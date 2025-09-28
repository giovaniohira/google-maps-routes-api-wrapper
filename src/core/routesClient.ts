import { HttpAdapter, HttpRequest, HttpResponse } from '../adapters/http/httpAdapter';
import { GetRouteOptions, RouteResult, DistanceMatrixOptions, DistanceMatrixResult, SnapToRoadsOptions, SnapToRoadsResult, Location } from '../types';
import { validateGetRouteOptions, validateDistanceMatrixOptions, validateSnapToRoadsOptions } from '../validation';
import { RoutesError } from '../errors';
import { RetryStrategy, RetryConfig } from './retryStrategy';
import { RateLimiter, RateLimiterConfig } from './rateLimiter';
import { CacheAdapter } from '../adapters/cache/cacheAdapter';

export class RoutesClient {
    private httpAdapter: HttpAdapter;
    private apiKey: string;
    private timeoutMs: number;
    private baseUrl: string;
    private retryStrategy: RetryStrategy;
    private rateLimiter: RateLimiter;
    private cacheAdapter?: CacheAdapter;

    constructor(opts: {
        apiKey: string;
        httpAdapter: HttpAdapter;
        timeoutMs?: number;
        baseUrl?: string;
        retryConfig?: Partial<RetryConfig>;
        rateLimiterConfig?: Partial<RateLimiterConfig>;
        cacheAdapter?: CacheAdapter;
    }) {
        if (!opts.apiKey) {
            throw RoutesError.validation('API key is required', 'apiKey');
        }
        if (!opts.httpAdapter) {
            throw RoutesError.validation('HTTP adapter is required', 'httpAdapter');
        }
        
        this.httpAdapter = opts.httpAdapter;
        this.apiKey = opts.apiKey;
        this.timeoutMs = opts.timeoutMs || 30000; // 30 seconds default
        this.baseUrl = opts.baseUrl || 'https://maps.googleapis.com/maps/api';
        
        // Initialize retry strategy and rate limiter
        this.retryStrategy = new RetryStrategy(opts.retryConfig);
        this.rateLimiter = new RateLimiter(opts.rateLimiterConfig);
        this.cacheAdapter = opts.cacheAdapter;
    }

    /**
     * Get route between origin and destination
     * @param opts - Route options including origin, destination, and optional parameters
     * @param cacheOptions - Cache options for this request
     * @returns Promise<RouteResult> - The route result from Google Maps API
     * @throws RoutesError - For validation errors, API errors, or network issues
     */
    async getRoute(
        opts: GetRouteOptions, 
        cacheOptions?: { bypassCache?: boolean; forceRefresh?: boolean; ttlMs?: number }
    ): Promise<RouteResult> {
        // Validate input options
        const validatedOptions = validateGetRouteOptions(opts);
        
        // Generate cache key
        const cacheKey = this.generateCacheKey('route', validatedOptions);
        
        // Check cache first (unless bypassing)
        if (this.cacheAdapter && !cacheOptions?.bypassCache && !cacheOptions?.forceRefresh) {
            const cachedResult = await this.cacheAdapter.get<RouteResult>(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
        }
        
        // Apply rate limiting
        const rateLimited = await this.rateLimiter.acquire();
        if (!rateLimited) {
            throw RoutesError.fromHttpResponse(429, 'Rate limit exceeded. Please try again later.');
        }

        // Execute with retry strategy
        const result = await this.retryStrategy.execute(async () => {
            return this.executeRouteRequest(validatedOptions);
        });

        // Cache the result
        if (this.cacheAdapter && result) {
            const ttlMs = cacheOptions?.ttlMs || 300000; // 5 minutes default
            await this.cacheAdapter.set(cacheKey, result, ttlMs);
        }

        return result;
    }

    /**
     * Execute the actual route request
     */
    private async executeRouteRequest(opts: GetRouteOptions): Promise<RouteResult> {
        try {
            // Build request URL
            const url = this.buildDirectionsUrl(opts);
            
            // Create HTTP request
            const req: HttpRequest = {
                method: 'GET',
                url,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'google-maps-routes-wrapper/1.0.0'
                }
            };

            // Send request with timeout
            const res = await this.sendRequestWithTimeout(req);
            
            // Check for HTTP errors
            if (res.status >= 400) {
                throw RoutesError.fromHttpResponse(res.status, 'API request failed', res.body);
            }

            // Parse and validate response
            return this.parseRouteResponse(res.body);
            
        } catch (error) {
            if (error instanceof RoutesError) {
                throw error;
            }
            
            // Handle network errors
            if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    throw RoutesError.timeout(this.timeoutMs);
                }
                throw RoutesError.network(error.message, error);
            }
            
