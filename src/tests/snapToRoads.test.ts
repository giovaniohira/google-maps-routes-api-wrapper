import { validateSnapToRoadsOptions } from '../validation';
import { SnapToRoadsOptions, SnapToRoadsResult, LatLng } from '../types';

describe('Snap to Roads Validation', () => {

    it('should validate correct snap to roads options', () => {
        const validOptions: SnapToRoadsOptions = {
            path: [
                { lat: 40.714728, lng: -73.998672 },
                { lat: 40.758896, lng: -73.985130 }
            ],
            interpolate: true
        };

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
