/**
 * Real-World Scenarios Examples
 * 
 * This file demonstrates practical use cases for the Google Maps Routes API wrapper
 * in real-world applications like delivery optimization, travel planning, and logistics.
 */

import { RoutesClient, FetchAdapter, InMemoryCacheAdapter, TravelMode } from '../src';
import { LatLng, Location } from '../src/types';

// Delivery optimization scenario
async function deliveryOptimizationExample() {
  console.log('🚚 Delivery Optimization Example\n');

  const client = new RoutesClient({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'your-api-key-here',
    httpAdapter: new FetchAdapter(),
    cacheAdapter: new InMemoryCacheAdapter({
      defaultTtlMs: 600000, // 10 minutes for delivery routes
      maxEntries: 500
    })
  });

  // Simulate delivery addresses
  const warehouse = '123 Main St, New York, NY';
  const deliveryAddresses = [
    '456 Oak Ave, Brooklyn, NY',
    '789 Pine St, Queens, NY',
    '321 Elm St, Manhattan, NY',
    '654 Maple Dr, Bronx, NY'
  ];

  try {
    console.log('📍 Warehouse:', warehouse);
    console.log('📍 Delivery addresses:', deliveryAddresses.length);

    // Get optimized route for all deliveries
    const optimizedRoute = await client.getRoute({
      origin: warehouse,
      destination: warehouse, // Return to warehouse
      waypoints: deliveryAddresses,
      travelMode: TravelMode.DRIVING,
      optimizeWaypoints: true,
      avoidTolls: false,
      avoidHighways: false
    });

    if (optimizedRoute.routes[0]) {
      const route = optimizedRoute.routes[0];
      console.log(`✅ Optimized route found with ${route.legs.length} stops`);
      console.log(`Total distance: ${route.legs.reduce((sum, leg) => sum + (leg.distance?.value || 0), 0) / 1000} km`);
      console.log(`Total duration: ${route.legs.reduce((sum, leg) => sum + (leg.duration?.value || 0), 0) / 60} minutes`);
      
      // Display optimized order
      console.log('\n📋 Optimized delivery order:');
      console.log('1. Start at warehouse');
      route.legs.forEach((leg, index) => {
        console.log(`${index + 2}. ${leg.endAddress}`);
      });
      console.log(`${route.legs.length + 2}. Return to warehouse\n`);
    }

  } catch (error) {
    console.error('❌ Delivery optimization error:', error.message);
  }
}

// Travel planning scenario
async function travelPlanningExample() {
  console.log('✈️ Travel Planning Example\n');

  const client = new RoutesClient({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'your-api-key-here',
    httpAdapter: new FetchAdapter(),
    cacheAdapter: new InMemoryCacheAdapter()
  });

  // Multi-modal travel planning
  const travelPlan = {
    origin: 'Times Square, New York, NY',
    destination: 'Central Park, New York, NY',
    waypoints: [
      'Brooklyn Bridge, New York, NY',
      'Statue of Liberty, New York, NY'
    ]
  };

  try {
    console.log('🗺️ Planning multi-modal travel route...');

    // Get driving route
    const drivingRoute = await client.getRoute({
      ...travelPlan,
      travelMode: TravelMode.DRIVING
    });

    // Get walking route
    const walkingRoute = await client.getRoute({
      ...travelPlan,
      travelMode: TravelMode.WALKING
    });

    // Get transit route
    const transitRoute = await client.getRoute({
      ...travelPlan,
      travelMode: TravelMode.TRANSIT
    });

    console.log('\n📊 Travel Options Comparison:');
    console.log('🚗 Driving:', {
      distance: drivingRoute.routes[0]?.legs[0]?.distance?.text,
      duration: drivingRoute.routes[0]?.legs[0]?.duration?.text
    });
    console.log('🚶 Walking:', {
      distance: walkingRoute.routes[0]?.legs[0]?.distance?.text,
      duration: walkingRoute.routes[0]?.legs[0]?.duration?.text
    });
    console.log('🚌 Transit:', {
      distance: transitRoute.routes[0]?.legs[0]?.distance?.text,
      duration: transitRoute.routes[0]?.legs[0]?.duration?.text
    });

  } catch (error) {
    console.error('❌ Travel planning error:', error.message);
  }
}

