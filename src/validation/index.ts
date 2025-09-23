import { z } from 'zod';
import { LatLng, TravelMode, GetRouteOptions } from '../types';

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
 * Schema for origin/destination (string or LatLng)
 */
export const locationSchema = z.union([
  z.string().min(1, 'Location string cannot be empty'),
  latLngSchema
]);

/**
 * Schema for GetRouteOptions
 */
export const getRouteOptionsSchema = z.object({
  origin: locationSchema,
  destination: locationSchema,
  travelMode: travelModeSchema.optional(),
  waypoints: z.array(locationSchema).optional(),
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
