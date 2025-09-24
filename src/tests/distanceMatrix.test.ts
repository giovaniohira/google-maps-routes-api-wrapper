import { validateDistanceMatrixOptions } from '../validation';
import { DistanceMatrixOptions, DistanceMatrixResult, LatLng } from '../types';

describe('Distance Matrix Validation', () => {

    it('should validate correct distance matrix options', () => {
        const validOptions: DistanceMatrixOptions = {
            origins: ['New York, NY', 'Boston, MA'],
            destinations: ['Philadelphia, PA', 'Washington, DC'],
            travelMode: 'DRIVING' as any,
            units: 'metric'
        };

        expect(() => validateDistanceMatrixOptions(validOptions)).not.toThrow();
    });

    it('should validate options with LatLng coordinates', () => {
        const optionsWithCoords: DistanceMatrixOptions = {
            origins: [{ lat: 40.7128, lng: -74.0060 }],
            destinations: [{ lat: 39.9526, lng: -75.1652 }]
        };

        expect(() => validateDistanceMatrixOptions(optionsWithCoords)).not.toThrow();
    });

    it('should validate options with all optional parameters', () => {
        const optionsWithAllParams: DistanceMatrixOptions = {
            origins: ['New York, NY'],
            destinations: ['Philadelphia, PA'],
            travelMode: 'TRANSIT' as any,
            avoidHighways: true,
            avoidTolls: true,
            avoidFerries: true,
            units: 'imperial',
            departureTime: new Date('2024-01-01T10:00:00Z'),
            arrivalTime: 1704110400,
            trafficModel: 'best_guess',
            transitMode: 'bus',
            transitRoutingPreference: 'less_walking'
        };

        expect(() => validateDistanceMatrixOptions(optionsWithAllParams)).not.toThrow();
    });

    it('should reject empty origins', () => {
        const invalidOptions = {
            origins: [],
            destinations: ['Philadelphia, PA']
        };

        expect(() => validateDistanceMatrixOptions(invalidOptions)).toThrow();
    });

    it('should reject empty destinations', () => {
        const invalidOptions = {
            origins: ['New York, NY'],
            destinations: []
        };

        expect(() => validateDistanceMatrixOptions(invalidOptions)).toThrow();
    });

    it('should reject too many origins', () => {
        const tooManyOrigins = Array.from({ length: 26 }, (_, i) => `Origin ${i}`);
        const invalidOptions = {
            origins: tooManyOrigins,
            destinations: ['Philadelphia, PA']
        };

        expect(() => validateDistanceMatrixOptions(invalidOptions)).toThrow();
    });

    it('should reject too many destinations', () => {
        const tooManyDestinations = Array.from({ length: 26 }, (_, i) => `Destination ${i}`);
        const invalidOptions = {
            origins: ['New York, NY'],
            destinations: tooManyDestinations
        };

        expect(() => validateDistanceMatrixOptions(invalidOptions)).toThrow();
    });

    it('should reject invalid units', () => {
        const invalidOptions = {
            origins: ['New York, NY'],
            destinations: ['Philadelphia, PA'],
            units: 'invalid' as any
        };

        expect(() => validateDistanceMatrixOptions(invalidOptions)).toThrow();
    });

    it('should reject invalid traffic model', () => {
        const invalidOptions = {
            origins: ['New York, NY'],
            destinations: ['Philadelphia, PA'],
            trafficModel: 'invalid' as any
        };

        expect(() => validateDistanceMatrixOptions(invalidOptions)).toThrow();
    });

    it('should reject invalid transit mode', () => {
        const invalidOptions = {
            origins: ['New York, NY'],
            destinations: ['Philadelphia, PA'],
            transitMode: 'invalid' as any
        };

        expect(() => validateDistanceMatrixOptions(invalidOptions)).toThrow();
    });

    it('should reject invalid transit routing preference', () => {
        const invalidOptions = {
            origins: ['New York, NY'],
            destinations: ['Philadelphia, PA'],
            transitRoutingPreference: 'invalid' as any
        };

        expect(() => validateDistanceMatrixOptions(invalidOptions)).toThrow();
    });
});
