import { 
    validateDistanceMatrixOptions, 
    validateSnapToRoadsOptions,
    distanceMatrixOptionsSchema,
    snapToRoadsOptionsSchema
} from '../validation';
import { DistanceMatrixOptions, SnapToRoadsOptions, LatLng } from '../types';

describe('Validation - Distance Matrix and Snap to Roads', () => {
    describe('validateDistanceMatrixOptions', () => {
        const validOptions: DistanceMatrixOptions = {
            origins: ['New York, NY', 'Boston, MA'],
            destinations: ['Philadelphia, PA', 'Washington, DC'],
            travelMode: 'DRIVING' as any,
            units: 'metric'
        };

        it('should validate correct distance matrix options', () => {
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

    describe('validateSnapToRoadsOptions', () => {
        const validOptions: SnapToRoadsOptions = {
            path: [
                { lat: 40.714728, lng: -73.998672 },
                { lat: 40.758896, lng: -73.985130 }
            ],
            interpolate: true
        };

        it('should validate correct snap to roads options', () => {
            expect(() => validateSnapToRoadsOptions(validOptions)).not.toThrow();
        });

        it('should validate options without interpolate', () => {
            const optionsWithoutInterpolate: SnapToRoadsOptions = {
                path: [
                    { lat: 40.714728, lng: -73.998672 },
                    { lat: 40.758896, lng: -73.985130 }
                ]
            };

            expect(() => validateSnapToRoadsOptions(optionsWithoutInterpolate)).not.toThrow();
        });

        it('should validate options with many points', () => {
            const manyPoints = Array.from({ length: 50 }, (_, i) => ({
                lat: 40.714728 + i * 0.001,
                lng: -73.998672 + i * 0.001
            }));

            const optionsWithManyPoints: SnapToRoadsOptions = {
                path: manyPoints,
                interpolate: true
            };

            expect(() => validateSnapToRoadsOptions(optionsWithManyPoints)).not.toThrow();
        });

        it('should reject path with too few points', () => {
            const invalidOptions = {
                path: [{ lat: 40.714728, lng: -73.998672 }] // Only one point
            };

            expect(() => validateSnapToRoadsOptions(invalidOptions)).toThrow();
        });

        it('should reject path with too many points', () => {
            const tooManyPoints = Array.from({ length: 101 }, (_, i) => ({
                lat: 40.714728 + i * 0.001,
                lng: -73.998672 + i * 0.001
            }));

            const invalidOptions = {
                path: tooManyPoints
            };

            expect(() => validateSnapToRoadsOptions(invalidOptions)).toThrow();
        });

        it('should reject invalid coordinates', () => {
            const invalidOptions = {
                path: [
                    { lat: 91, lng: -73.998672 }, // Invalid latitude
                    { lat: 40.758896, lng: -73.985130 }
                ]
            };

            expect(() => validateSnapToRoadsOptions(invalidOptions)).toThrow();
        });

        it('should reject invalid longitude', () => {
            const invalidOptions = {
                path: [
                    { lat: 40.714728, lng: 181 }, // Invalid longitude
                    { lat: 40.758896, lng: -73.985130 }
                ]
            };

            expect(() => validateSnapToRoadsOptions(invalidOptions)).toThrow();
        });

        it('should reject non-array path', () => {
            const invalidOptions = {
                path: 'not an array' as any
            };

            expect(() => validateSnapToRoadsOptions(invalidOptions)).toThrow();
        });

        it('should reject invalid interpolate type', () => {
            const invalidOptions = {
                path: [
                    { lat: 40.714728, lng: -73.998672 },
                    { lat: 40.758896, lng: -73.985130 }
                ],
                interpolate: 'not a boolean' as any
            };

            expect(() => validateSnapToRoadsOptions(invalidOptions)).toThrow();
        });
    });

    describe('Schema validation', () => {
        it('should validate distance matrix schema with valid data', () => {
            const validData = {
                origins: ['New York, NY'],
                destinations: ['Philadelphia, PA'],
                travelMode: 'DRIVING',
                units: 'metric'
            };

            expect(() => distanceMatrixOptionsSchema.parse(validData)).not.toThrow();
        });

        it('should validate snap to roads schema with valid data', () => {
            const validData = {
                path: [
                    { lat: 40.714728, lng: -73.998672 },
                    { lat: 40.758896, lng: -73.985130 }
                ],
                interpolate: true
            };

            expect(() => snapToRoadsOptionsSchema.parse(validData)).not.toThrow();
        });
    });
});