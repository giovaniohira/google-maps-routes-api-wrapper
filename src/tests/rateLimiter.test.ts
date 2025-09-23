import { RateLimiter, RateLimiterConfig } from '../core/rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      capacity: 3,
      refillRate: 1,
      refillIntervalMs: 100,
      allowBurst: true
    });
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe('acquire', () => {
    it('should acquire tokens when available', async () => {
      expect(await rateLimiter.acquire(1)).toBe(true);
      expect(await rateLimiter.acquire(2)).toBe(true);
    });

    it('should not acquire tokens when insufficient', async () => {
      expect(await rateLimiter.acquire(3)).toBe(true); // Use all tokens
      expect(await rateLimiter.acquire(1)).toBe(false); // Should fail
    });

    it('should refill tokens over time', async () => {
      // Use all tokens
      expect(await rateLimiter.acquire(3)).toBe(true);
      expect(await rateLimiter.acquire(1)).toBe(false);

      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await rateLimiter.acquire(1)).toBe(true);
    });
  });

  describe('waitForTokens', () => {
    it('should wait for tokens to become available', async () => {
      // Use all tokens
      expect(await rateLimiter.acquire(3)).toBe(true);
      
      // Start waiting for tokens
      const waitPromise = rateLimiter.waitForTokens(1, 200);
      
      // Wait for refill
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(await waitPromise).toBe(true);
    });

    it('should timeout if tokens not available', async () => {
      // Use all tokens
      expect(await rateLimiter.acquire(3)).toBe(true);
      
      // Wait with short timeout
      const result = await rateLimiter.waitForTokens(1, 50);
      expect(result).toBe(false);
    });
  });

  describe('token management', () => {
    it('should track token count correctly', () => {
      expect(rateLimiter.getTokenCount()).toBe(3);
      
      rateLimiter.acquire(2);
      expect(rateLimiter.getTokenCount()).toBe(1);
    });

    it('should reset to full capacity', () => {
      rateLimiter.acquire(3);
      expect(rateLimiter.getTokenCount()).toBe(0);
      
      rateLimiter.reset();
      expect(rateLimiter.getTokenCount()).toBe(3);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultLimiter = new RateLimiter();
      const config = defaultLimiter.getConfig();
      
      expect(config.capacity).toBe(10);
      expect(config.refillRate).toBe(1);
      expect(config.refillIntervalMs).toBe(1000);
      expect(config.allowBurst).toBe(true);
      
      defaultLimiter.destroy();
    });

    it('should update configuration', () => {
      rateLimiter.updateConfig({ capacity: 5 });
      const config = rateLimiter.getConfig();
      
      expect(config.capacity).toBe(5);
    });
  });
});
