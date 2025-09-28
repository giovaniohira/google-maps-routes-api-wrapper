/**
 * Token bucket rate limiter configuration
 */
export interface RateLimiterConfig {
  /** Maximum number of tokens in the bucket */
  capacity: number;
  /** Number of tokens to add per interval */
  refillRate: number;
  /** Interval in milliseconds for token refill */
  refillIntervalMs: number;
  /** Whether to allow burst requests up to capacity */
  allowBurst?: boolean;
}

/**
 * Default rate limiter configuration
 */
export const DEFAULT_RATE_LIMITER_CONFIG: RateLimiterConfig = {
  capacity: 10, // 10 requests
  refillRate: 1, // 1 token per interval
  refillIntervalMs: 1000, // 1 second
  allowBurst: true
};

/**
 * Token bucket rate limiter implementation
 */
export class RateLimiter {
  private config: RateLimiterConfig;
  private tokens: number;
  private lastRefill: number;
  private refillTimer?: NodeJS.Timeout;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    this.config = { ...DEFAULT_RATE_LIMITER_CONFIG, ...config };
    this.tokens = this.config.capacity;
    this.lastRefill = Date.now();
    this.startRefillTimer();
  }

  /**
   * Try to acquire a token from the bucket
   * @param tokens - Number of tokens to acquire (default: 1)
   * @returns Promise<boolean> - true if tokens were acquired, false if rate limited
   */
  async acquire(tokens: number = 1): Promise<boolean> {
    this.refillTokens();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }

    return false;
  }

  /**
   * Wait for tokens to become available
   * @param tokens - Number of tokens to acquire (default: 1)
   * @param timeoutMs - Maximum time to wait in milliseconds
   * @returns Promise<boolean> - true if tokens were acquired, false if timeout
   */
  async waitForTokens(tokens: number = 1, timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      if (await this.acquire(tokens)) {
        return true;
      }
      
      // Wait a bit before checking again
      await this.delay(100);
    }
    
    return false;
  }

  /**
   * Get current token count
   */
  getTokenCount(): number {
    this.refillTokens();
    return this.tokens;
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimiterConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<RateLimiterConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.startRefillTimer();
  }

  /**
   * Reset the rate limiter to full capacity
   */
  reset(): void {
    this.tokens = this.config.capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Destroy the rate limiter and clean up timers
   */
  destroy(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = undefined;
    }
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed >= this.config.refillIntervalMs) {
      const intervalsPassed = Math.floor(elapsed / this.config.refillIntervalMs);
      const tokensToAdd = intervalsPassed * this.config.refillRate;
      
      this.tokens = Math.min(this.config.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  /**
   * Start the automatic refill timer
   */
  private startRefillTimer(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
    }

    this.refillTimer = setInterval(() => {
      this.refillTokens();
    }, this.config.refillIntervalMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Multiple rate limiters for different operations
 */
export class MultiRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();

  /**
   * Get or create a rate limiter for a specific key
   */
  getLimiter(key: string, config?: Partial<RateLimiterConfig>): RateLimiter {
    if (!this.limiters.has(key)) {
      this.limiters.set(key, new RateLimiter(config));
    }
    const limiter = this.limiters.get(key);
    if (!limiter) {
      throw new Error(`Limiter not found for key: ${key}`);
    }
    return limiter;
  }

  /**
   * Acquire tokens from a specific limiter
   */
  async acquire(key: string, tokens: number = 1): Promise<boolean> {
    const limiter = this.getLimiter(key);
    return limiter.acquire(tokens);
  }

  /**
   * Wait for tokens from a specific limiter
   */
  async waitForTokens(key: string, tokens: number = 1, timeoutMs: number = 30000): Promise<boolean> {
    const limiter = this.getLimiter(key);
    return limiter.waitForTokens(tokens, timeoutMs);
  }

  /**
   * Get token count for a specific limiter
   */
  getTokenCount(key: string): number {
    const limiter = this.getLimiter(key);
    return limiter.getTokenCount();
  }

  /**
   * Reset all limiters
   */
  resetAll(): void {
    this.limiters.forEach(limiter => limiter.reset());
  }

  /**
   * Destroy all limiters
   */
  destroyAll(): void {
    this.limiters.forEach(limiter => limiter.destroy());
    this.limiters.clear();
  }
}
