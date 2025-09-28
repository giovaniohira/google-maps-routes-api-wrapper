import { z } from 'zod';
import { LatLng, TravelMode, GetRouteOptions, DistanceMatrixOptions, SnapToRoadsOptions } from '../types';

/**
 * Schema for LatLng coordinates
 */
export const latLngSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
});

/**
 * Schema for travel mode
 */
export const travelModeSchema = z.nativeEnum(TravelMode);

/**
 * Schema for location (string, LatLng, or [lat, lng] array)
 */
export const locationSchema = z.union([
  z.string().min(1, 'Location string cannot be empty'),
  latLngSchema,
  z.tuple([z.number().min(-90).max(90), z.number().min(-180).max(180)])
    .refine(([lat, lng]) => {
      return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    }, 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180')
]);

/**
 * Schema for waypoint (string, LatLng, or [lat, lng] array)
 */
export const waypointSchema = locationSchema;

/**
 * Schema for GetRouteOptions
 */
export const getRouteOptionsSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  travelMode: travelModeSchema.optional(),
  waypoints: z.array(waypointSchema).optional(),
  avoidHighways: z.boolean().optional(),
  avoidTolls: z.boolean().optional(),
  avoidFerries: z.boolean().optional(),
  optimizeWaypoints: z.boolean().optional()
});

/**
 * Validate and parse GetRouteOptions
 */
export function validateGetRouteOptions(options: unknown): GetRouteOptions {
  try {
    return getRouteOptionsSchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new Error(`Validation error: ${firstError.path.join('.')} - ${firstError.message}`);
    }
    throw error;
  }
}

/**
 * Validate LatLng coordinates
 */
export function validateLatLng(coords: unknown): LatLng {
  try {
    return latLngSchema.parse(coords);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new Error(`Invalid coordinates: ${firstError.path.join('.')} - ${firstError.message}`);
    }
    throw error;
  }
}

/**
 * Validate travel mode
 */
export function validateTravelMode(mode: unknown): TravelMode {
  try {
    return travelModeSchema.parse(mode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid travel mode: ${mode}. Must be one of: ${Object.values(TravelMode).join(', ')}`);
    }
    throw error;
  }
}

/**
 * Schema for DistanceMatrixOptions
 */
export const distanceMatrixOptionsSchema = z.object({
  origins: z.array(locationSchema).min(1, 'At least one origin is required').max(25, 'Maximum 25 origins allowed'),
  destinations: z.array(locationSchema).min(1, 'At least one destination is required').max(25, 'Maximum 25 destinations allowed'),
  travelMode: travelModeSchema.optional(),
  avoidHighways: z.boolean().optional(),
  avoidTolls: z.boolean().optional(),
  avoidFerries: z.boolean().optional(),
  units: z.enum(['metric', 'imperial']).optional(),
  departureTime: z.union([z.date(), z.number()]).optional(),
  arrivalTime: z.union([z.date(), z.number()]).optional(),
  trafficModel: z.enum(['best_guess', 'pessimistic', 'optimistic']).optional(),
  transitMode: z.enum(['bus', 'subway', 'train', 'tram', 'rail']).optional(),
  transitRoutingPreference: z.enum(['less_walking', 'fewer_transfers']).optional()
});

/**
 * Schema for SnapToRoadsOptions
 */
export const snapToRoadsOptionsSchema = z.object({
  path: z.array(latLngSchema).min(2, 'At least 2 points required for path').max(100, 'Maximum 100 points allowed'),
  interpolate: z.boolean().optional()
});

/**
 * Validate DistanceMatrixOptions
 */
export function validateDistanceMatrixOptions(options: unknown): DistanceMatrixOptions {
  try {
    return distanceMatrixOptionsSchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new Error(`Validation error: ${firstError.path.join('.')} - ${firstError.message}`);
    }
    throw error;
  }
}

/**
 * Validate SnapToRoadsOptions
 */
export function validateSnapToRoadsOptions(options: unknown): SnapToRoadsOptions {
  try {
    return snapToRoadsOptionsSchema.parse(options);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new Error(`Validation error: ${firstError.path.join('.')} - ${firstError.message}`);
    }
    throw error;
  }
}
