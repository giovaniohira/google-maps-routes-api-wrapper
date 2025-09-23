/**
 * Geographic coordinates
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Travel modes supported by Google Maps Routes API
 */
export enum TravelMode {
  DRIVING = 'DRIVING',
  WALKING = 'WALKING',
  BICYCLING = 'BICYCLING',
  TRANSIT = 'TRANSIT'
}

/**
 * Options for getting a route
 */
export interface GetRouteOptions {
  origin: string | LatLng;
  destination: string | LatLng;
  travelMode?: TravelMode;
  waypoints?: (string | LatLng)[];
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  optimizeWaypoints?: boolean;
}

/**
 * Route leg information
 */
export interface RouteLeg {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  startAddress: string;
  endAddress: string;
  startLocation: LatLng;
  endLocation: LatLng;
  steps: RouteStep[];
}

/**
 * Route step information
 */
export interface RouteStep {
  distance: {
    text: string;
    value: number;
  };
  duration: {
    text: string;
    value: number;
  };
  startLocation: LatLng;
  endLocation: LatLng;
  htmlInstructions: string;
  travelMode: TravelMode;
  polyline: {
    points: string;
  };
}

/**
 * Complete route result
 */
export interface RouteResult {
  routes: {
    summary: string;
    legs: RouteLeg[];
    overviewPolyline: {
      points: string;
    };
    bounds: {
      northeast: LatLng;
      southwest: LatLng;
    };
    copyrights: string;
    warnings: string[];
    waypointOrder: number[];
  }[];
  status: string;
  errorMessage?: string;
}
