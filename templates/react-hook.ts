/**
 * React Hook Template
 * 
 * A custom React hook template that provides a clean interface for using
 * the Google Maps Routes API wrapper in React applications.
 * 
 * Usage:
 * 1. Copy this file to your React project
 * 2. Install the wrapper: npm install google-maps-routes-api-wrapper
 * 3. Set GOOGLE_MAPS_API_KEY in your environment variables
 * 4. Use the hook in your components
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { RoutesClient, FetchAdapter, InMemoryCacheAdapter } from 'google-maps-routes-api-wrapper';
import { GetRouteOptions, DistanceMatrixOptions, SnapToRoadsOptions, RouteResult, DistanceMatrixResult, SnapToRoadsResult } from 'google-maps-routes-api-wrapper';

// Hook state interface
interface UseRoutesState {
  loading: boolean;
  error: string | null;
  data: RouteResult | DistanceMatrixResult | SnapToRoadsResult | null;
}

// Hook options interface
interface UseRoutesOptions {
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

// Custom hook for Google Maps Routes API
export function useRoutes(options: UseRoutesOptions) {
  const [state, setState] = useState<UseRoutesState>({
    loading: false,
    error: null,
    data: null
  });

  const clientRef = useRef<RoutesClient | null>(null);

  // Initialize client
  useEffect(() => {
    if (!clientRef.current) {
      clientRef.current = new RoutesClient({
        apiKey: options.apiKey,
        httpAdapter: new FetchAdapter(),
        cacheAdapter: new InMemoryCacheAdapter(options.cacheConfig),
        retryConfig: options.retryConfig,
        rateLimiterConfig: options.rateLimiterConfig
      });
    }
  }, [options.apiKey, options.cacheConfig, options.retryConfig, options.rateLimiterConfig]);

  // Get route function
  const getRoute = useCallback(async (routeOptions: GetRouteOptions) => {
    if (!clientRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await clientRef.current.getRoute(routeOptions);
      setState(prev => ({ ...prev, loading: false, data: result, error: null }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  // Get distance matrix function
  const getDistanceMatrix = useCallback(async (matrixOptions: DistanceMatrixOptions) => {
    if (!clientRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await clientRef.current.getDistanceMatrix(matrixOptions);
      setState(prev => ({ ...prev, loading: false, data: result, error: null }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  // Snap to roads function
  const snapToRoads = useCallback(async (snapOptions: SnapToRoadsOptions) => {
    if (!clientRef.current) return;

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await clientRef.current.snapToRoads(snapOptions);
      setState(prev => ({ ...prev, loading: false, data: result, error: null }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, loading: false, error: errorMessage }));
      throw error;
    }
  }, []);

  // Clear cache function
  const clearCache = useCallback(async () => {
    if (!clientRef.current) return;

    try {
      await clientRef.current.clearCache();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  // Get cache stats function
  const getCacheStats = useCallback(async () => {
    if (!clientRef.current) return null;

    try {
      return await clientRef.current.getCacheStats();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prev => ({ ...prev, error: errorMessage }));
      throw error;
    }
  }, []);

  // Reset state function
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      data: null
    });
  }, []);

  return {
    ...state,
    getRoute,
    getDistanceMatrix,
    snapToRoads,
    clearCache,
    getCacheStats,
    reset
  };
}

// Specialized hooks for specific use cases

// Hook for route planning
export function useRoutePlanner(apiKey: string) {
  const routes = useRoutes({ apiKey });

  const planRoute = useCallback(async (
    origin: string,
    destination: string,
    waypoints?: string[],
    travelMode: 'DRIVING' | 'WALKING' | 'BICYCLING' | 'TRANSIT' = 'DRIVING'
  ) => {
    return routes.getRoute({
      origin,
      destination,
      waypoints,
      travelMode
    });
  }, [routes]);

  return {
    ...routes,
    planRoute
  };
}

// Hook for delivery optimization
export function useDeliveryOptimizer(apiKey: string) {
  const routes = useRoutes({ apiKey });

  const optimizeDelivery = useCallback(async (
    warehouse: string,
    deliveryAddresses: string[]
  ) => {
    return routes.getRoute({
      origin: warehouse,
      destination: warehouse, // Return to warehouse
      waypoints: deliveryAddresses,
      travelMode: 'DRIVING',
      optimizeWaypoints: true
    });
  }, [routes]);

  return {
    ...routes,
    optimizeDelivery
  };
}

// Hook for fleet management
export function useFleetManager(apiKey: string) {
  const routes = useRoutes({ apiKey });

  const findClosestVehicle = useCallback(async (
    vehicleLocations: string[],
    pickupLocation: string
  ) => {
    const distanceMatrix = await routes.getDistanceMatrix({
      origins: vehicleLocations,
      destinations: [pickupLocation],
      travelMode: 'DRIVING'
    });

    // Find closest vehicle
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

    return {
      closestVehicleIndex: closestIndex,
      closestVehicleLocation: closestIndex >= 0 ? vehicleLocations[closestIndex] : null,
      distance: closestIndex >= 0 ? distanceMatrix.rows[closestIndex].elements[0].distance : null,
      duration: closestIndex >= 0 ? distanceMatrix.rows[closestIndex].elements[0].duration : null
    };
  }, [routes]);

  return {
    ...routes,
    findClosestVehicle
  };
}

// Example usage in a React component:
/*
import React from 'react';
import { useRoutePlanner } from './useRoutes';

export default function RoutePlannerComponent() {
  const { loading, error, data, planRoute } = useRoutePlanner(process.env.REACT_APP_GOOGLE_MAPS_API_KEY!);

  const handleGetRoute = async () => {
    try {
      await planRoute('New York, NY', 'Philadelphia, PA', ['Baltimore, MD'], 'DRIVING');
    } catch (error) {
      console.error('Route planning failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleGetRoute} disabled={loading}>
        {loading ? 'Planning Route...' : 'Plan Route'}
      </button>
      
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      
      {data && (
        <div>
          <h3>Route Found!</h3>
          <p>Distance: {data.routes[0]?.legs[0]?.distance?.text}</p>
          <p>Duration: {data.routes[0]?.legs[0]?.duration?.text}</p>
        </div>
      )}
    </div>
  );
}
*/
