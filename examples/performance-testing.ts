/**
 * Performance Testing Examples
 * 
 * This file demonstrates performance testing and benchmarking
 * for the Google Maps Routes API wrapper.
 */

import { RoutesClient, FetchAdapter, InMemoryCacheAdapter, TravelMode } from '../src';

interface PerformanceMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  cacheHitRate: number;
  totalTime: number;
}

class PerformanceTester {
  private client: RoutesClient;
  private metrics: PerformanceMetrics;

  constructor(apiKey: string) {
    this.client = new RoutesClient({
      apiKey,
      httpAdapter: new FetchAdapter(),
      cacheAdapter: new InMemoryCacheAdapter({
        defaultTtlMs: 300000, // 5 minutes
        maxEntries: 1000
      })
    });

    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      cacheHitRate: 0,
      totalTime: 0
    };
  }

  async runSingleRequestTest(): Promise<void> {
    console.log('🧪 Single Request Performance Test\n');

    const testRoute = {
      origin: 'New York, NY',
      destination: 'Philadelphia, PA',
      travelMode: TravelMode.DRIVING as const
    };

    const startTime = Date.now();
    
    try {
      const result = await this.client.getRoute(testRoute);
      const endTime = Date.now();
      const responseTime = endTime - startTime;

      this.metrics.totalRequests++;
      this.metrics.successfulRequests++;
      this.metrics.totalTime = responseTime;
      this.metrics.averageResponseTime = responseTime;
      this.metrics.minResponseTime = responseTime;
      this.metrics.maxResponseTime = responseTime;

      console.log('✅ Single request completed');
      console.log(`Response time: ${responseTime}ms`);
      console.log(`Route found: ${result.routes.length > 0 ? 'Yes' : 'No'}`);
      console.log(`Distance: ${result.routes[0]?.legs[0]?.distance?.text || 'N/A'}`);
      console.log(`Duration: ${result.routes[0]?.legs[0]?.duration?.text || 'N/A'}\n`);

    } catch (error) {
      this.metrics.failedRequests++;
      console.error('❌ Single request failed:', error.message);
    }
  }

  async runConcurrentRequestsTest(concurrency: number = 5): Promise<void> {
    console.log(`🧪 Concurrent Requests Test (${concurrency} requests)\n`);

    const testRoutes = Array(concurrency).fill(null).map((_, i) => ({
      origin: `City ${i}, State`,
      destination: `Destination ${i}, State`,
      travelMode: TravelMode.DRIVING as const
    }));

    const startTime = Date.now();
    const promises = testRoutes.map(async (route, index) => {
      const requestStartTime = Date.now();
      
      try {
        const result = await this.client.getRoute(route);
        const requestEndTime = Date.now();
        const responseTime = requestEndTime - requestStartTime;

        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;
        this.updateResponseTimeMetrics(responseTime);

        console.log(`✅ Request ${index + 1} completed in ${responseTime}ms`);
        return { success: true, responseTime, result };

      } catch (error) {
        this.metrics.totalRequests++;
        this.metrics.failedRequests++;
        console.error(`❌ Request ${index + 1} failed:`, error.message);
        return { success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    this.metrics.totalTime = totalTime;
    this.metrics.averageResponseTime = this.metrics.totalRequests > 0 
      ? this.metrics.totalTime / this.metrics.totalRequests 
      : 0;

    console.log(`\n📊 Concurrent Test Results:`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`Successful requests: ${this.metrics.successfulRequests}`);
    console.log(`Failed requests: ${this.metrics.failedRequests}`);
    console.log(`Average response time: ${Math.round(this.metrics.averageResponseTime)}ms\n`);
  }

  async runCachePerformanceTest(): Promise<void> {
    console.log('🧪 Cache Performance Test\n');

    const testRoute = {
      origin: 'San Francisco, CA',
      destination: 'Los Angeles, CA',
      travelMode: TravelMode.DRIVING as const
    };

    // First request (cache miss)
    console.log('🔄 First request (cache miss)...');
    const firstStartTime = Date.now();
    
    try {
      await this.client.getRoute(testRoute);
      const firstEndTime = Date.now();
      const firstResponseTime = firstEndTime - firstStartTime;
      
      console.log(`Cache miss response time: ${firstResponseTime}ms`);

      // Second request (cache hit)
      console.log('🔄 Second request (cache hit)...');
      const secondStartTime = Date.now();
      
      await this.client.getRoute(testRoute);
      const secondEndTime = Date.now();
      const secondResponseTime = secondEndTime - secondStartTime;
      
      console.log(`Cache hit response time: ${secondResponseTime}ms`);
      console.log(`Cache performance improvement: ${Math.round((firstResponseTime - secondResponseTime) / firstResponseTime * 100)}%\n`);

    } catch (error) {
      console.error('❌ Cache performance test failed:', error.message);
    }
  }

  async runLoadTest(iterations: number = 10): Promise<void> {
    console.log(`🧪 Load Test (${iterations} iterations)\n`);

    const testRoutes = [
      { origin: 'New York, NY', destination: 'Philadelphia, PA', travelMode: TravelMode.DRIVING as const },
      { origin: 'Los Angeles, CA', destination: 'San Diego, CA', travelMode: TravelMode.DRIVING as const },
      { origin: 'Chicago, IL', destination: 'Milwaukee, WI', travelMode: TravelMode.DRIVING as const },
      { origin: 'Miami, FL', destination: 'Orlando, FL', travelMode: TravelMode.DRIVING as const },
      { origin: 'Seattle, WA', destination: 'Portland, OR', travelMode: TravelMode.DRIVING as const }
    ];

    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      const route = testRoutes[i % testRoutes.length];
      const requestStartTime = Date.now();

      try {
        await this.client.getRoute(route);
        const requestEndTime = Date.now();
        const responseTime = requestEndTime - requestStartTime;

        this.metrics.totalRequests++;
        this.metrics.successfulRequests++;
        this.updateResponseTimeMetrics(responseTime);

        console.log(`✅ Iteration ${i + 1}/${iterations} completed in ${responseTime}ms`);

      } catch (error) {
        this.metrics.totalRequests++;
        this.metrics.failedRequests++;
        console.error(`❌ Iteration ${i + 1}/${iterations} failed:`, error.message);
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const endTime = Date.now();
    this.metrics.totalTime = endTime - startTime;
    this.metrics.averageResponseTime = this.metrics.totalRequests > 0 
      ? this.metrics.totalTime / this.metrics.totalRequests 
      : 0;

    console.log(`\n📊 Load Test Results:`);
    console.log(`Total iterations: ${iterations}`);
    console.log(`Total time: ${this.metrics.totalTime}ms`);
    console.log(`Successful requests: ${this.metrics.successfulRequests}`);
    console.log(`Failed requests: ${this.metrics.failedRequests}`);
    console.log(`Average response time: ${Math.round(this.metrics.averageResponseTime)}ms`);
    console.log(`Min response time: ${this.metrics.minResponseTime}ms`);
    console.log(`Max response time: ${this.metrics.maxResponseTime}ms`);
    console.log(`Requests per second: ${Math.round(this.metrics.totalRequests / (this.metrics.totalTime / 1000))}\n`);
  }

  private updateResponseTimeMetrics(responseTime: number): void {
    this.metrics.minResponseTime = Math.min(this.metrics.minResponseTime, responseTime);
    this.metrics.maxResponseTime = Math.max(this.metrics.maxResponseTime, responseTime);
  }

  async getCacheStats(): Promise<void> {
    try {
      const stats = await this.client.getCacheStats();
      console.log('📊 Cache Statistics:');
      console.log(`Cache hits: ${stats.hits}`);
      console.log(`Cache misses: ${stats.misses}`);
      console.log(`Cache size: ${stats.size}`);
      console.log(`Hit rate: ${Math.round(stats.hitRate * 100)}%\n`);
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error.message);
    }
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
}

// Main performance testing function
async function runPerformanceTests(): Promise<void> {
  console.log('🚀 Performance Testing Suite\n');

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || 'your-api-key-here';
  const tester = new PerformanceTester(apiKey);

  try {
    // Run individual tests
    await tester.runSingleRequestTest();
    await tester.runConcurrentRequestsTest(3);
    await tester.runCachePerformanceTest();
    await tester.runLoadTest(5);
    
    // Get final cache statistics
    await tester.getCacheStats();

    // Display final metrics
    const metrics = tester.getMetrics();
    console.log('📈 Final Performance Metrics:');
    console.log(`Total requests: ${metrics.totalRequests}`);
    console.log(`Success rate: ${Math.round((metrics.successfulRequests / metrics.totalRequests) * 100)}%`);
    console.log(`Average response time: ${Math.round(metrics.averageResponseTime)}ms`);
    console.log(`Min response time: ${metrics.minResponseTime}ms`);
    console.log(`Max response time: ${metrics.maxResponseTime}ms`);

  } catch (error) {
    console.error('❌ Performance testing failed:', error.message);
  }
}

// Run performance tests
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

export { PerformanceTester, runPerformanceTests };