// Fleet management scenario
async function fleetManagementExample() {
  console.log('🚛 Fleet Management Example\n');

  const client = new RoutesClient({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'your-api-key-here',
    httpAdapter: new FetchAdapter(),
    cacheAdapter: new InMemoryCacheAdapter({
      defaultTtlMs: 300000, // 5 minutes
      maxEntries: 1000
    })
  });

  // Simulate fleet vehicles and their current locations
  const fleet = [
    { id: 'FLEET-001', location: 'Downtown Manhattan, NY' },
    { id: 'FLEET-002', location: 'Brooklyn Heights, NY' },
    { id: 'FLEET-003', location: 'Queens, NY' }
  ];

  const pickupRequest = 'JFK Airport, Queens, NY';

  try {
    console.log('🚛 Fleet vehicles:', fleet.length);
    console.log('📍 Pickup request:', pickupRequest);

    // Find closest vehicle using distance matrix
    const distanceMatrix = await client.getDistanceMatrix({
      origins: fleet.map(vehicle => vehicle.location),
      destinations: [pickupRequest],
      travelMode: TravelMode.DRIVING
    });

    // Analyze results and find closest vehicle
    let closestVehicle: { id: string; location: string; distance: string; duration?: string } | null = null;
    let shortestDistance = Infinity;

    distanceMatrix.rows.forEach((row, index) => {
      const element = row.elements[0];
      if (element.status === 'OK' && element.distance) {
        const distance = element.distance.value;
        if (distance < shortestDistance) {
          shortestDistance = distance;
          const vehicle = fleet[index];
          closestVehicle = {
            id: vehicle.id,
            location: vehicle.location,
            distance: element.distance.text,
            duration: element.duration?.text
          };
        }
      }
    });

    if (closestVehicle) {
      console.log(`\n✅ Closest vehicle: ${(closestVehicle as any).id}`);
      console.log(`📍 Current location: ${(closestVehicle as any).location}`);
      console.log(`📏 Distance to pickup: ${(closestVehicle as any).distance}`);
      console.log(`⏱️ Estimated time: ${(closestVehicle as any).duration}`);

      // Get detailed route for the closest vehicle
      const route = await client.getRoute({
        origin: (closestVehicle as any).location,
        destination: pickupRequest,
        travelMode: TravelMode.DRIVING
      });

      if (route.routes[0]) {
        console.log(`\n🗺️ Route details:`);
        console.log(`Total distance: ${route.routes[0].legs[0]?.distance?.text}`);
        console.log(`Total duration: ${route.routes[0].legs[0]?.duration?.text}`);
        console.log(`Route status: ${route.status}`);
      }
    }

  } catch (error) {
    console.error('❌ Fleet management error:', error.message);
  }
}

// GPS coordinate snapping scenario
async function gpsSnappingExample() {
  console.log('📡 GPS Coordinate Snapping Example\n');

  const client = new RoutesClient({
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'your-api-key-here',
    httpAdapter: new FetchAdapter()
  });

  // Simulate GPS coordinates that might be slightly off-road
  const gpsCoordinates: LatLng[] = [
    { lat: 40.758896, lng: -73.985130 }, // Times Square (approximate)
    { lat: 40.761432, lng: -73.977622 }, // Central Park (approximate)
    { lat: 40.7505, lng: -73.9934 }     // Greenwich Village (approximate)
  ];

  try {
    console.log('📍 Raw GPS coordinates:', gpsCoordinates.length);

    // Snap coordinates to roads
    const snappedResult = await client.snapToRoads({
      path: gpsCoordinates
    });

    console.log('\n✅ Snapped coordinates:');
    snappedResult.snappedPoints.forEach((point, index) => {
      console.log(`Point ${index + 1}:`);
      console.log(`  Original: (${gpsCoordinates[index].lat}, ${gpsCoordinates[index].lng})`);
      console.log(`  Snapped: (${point.location.lat}, ${point.location.lng})`);
      console.log(`  Place ID: ${point.placeId}`);
      console.log(`  Original Index: ${point.originalIndex}`);
    });

  } catch (error) {
    console.error('❌ GPS snapping error:', error.message);
  }
}

// Run all examples
if (require.main === module) {
  async function runAllExamples() {
    await deliveryOptimizationExample();
    await travelPlanningExample();
    await fleetManagementExample();
    await gpsSnappingExample();
  }

  runAllExamples().catch(console.error);
}

export { 
  deliveryOptimizationExample, 
  travelPlanningExample, 
  fleetManagementExample, 
  gpsSnappingExample 
};
