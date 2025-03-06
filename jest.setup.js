const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const redisMock = require('redis-mock');

let mongoServer;
let redisClient;

// Increase timeout for all tests
jest.setTimeout(60000);

// Setup MongoDB Memory Server
beforeAll(async () => {
  try {
    mongoServer = await MongoMemoryServer.create({
      instance: {
        dbName: 'jest'
      },
      binary: {
        version: '4.0.3'
      },
      autoStart: true
    });
    const mongoUri = await mongoServer.getUri();
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    // Initialize Redis Mock client
    redisClient = redisMock.createClient();
    redisClient.on('error', (err) => console.error('Redis Client Error', err));
  } catch (error) {
    console.error('MongoDB Memory Server setup failed:', error);
    throw error;
  }
});

afterAll(async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    if (mongoServer) {
      await mongoServer.stop();
    }
    if (redisClient) {
      redisClient.end(true);
    }
  } catch (error) {
    console.error('Cleanup failed:', error);
  }
});

// Clear all collections after each test
afterEach(async () => {
  if (mongoose.connection.readyState === 1) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany();
    }
    if (redisClient) {
      redisClient.flushdb();
    }
  }
});

// Mock Redis client for imports
jest.mock('redis', () => require('redis-mock'));

// Mock Next.js
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '',
      query: {},
      asPath: '',
      push: jest.fn(),
      replace: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn(),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    };
  },
}));

// Add global error handlers for async operations
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Promise Rejection:', error);
});

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret';
process.env.STRIPE_SECRET_KEY = 'test-stripe-secret';
process.env.OPENAI_API_KEY = 'test-openai-key'; 