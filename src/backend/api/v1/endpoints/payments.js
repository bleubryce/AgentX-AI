const express = require('express');
const router = express.Router();
const Payment = require('@/models/payment');
const { authenticate } = require('@/core/security');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const payments = await Payment.find({ user_id: req.user.userId });
    res.json(payments);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const paymentData = {
      ...req.body,
      user_id: req.user.userId,
      status: 'pending'
    };
    
    const payment = await Payment.create(paymentData);
    res.status(201).json(payment);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      user_id: req.user.userId
    });
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    next(error);
  }
});

router.put('/:id/status', authenticate, async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['pending', 'completed', 'failed'].includes(status)) {
      return res.status(400).json({ message: 'Invalid payment status' });
    }
    
    const payment = await Payment.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.userId },
      { status },
      { new: true }
    );
    
    if (!payment) {
      return res.status(404).json({ message: 'Payment not found' });
    }
    
    res.json(payment);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 