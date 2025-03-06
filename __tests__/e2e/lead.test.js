const mongoose = require('mongoose');
const { createTestServer } = require('../helpers/test-server');
const { createTestUser } = require('../helpers/test-data');
const Lead = require('@/models/lead');

describe('Lead Model Tests', () => {
  let app;
  let testUser;

  beforeAll(async () => {
    app = createTestServer();
    testUser = await createTestUser();
  });

  describe('Lead Status Validation', () => {
    test('should accept valid lead status', async () => {
      const validLead = new Lead({
        userId: testUser.id,
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'website'
      });

      const savedLead = await validLead.save();
      expect(savedLead.status).toBe('new');
    });

    test('should reject invalid lead status', async () => {
      const invalidLead = new Lead({
        userId: testUser.id,
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '1234567890',
        status: 'invalid_status',
        source: 'website'
      });

      await expect(invalidLead.save()).rejects.toThrow();
      expect(invalidLead.errors.status).toBeDefined();
    });

    test('should handle case-insensitive status values', async () => {
      const lead = new Lead({
        userId: testUser.id,
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '1234567890',
        status: 'NEW',
        source: 'website'
      });

      const savedLead = await lead.save();
      expect(savedLead.status).toBe('new');
    });
  });

  describe('Lead Source Validation', () => {
    test('should accept valid lead source', async () => {
      const validLead = new Lead({
        userId: testUser.id,
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'referral'
      });

      const savedLead = await validLead.save();
      expect(savedLead.source).toBe('referral');
    });

    test('should reject invalid lead source', async () => {
      const invalidLead = new Lead({
        userId: testUser.id,
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'invalid_source'
      });

      await expect(invalidLead.save()).rejects.toThrow();
      expect(invalidLead.errors.source).toBeDefined();
    });

    test('should handle case-insensitive source values', async () => {
      const lead = new Lead({
        userId: testUser.id,
        name: 'Test Lead',
        email: 'test@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'REFERRAL'
      });

      const savedLead = await lead.save();
      expect(savedLead.source).toBe('referral');
    });
  });

  describe('Lead Validation Error Handling', () => {
    test('should handle missing required fields', async () => {
      const incompleteLead = new Lead({
        userId: testUser.id,
        name: 'Test Lead'
      });

      await expect(incompleteLead.save()).rejects.toThrow();
      expect(incompleteLead.errors.email).toBeDefined();
      expect(incompleteLead.errors.phone).toBeDefined();
      expect(incompleteLead.errors.status).toBeDefined();
      expect(incompleteLead.errors.source).toBeDefined();
    });

    test('should handle invalid email format', async () => {
      const invalidEmailLead = new Lead({
        userId: testUser.id,
        name: 'Test Lead',
        email: 'invalid-email',
        phone: '1234567890',
        status: 'new',
        source: 'website'
      });

      await expect(invalidEmailLead.save()).rejects.toThrow();
      expect(invalidEmailLead.errors.email).toBeDefined();
    });

    test('should handle invalid phone format', async () => {
      const invalidPhoneLead = new Lead({
        userId: testUser.id,
        name: 'Test Lead',
        email: 'test@example.com',
        phone: 'invalid-phone',
        status: 'new',
        source: 'website'
      });

      await expect(invalidPhoneLead.save()).rejects.toThrow();
      expect(invalidPhoneLead.errors.phone).toBeDefined();
    });

    test('should handle duplicate email for same user', async () => {
      const lead1 = new Lead({
        userId: testUser.id,
        name: 'Test Lead 1',
        email: 'duplicate@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'website'
      });

      const lead2 = new Lead({
        userId: testUser.id,
        name: 'Test Lead 2',
        email: 'duplicate@example.com',
        phone: '0987654321',
        status: 'new',
        source: 'website'
      });

      await lead1.save();
      await expect(lead2.save()).rejects.toThrow();
      expect(lead2.errors.email).toBeDefined();
    });

    test('should allow duplicate email for different users', async () => {
      const otherUser = await createTestUser();
      
      const lead1 = new Lead({
        userId: testUser.id,
        name: 'Test Lead 1',
        email: 'shared@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'website'
      });

      const lead2 = new Lead({
        userId: otherUser.id,
        name: 'Test Lead 2',
        email: 'shared@example.com',
        phone: '0987654321',
        status: 'new',
        source: 'website'
      });

      await expect(lead1.save()).resolves.toBeDefined();
      await expect(lead2.save()).resolves.toBeDefined();
    });
  });
}); 