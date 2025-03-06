const request = require('supertest');
const mongoose = require('mongoose');
const { createAccessToken } = require('@/core/security');
const User = require('@/models/user');
const Lead = require('@/models/lead');
const Subscription = require('@/models/subscription');
const { createTestUser, createTestLead, createTestSubscription } = require('../helpers/test-data');

describe('Platform End-to-End Tests', () => {
  let testUser;
  let testToken;
  let testLead;
  let testSubscription;

  beforeEach(async () => {
    // Create test user
    testUser = await createTestUser();
    testToken = createAccessToken(testUser);

    // Create test lead
    testLead = await createTestLead(testUser.id);

    // Create test subscription
    testSubscription = await createTestSubscription(testUser.id);
  });

  describe('Authentication Tests', () => {
    test('should login with valid credentials', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/auth/token')
        .send({
          email: testUser.email,
          password: 'testpassword123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('token_type', 'bearer');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/auth/token')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
    });

    test('should protect routes requiring authentication', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/leads')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Lead Management Tests', () => {
    test('should create a new lead', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/leads')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: 'Test Lead',
          email: 'test@example.com',
          phone: '1234567890',
          property_type: 'residential',
          budget: 500000
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.user_id).toBe(testUser.id);
    });

    test('should only allow access to own leads', async () => {
      const otherUser = await createTestUser();
      const otherLead = await createTestLead(otherUser.id);

      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get(`/leads/${otherLead.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Subscription and Payment Tests', () => {
    test('should create a subscription', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/payments/subscription')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          plan_id: 'basic',
          payment_method_id: 'pm_test_card'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('active');
    });

    test('should handle subscription cancellation', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/payments/subscription/${testSubscription.id}/cancel`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('canceled');
    });
  });

  describe('Security Tests', () => {
    test('should prevent SQL injection in lead search', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/leads/search')
        .set('Authorization', `Bearer ${testToken}`)
        .query({ q: "' OR '1'='1" });

      expect(response.status).toBe(400);
    });

    test('should prevent XSS in lead creation', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/leads')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          name: '<script>alert("xss")</script>',
          email: 'test@example.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.name).not.toContain('<script>');
    });

    test('should validate CSRF token', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/leads')
        .set('Authorization', `Bearer ${testToken}`)
        .set('X-CSRF-Token', 'invalid-token')
        .send({
          name: 'Test Lead',
          email: 'test@example.com'
        });

      expect(response.status).toBe(403);
    });
  });

  describe('Performance Tests', () => {
    test('should implement caching for lead list', async () => {
      const startTime = Date.now();
      
      // First request
      await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/leads')
        .set('Authorization', `Bearer ${testToken}`);

      const firstRequestTime = Date.now() - startTime;

      // Second request (should be cached)
      const secondStartTime = Date.now();
      await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/leads')
        .set('Authorization', `Bearer ${testToken}`);

      const secondRequestTime = Date.now() - secondStartTime;

      // Cached request should be faster
      expect(secondRequestTime).toBeLessThan(firstRequestTime);
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(10).fill().map(() =>
        request(process.env.NEXT_PUBLIC_API_URL)
          .get('/leads')
          .set('Authorization', `Bearer ${testToken}`)
      );

      const responses = await Promise.all(requests);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });

  describe('API Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const requests = Array(150).fill().map(() =>
        request(process.env.NEXT_PUBLIC_API_URL)
          .get('/leads')
          .set('Authorization', `Bearer ${testToken}`)
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
}); 