/**
 * Basic Usage Examples for Google Maps Routes API Wrapper
 * 
 * This file demonstrates the most common usage patterns for the wrapper.
 * Run with: npx ts-node examples/basic-usage.ts
 */

import { RoutesClient, FetchAdapter, InMemoryCacheAdapter, TravelMode } from '../src';

async function basicUsageExample() {
  console.log('🚀 Basic Usage Examples\n');

  // Initialize the client with basic configuration
  const client = new RoutesClient({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'your-api-key-here',
    httpAdapter: new FetchAdapter(),
    cacheAdapter: new InMemoryCacheAdapter()
  });

  try {
    // Example 1: Simple route between two cities
    const route = await client.getRoute({
      origin: 'New York, NY',
      destination: 'Philadelphia, PA',
      travelMode: TravelMode.DRIVING
    });

    console.log(`Route found: ${route.routes[0]?.legs[0]?.distance?.text}`);
    console.log(`Duration: ${route.routes[0]?.legs[0]?.duration?.text}\n`);

    // Example 2: Route with waypoints
    const routeWithWaypoints = await client.getRoute({
      origin: 'New York, NY',
      destination: 'Washington, DC',
      waypoints: ['Philadelphia, PA', 'Baltimore, MD'],
      travelMode: TravelMode.DRIVING,
      optimizeWaypoints: true
    });

    console.log(`Multi-stop route: ${routeWithWaypoints.routes[0]?.legs.length} legs\n`);

    // Example 3: Distance Matrix
    const distances = await client.getDistanceMatrix({
      origins: ['New York, NY', 'Boston, MA'],
      destinations: ['Philadelphia, PA', 'Washington, DC']
    });

    console.log('Distance Matrix Results:');
    distances.rows.forEach((row, i) => {
      row.elements.forEach((element, j) => {
        if (element.status === 'OK' && element.distance) {
          console.log(`${distances.originAddresses[i]} → ${distances.destinationAddresses[j]}: ${element.distance.text}`);
        }
      });
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the example
if (require.main === module) {
  basicUsageExample();
}

export { basicUsageExample };
