import { RetryStrategy, RetryConfig } from '../core/retryStrategy';

describe('RetryStrategy', () => {
  let retryStrategy: RetryStrategy;

  beforeEach(() => {
    retryStrategy = new RetryStrategy({
      baseMs: 100,
      factor: 2,
      maxRetries: 3,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      retryOnNetworkError: true
    });
  });

  describe('execute', () => {
    it('should execute function successfully on first try', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      
      const result = await retryStrategy.execute(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('status: 500'))
        .mockRejectedValueOnce(new Error('status: 502'))
        .mockResolvedValue('success');
      
      const result = await retryStrategy.execute(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-retryable errors', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('status: 400'));
      
      await expect(retryStrategy.execute(fn)).rejects.toThrow('status: 400');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on network errors', async () => {
      const fn = jest.fn()
        .mockRejectedValueOnce(new Error('network timeout'))
        .mockResolvedValue('success');
      
      const result = await retryStrategy.execute(fn);
      
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('status: 500'));
      
      await expect(retryStrategy.execute(fn)).rejects.toThrow('status: 500');
      expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });

    it('should use exponential backoff', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('status: 500'));
      const startTime = Date.now();
      
      await expect(retryStrategy.execute(fn)).rejects.toThrow();
      
      const elapsed = Date.now() - startTime;
      // Should take at least 100 + 200 + 400 = 700ms (with jitter)
      expect(elapsed).toBeGreaterThanOrEqual(600);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultRetry = new RetryStrategy();
      const config = defaultRetry.getConfig();
      
      expect(config.baseMs).toBe(1000);
      expect(config.factor).toBe(2);
      expect(config.maxRetries).toBe(3);
    });

    it('should update configuration', () => {
      retryStrategy.updateConfig({ maxRetries: 5 });
      const config = retryStrategy.getConfig();
      
      expect(config.maxRetries).toBe(5);
    });
  });
});
