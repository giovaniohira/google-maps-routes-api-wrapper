# Google Maps Routes API Wrapper

Fast, robust, and feature-rich wrapper for Google Maps Routes API with TypeScript support.

This project has a Code of Conduct.

## Table of contents

- [Installation](#installation)
- [Features](#features)
- [Docs & Community](#docs--community)
- [Quick Start](#quick-start)
- [Philosophy](#philosophy)
- [Examples](#examples)
- [Contributing](#contributing)
- [Security Issues](#security-issues)
- [Running Tests](#running-tests)
- [Current project team members](#current-project-team-members)
- [License](#license)

```typescript
import { RoutesClient, FetchAdapter, InMemoryCacheAdapter, TravelMode } from 'google-maps-routes-api-wrapper';

//Create the client
const client = new RoutesClient({
  apiKey: 'your-google-maps-api-key',
  httpAdapter: new FetchAdapter(),
  cacheAdapter: new InMemoryCacheAdapter()
});

//Call the route module
const route = await client.getRoute({
  origin: 'New York, NY',
  destination: 'Philadelphia, PA',
  travelMode: TravelMode.DRIVING
});

//As simple as that.
console.log(`Distance: ${route.routes[0]?.legs[0]?.distance?.text}`);
console.log(`Duration: ${route.routes[0]?.legs[0]?.duration?.text}`);
```

## Installation

This is a Node.js module available through the npm registry.

Before installing, download and install Node.js. Node.js 18 or higher is required.

If this is a brand new project, make sure to create a package.json first with the npm init command.

Installation is done using the npm install command:

```bash
npm install google-maps-routes-api-wrapper
```

## Features

- **Comprehensive API Coverage** - Support for Directions, Distance Matrix, and Roads APIs
- **TypeScript First** - Full TypeScript support with comprehensive type definitions
- **Advanced Caching** - Built-in caching with configurable TTL and multiple cache adapters
- **Rate Limiting** - Intelligent rate limiting to respect API quotas
- **Retry Strategy** - Configurable retry logic with exponential backoff
- **HTTP Adapter Pattern** - Pluggable HTTP adapters for different environments
- **Input Validation** - Zod-based validation for all API parameters
- **Error Handling** - Comprehensive error handling with custom error types
- **Performance Optimized** - Built for high-performance applications
- **Extensible Architecture** - Modular design for easy customization

## Docs & Community

- [API Documentation](docs/) - Complete API reference generated with TypeDoc
- [Examples](examples/) - Real-world usage examples and patterns
- [Templates](templates/) - Ready-to-use templates for popular frameworks

## Quick Start

The quickest way to get started with the Google Maps Routes API wrapper is to use the basic example:

Install the package:

```bash
npm install google-maps-routes-api-wrapper
```

Create a simple route finder:

```typescript
import { RoutesClient, FetchAdapter, TravelMode } from 'google-maps-routes-api-wrapper';

const client = new RoutesClient({
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  httpAdapter: new FetchAdapter()
});

// Get route between two cities
const route = await client.getRoute({
  origin: 'New York, NY',
  destination: 'Philadelphia, PA',
  travelMode: TravelMode.DRIVING
});

console.log(`Route: ${route.routes[0]?.legs[0]?.distance?.text}`);
```

View the website at: http://localhost:3000

## Philosophy

The Google Maps Routes API Wrapper philosophy is to provide a robust, type-safe, and feature-rich interface to Google Maps APIs while maintaining simplicity and performance. The wrapper handles the complexity of API interactions, caching, rate limiting, and error handling so you can focus on building your application.

The wrapper does not force you to use any specific HTTP client or caching strategy. With support for multiple HTTP adapters and cache implementations, you can quickly integrate it into your existing infrastructure.

## Examples

To view the examples, clone the repository:

```bash
git clone https://github.com/giovaniohira/google-maps-routes-api-wrapper.git --depth 1 && cd google-maps-routes-api-wrapper
```

Then install the dependencies:

```bash
npm install
```

Then run whichever example you want:

```bash
# Basic usage
npx ts-node examples/basic-usage.ts

# Advanced configuration
npx ts-node examples/advanced-configuration.ts

# Performance testing
npx ts-node examples/performance-testing.ts

# Real-world scenarios
npx ts-node examples/real-world-scenarios.ts
```

### Advanced Configuration Example

```typescript
import { 
  RoutesClient, 
  FetchAdapter, 
  InMemoryCacheAdapter,
  RetryStrategy,
  RateLimiter,
  TravelMode 
} from 'google-maps-routes-api-wrapper';

const client = new RoutesClient({
  apiKey: process.env.GOOGLE_MAPS_API_KEY,
  httpAdapter: new FetchAdapter(),
  cacheAdapter: new InMemoryCacheAdapter({
    maxSize: 1000,
    ttlMs: 300000 // 5 minutes
  }),
  retryConfig: {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 10000
  },
  rateLimiterConfig: {
    maxTokens: 100,
    refillRate: 10,
    refillPeriodMs: 60000
  },
  timeoutMs: 30000
});

// Get route with waypoints and optimization
const route = await client.getRoute({
  origin: 'New York, NY',
  destination: 'Washington, DC',
  waypoints: ['Philadelphia, PA', 'Baltimore, MD'],
  travelMode: TravelMode.DRIVING,
  optimizeWaypoints: true,
  avoidHighways: false,
  avoidTolls: true
});
```

### Distance Matrix Example

```typescript
// Get distance matrix between multiple origins and destinations
const distances = await client.getDistanceMatrix({
  origins: ['New York, NY', 'Boston, MA'],
  destinations: ['Philadelphia, PA', 'Washington, DC'],
  travelMode: TravelMode.DRIVING,
  units: 'metric'
});

distances.rows.forEach((row, i) => {
  row.elements.forEach((element, j) => {
    if (element.status === 'OK') {
      console.log(`${distances.originAddresses[i]} → ${distances.destinationAddresses[j]}: ${element.distance?.text}`);
    }
  });
});
```

### Snap to Roads Example

```typescript
// Snap GPS coordinates to roads
const snappedPoints = await client.snapToRoads({
  path: [
    { lat: 40.714728, lng: -73.998672 },
    { lat: 40.758896, lng: -73.985130 }
  ],
  interpolate: true
});

console.log(`Snapped ${snappedPoints.snappedPoints.length} points to roads`);
```

## Contributing

The Google Maps Routes API Wrapper project welcomes all constructive contributions. Contributions take many forms, from code for bug fixes and enhancements, to additions and fixes to documentation, additional tests, triaging incoming pull requests and issues, and more!

See the Contributing Guide for more technical details on contributing.

## Security Issues

If you discover a security vulnerability in the Google Maps Routes API Wrapper, please see Security Policies and Procedures.

## Running Tests

To run the test suite, first install the dependencies:

```bash
npm install
```

Then run npm test:

```bash
npm test
```

To run tests with coverage:

```bash
npm run test:coverage
```

To run tests in watch mode:

```bash
npm run test:watch
```

## Current project team members

The original author of Google Maps Routes API Wrapper is **Giovani Ohira**

### Core Contributors

- **Giovani Ohira** - Project maintainer and lead developer

### Contributors

We welcome contributions from the community! See our [Contributing Guide](CONTRIBUTING.md) for more information.

## License

[MIT License](LICENSE)

---

**NPM Version** ![npm version](https://img.shields.io/npm/v/google-maps-routes-api-wrapper)
**NPM Downloads** ![npm downloads](https://img.shields.io/npm/dm/google-maps-routes-api-wrapper)
**Build Status** ![Build Status](https://img.shields.io/github/workflow/status/your-username/google-maps-routes-api-wrapper/CI)
**Test Coverage** ![Test Coverage](https://img.shields.io/codecov/c/github/your-username/google-maps-routes-api-wrapper)
**OpenSSF Scorecard** ![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/your-username/google-maps-routes-api-wrapper/badge)
