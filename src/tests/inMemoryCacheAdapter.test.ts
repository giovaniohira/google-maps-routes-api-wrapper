import { InMemoryCacheAdapter, DEFAULT_CACHE_CONFIG } from '../adapters/cache/inMemoryCacheAdapter';

describe('InMemoryCacheAdapter', () => {
  let cache: InMemoryCacheAdapter;

  beforeEach(() => {
    cache = new InMemoryCacheAdapter({
      defaultTtlMs: 1000,
      maxEntries: 5,
      enableStats: true
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('basic operations', () => {
    it('should set and get values', async () => {
      await cache.set('key1', 'value1');
      const result = await cache.get('key1');
      expect(result).toBe('value1');
    });

    it('should return null for non-existent keys', async () => {
      const result = await cache.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should delete values', async () => {
      await cache.set('key1', 'value1');
      await cache.del('key1');
      const result = await cache.get('key1');
      expect(result).toBeNull();
    });

    it('should check if keys exist', async () => {
      await cache.set('key1', 'value1');
      expect(await cache.has('key1')).toBe(true);
      expect(await cache.has('nonexistent')).toBe(false);
    });

    it('should clear all values', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      await cache.clear();
      
      expect(await cache.get('key1')).toBeNull();
      expect(await cache.get('key2')).toBeNull();
    });
  });

  describe('TTL functionality', () => {
    it('should expire values after TTL', async () => {
      await cache.set('key1', 'value1', 100);
      
      // Should be available immediately
      expect(await cache.get('key1')).toBe('value1');
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(await cache.get('key1')).toBeNull();
    });

    it('should not return expired values in has()', async () => {
      await cache.set('key1', 'value1', 100);
      
      // Should be available immediately
      expect(await cache.has('key1')).toBe(true);
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be expired
      expect(await cache.has('key1')).toBe(false);
    });
  });

  describe('max entries', () => {
    it('should evict oldest entries when max entries reached', async () => {
      // Fill cache to max capacity
      for (let i = 0; i < 5; i++) {
        await cache.set(`key${i}`, `value${i}`);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Add one more entry (should evict oldest)
      await cache.set('key5', 'value5');
      
      // Check that we have exactly 5 entries
      expect(cache.getSize()).toBe(5);
      
      // The oldest entry (key0) should be evicted
      expect(await cache.get('key0')).toBeNull();
      expect(await cache.get('key5')).toBe('value5');
    });
  });

  describe('statistics', () => {
    it('should track hit and miss counts', async () => {
      // Miss
      await cache.get('nonexistent');
      
      // Hit
      await cache.set('key1', 'value1');
      await cache.get('key1');
      
      const stats = await cache.getStats();
      expect(stats.hitCount).toBe(1);
      expect(stats.missCount).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it('should track expired entries', async () => {
      await cache.set('key1', 'value1', 100);
      
      // Wait for expiration and try to get
      await new Promise(resolve => setTimeout(resolve, 150));
      await cache.get('key1');
      
      const stats = await cache.getStats();
      expect(stats.expiredCount).toBe(1);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const defaultCache = new InMemoryCacheAdapter();
      const config = defaultCache.getConfig();
      
      expect(config.defaultTtlMs).toBe(DEFAULT_CACHE_CONFIG.defaultTtlMs);
      expect(config.maxEntries).toBe(DEFAULT_CACHE_CONFIG.maxEntries);
      expect(config.enableStats).toBe(DEFAULT_CACHE_CONFIG.enableStats);
      
      defaultCache.destroy();
    });

    it('should update configuration', () => {
      cache.updateConfig({ maxEntries: 10 });
      const config = cache.getConfig();
      
      expect(config.maxEntries).toBe(10);
    });

    it('should get cache size', async () => {
      expect(cache.getSize()).toBe(0);
      
      await cache.set('key1', 'value1');
      expect(cache.getSize()).toBe(1);
    });

    it('should get cache keys', async () => {
      await cache.set('key1', 'value1');
      await cache.set('key2', 'value2');
      
      const keys = cache.getKeys();
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
      expect(keys).toHaveLength(2);
    });
  });
});