            throw RoutesError.network('Unknown error occurred');
        }
    }

    /**
     * Build Google Directions API URL with query parameters
     */
    private buildDirectionsUrl(options: GetRouteOptions): string {
        const params = new URLSearchParams();
        
        // Origin
        params.append('origin', this.formatLocation(options.origin));
        
        // Destination
        params.append('destination', this.formatLocation(options.destination));
        
        // API Key
        params.append('key', this.apiKey);
        
        // Optional parameters
        if (options.travelMode) {
            params.append('mode', options.travelMode.toLowerCase());
        }
        
        if (options.waypoints && options.waypoints.length > 0) {
            const waypointStr = options.waypoints
                .map(wp => this.formatLocation(wp as Location))
                .join('|');
            params.append('waypoints', waypointStr);
        }
        
        if (options.avoidHighways) {
            params.append('avoid', 'highways');
        }
        
        if (options.avoidTolls) {
            params.append('avoid', 'tolls');
        }
        
        if (options.avoidFerries) {
            params.append('avoid', 'ferries');
        }
        
        if (options.optimizeWaypoints) {
            params.append('optimize', 'true');
        }

        return `${this.baseUrl}/directions/json?${params.toString()}`;
    }

    /**
     * Format location (string, LatLng, or [lat, lng] array) for API request
     */
    private formatLocation(location: Location): string {
        if (typeof location === 'string') {
            return location;
        }
        if (Array.isArray(location)) {
            return `${location[0]},${location[1]}`;
        }
        return `${location.lat},${location.lng}`;
    }

    /**
     * Send HTTP request with timeout
     */
    private async sendRequestWithTimeout(req: HttpRequest): Promise<HttpResponse> {
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Request timed out after ${this.timeoutMs}ms`));
            }, this.timeoutMs);
        });

        const requestPromise = this.httpAdapter.sendRequest(req);

        return Promise.race([requestPromise, timeoutPromise]);
    }

    /**
     * Parse and validate Google Directions API response
     */
    private parseRouteResponse(body: any): RouteResult {
        if (!body || typeof body !== 'object') {
            throw RoutesError.validation('Invalid response format from API');
        }

        if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS') {
            throw RoutesError.fromHttpResponse(
                400,
                body.error_message || `API returned status: ${body.status}`,
                body
            );
        }

        return body as RouteResult;
    }

    /**
     * Get current retry configuration
     */
    getRetryConfig(): RetryConfig {
        return this.retryStrategy.getConfig();
    }

    /**
     * Update retry configuration
     */
    updateRetryConfig(config: Partial<RetryConfig>): void {
        this.retryStrategy.updateConfig(config);
    }

    /**
     * Get current rate limiter configuration
     */
    getRateLimiterConfig(): RateLimiterConfig {
        return this.rateLimiter.getConfig();
    }

    /**
     * Update rate limiter configuration
     */
    updateRateLimiterConfig(config: Partial<RateLimiterConfig>): void {
        this.rateLimiter.updateConfig(config);
    }

    /**
     * Get current token count from rate limiter
     */
    getTokenCount(): number {
        return this.rateLimiter.getTokenCount();
    }

    /**
     * Reset rate limiter to full capacity
     */
    resetRateLimiter(): void {
        this.rateLimiter.reset();
    }

    /**
     * Generate cache key for request
     */
    private generateCacheKey(operation: string, options: GetRouteOptions): string {
        const keyData = {
            operation,
            origin: options.origin,
            destination: options.destination,
            travelMode: options.travelMode,
            waypoints: options.waypoints,
            avoidHighways: options.avoidHighways,
            avoidTolls: options.avoidTolls,
            avoidFerries: options.avoidFerries,
            optimizeWaypoints: options.optimizeWaypoints
        };
        
        // Create a more efficient cache key using simple string concatenation
        const keyParts = [
            operation,
            String(keyData.origin),
            String(keyData.destination),
            keyData.travelMode || '',
            keyData.waypoints ? keyData.waypoints.join(',') : '',
            keyData.avoidHighways ? '1' : '0',
            keyData.avoidTolls ? '1' : '0',
            keyData.avoidFerries ? '1' : '0',
            keyData.optimizeWaypoints ? '1' : '0'
        ];
        return `routes:${keyParts.join(':')}`;
    }

    /**
     * Get cache adapter
     */
    getCacheAdapter(): CacheAdapter | undefined {
        return this.cacheAdapter;
    }

    /**
     * Set cache adapter
     */
    setCacheAdapter(cacheAdapter: CacheAdapter): void {
        this.cacheAdapter = cacheAdapter;
    }

    /**
     * Clear cache
     */
    async clearCache(): Promise<void> {
        if (this.cacheAdapter) {
            await this.cacheAdapter.clear();
        }
    }

    /**
     * Get cache statistics
     */
    async getCacheStats(): Promise<any> {
        if (this.cacheAdapter) {
            return await this.cacheAdapter.getStats();
        }
        return null;
    }

    /**
     * Invalidate cache for specific route
     */
    async invalidateRoute(opts: GetRouteOptions): Promise<void> {
        if (this.cacheAdapter) {
            const cacheKey = this.generateCacheKey('route', opts);
            await this.cacheAdapter.del(cacheKey);
        }
    }

    /**
     * Get distance matrix between origins and destinations
     * @param opts - Distance matrix options including origins, destinations, and optional parameters
     * @param cacheOptions - Cache options for this request
     * @returns Promise<DistanceMatrixResult> - The distance matrix result from Google Maps API
     * @throws RoutesError - For validation errors, API errors, or network issues
     */
    async getDistanceMatrix(
        opts: DistanceMatrixOptions,
        cacheOptions?: { bypassCache?: boolean; forceRefresh?: boolean; ttlMs?: number }
    ): Promise<DistanceMatrixResult> {
        // Validate input options
        const validatedOptions = validateDistanceMatrixOptions(opts);
        
        // Generate cache key
        const cacheKey = this.generateDistanceMatrixCacheKey(validatedOptions);
        
        // Check cache first (unless bypassing)
        if (this.cacheAdapter && !cacheOptions?.bypassCache && !cacheOptions?.forceRefresh) {
            const cachedResult = await this.cacheAdapter.get<DistanceMatrixResult>(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
        }
        
        // Apply rate limiting
        const rateLimited = await this.rateLimiter.acquire();
        if (!rateLimited) {
            throw RoutesError.fromHttpResponse(429, 'Rate limit exceeded. Please try again later.');
        }

        // Execute with retry strategy
        const result = await this.retryStrategy.execute(async () => {
            return this.executeDistanceMatrixRequest(validatedOptions);
        });

        // Cache the result
        if (this.cacheAdapter && result) {
            const ttlMs = cacheOptions?.ttlMs || 300000; // 5 minutes default
            await this.cacheAdapter.set(cacheKey, result, ttlMs);
        }

        return result;
    }

    /**
     * Snap GPS coordinates to roads
     * @param opts - Snap to roads options including path and optional parameters
     * @param cacheOptions - Cache options for this request
     * @returns Promise<SnapToRoadsResult> - The snap to roads result from Google Maps API
     * @throws RoutesError - For validation errors, API errors, or network issues
     */
    async snapToRoads(
        opts: SnapToRoadsOptions,
        cacheOptions?: { bypassCache?: boolean; forceRefresh?: boolean; ttlMs?: number }
    ): Promise<SnapToRoadsResult> {
        // Validate input options
        const validatedOptions = validateSnapToRoadsOptions(opts);
        
        // Generate cache key
        const cacheKey = this.generateSnapToRoadsCacheKey(validatedOptions);
        
        // Check cache first (unless bypassing)
        if (this.cacheAdapter && !cacheOptions?.bypassCache && !cacheOptions?.forceRefresh) {
            const cachedResult = await this.cacheAdapter.get<SnapToRoadsResult>(cacheKey);
            if (cachedResult) {
                return cachedResult;
            }
        }
        
        // Apply rate limiting
        const rateLimited = await this.rateLimiter.acquire();
        if (!rateLimited) {
            throw RoutesError.fromHttpResponse(429, 'Rate limit exceeded. Please try again later.');
        }

        // Execute with retry strategy
        const result = await this.retryStrategy.execute(async () => {
            return this.executeSnapToRoadsRequest(validatedOptions);
        });

        // Cache the result
        if (this.cacheAdapter && result) {
            const ttlMs = cacheOptions?.ttlMs || 300000; // 5 minutes default
            await this.cacheAdapter.set(cacheKey, result, ttlMs);
        }

        return result;
    }

    /**
     * Execute the actual distance matrix request
     */
    private async executeDistanceMatrixRequest(opts: DistanceMatrixOptions): Promise<DistanceMatrixResult> {
        try {
            // Build request URL
            const url = this.buildDistanceMatrixUrl(opts);
            
            // Create HTTP request
            const req: HttpRequest = {
                method: 'GET',
                url,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'google-maps-routes-wrapper/1.0.0'
                }
            };

            // Send request with timeout
            const res = await this.sendRequestWithTimeout(req);
            
            // Check for HTTP errors
            if (res.status >= 400) {
                throw RoutesError.fromHttpResponse(res.status, 'API request failed', res.body);
            }

            // Parse and validate response
            return this.parseDistanceMatrixResponse(res.body);
            
        } catch (error) {
            if (error instanceof RoutesError) {
                throw error;
            }
            
            // Handle network errors
            if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    throw RoutesError.timeout(this.timeoutMs);
                }
                throw RoutesError.network(error.message, error);
            }
            
            throw RoutesError.network('Unknown error occurred');
        }
    }

    /**
     * Execute the actual snap to roads request
     */
    private async executeSnapToRoadsRequest(opts: SnapToRoadsOptions): Promise<SnapToRoadsResult> {
        try {
            // Build request URL
            const url = this.buildSnapToRoadsUrl(opts);
            
            // Create HTTP request
            const req: HttpRequest = {
                method: 'GET',
                url,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'google-maps-routes-wrapper/1.0.0'
                }
            };

            // Send request with timeout
            const res = await this.sendRequestWithTimeout(req);
            
            // Check for HTTP errors
            if (res.status >= 400) {
                throw RoutesError.fromHttpResponse(res.status, 'API request failed', res.body);
            }

            // Parse and validate response
            return this.parseSnapToRoadsResponse(res.body);
            
        } catch (error) {
            if (error instanceof RoutesError) {
                throw error;
            }
            
            // Handle network errors
            if (error instanceof Error) {
                if (error.message.includes('timeout')) {
                    throw RoutesError.timeout(this.timeoutMs);
                }
                throw RoutesError.network(error.message, error);
            }
            
            throw RoutesError.network('Unknown error occurred');
        }
    }

    /**
     * Build Google Distance Matrix API URL with query parameters
     */
    private buildDistanceMatrixUrl(options: DistanceMatrixOptions): string {
        const params = new URLSearchParams();
        
        // Origins
        const origins = options.origins.map(origin => this.formatLocation(origin)).join('|');
        params.append('origins', origins);
        
        // Destinations
        const destinations = options.destinations.map(dest => this.formatLocation(dest)).join('|');
        params.append('destinations', destinations);
        
        // API Key
        params.append('key', this.apiKey);
        
        // Optional parameters
        if (options.travelMode) {
            params.append('mode', options.travelMode.toLowerCase());
        }
        
        if (options.units) {
            params.append('units', options.units);
        }
        
        if (options.departureTime) {
            const timestamp = options.departureTime instanceof Date 
                ? Math.floor(options.departureTime.getTime() / 1000)
                : options.departureTime;
            params.append('departure_time', timestamp.toString());
        }
        
        if (options.arrivalTime) {
            const timestamp = options.arrivalTime instanceof Date 
                ? Math.floor(options.arrivalTime.getTime() / 1000)
                : options.arrivalTime;
            params.append('arrival_time', timestamp.toString());
        }
        
        if (options.trafficModel) {
            params.append('traffic_model', options.trafficModel);
        }
        
        if (options.transitMode) {
            params.append('transit_mode', options.transitMode);
        }
        
        if (options.transitRoutingPreference) {
            params.append('transit_routing_preference', options.transitRoutingPreference);
        }
        
        // Avoid parameters
        const avoidParams: string[] = [];
        if (options.avoidHighways) avoidParams.push('highways');
        if (options.avoidTolls) avoidParams.push('tolls');
        if (options.avoidFerries) avoidParams.push('ferries');
        
        if (avoidParams.length > 0) {
            params.append('avoid', avoidParams.join('|'));
        }

        return `${this.baseUrl}/distancematrix/json?${params.toString()}`;
    }

    /**
     * Build Google Roads API URL with query parameters
     */
    private buildSnapToRoadsUrl(options: SnapToRoadsOptions): string {
        const params = new URLSearchParams();
        
        // Path
        const path = options.path.map(point => `${point.lat},${point.lng}`).join('|');
        params.append('path', path);
        
        // API Key
        params.append('key', this.apiKey);
        
        // Optional parameters
        if (options.interpolate) {
            params.append('interpolate', 'true');
        }

        return `${this.baseUrl}/snapToRoads?${params.toString()}`;
    }

    /**
     * Parse and validate Google Distance Matrix API response
     */
    private parseDistanceMatrixResponse(body: any): DistanceMatrixResult {
        if (!body || typeof body !== 'object') {
            throw RoutesError.validation('Invalid response format from API');
        }

        if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS') {
            throw RoutesError.fromHttpResponse(
                400,
                body.error_message || `API returned status: ${body.status}`,
                body
            );
        }

        return body as DistanceMatrixResult;
    }

    /**
     * Parse and validate Google Roads API response
     */
    private parseSnapToRoadsResponse(body: any): SnapToRoadsResult {
        if (!body || typeof body !== 'object') {
            throw RoutesError.validation('Invalid response format from API');
        }

        if (body.status !== 'OK' && body.status !== 'ZERO_RESULTS') {
            throw RoutesError.fromHttpResponse(
                400,
                body.error_message || `API returned status: ${body.status}`,
                body
            );
        }

        return body as SnapToRoadsResult;
    }

    /**
     * Generate cache key for distance matrix request
     */
    private generateDistanceMatrixCacheKey(options: DistanceMatrixOptions): string {
        const keyData = {
            operation: 'distanceMatrix',
            origins: options.origins,
            destinations: options.destinations,
            travelMode: options.travelMode,
            units: options.units,
            departureTime: options.departureTime,
            arrivalTime: options.arrivalTime,
            trafficModel: options.trafficModel,
            transitMode: options.transitMode,
            transitRoutingPreference: options.transitRoutingPreference,
            avoidHighways: options.avoidHighways,
            avoidTolls: options.avoidTolls,
            avoidFerries: options.avoidFerries
        };
        
        // Create a more efficient cache key using simple string concatenation
        const keyParts = [
            'distanceMatrix',
            keyData.origins.join('|'),
            keyData.destinations.join('|'),
            keyData.travelMode || '',
            keyData.units || '',
            keyData.departureTime ? String(keyData.departureTime) : '',
            keyData.arrivalTime ? String(keyData.arrivalTime) : '',
            keyData.trafficModel || '',
            keyData.transitMode || '',
            keyData.transitRoutingPreference || '',
            keyData.avoidHighways ? '1' : '0',
            keyData.avoidTolls ? '1' : '0',
            keyData.avoidFerries ? '1' : '0'
        ];
        return `routes:${keyParts.join(':')}`;
    }

    /**
     * Generate cache key for snap to roads request
     */
    private generateSnapToRoadsCacheKey(options: SnapToRoadsOptions): string {
        const keyData = {
            operation: 'snapToRoads',
            path: options.path,
            interpolate: options.interpolate
        };
        
        // Create a more efficient cache key using simple string concatenation
        const pathString = keyData.path.map(p => `${p.lat},${p.lng}`).join('|');
        const keyParts = [
            'snapToRoads',
            pathString,
            keyData.interpolate ? '1' : '0'
        ];
        return `routes:${keyParts.join(':')}`;
    }

    /**
     * Invalidate cache for specific distance matrix request
     */
    async invalidateDistanceMatrix(opts: DistanceMatrixOptions): Promise<void> {
        if (this.cacheAdapter) {
            const cacheKey = this.generateDistanceMatrixCacheKey(opts);
            await this.cacheAdapter.del(cacheKey);
        }
    }

    /**
     * Invalidate cache for specific snap to roads request
     */
    async invalidateSnapToRoads(opts: SnapToRoadsOptions): Promise<void> {
        if (this.cacheAdapter) {
            const cacheKey = this.generateSnapToRoadsCacheKey(opts);
            await this.cacheAdapter.del(cacheKey);
        }
    }

    /**
     * Destroy the client and clean up resources
     */
    destroy(): void {
        this.rateLimiter.destroy();
        if (this.cacheAdapter && 'destroy' in this.cacheAdapter) {
            (this.cacheAdapter as any).destroy();
        }
    }
}


