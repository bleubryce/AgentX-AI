const request = require('supertest');
const jwt = require('jsonwebtoken');
const { createTestServer } = require('../helpers/test-server');
const { createTestUser } = require('../helpers/test-data');
const { createAccessToken } = require('@/core/security');

describe('Authentication Middleware Tests', () => {
  let app;
  let testUser;
  let validToken;

  beforeAll(() => {
    app = createTestServer();
  });

  beforeEach(async () => {
    testUser = await createTestUser();
    validToken = createAccessToken(testUser);
  });

  describe('Token Validation', () => {
    test('should reject requests without authorization header', async () => {
      const response = await request(app)
        .get('/api/v1/agents')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    test('should reject requests with invalid authorization format', async () => {
      const response = await request(app)
        .get('/api/v1/agents')
        .set('Authorization', 'InvalidFormat')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });

    test('should reject requests with non-Bearer token type', async () => {
      const response = await request(app)
        .get('/api/v1/agents')
        .set('Authorization', `Basic ${validToken}`)
        .send();

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('No token provided');
    });
  });

  describe('User Verification', () => {
    test('should reject requests with valid token but non-existent user', async () => {
      // Create a token for a non-existent user ID
      const nonExistentUserId = '507f1f77bcf86cd799439011';
      const token = jwt.sign(
        { userId: nonExistentUserId },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      const response = await request(app)
        .get('/api/v1/agents')
        .set('Authorization', `Bearer ${token}`)
        .send();

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('User not found');
    });

    test('should handle JWT verification errors', async () => {
      // Create an invalid token by using a different secret
      const invalidToken = jwt.sign(
        { userId: testUser.id },
        'wrong-secret',
        { expiresIn: '1d' }
      );

      const response = await request(app)
        .get('/api/v1/agents')
        .set('Authorization', `Bearer ${invalidToken}`)
        .send();

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    test('should handle expired tokens', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { userId: testUser.id },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      const response = await request(app)
        .get('/api/v1/agents')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send();

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed tokens', async () => {
      const response = await request(app)
        .get('/api/v1/agents')
        .set('Authorization', 'Bearer malformed.token.here')
        .send();

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid token');
    });

    test('should handle database errors during user lookup', async () => {
      // Mock User.findById to throw an error
      const User = require('@/models/user');
      const originalFindById = User.findById;
      User.findById = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/v1/agents')
        .set('Authorization', `Bearer ${validToken}`)
        .send();

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Authentication failed');

      // Restore original findById function
      User.findById = originalFindById;
    });
  });
}); 