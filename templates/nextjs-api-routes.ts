/**
 * Next.js API Routes Template
 * 
 * A complete Next.js API routes template that demonstrates how to integrate
 * the Google Maps Routes API wrapper into a Next.js application.
 * 
 * Usage:
 * 1. Create a Next.js project: npx create-next-app@latest my-app
 * 2. Copy this file to pages/api/routes.ts
 * 3. Install the wrapper: npm install google-maps-routes-api-wrapper
 * 4. Set GOOGLE_MAPS_API_KEY in your .env.local file
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { RoutesClient, FetchAdapter, InMemoryCacheAdapter } from 'google-maps-routes-api-wrapper';
import { GetRouteOptions, DistanceMatrixOptions, SnapToRoadsOptions } from 'google-maps-routes-api-wrapper';

// Initialize Routes Client (singleton pattern)
let routesClient: RoutesClient | null = null;

function getRoutesClient(): RoutesClient {
  if (!routesClient) {
    routesClient = new RoutesClient({
      apiKey: process.env.GOOGLE_MAPS_API_KEY!,
      httpAdapter: new FetchAdapter(),
      cacheAdapter: new InMemoryCacheAdapter({
        defaultTtlMs: 300000, // 5 minutes
        maxEntries: 1000
      })
    });
  }
  return routesClient;
}

// API route handler
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action } = req.query;

    switch (action) {
      case 'route':
        return await handleGetRoute(req, res);
      case 'distance-matrix':
        return await handleDistanceMatrix(req, res);
      case 'snap-to-roads':
        return await handleSnapToRoads(req, res);
      case 'cache-stats':
        return await handleCacheStats(req, res);
      case 'clear-cache':
        return await handleClearCache(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }

  } catch (error) {
    console.error('API error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}

// Get route handler
async function handleGetRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const options: GetRouteOptions = req.body;
  
  if (!options.origin || !options.destination) {
    return res.status(400).json({
      error: 'Origin and destination are required'
    });
  }

  const client = getRoutesClient();
  const result = await client.getRoute(options);
  
  return res.json(result);
}

// Distance matrix handler
async function handleDistanceMatrix(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const options: DistanceMatrixOptions = req.body;
  
  if (!options.origins || !options.destinations) {
    return res.status(400).json({
      error: 'Origins and destinations are required'
    });
  }

  const client = getRoutesClient();
  const result = await client.getDistanceMatrix(options);
  
  return res.json(result);
}

// Snap to roads handler
async function handleSnapToRoads(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const options: SnapToRoadsOptions = req.body;
  
  if (!options.path || options.path.length === 0) {
    return res.status(400).json({
      error: 'Path is required and must not be empty'
    });
  }

  const client = getRoutesClient();
  const result = await client.snapToRoads(options);
  
  return res.json(result);
}

// Cache stats handler
async function handleCacheStats(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = getRoutesClient();
  const stats = await client.getCacheStats();
  
  return res.json(stats);
}

// Clear cache handler
async function handleClearCache(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const client = getRoutesClient();
  await client.clearCache();
  
  return res.json({ message: 'Cache cleared successfully' });
}

// Example usage in a React component:
/*
import { useState } from 'react';

export default function RoutePlanner() {
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(false);

  const getRoute = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/routes?action=route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: 'New York, NY',
          destination: 'Philadelphia, PA',
          travelMode: 'DRIVING'
        })
      });
      
      const result = await response.json();
      setRoute(result);
    } catch (error) {
      console.error('Error getting route:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={getRoute} disabled={loading}>
        {loading ? 'Loading...' : 'Get Route'}
      </button>
      {route && (
        <div>
          <h3>Route Found!</h3>
          <p>Distance: {route.routes[0]?.legs[0]?.distance?.text}</p>
          <p>Duration: {route.routes[0]?.legs[0]?.duration?.text}</p>
        </div>
      )}
    </div>
  );
}
*/
