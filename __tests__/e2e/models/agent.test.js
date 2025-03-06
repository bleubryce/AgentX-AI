const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const Agent = require('../../../src/backend/models/agent');

describe('Agent Model Tests', () => {
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Agent.deleteMany({});
  });

  describe('Agent Creation', () => {
    test('should create a valid agent', async () => {
      const agentData = {
        name: 'Test Agent',
        user_id: new mongoose.Types.ObjectId(),
        type: 'lead_generator',
        status: 'active',
        config: {
          model: 'gpt-4',
          temperature: 0.7,
          max_tokens: 1000
        }
      };

      const agent = new Agent(agentData);
      await agent.save();

      expect(agent._id).toBeDefined();
      expect(agent.name).toBe(agentData.name);
      expect(agent.type).toBe(agentData.type);
      expect(agent.status).toBe(agentData.status);
      expect(agent.config).toEqual(agentData.config);
    });

    test('should require name field', async () => {
      const agentData = {
        user_id: new mongoose.Types.ObjectId(),
        type: 'lead_generator'
      };

      const agent = new Agent(agentData);
      await expect(agent.save()).rejects.toThrow();
    });

    test('should require user_id field', async () => {
      const agentData = {
        name: 'Test Agent',
        type: 'lead_generator'
      };

      const agent = new Agent(agentData);
      await expect(agent.save()).rejects.toThrow();
    });

    test('should validate agent type', async () => {
      const agentData = {
        name: 'Test Agent',
        user_id: new mongoose.Types.ObjectId(),
        type: 'invalid_type'
      };

      const agent = new Agent(agentData);
      await expect(agent.save()).rejects.toThrow();
    });
  });

  describe('Agent Methods', () => {
    let agent;

    beforeEach(async () => {
      agent = new Agent({
        name: 'Test Agent',
        user_id: new mongoose.Types.ObjectId(),
        type: 'lead_generator',
        status: 'active',
        config: {
          model: 'gpt-4',
          temperature: 0.7
        }
      });
      await agent.save();
    });

    test('should update last_active timestamp', async () => {
      const beforeUpdate = agent.last_active;
      await agent.updateLastActive();
      const afterUpdate = agent.last_active;

      expect(afterUpdate).toBeGreaterThan(beforeUpdate);
    });

    test('should update status', async () => {
      await agent.updateStatus('paused');
      expect(agent.status).toBe('paused');
    });

    test('should validate status update', async () => {
      await expect(agent.updateStatus('invalid_status')).rejects.toThrow();
    });
  });

  describe('Agent Queries', () => {
    beforeEach(async () => {
      await Agent.create([
        {
          name: 'Agent 1',
          user_id: new mongoose.Types.ObjectId(),
          type: 'lead_generator',
          status: 'active'
        },
        {
          name: 'Agent 2',
          user_id: new mongoose.Types.ObjectId(),
          type: 'qualifier',
          status: 'paused'
        }
      ]);
    });

    test('should find agents by user_id', async () => {
      const userId = new mongoose.Types.ObjectId();
      await Agent.create({
        name: 'User Agent',
        user_id: userId,
        type: 'lead_generator',
        status: 'active'
      });

      const userAgents = await Agent.findByUserId(userId);
      expect(userAgents).toHaveLength(1);
      expect(userAgents[0].name).toBe('User Agent');
    });

    test('should find active agents', async () => {
      const activeAgents = await Agent.findActive();
      expect(activeAgents).toHaveLength(1);
      expect(activeAgents[0].status).toBe('active');
    });

    test('should find agents by type', async () => {
      const leadGenerators = await Agent.findByType('lead_generator');
      expect(leadGenerators).toHaveLength(1);
      expect(leadGenerators[0].type).toBe('lead_generator');
    });
  });
}); 