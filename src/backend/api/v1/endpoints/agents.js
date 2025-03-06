const express = require('express');
const { body, param } = require('express-validator');
const { validateRequest } = require('../middleware/validation');
const Agent = require('@/models/agent');
const AgentLog = require('@/models/agent_log');
const Subscription = require('@/models/subscription');

const router = express.Router();

// Middleware to check subscription
async function checkSubscription(req, res, next) {
  const subscription = await Subscription.findOne({ 
    user_id: req.user.id,
    status: 'active'
  });

  if (!subscription) {
    return res.status(403).json({ error: 'Subscription required' });
  }
  
  req.subscription = subscription;
  next();
}

// Create agent
router.post('/',
  checkSubscription,
  [
    body('name').notEmpty().trim(),
    body('description').notEmpty().trim(),
    body('config').isObject(),
    body('config.model').notEmpty().trim(),
    body('config.temperature').isFloat({ min: 0, max: 1 }),
    body('config.max_tokens').isInt({ min: 1 }),
    body('config.system_prompt').notEmpty().trim(),
    body('config.allowed_features').isArray()
  ],
  validateRequest,
  async (req, res) => {
    try {
      // Check for duplicate name
      const existingAgent = await Agent.findOne({
        user_id: req.user.id,
        name: req.body.name
      });

      if (existingAgent) {
        return res.status(400).json({ error: 'Agent with this name already exists' });
      }

      const agent = await Agent.create({
        user_id: req.user.id,
        name: req.body.name,
        description: req.body.description,
        config: req.body.config
      });

      res.status(201).json(agent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to create agent' });
    }
  }
);

// Query agent
router.post('/:id/query',
  checkSubscription,
  [
    param('id').isMongoId(),
    body('prompt').notEmpty().trim(),
    body('features').isArray()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const agent = await Agent.findOne({
        _id: req.params.id,
        user_id: req.user.id
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      // Check feature access
      const invalidFeatures = req.body.features.filter(
        f => !agent.config.allowed_features.includes(f)
      );

      if (invalidFeatures.length > 0) {
        return res.status(403).json({ error: 'Feature not allowed' });
      }

      // Mock response for testing
      const response = {
        response: 'Test response',
        tokens_used: 100,
        request_id: 'test-' + Date.now()
      };

      // Log the request
      await AgentLog.create({
        agent_id: agent.id,
        user_id: req.user.id,
        request_id: response.request_id,
        prompt: req.body.prompt,
        response: response.response,
        tokens_used: response.tokens_used,
        features: req.body.features,
        status: 'success'
      });

      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'Failed to process query' });
    }
  }
);

// Update agent
router.put('/:id',
  checkSubscription,
  [
    param('id').isMongoId(),
    body('description').optional().trim(),
    body('config').optional().isObject()
  ],
  validateRequest,
  async (req, res) => {
    try {
      const agent = await Agent.findOneAndUpdate(
        { _id: req.params.id, user_id: req.user.id },
        { $set: req.body },
        { new: true }
      );

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      res.json(agent);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update agent' });
    }
  }
);

// Delete agent
router.delete('/:id',
  checkSubscription,
  param('id').isMongoId(),
  validateRequest,
  async (req, res) => {
    try {
      const agent = await Agent.findOneAndDelete({
        _id: req.params.id,
        user_id: req.user.id
      });

      if (!agent) {
        return res.status(404).json({ error: 'Agent not found' });
      }

      res.json({ message: 'Agent deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete agent' });
    }
  }
);

// Get agent stats
router.get('/:id/stats',
  checkSubscription,
  param('id').isMongoId(),
  validateRequest,
  async (req, res) => {
    try {
      const logs = await AgentLog.find({
        agent_id: req.params.id,
        user_id: req.user.id
      });

      const total_tokens = logs.reduce((sum, log) => sum + log.tokens_used, 0);
      const total_requests = logs.length;

      res.json({
        total_requests,
        total_tokens,
        average_tokens_per_request: total_requests ? total_tokens / total_requests : 0
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve stats' });
    }
  }
);

// Get agent logs
router.get('/:id/logs',
  checkSubscription,
  param('id').isMongoId(),
  validateRequest,
  async (req, res) => {
    try {
      const logs = await AgentLog.find({
        agent_id: req.params.id,
        user_id: req.user.id
      }).sort({ created_at: -1 });

      res.json({ logs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve logs' });
    }
  }
);

module.exports = router; 