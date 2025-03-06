const request = require('supertest');
const { createAccessToken } = require('@/core/security');
const { createTestUser, createTestLead } = require('../helpers/test-data');
const { createTestServer } = require('../helpers/test-server');
const Agent = require('@/models/agent');
const AgentLog = require('@/models/agent_log');
const Subscription = require('@/models/subscription');

describe('AI Agent API Endpoint Tests', () => {
  let app;
  let testUser;
  let testToken;
  let premiumUser;
  let premiumToken;
  let freeUser;
  let freeToken;

  beforeAll(() => {
    app = createTestServer();
  });

  beforeEach(async () => {
    // Create users with different subscription levels
    testUser = await createTestUser();
    testToken = createAccessToken(testUser);

    premiumUser = await createTestUser();
    premiumToken = createAccessToken(premiumUser);
    await Subscription.create({
      user_id: premiumUser.id,
      plan_id: 'premium',
      status: 'active'
    });

    freeUser = await createTestUser();
    freeToken = createAccessToken(freeUser);
  });

  describe('Agent Creation API Tests', () => {
    test('should create agent with valid subscription', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          name: 'Test Agent',
          description: 'Test Description',
          config: {
            model: 'gpt-4',
            temperature: 0.7,
            max_tokens: 1000,
            system_prompt: 'You are a lead generation assistant.',
            allowed_features: ['lead_generation']
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Agent');
    });

    test('should prevent duplicate agent creation', async () => {
      // Create first agent
      await request(app)
        .post('/api/v1/agents')
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          name: 'Duplicate Agent',
          description: 'Test Description',
          config: {
            model: 'gpt-4',
            temperature: 0.7,
            max_tokens: 1000,
            system_prompt: 'Test prompt',
            allowed_features: ['lead_generation']
          }
        });

      // Try to create duplicate
      const response = await request(app)
        .post('/api/v1/agents')
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          name: 'Duplicate Agent',
          description: 'Test Description',
          config: {
            model: 'gpt-4',
            temperature: 0.7,
            max_tokens: 1000,
            system_prompt: 'Test prompt',
            allowed_features: ['lead_generation']
          }
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Agent with this name already exists');
    });

    test('should prevent agent creation without subscription', async () => {
      const response = await request(app)
        .post('/api/v1/agents')
        .set('Authorization', `Bearer ${freeToken}`)
        .send({
          name: 'Test Agent',
          description: 'Test Description',
          config: {
            model: 'gpt-4',
            temperature: 0.7,
            max_tokens: 1000,
            system_prompt: 'Test prompt',
            allowed_features: ['lead_generation']
          }
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Subscription required');
    });

    test('should handle database errors during agent creation', async () => {
      // Mock Agent.create to throw an error
      const originalCreate = Agent.create;
      Agent.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/agents')
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          name: 'Test Agent',
          description: 'Test Description',
          config: {
            model: 'gpt-4',
            temperature: 0.7,
            max_tokens: 1000,
            system_prompt: 'Test prompt',
            allowed_features: ['lead_generation']
          }
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create agent');

      // Restore original create function
      Agent.create = originalCreate;
    });
  });

  describe('Agent Query API Tests', () => {
    let testAgent;

    beforeEach(async () => {
      testAgent = await Agent.create({
        user_id: premiumUser.id,
        name: 'Test Agent',
        description: 'Test Description',
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: 'Test prompt',
          allowed_features: ['lead_generation']
        }
      });
    });

    test('should process agent query successfully', async () => {
      const response = await request(app)
        .post(`/api/v1/agents/${testAgent.id}/query`)
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          prompt: 'Find leads in San Francisco',
          features: ['lead_generation']
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('tokens_used');
      expect(response.body).toHaveProperty('request_id');
    });

    test('should validate query input', async () => {
      const response = await request(app)
        .post(`/api/v1/agents/${testAgent.id}/query`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          // Missing required prompt field
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid value');
      expect(response.body.details).toEqual(expect.arrayContaining([
        expect.objectContaining({
          field: 'prompt',
          message: 'Required field missing'
        })
      ]));
    });

    test('should enforce feature access control', async () => {
      const response = await request(app)
        .post(`/api/v1/agents/${testAgent.id}/query`)
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          prompt: 'Test prompt',
          features: ['unauthorized_feature']
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Feature not allowed');
    });

    test('should handle database errors during agent query', async () => {
      // Mock Agent.findOne to throw an error
      const originalFindOne = Agent.findOne;
      Agent.findOne = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/v1/agents/${testAgent.id}/query`)
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          prompt: 'Test prompt',
          features: ['lead_generation']
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to process query');

      // Restore original findOne function
      Agent.findOne = originalFindOne;
    });

    test('should handle database errors during agent log creation', async () => {
      // Mock AgentLog.create to throw an error
      const originalCreate = AgentLog.create;
      AgentLog.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post(`/api/v1/agents/${testAgent.id}/query`)
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          prompt: 'Test prompt',
          features: ['lead_generation']
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to process query');

      // Restore original create function
      AgentLog.create = originalCreate;
    });
  });

  describe('Agent Management API Tests', () => {
    let testAgent;

    beforeEach(async () => {
      testAgent = await Agent.create({
        user_id: premiumUser.id,
        name: 'Test Agent',
        description: 'Test Description',
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: 'Test prompt',
          allowed_features: ['lead_generation']
        }
      });
    });

    test('should update agent configuration', async () => {
      const response = await request(app)
        .put(`/api/v1/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          description: 'Updated Description',
          config: {
            temperature: 0.8,
            max_tokens: 2000
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.description).toBe('Updated Description');
      expect(response.body.config.temperature).toBe(0.8);
      expect(response.body.config.max_tokens).toBe(2000);
    });

    test('should prevent unauthorized agent updates', async () => {
      const response = await request(app)
        .put(`/api/v1/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${testToken}`) // Different user's token
        .send({
          description: 'Unauthorized Update'
        });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Subscription required');
    });

    test('should delete agent', async () => {
      const response = await request(app)
        .delete(`/api/v1/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${premiumToken}`);

      expect(response.status).toBe(200);

      // Verify agent is deleted
      const deletedAgent = await Agent.findById(testAgent.id);
      expect(deletedAgent).toBeNull();
    });

    test('should handle database errors during agent update', async () => {
      // Mock Agent.findOneAndUpdate to throw an error
      const originalFindOneAndUpdate = Agent.findOneAndUpdate;
      Agent.findOneAndUpdate = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .put(`/api/v1/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${premiumToken}`)
        .send({
          description: 'Updated Description'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to update agent');

      // Restore original findOneAndUpdate function
      Agent.findOneAndUpdate = originalFindOneAndUpdate;
    });

    test('should handle database errors during agent deletion', async () => {
      // Mock Agent.findOneAndDelete to throw an error
      const originalFindOneAndDelete = Agent.findOneAndDelete;
      Agent.findOneAndDelete = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .delete(`/api/v1/agents/${testAgent.id}`)
        .set('Authorization', `Bearer ${premiumToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to delete agent');

      // Restore original findOneAndDelete function
      Agent.findOneAndDelete = originalFindOneAndDelete;
    });
  });

  describe('Agent Analytics API Tests', () => {
    let testAgent;

    beforeEach(async () => {
      testAgent = await Agent.create({
        user_id: premiumUser.id,
        name: 'Test Agent',
        description: 'Test Description',
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1000,
          system_prompt: 'Test prompt',
          allowed_features: ['lead_generation']
        }
      });

      // Create some test logs
      await AgentLog.create({
        agent_id: testAgent.id,
        user_id: premiumUser.id,
        request_id: 'test-request-1',
        prompt: 'Test prompt 1',
        response: 'Test response 1',
        tokens_used: 100,
        features: ['lead_generation']
      });

      await AgentLog.create({
        agent_id: testAgent.id,
        user_id: premiumUser.id,
        request_id: 'test-request-2',
        prompt: 'Test prompt 2',
        response: 'Test response 2',
        tokens_used: 150,
        features: ['lead_generation']
      });
    });

    test('should retrieve agent usage statistics', async () => {
      const response = await request(app)
        .get(`/api/v1/agents/${testAgent.id}/stats`)
        .set('Authorization', `Bearer ${premiumToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('total_requests', 2);
      expect(response.body).toHaveProperty('total_tokens', 250);
      expect(response.body).toHaveProperty('average_tokens_per_request', 125);
    });

    test('should retrieve agent logs', async () => {
      const response = await request(app)
        .get(`/api/v1/agents/${testAgent.id}/logs`)
        .set('Authorization', `Bearer ${premiumToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('logs');
      expect(response.body.logs).toHaveLength(2);
      expect(response.body.logs[0]).toHaveProperty('request_id');
      expect(response.body.logs[0]).toHaveProperty('prompt');
      expect(response.body.logs[0]).toHaveProperty('response');
      expect(response.body.logs[0]).toHaveProperty('tokens_used');
    });

    test('should handle database errors during stats retrieval', async () => {
      // Mock AgentLog.find to throw an error
      const originalFind = AgentLog.find;
      AgentLog.find = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/v1/agents/${testAgent.id}/stats`)
        .set('Authorization', `Bearer ${premiumToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to retrieve stats');

      // Restore original find function
      AgentLog.find = originalFind;
    });

    test('should handle database errors during logs retrieval', async () => {
      // Mock AgentLog.find to throw an error
      const originalFind = AgentLog.find;
      AgentLog.find = jest.fn().mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get(`/api/v1/agents/${testAgent.id}/logs`)
        .set('Authorization', `Bearer ${testToken}`);

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('Failed to retrieve agent logs');

      // Restore original function
      AgentLog.find = originalFind;
    });
  });
}); 