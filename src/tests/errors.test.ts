import { RoutesError } from '../errors';

describe('RoutesError', () => {
  describe('constructor', () => {
    it('should create error with basic properties', () => {
      const error = new RoutesError('Test message', 'TEST_ERROR', 400);
      
      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.status).toBe(400);
      expect(error.name).toBe('RoutesError');
    });

    it('should create error with meta information', () => {
      const meta = { field: 'test', value: 123 };
      const error = new RoutesError('Test message', 'TEST_ERROR', 400, meta);
      
      expect(error.meta).toEqual(meta);
    });
  });

  describe('validation', () => {
    it('should create validation error', () => {
      const error = RoutesError.validation('Invalid input', 'fieldName');
      
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.meta?.field).toBe('fieldName');
    });

    it('should create validation error without field', () => {
      const error = RoutesError.validation('Invalid input');
      
      expect(error.message).toBe('Invalid input');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.meta).toBeUndefined();
    });
  });

  describe('fromHttpResponse', () => {
    it('should create error for 400 status', () => {
      const error = RoutesError.fromHttpResponse(400, 'Bad request', { error: 'details' });
      
      expect(error.message).toBe('Bad request');
      expect(error.code).toBe('INVALID_REQUEST');
      expect(error.status).toBe(400);
      expect(error.meta?.responseBody).toEqual({ error: 'details' });
    });

    it('should create error for 401 status', () => {
      const error = RoutesError.fromHttpResponse(401, 'Unauthorized');
      
      expect(error.message).toBe('Invalid API key or authentication failed');
      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.status).toBe(401);
    });

    it('should create error for 403 status', () => {
      const error = RoutesError.fromHttpResponse(403, 'Forbidden');
      
      expect(error.message).toBe('API key does not have permission to access this resource');
      expect(error.code).toBe('FORBIDDEN');
      expect(error.status).toBe(403);
    });

    it('should create error for 429 status', () => {
      const error = RoutesError.fromHttpResponse(429, 'Too many requests');
      
      expect(error.message).toBe('Rate limit exceeded. Please try again later');
      expect(error.code).toBe('RATE_LIMITED');
      expect(error.status).toBe(429);
    });

    it('should create error for 500 status', () => {
      const error = RoutesError.fromHttpResponse(500, 'Server error');
      
      expect(error.message).toBe('Server error');
      expect(error.code).toBe('SERVER_ERROR');
      expect(error.status).toBe(500);
    });

    it('should create error for 503 status', () => {
      const error = RoutesError.fromHttpResponse(503, 'Service unavailable');
      
      expect(error.message).toBe('Service unavailable');
      expect(error.code).toBe('SERVICE_UNAVAILABLE');
      expect(error.status).toBe(503);
    });
  });

  describe('network', () => {
    it('should create network error', () => {
      const originalError = new Error('Connection failed');
      const error = RoutesError.network('Network request failed', originalError);
      
      expect(error.message).toBe('Network request failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.status).toBe(0);
      expect(error.meta?.originalError).toBe('Connection failed');
    });

    it('should create network error without original error', () => {
      const error = RoutesError.network('Network request failed');
      
      expect(error.message).toBe('Network request failed');
      expect(error.code).toBe('NETWORK_ERROR');
      expect(error.status).toBe(0);
      expect(error.meta).toBeUndefined();
    });
  });

  describe('timeout', () => {
    it('should create timeout error', () => {
      const error = RoutesError.timeout(5000);
      
      expect(error.message).toBe('Request timed out after 5000ms');
      expect(error.code).toBe('TIMEOUT_ERROR');
      expect(error.status).toBe(408);
      expect(error.meta?.timeoutMs).toBe(5000);
    });
  });
});
