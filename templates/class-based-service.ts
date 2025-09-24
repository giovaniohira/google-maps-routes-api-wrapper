/**
 * Class-Based Service Template
 * 
 * A comprehensive service class template that demonstrates how to create
 * a business logic layer on top of the Google Maps Routes API wrapper.
 * 
 * This template shows how to build a delivery service, logistics manager,
 * or any other business application using the wrapper.
 */

import { RoutesClient, FetchAdapter, InMemoryCacheAdapter } from 'google-maps-routes-api-wrapper';
import { GetRouteOptions, DistanceMatrixOptions, SnapToRoadsOptions, LatLng } from 'google-maps-routes-api-wrapper';

// Business domain interfaces
interface DeliveryRequest {
  id: string;
  pickupLocation: string;
  deliveryLocation: string;
  priority: 'high' | 'medium' | 'low';
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  specialInstructions?: string;
}

interface Vehicle {
  id: string;
  currentLocation: string;
  capacity: number;
  currentLoad: number;
  driverId: string;
  status: 'available' | 'busy' | 'offline';
}

interface OptimizedRoute {
  vehicleId: string;
  route: {
    origin: string;
    destination: string;
    waypoints: string[];
    totalDistance: string;
    totalDuration: string;
    legs: Array<{
      startAddress: string;
      endAddress: string;
      distance: string;
      duration: string;
    }>;
  };
  deliveries: DeliveryRequest[];
  estimatedCompletion: Date;
}

interface ServiceConfig {
  apiKey: string;
  cacheConfig?: {
    defaultTtlMs?: number;
    maxEntries?: number;
  };
  retryConfig?: {
    maxRetries?: number;
    baseMs?: number;
    factor?: number;
  };
  rateLimiterConfig?: {
    capacity?: number;
    refillRate?: number;
    refillIntervalMs?: number;
  };
}

// Main service class
export class DeliveryService {
  private routesClient: RoutesClient;
  private vehicles: Map<string, Vehicle> = new Map();
  private deliveryRequests: Map<string, DeliveryRequest> = new Map();
  private optimizedRoutes: Map<string, OptimizedRoute> = new Map();

  constructor(config: ServiceConfig) {
    this.routesClient = new RoutesClient({
      apiKey: config.apiKey,
      httpAdapter: new FetchAdapter(),
      cacheAdapter: new InMemoryCacheAdapter(config.cacheConfig),
      retryConfig: config.retryConfig,
      rateLimiterConfig: config.rateLimiterConfig
    });
  }

  // Vehicle management
  addVehicle(vehicle: Vehicle): void {
    this.vehicles.set(vehicle.id, vehicle);
  }

  updateVehicleLocation(vehicleId: string, location: string): void {
    const vehicle = this.vehicles.get(vehicleId);
    if (vehicle) {
      vehicle.currentLocation = location;
      this.vehicles.set(vehicleId, vehicle);
    }
  }

  getVehicle(vehicleId: string): Vehicle | undefined {
    return this.vehicles.get(vehicleId);
  }

  getAvailableVehicles(): Vehicle[] {
    return Array.from(this.vehicles.values()).filter(v => v.status === 'available');
  }

  // Delivery request management
  addDeliveryRequest(request: DeliveryRequest): void {
    this.deliveryRequests.set(request.id, request);
  }

  getDeliveryRequest(requestId: string): DeliveryRequest | undefined {
    return this.deliveryRequests.get(requestId);
  }

  getAllDeliveryRequests(): DeliveryRequest[] {
    return Array.from(this.deliveryRequests.values());
  }

  // Route optimization
  async optimizeDeliveryRoute(vehicleId: string, deliveryIds: string[]): Promise<OptimizedRoute> {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle) {
      throw new Error(`Vehicle ${vehicleId} not found`);
    }

    const deliveries = deliveryIds
      .map(id => this.deliveryRequests.get(id))
      .filter((delivery): delivery is DeliveryRequest => delivery !== undefined);

    if (deliveries.length === 0) {
      throw new Error('No valid deliveries found');
    }

    // Build waypoints from delivery locations
    const waypoints = deliveries.map(delivery => delivery.deliveryLocation);

