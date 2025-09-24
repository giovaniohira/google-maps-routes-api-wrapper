/**
 * Express.js Server Template
 * 
 * A complete Express.js server template that demonstrates how to integrate
 * the Google Maps Routes API wrapper into a web application.
 * 
 * Usage:
 * 1. Install dependencies: npm install express cors dotenv
 * 2. Set GOOGLE_MAPS_API_KEY in your .env file
 * 3. Run: npx ts-node templates/express-server.ts
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { RoutesClient, FetchAdapter, InMemoryCacheAdapter } from '../src';
import { GetRouteOptions, DistanceMatrixOptions, SnapToRoadsOptions } from '../src/types';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Routes Client
const routesClient = new RoutesClient({
  apiKey: process.env.GOOGLE_MAPS_API_KEY!,
  httpAdapter: new FetchAdapter(),
  cacheAdapter: new InMemoryCacheAdapter({
    defaultTtlMs: 300000, // 5 minutes
    maxEntries: 1000
  })
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Google Maps Routes API Wrapper'
  });
});

// Get route endpoint
app.post('/api/routes', async (req, res) => {
  try {
    const options: GetRouteOptions = req.body;
    
    // Validate required fields
    if (!options.origin || !options.destination) {
      return res.status(400).json({
        error: 'Origin and destination are required'
      });
    }

    const result = await routesClient.getRoute(options);
    res.json(result);

  } catch (error) {
    console.error('Route API error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Distance matrix endpoint
app.post('/api/distance-matrix', async (req, res) => {
  try {
    const options: DistanceMatrixOptions = req.body;
    
    // Validate required fields
    if (!options.origins || !options.destinations) {
      return res.status(400).json({
        error: 'Origins and destinations are required'
      });
    }

    const result = await routesClient.getDistanceMatrix(options);
    res.json(result);

  } catch (error) {
    console.error('Distance Matrix API error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Snap to roads endpoint
app.post('/api/snap-to-roads', async (req, res) => {
  try {
    const options: SnapToRoadsOptions = req.body;
    
    // Validate required fields
    if (!options.path || options.path.length === 0) {
      return res.status(400).json({
        error: 'Path is required and must not be empty'
      });
    }

    const result = await routesClient.snapToRoads(options);
    res.json(result);

  } catch (error) {
    console.error('Snap to Roads API error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Cache statistics endpoint
app.get('/api/cache/stats', async (req, res) => {
  try {
    const stats = await routesClient.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Clear cache endpoint
app.delete('/api/cache', async (req, res) => {
  try {
    await routesClient.clearCache();
    res.json({ message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🗺️ Routes API: http://localhost:${PORT}/api/routes`);
  console.log(`📏 Distance Matrix: http://localhost:${PORT}/api/distance-matrix`);
  console.log(`📡 Snap to Roads: http://localhost:${PORT}/api/snap-to-roads`);
  console.log(`📊 Cache Stats: http://localhost:${PORT}/api/cache/stats`);
});

export default app;
