const request = require('supertest');
const { createTestServer } = require('../../helpers/test-server');

describe('Error Middleware Tests', () => {
  let app;

  beforeAll(() => {
    app = createTestServer();
  });

  describe('Validation Error Handling', () => {
    test('should handle mongoose validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .send({}); // Missing required fields

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation Error');
      expect(Array.isArray(response.body.details)).toBe(true);
    });
  });

  describe('Duplicate Key Error Handling', () => {
    test('should handle duplicate key errors', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .send({
          name: 'Test Agent',
          user_id: 'test_user_id'
        });

      // Attempt to create duplicate
      const duplicateResponse = await request(app)
        .post('/api/v1/agents')
        .send({
          name: 'Test Agent',
          user_id: 'test_user_id'
        });

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.error).toBe('Duplicate Error');
    });
  });

  describe('JWT Error Handling', () => {
    test('should handle invalid JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication Error');
    });

    test('should handle expired JWT tokens', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJpYXQiOjE1MTYyMzkwMjIsImV4cCI6MTUxNjIzOTAyM30.4Adcj3UFYzPUVaVF43FmMze0x8Y7ZkqK3j3Z6JqXqXk');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Authentication Error');
    });
  });

  describe('MongoDB Error Handling', () => {
    test('should handle MongoDB errors', async () => {
      // Simulate MongoDB error by disconnecting
      const mongoose = require('mongoose');
      await mongoose.disconnect();

      const response = await request(app)
        .get('/api/v1/leads');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Database Error');
    });
  });

  describe('Cast Error Handling', () => {
    test('should handle invalid ID format', async () => {
      const response = await request(app)
        .get('/api/v1/leads/invalid_id');

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid Input');
    });
  });

  describe('Custom Application Error Handling', () => {
    test('should handle custom application errors', async () => {
      const customError = new Error('Custom Error');
      customError.status = 403;
      customError.name = 'CustomError';

      app.use((req, res, next) => {
        next(customError);
      });

      const response = await request(app)
        .get('/api/v1/leads');

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('CustomError');
    });
  });

  describe('Default Error Handling', () => {
    test('should handle unknown errors', async () => {
      const unknownError = new Error('Unknown Error');

      app.use((req, res, next) => {
        next(unknownError);
      });

      const response = await request(app)
        .get('/api/v1/leads');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal Server Error');
    });
  });
}); 