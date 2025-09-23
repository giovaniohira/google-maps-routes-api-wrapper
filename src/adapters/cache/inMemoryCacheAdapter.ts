import { CacheAdapter, CacheEntry, CacheStats, CacheConfig } from './cacheAdapter';

/**
 * Default cache configuration
 */
export const DEFAULT_CACHE_CONFIG: Required<CacheConfig> = {
  defaultTtlMs: 300000, // 5 minutes
  maxEntries: 1000,
  enableStats: true
};

/**
 * In-memory cache adapter implementation
 */
export class InMemoryCacheAdapter implements CacheAdapter {
  private cache: Map<string, CacheEntry> = new Map();
  private config: Required<CacheConfig>;
  private stats: {
    hitCount: number;
    missCount: number;
    expiredCount: number;
  } = {
    hitCount: 0,
    missCount: 0,
    expiredCount: 0
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupTimer();
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      if (this.config.enableStats) {
        this.stats.missCount++;
      }
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.expiredCount++;
        this.stats.missCount++;
      }
      return null;
    }

    if (this.config.enableStats) {
      this.stats.hitCount++;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T = any>(key: string, value: T, ttlMs: number = this.config.defaultTtlMs): Promise<void> {
    // Check if we need to evict entries
    if (this.config.maxEntries && this.cache.size >= this.config.maxEntries) {
      this.evictOldestEntry();
    }

    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      expiresAt: now + ttlMs,
      createdAt: now
    };

    this.cache.set(key, entry);
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.expiredCount++;
      }
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    if (this.config.enableStats) {
      this.stats = {
        hitCount: 0,
        missCount: 0,
        expiredCount: 0
      };
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const totalRequests = this.stats.hitCount + this.stats.missCount;
    const hitRate = totalRequests > 0 ? this.stats.hitCount / totalRequests : 0;

    return {
      size: this.cache.size,
      hitCount: this.stats.hitCount,
      missCount: this.stats.missCount,
      hitRate,
      expiredCount: this.stats.expiredCount
    };
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<CacheConfig> {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.startCleanupTimer();
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Get all cache keys
   */
  getKeys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Destroy the cache adapter and clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
    this.cache.clear();
  }

  /**
   * Start the cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Run cleanup every 30 seconds
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 30000);
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.expiredCount++;
      }
    });
  }

  /**
   * Evict the oldest entry when cache is full
   */
  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