    try {
      const route = await this.routesClient.getRoute({
        origin: vehicle.currentLocation,
        destination: vehicle.currentLocation, // Return to starting point
        waypoints,
        travelMode: 'DRIVING',
        optimizeWaypoints: true
      });

      if (!route.routes[0]) {
        throw new Error('No route found');
      }

      const optimizedRoute: OptimizedRoute = {
        vehicleId,
        route: {
          origin: vehicle.currentLocation,
          destination: vehicle.currentLocation,
          waypoints,
          totalDistance: route.routes[0].legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0).toString(),
          totalDuration: route.routes[0].legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0).toString(),
          legs: route.routes[0].legs.map(leg => ({
            startAddress: leg.startAddress || '',
            endAddress: leg.endAddress || '',
            distance: leg.distance?.text || '',
            duration: leg.duration?.text || ''
          }))
        },
        deliveries,
        estimatedCompletion: new Date(Date.now() + (route.routes[0].legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0) * 1000))
      };

      this.optimizedRoutes.set(vehicleId, optimizedRoute);
      return optimizedRoute;

    } catch (error) {
      throw new Error(`Route optimization failed: ${error.message}`);
    }
  }

  // Find closest vehicle for a delivery
  async findClosestVehicle(deliveryLocation: string): Promise<{ vehicle: Vehicle; distance: string; duration: string } | null> {
    const availableVehicles = this.getAvailableVehicles();
    if (availableVehicles.length === 0) {
      return null;
    }

    try {
      const distanceMatrix = await this.routesClient.getDistanceMatrix({
        origins: availableVehicles.map(v => v.currentLocation),
        destinations: [deliveryLocation],
        travelMode: 'DRIVING'
      });

      let closestIndex = -1;
      let shortestDistance = Infinity;

      distanceMatrix.rows.forEach((row, index) => {
        const element = row.elements[0];
        if (element.status === 'OK' && element.distance) {
          const distance = element.distance.value;
          if (distance < shortestDistance) {
            shortestDistance = distance;
            closestIndex = index;
          }
        }
      });

      if (closestIndex >= 0) {
        const vehicle = availableVehicles[closestIndex];
        const element = distanceMatrix.rows[closestIndex].elements[0];
        return {
          vehicle,
          distance: element.distance?.text || '',
          duration: element.duration?.text || ''
        };
      }

      return null;

    } catch (error) {
      throw new Error(`Failed to find closest vehicle: ${error.message}`);
    }
  }

  // Batch delivery optimization
  async optimizeBatchDeliveries(): Promise<Map<string, OptimizedRoute>> {
    const availableVehicles = this.getAvailableVehicles();
    const pendingDeliveries = this.getAllDeliveryRequests().filter(d => 
      !Array.from(this.optimizedRoutes.values()).some(route => 
        route.deliveries.some(delivery => delivery.id === d.id)
      )
    );

    if (availableVehicles.length === 0 || pendingDeliveries.length === 0) {
      return new Map();
    }

    const optimizedRoutes = new Map<string, OptimizedRoute>();

    // Simple round-robin assignment (can be enhanced with more sophisticated algorithms)
    const deliveriesPerVehicle = Math.ceil(pendingDeliveries.length / availableVehicles.length);
    
    for (let i = 0; i < availableVehicles.length; i++) {
      const vehicle = availableVehicles[i];
      const startIndex = i * deliveriesPerVehicle;
      const endIndex = Math.min(startIndex + deliveriesPerVehicle, pendingDeliveries.length);
      const vehicleDeliveries = pendingDeliveries.slice(startIndex, endIndex);

      if (vehicleDeliveries.length > 0) {
        try {
          const route = await this.optimizeDeliveryRoute(
            vehicle.id, 
            vehicleDeliveries.map(d => d.id)
          );
          optimizedRoutes.set(vehicle.id, route);
        } catch (error) {
          console.error(`Failed to optimize route for vehicle ${vehicle.id}:`, error);
        }
      }
    }

    return optimizedRoutes;
  }

  // GPS coordinate snapping for delivery locations
  async snapDeliveryLocation(coordinates: LatLng[]): Promise<LatLng[]> {
    try {
      const snappedResult = await this.routesClient.snapToRoads({
        path: coordinates
      });

      return snappedResult.snappedPoints.map(point => point.location);
    } catch (error) {
      throw new Error(`Failed to snap coordinates: ${error.message}`);
    }
  }

  // Get service statistics
  async getServiceStats(): Promise<{
    totalVehicles: number;
    availableVehicles: number;
    totalDeliveries: number;
    pendingDeliveries: number;
    optimizedRoutes: number;
    cacheStats: any;
  }> {
    const cacheStats = await this.routesClient.getCacheStats();
    
    return {
      totalVehicles: this.vehicles.size,
      availableVehicles: this.getAvailableVehicles().length,
      totalDeliveries: this.deliveryRequests.size,
      pendingDeliveries: this.getAllDeliveryRequests().length,
      optimizedRoutes: this.optimizedRoutes.size,
      cacheStats
    };
  }

  // Clear all data
  clearAll(): void {
    this.vehicles.clear();
    this.deliveryRequests.clear();
    this.optimizedRoutes.clear();
  }

  // Get optimized route for a vehicle
  getOptimizedRoute(vehicleId: string): OptimizedRoute | undefined {
    return this.optimizedRoutes.get(vehicleId);
  }

  // Get all optimized routes
  getAllOptimizedRoutes(): OptimizedRoute[] {
    return Array.from(this.optimizedRoutes.values());
  }
}

// Example usage:
/*
const deliveryService = new DeliveryService({
  apiKey: process.env.GOOGLE_MAPS_API_KEY!,
  cacheConfig: {
    defaultTtlMs: 300000, // 5 minutes
    maxEntries: 1000
  }
});

// Add vehicles
deliveryService.addVehicle({
  id: 'VEHICLE-001',
  currentLocation: '123 Main St, New York, NY',
  capacity: 1000,
  currentLoad: 0,
  driverId: 'DRIVER-001',
  status: 'available'
});

// Add delivery requests
deliveryService.addDeliveryRequest({
  id: 'DELIVERY-001',
  pickupLocation: '456 Oak Ave, Brooklyn, NY',
  deliveryLocation: '789 Pine St, Queens, NY',
  priority: 'high'
});

// Optimize routes
const optimizedRoute = await deliveryService.optimizeDeliveryRoute('VEHICLE-001', ['DELIVERY-001']);

// Get service statistics
const stats = await deliveryService.getServiceStats();
console.log('Service Statistics:', stats);
*/
