const mongoose = require('mongoose');
const User = require('../../src/backend/models/user');
const Lead = require('../../src/backend/models/lead');
const { hashPassword } = require('../../src/backend/core/security');
const Agent = require('../../src/backend/models/agent');
const Subscription = require('../../src/backend/models/subscription');

const createTestUser = async (overrides = {}) => {
  const defaultUser = {
    email: `test${Date.now()}@example.com`,
    password: await hashPassword('testpassword123'),
    full_name: 'Test User',
    is_active: true,
    is_superuser: false,
    roles: ['user'],
    ...overrides
  };

  return await User.create(defaultUser);
};

const createTestLead = async (userId, overrides = {}) => {
  const defaultData = {
    user_id: userId,
    name: `Test Lead ${Date.now()}`,
    email: `test${Date.now()}@example.com`,
    phone: '1234567890',
    status: 'new',
    source: 'website',
    notes: 'Test lead notes'
  };

  return await Lead.create({ ...defaultData, ...overrides });
};

const createTestAgent = async (userId, overrides = {}) => {
  const defaultData = {
    user_id: userId,
    name: `Test Agent ${Date.now()}`,
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

  return await Agent.create({ ...defaultData, ...overrides });
};

const createTestSubscription = async (userId, options = {}) => {
  const defaultOptions = {
    plan_id: 'basic_monthly',
    status: 'active',
    stripe_subscription_id: 'sub_test_' + Date.now(),
    stripe_customer_id: 'cus_test_' + Date.now(),
    current_period_start: new Date(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    cancel_at_period_end: false,
    trial_end: null
  };

  const subscriptionData = {
    ...defaultOptions,
    ...options,
    user_id: userId
  };

  const subscription = new Subscription(subscriptionData);
  await subscription.save();
  return subscription;
};

module.exports = {
  createTestUser,
  createTestLead,
  createTestAgent,
  createTestSubscription
}; 