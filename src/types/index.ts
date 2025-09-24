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

/**
 * Distance Matrix request options
 */
export interface DistanceMatrixOptions {
  origins: (string | LatLng)[];
  destinations: (string | LatLng)[];
  travelMode?: TravelMode;
  avoidHighways?: boolean;
  avoidTolls?: boolean;
  avoidFerries?: boolean;
  units?: 'metric' | 'imperial';
  departureTime?: Date | number; // Date object or Unix timestamp
  arrivalTime?: Date | number; // Date object or Unix timestamp
  trafficModel?: 'best_guess' | 'pessimistic' | 'optimistic';
  transitMode?: 'bus' | 'subway' | 'train' | 'tram' | 'rail';
  transitRoutingPreference?: 'less_walking' | 'fewer_transfers';
}

/**
 * Distance Matrix element result
 */
export interface DistanceMatrixElement {
  status: string;
  duration?: {
    text: string;
    value: number; // in seconds
  };
  distance?: {
    text: string;
    value: number; // in meters
  };
  duration_in_traffic?: {
    text: string;
    value: number; // in seconds
  };
  fare?: {
    text: string;
    value: number;
    currency: string;
  };
}

/**
 * Distance Matrix row result
 */
export interface DistanceMatrixRow {
  elements: DistanceMatrixElement[];
}

/**
 * Distance Matrix result
 */
export interface DistanceMatrixResult {
  originAddresses: string[];
  destinationAddresses: string[];
  rows: DistanceMatrixRow[];
  status: string;
  errorMessage?: string;
}

/**
 * Snap to Roads request options
 */
export interface SnapToRoadsOptions {
  path: LatLng[];
  interpolate?: boolean;
}

/**
 * Snapped point result
 */
export interface SnappedPoint {
  location: LatLng;
  originalIndex?: number;
  placeId?: string;
}

/**
 * Snap to Roads result
 */
export interface SnapToRoadsResult {
  snappedPoints: SnappedPoint[];
  status: string;
  errorMessage?: string;
}