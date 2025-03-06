const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const supertest = require('supertest');
const { createTestServer } = require('../helpers/test-server');
const { createTestUser, createTestLead } = require('../helpers/test-data');
const User = require('@/models/user');
const Lead = require('@/models/lead');
const Subscription = require('@/models/subscription');
const Agent = require('@/models/agent');

describe('Database and Multi-tenant Tests', () => {
  let mongoServer;
  let app;
  let request;
  let testUser;
  let testToken;

  beforeAll(async () => {
    // Setup MongoDB Memory Server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Setup Express app and supertest
    app = createTestServer();
    request = supertest(app);

    // Create test user and get token
    testUser = await createTestUser();
    testToken = testUser.generateAuthToken();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Promise.all([
      Lead.deleteMany({}),
      Agent.deleteMany({})
    ]);
  });

  describe('Multi-tenant Data Isolation Tests', () => {
    test('should isolate user data', async () => {
      // Create leads for both users
      const testLead = await createTestLead(testUser.id);
      const otherLead = await createTestLead(otherUser.id);

      // Try to access other user's lead
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get(`/leads/${otherLead.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });

    test('should isolate agent data', async () => {
      // Create agents for both users
      const testAgent = await Agent.create({
        user_id: testUser.id,
        name: 'Test Agent',
        description: 'Test Description',
        config: {
          name: 'Test Agent',
          description: 'Test Description',
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: 'Test prompt',
          allowed_features: ['test'],
          rate_limit: 100,
          usage_limit: 1000
        }
      });

      const otherAgent = await Agent.create({
        user_id: otherUser.id,
        name: 'Other Agent',
        description: 'Other Description',
        config: {
          name: 'Other Agent',
          description: 'Other Description',
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: 'Other prompt',
          allowed_features: ['test'],
          rate_limit: 100,
          usage_limit: 1000
        }
      });

      // Try to access other user's agent
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .get(`/agents/${otherAgent.id}`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('Database Optimization Tests', () => {
    test('should use indexes for queries', async () => {
      // Create multiple leads
      await Promise.all(Array(100).fill().map(() => createTestLead(testUser.id)));

      // Get execution plan for query
      const plan = await Lead.collection
        .find({ user_id: testUser.id })
        .explain('executionStats');

      expect(plan.executionStats.executionStages.stage).toBe('IXSCAN');
      expect(plan.executionStats.totalDocsExamined).toBeLessThan(100);
    });

    test('should handle concurrent operations', async () => {
      const operations = Array(50).fill().map(() =>
        createTestLead(testUser.id)
      );

      const results = await Promise.all(operations);
      expect(results.length).toBe(50);
      expect(new Set(results.map(r => r.id)).size).toBe(50);
    });
  });

  describe('Duplicate Prevention Tests', () => {
    test('should prevent duplicate leads', async () => {
      const leadData = {
        user_id: testUser.id,
        name: 'Duplicate Lead',
        email: 'duplicate@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'website',
        notes: 'Test lead'
      };

      // Create first lead
      const firstLead = await Lead.create(leadData);
      expect(firstLead).toBeTruthy();

      // Try to create duplicate lead
      await expect(Lead.create(leadData)).rejects.toThrow(/E11000 duplicate key error/);
    });

    test('should prevent duplicate agent names per user', async () => {
      const agentData = {
        user_id: testUser.id,
        name: 'Duplicate Agent',
        description: 'Test Description',
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: 'Test prompt',
          allowed_features: ['lead_generation'],
          rate_limit: 100,
          usage_limit: 1000
        },
        status: 'active'
      };

      // Create first agent
      const firstAgent = await Agent.create(agentData);
      expect(firstAgent).toBeTruthy();

      // Try to create duplicate agent
      await expect(Agent.create(agentData)).rejects.toThrow(/E11000 duplicate key error/);
    });
  });

  describe('Database Security Tests', () => {
    test('should encrypt sensitive data', async () => {
      const lead = await Lead.create({
        user_id: testUser.id,
        name: 'Secure Lead',
        email: 'secure@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'website',
        notes: 'Sensitive information'
      });

      // Check if sensitive data is encrypted in database
      const rawLead = await mongoose.connection.db
        .collection('leads')
        .findOne({ _id: lead._id });

      expect(rawLead.notes).not.toBe('Sensitive information');
    });

    test('should sanitize user input', async () => {
      const maliciousInput = {
        user_id: testUser.id,
        name: '<script>alert("xss")</script>',
        email: 'test@example.com',
        phone: '1234567890',
        status: 'new',
        source: 'website',
        notes: 'DROP TABLE users;'
      };

      const lead = await Lead.create(maliciousInput);
      expect(lead.name).not.toContain('<script>');
      expect(lead.notes).not.toContain('DROP TABLE');
    });
  });

  describe('Database Performance Tests', () => {
    test('should handle large datasets efficiently', async () => {
      // Create 1000 leads
      const startTime = Date.now();
      await Promise.all(Array(1000).fill().map(() => createTestLead(testUser.id)));
      const creationTime = Date.now() - startTime;

      // Query leads with pagination
      const queryStartTime = Date.now();
      const leads = await Lead.find({ user_id: testUser.id })
        .limit(100)
        .skip(0);
      const queryTime = Date.now() - queryStartTime;

      expect(creationTime).toBeLessThan(5000); // Should create 1000 leads in less than 5 seconds
      expect(queryTime).toBeLessThan(100); // Should query 100 leads in less than 100ms
    });

    test('should maintain performance under load', async () => {
      // Create multiple users and leads
      const users = await Promise.all(Array(10).fill().map(() => createTestUser()));
      await Promise.all(users.map(user => 
        Promise.all(Array(100).fill().map(() => createTestLead(user.id)))
      ));

      // Simulate concurrent queries
      const queries = users.map(user =>
        Lead.find({ user_id: user.id }).limit(10)
      );

      const startTime = Date.now();
      await Promise.all(queries);
      const totalTime = Date.now() - startTime;

      expect(totalTime).toBeLessThan(1000); // Should complete all queries in less than 1 second
    });
  });
}); 