const request = require('supertest');
const { createAccessToken } = require('@/core/security');
const { createTestUser, createTestLead } = require('../helpers/test-data');
const Agent = require('@/models/agent');
const AgentLog = require('@/models/agent_log');

describe('AI Agent System Tests', () => {
  let testUser;
  let testToken;
  let leadGeneratorAgent;
  let qualificationAgent;
  let engagementAgent;

  beforeEach(async () => {
    testUser = await createTestUser();
    testToken = createAccessToken(testUser);

    // Create test agents
    leadGeneratorAgent = await Agent.create({
      user_id: testUser.id,
      name: 'Lead Generator',
      description: 'Generates potential leads',
      config: {
        name: 'Lead Generator',
        description: 'Generates potential leads',
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
        system_prompt: 'You are a lead generation assistant.',
        allowed_features: ['lead_generation'],
        rate_limit: 100,
        usage_limit: 1000
      }
    });

    qualificationAgent = await Agent.create({
      user_id: testUser.id,
      name: 'Lead Qualifier',
      description: 'Qualifies potential leads',
      config: {
        name: 'Lead Qualifier',
        description: 'Qualifies potential leads',
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
        system_prompt: 'You are a lead qualification assistant.',
        allowed_features: ['lead_qualification'],
        rate_limit: 100,
        usage_limit: 1000
      }
    });

    engagementAgent = await Agent.create({
      user_id: testUser.id,
      name: 'Lead Engagement',
      description: 'Engages with qualified leads',
      config: {
        name: 'Lead Engagement',
        description: 'Engages with qualified leads',
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 1000,
        system_prompt: 'You are a lead engagement assistant.',
        allowed_features: ['lead_engagement'],
        rate_limit: 100,
        usage_limit: 1000
      }
    });
  });

  describe('Agent Functionality Tests', () => {
    test('should generate leads using lead generator agent', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/agents/${leadGeneratorAgent.id}/process`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          prompt: 'Find potential leads in San Francisco area',
          features: ['lead_generation'],
          metadata: { location: 'San Francisco' }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('tokens_used');
      expect(response.body).toHaveProperty('request_id');
    });

    test('should qualify leads using qualification agent', async () => {
      const testLead = await createTestLead(testUser.id);
      
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/agents/${qualificationAgent.id}/process`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          prompt: `Qualify this lead: ${testLead.name}`,
          features: ['lead_qualification'],
          metadata: { lead_id: testLead.id }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('tokens_used');
    });

    test('should engage with leads using engagement agent', async () => {
      const testLead = await createTestLead(testUser.id);
      
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/agents/${engagementAgent.id}/process`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          prompt: `Engage with this lead: ${testLead.name}`,
          features: ['lead_engagement'],
          metadata: { lead_id: testLead.id }
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('response');
      expect(response.body).toHaveProperty('tokens_used');
    });
  });

  describe('Agent Security Tests', () => {
    test('should prevent unauthorized access to agents', async () => {
      const otherUser = await createTestUser();
      const otherUserToken = createAccessToken(otherUser);

      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/agents/${leadGeneratorAgent.id}/process`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          prompt: 'Generate leads',
          features: ['lead_generation']
        });

      expect(response.status).toBe(404);
    });

    test('should prevent access to unauthorized features', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/agents/${leadGeneratorAgent.id}/process`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          prompt: 'Generate leads',
          features: ['unauthorized_feature']
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Agent Integration Tests', () => {
    test('should maintain agent logs for all interactions', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/agents/${leadGeneratorAgent.id}/process`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          prompt: 'Generate leads',
          features: ['lead_generation']
        });

      const log = await AgentLog.findOne({
        agent_id: leadGeneratorAgent.id,
        request_id: response.body.request_id
      });

      expect(log).toBeTruthy();
      expect(log.user_id).toBe(testUser.id);
      expect(log.status).toBe('success');
    });

    test('should handle agent errors gracefully', async () => {
      const response = await request(process.env.NEXT_PUBLIC_API_URL)
        .post(`/agents/${leadGeneratorAgent.id}/process`)
        .set('Authorization', `Bearer ${testToken}`)
        .send({
          prompt: '', // Empty prompt should trigger error
          features: ['lead_generation']
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Agent Performance Tests', () => {
    test('should handle concurrent agent requests', async () => {
      const requests = Array(5).fill().map(() =>
        request(process.env.NEXT_PUBLIC_API_URL)
          .post(`/agents/${leadGeneratorAgent.id}/process`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            prompt: 'Generate leads',
            features: ['lead_generation']
          })
      );

      const responses = await Promise.all(requests);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });

    test('should respect rate limits', async () => {
      const requests = Array(150).fill().map(() =>
        request(process.env.NEXT_PUBLIC_API_URL)
          .post(`/agents/${leadGeneratorAgent.id}/process`)
          .set('Authorization', `Bearer ${testToken}`)
          .send({
            prompt: 'Generate leads',
            features: ['lead_generation']
          })
      );

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
}); 