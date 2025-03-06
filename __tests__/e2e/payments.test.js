const request = require('supertest');
const mongoose = require('mongoose');
const { createTestServer } = require('../helpers/test-server');
const { createTestUser, createTestSubscription } = require('../helpers/test-data');
const Payment = require('../../src/backend/models/payment');
const { createAccessToken } = require('@/core/security');
const User = require('@/models/user');
const Subscription = require('@/models/subscription');

describe('Payment and Subscription Tests', () => {
  let testUser;
  let testToken;
  let testSubscription;

  beforeEach(async () => {
    testUser = await createTestUser();
    testToken = createAccessToken(testUser);
    testSubscription = await createTestSubscription(testUser.id);
  });

  describe('Subscription Management Tests', () => {
    test('should create a new subscription', async () => {
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
      expect(response.body.plan_id).toBe('basic');
    });

    test('should prevent access to premium features without subscription', async () => {
      // Cancel subscription
      await Subscription.findByIdAndUpdate(testSubscription.id, {
        status: 'canceled'
      });

      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/leads/premium')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(403);
      expect(response.body.detail).toBe('Premium subscription required');
    });

    test('should handle subscription upgrades', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/payments/subscription/${testSubscription.id}/upgrade`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          plan_id: 'premium',
          payment_method_id: 'pm_test_card'
        });

      expect(response.status).toBe(200);
      expect(response.body.plan_id).toBe('premium');
      expect(response.body.status).toBe('active');
    });

    test('should handle subscription cancellations', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/payments/subscription/${testSubscription.id}/cancel`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('canceled');
      expect(response.body.canceled_at).toBeTruthy();
    });
  });

  describe('Payment Processing Tests', () => {
    test('should process payment successfully', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/payments/process')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 1000,
          currency: 'usd',
          payment_method_id: 'pm_test_card'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('succeeded');
      expect(response.body.amount).toBe(1000);
    });

    test('should handle failed payments', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/payments/process')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 1000,
          currency: 'usd',
          payment_method_id: 'pm_test_card_failure'
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('failed');
      expect(response.body.error).toBeTruthy();
    });

    test('should record payment transactions', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/payments/process')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          amount: 1000,
          currency: 'usd',
          payment_method_id: 'pm_test_card'
        });

      const transaction = await Payment.findOne({
        user_id: testUser.id,
        stripe_payment_intent_id: response.body.payment_intent_id
      });

      expect(transaction).toBeTruthy();
      expect(transaction.amount).toBe(1000);
      expect(transaction.status).toBe('succeeded');
    });
  });

  describe('Billing Cycle Tests', () => {
    test('should handle subscription renewal', async () => {
      // Simulate subscription renewal
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/payments/subscription/${testSubscription.id}/renew`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          payment_method_id: 'pm_test_card'
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('active');
      expect(response.body.current_period_end).toBeGreaterThan(Date.now());
    });

    test('should handle failed renewals', async () => {
      // Simulate failed renewal
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/payments/subscription/${testSubscription.id}/renew`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          payment_method_id: 'pm_test_card_failure'
        });

      expect(response.status).toBe(400);
      expect(response.body.status).toBe('past_due');
    });
  });

  describe('Invoice and Transaction History Tests', () => {
    test('should generate invoice', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get(`/payments/invoices/${testSubscription.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('invoice_number');
      expect(response.body).toHaveProperty('amount');
      expect(response.body).toHaveProperty('status');
    });

    test('should provide transaction history', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get('/payments/transactions')
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('amount');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('created_at');
    });
  });

  describe('Payment Security Tests', () => {
    test('should validate payment method', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post('/payments/validate')
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          payment_method_id: 'pm_test_card'
        });

      expect(response.status).toBe(200);
      expect(response.body.valid).toBe(true);
    });

    test('should prevent unauthorized access to payment data', async () => {
      const otherUser = await createTestUser();
      const otherUserToken = createAccessToken(otherUser);

      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get(`/payments/transactions/${testUser.id}`)
        .set('Authorization', `Bearer ${otherUserToken}`);

      expect(response.status).toBe(403);
    });
  });
}); 