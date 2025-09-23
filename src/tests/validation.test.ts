import { validateGetRouteOptions, validateLatLng, validateTravelMode } from '../validation';
import { TravelMode } from '../types';

describe('Validation', () => {
  describe('validateGetRouteOptions', () => {
    it('should validate valid options with string locations', () => {
      const options = {
        origin: 'New York, NY',
        destination: 'Los Angeles, CA',
        travelMode: TravelMode.DRIVING
      };

      const result = validateGetRouteOptions(options);
      expect(result).toEqual(options);
    });

    it('should validate valid options with LatLng locations', () => {
      const options = {
        origin: { lat: 40.7128, lng: -74.0060 },
        destination: { lat: 34.0522, lng: -118.2437 },
        travelMode: TravelMode.DRIVING
      };

      const result = validateGetRouteOptions(options);
      expect(result).toEqual(options);
    });

    it('should validate options with waypoints', () => {
      const options = {
        origin: 'New York, NY',
        destination: 'Los Angeles, CA',
        waypoints: ['Chicago, IL', 'Denver, CO'],
        optimizeWaypoints: true
      };

      const result = validateGetRouteOptions(options);
      expect(result).toEqual(options);
    });

    it('should throw error for missing origin', () => {
      const options = {
        destination: 'Los Angeles, CA'
      };

      expect(() => validateGetRouteOptions(options)).toThrow('Validation error: origin - Invalid input');
    });

    it('should throw error for missing destination', () => {
      const options = {
        origin: 'New York, NY'
      };

      expect(() => validateGetRouteOptions(options)).toThrow('Validation error: destination - Invalid input');
    });

    it('should throw error for empty origin string', () => {
      const options = {
        origin: '',
        destination: 'Los Angeles, CA'
      };

      expect(() => validateGetRouteOptions(options)).toThrow('Location string cannot be empty');
    });

    it('should throw error for invalid LatLng coordinates', () => {
      const options = {
        origin: { lat: 200, lng: -74.0060 }, // Invalid lat
        destination: 'Los Angeles, CA'
      };

      expect(() => validateGetRouteOptions(options)).toThrow('Validation error: origin.lat - Too big: expected number to be <=90');
    });
  });

  describe('validateLatLng', () => {
    it('should validate valid coordinates', () => {
      const coords = { lat: 40.7128, lng: -74.0060 };
      const result = validateLatLng(coords);
      expect(result).toEqual(coords);
    });

    it('should throw error for invalid latitude', () => {
      const coords = { lat: 200, lng: -74.0060 };
      expect(() => validateLatLng(coords)).toThrow('Invalid coordinates');
    });

    it('should throw error for invalid longitude', () => {
      const coords = { lat: 40.7128, lng: 200 };
      expect(() => validateLatLng(coords)).toThrow('Invalid coordinates');
    });
  });

  describe('validateTravelMode', () => {
    it('should validate valid travel modes', () => {
      expect(validateTravelMode(TravelMode.DRIVING)).toBe(TravelMode.DRIVING);
      expect(validateTravelMode(TravelMode.WALKING)).toBe(TravelMode.WALKING);
      expect(validateTravelMode(TravelMode.BICYCLING)).toBe(TravelMode.BICYCLING);
      expect(validateTravelMode(TravelMode.TRANSIT)).toBe(TravelMode.TRANSIT);
    });

    it('should throw error for invalid travel mode', () => {
      expect(() => validateTravelMode('INVALID')).toThrow('Invalid travel mode');
    });
  });
});
