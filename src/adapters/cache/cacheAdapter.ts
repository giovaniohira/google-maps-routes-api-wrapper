/**
 * Cache entry with TTL support
 */
export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  createdAt: number;
}

/**
 * Cache adapter interface
 */
export interface CacheAdapter {
  /**
   * Get a value from cache
   * @param key - Cache key
   * @returns Promise with cached value or null if not found/expired
   */
  get<T = any>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with TTL
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlMs - Time to live in milliseconds
   * @returns Promise that resolves when value is cached
   */
  set<T = any>(key: string, value: T, ttlMs: number): Promise<void>;

  /**
   * Delete a value from cache
   * @param key - Cache key
   * @returns Promise that resolves when value is deleted
   */
  del(key: string): Promise<void>;

  /**
   * Check if a key exists in cache
   * @param key - Cache key
   * @returns Promise with boolean indicating if key exists
   */
  has(key: string): Promise<boolean>;

  /**
   * Clear all cache entries
   * @returns Promise that resolves when cache is cleared
   */
  clear(): Promise<void>;

  /**
   * Get cache statistics
   * @returns Promise with cache statistics
   */
  getStats(): Promise<CacheStats>;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  size: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  expiredCount: number;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Default TTL in milliseconds */
  defaultTtlMs?: number;
  /** Maximum number of entries */
  maxEntries?: number;
  /** Whether to enable statistics tracking */
  enableStats?: boolean;
}
