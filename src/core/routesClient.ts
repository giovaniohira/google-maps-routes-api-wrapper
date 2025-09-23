import { HttpAdapter, HttpRequest, HttpResponse } from '../adapters/http/httpAdapter';
import { GetRouteOptions, RouteResult, LatLng } from '../types';
import { validateGetRouteOptions } from '../validation';
import { RoutesError } from '../errors';
import { RetryStrategy, RetryConfig } from './retryStrategy';
import { RateLimiter, RateLimiterConfig } from './rateLimiter';

export class RoutesClient {
    private httpAdapter: HttpAdapter;
    private apiKey: string;
    private timeoutMs: number;
    private baseUrl: string;
    private retryStrategy: RetryStrategy;
    private rateLimiter: RateLimiter;

    constructor(opts: {
        apiKey: string;
        httpAdapter: HttpAdapter;
        timeoutMs?: number;
        baseUrl?: string;
        retryConfig?: Partial<RetryConfig>;
        rateLimiterConfig?: Partial<RateLimiterConfig>;
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
    }

    /**
     * Get route between origin and destination
     * @param opts - Route options including origin, destination, and optional parameters
     * @returns Promise<RouteResult> - The route result from Google Maps API
     * @throws RoutesError - For validation errors, API errors, or network issues
     */
    async getRoute(opts: GetRouteOptions): Promise<RouteResult> {
        // Validate input options
        const validatedOptions = validateGetRouteOptions(opts);
        
        // Apply rate limiting
        const rateLimited = await this.rateLimiter.acquire();
        if (!rateLimited) {
            throw RoutesError.fromHttpResponse(429, 'Rate limit exceeded. Please try again later.');
        }

        // Execute with retry strategy
        return this.retryStrategy.execute(async () => {
            return this.executeRouteRequest(validatedOptions);
        }, { operation: 'getRoute' });
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
                .map(wp => this.formatLocation(wp))
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
     * Format location (string or LatLng) for API request
     */
    private formatLocation(location: string | LatLng): string {
        if (typeof location === 'string') {
            return location;
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
     * Destroy the client and clean up resources
     */
    destroy(): void {
        this.rateLimiter.destroy();
    }
}


