/**
 * Advanced Configuration Examples
 * 
 * This file demonstrates advanced configuration options including
 * caching, rate limiting, retry strategies, and error handling.
 */

import { 
  RoutesClient, 
  FetchAdapter, 
  InMemoryCacheAdapter,
  RetryConfig,
  RateLimiterConfig,
  CacheConfig,
  RoutesError,
  TravelMode
} from '../src';

async function advancedConfigurationExample() {
  console.log('🔧 Advanced Configuration Examples\n');

  // Advanced cache configuration
  const cacheConfig: CacheConfig = {
    defaultTtlMs: 300000, // 5 minutes
    maxEntries: 1000
  };

  // Advanced retry configuration
  const retryConfig: RetryConfig = {
    maxRetries: 5,
    baseMs: 1000,
    factor: 2,
    maxDelayMs: 30000
  };

  // Advanced rate limiter configuration
  const rateLimiterConfig: RateLimiterConfig = {
    capacity: 20,
    refillRate: 2,
    refillIntervalMs: 1000,
    allowBurst: true
  };

  // Initialize client with advanced configuration
  const client = new RoutesClient({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'your-api-key-here',
    httpAdapter: new FetchAdapter(),
    cacheAdapter: new InMemoryCacheAdapter(cacheConfig),
    retryConfig,
    rateLimiterConfig,
    timeoutMs: 45000 // 45 seconds
  });

  try {
    console.log('📍 Testing Advanced Features');

    // Test caching with repeated requests
    console.log('🔄 Testing Cache Performance...');
    const startTime = Date.now();
    
    // First request (cache miss)
    await client.getRoute({
      origin: 'San Francisco, CA',
      destination: 'Los Angeles, CA',
      travelMode: TravelMode.DRIVING
    });
    
    const firstRequestTime = Date.now() - startTime;
    console.log(`First request (cache miss): ${firstRequestTime}ms`);

    // Second request (cache hit)
    const cacheStartTime = Date.now();
    await client.getRoute({
      origin: 'San Francisco, CA',
      destination: 'Los Angeles, CA',
      travelMode: TravelMode.DRIVING
    });
    
    const cacheRequestTime = Date.now() - cacheStartTime;
    console.log(`Second request (cache hit): ${cacheRequestTime}ms`);
    console.log(`Cache performance improvement: ${Math.round((firstRequestTime - cacheRequestTime) / firstRequestTime * 100)}%\n`);

    // Test rate limiting
    console.log('⏱️ Testing Rate Limiting...');
    const rateLimitStartTime = Date.now();
    
    const promises = Array(5).fill(null).map(async (_, i) => {
      return client.getRoute({
        origin: `City ${i}, State`,
        destination: `Destination ${i}, State`,
        travelMode: TravelMode.DRIVING
      });
    });

    await Promise.all(promises);
    const rateLimitTime = Date.now() - rateLimitStartTime;
    console.log(`5 concurrent requests completed in: ${rateLimitTime}ms\n`);

    // Test error handling
    console.log('🚨 Testing Error Handling...');
    try {
      await client.getRoute({
        origin: 'Invalid Location That Does Not Exist',
        destination: 'Another Invalid Location',
        travelMode: TravelMode.DRIVING
      });
    } catch (error) {
      if (error instanceof RoutesError) {
        console.log(`Caught RoutesError: ${error.message}`);
        console.log(`Error code: ${error.code}`);
        console.log(`Error status: ${error.status}\n`);
      }
    }

    // Test cache statistics
    console.log('📊 Cache Statistics:');
    const cacheStats = await client.getCacheStats();
    console.log(`Cache hits: ${cacheStats.hits}`);
    console.log(`Cache misses: ${cacheStats.misses}`);
    console.log(`Cache size: ${cacheStats.size}`);
    console.log(`Hit rate: ${Math.round(cacheStats.hitRate * 100)}%\n`);

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

async function errorHandlingExample() {
  console.log('🚨 Error Handling Examples\n');

  const client = new RoutesClient({
    apiKey: 'invalid-api-key',
    httpAdapter: new FetchAdapter()
  });

  try {
    await client.getRoute({
      origin: 'New York, NY',
      destination: 'Philadelphia, PA'
    });
  } catch (error) {
    if (error instanceof RoutesError) {
      console.log('Error Type:', error.constructor.name);
      console.log('Error Message:', error.message);
      console.log('Error Code:', error.code);
      console.log('HTTP Status:', error.status);
      console.log('Metadata:', error.meta);
    }
  }
}

// Run the examples
if (require.main === module) {
  advancedConfigurationExample()
    .then(() => errorHandlingExample())
    .catch(console.error);
}

export { advancedConfigurationExample, errorHandlingExample };
