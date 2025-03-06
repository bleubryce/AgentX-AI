const express = require('express');
const router = express.Router();

// Import route handlers
const authRoutes = require('./endpoints/auth');
const leadRoutes = require('./endpoints/leads');
const agentRoutes = require('./endpoints/agents');
const paymentRoutes = require('./endpoints/payments');

// Mount routes
router.use('/auth', authRoutes);
router.use('/leads', leadRoutes);
router.use('/agents', agentRoutes);
router.use('/payments', paymentRoutes);

module.exports = router; 