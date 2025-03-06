const request = require('supertest');
const { createAccessToken } = require('@/core/security');
const { createTestUser, createTestLead } = require('../helpers/test-data');
const User = require('@/models/user');
const Lead = require('@/models/lead');
const Subscription = require('@/models/subscription');

describe('API Endpoint Tests', () => {
  let testUser;
  let testToken;
  let adminUser;
  let adminToken;

  beforeEach(async () => {
    testUser = await createTestUser();
    testToken = createAccessToken(testUser);

    adminUser = await createTestUser({
      is_superuser: true,
      roles: ['admin']
    });
    adminToken = createAccessToken(adminUser);
  });

  describe('API Documentation Tests', () => {
    test('should return OpenAPI documentation', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/docs');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('openapi');
      expect(response.body).toHaveProperty('info');
      expect(response.body).toHaveProperty('paths');
    });

    test('should return ReDoc documentation', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/redoc');

      expect(response.status).toBe(200);
      expect(response.text).toContain('ReDoc');
    });
  });

  describe('API Security Tests', () => {
    test('should enforce rate limiting', async () => {
      const requests = Array(150).fill().map(() =>
        request(process.env.NEXT_PUBLIC_API_URL)
          .get('/leads')
          .set('Authorization', `Bearer ${testToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });

    test('should validate input data', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/leads')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: '', // Invalid empty name
          email: 'invalid-email' // Invalid email format
        });

      expect(response.status).toBe(422);
      expect(response.body).toHaveProperty('detail');
    });

    test('should prevent access to sensitive data', async () => {
      const otherUser = await createTestUser();
      const otherUserToken = createAccessToken(otherUser);

      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get(`/users/${otherUser.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('API Logging Tests', () => {
    test('should log API requests', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/leads')
        .set('Authorization', `Bearer ${testToken}`);

      // Check logs in database
      const logs = await mongoose.connection.db
        .collection('api_logs')
        .find({
          user_id: testUser.id,
          endpoint: '/leads',
          method: 'GET'
        })
        .toArray();

      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty('timestamp');
      expect(logs[0]).toHaveProperty('status_code');
      expect(logs[0]).toHaveProperty('response_time');
    });

    test('should log API errors', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/invalid-endpoint')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);

      // Check error logs
      const errorLogs = await mongoose.connection.db
        .collection('error_logs')
        .find({
          user_id: testUser.id,
          endpoint: '/invalid-endpoint'
        })
        .toArray();

      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0]).toHaveProperty('error_message');
      expect(errorLogs[0]).toHaveProperty('stack_trace');
    });
  });

  describe('API Response Tests', () => {
    test('should return paginated results', async () => {
      // Create multiple test leads
      await Promise.all(Array(15).fill().map(() => createTestLead(testUser.id)));

      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/leads?page=1&limit=10')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('total_pages');
      expect(response.body.items.length).toBeLessThanOrEqual(10);
    });

    test('should handle API errors gracefully', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/leads/invalid-id')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('detail');
      expect(response.body.detail).toBe('Lead not found');
    });
  });

  describe('API Analytics Tests', () => {
    test('should track API usage metrics', async () => {
      // Make multiple API calls
      await Promise.all(Array(5).fill().map(() =>
        request(process.env.NEXT_PUBLIC_API_URL)
          .get('/leads')
          .set('Authorization', `Bearer ${testToken}`)
      ));

      // Check analytics
      const analytics = await mongoose.connection.db
        .collection('api_analytics')
        .find({
          user_id: testUser.id,
          endpoint: '/leads'
        })
        .toArray();

      expect(analytics.length).toBeGreaterThan(0);
      expect(analytics[0]).toHaveProperty('total_requests');
      expect(analytics[0]).toHaveProperty('average_response_time');
      expect(analytics[0]).toHaveProperty('success_rate');
    });
  });
}); 