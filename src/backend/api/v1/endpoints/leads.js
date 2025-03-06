const express = require('express');
const router = express.Router();
const Lead = require('@/models/lead');
const { authenticate } = require('@/core/security');

router.get('/', authenticate, async (req, res, next) => {
  try {
    const leads = await Lead.find({ user_id: req.user.userId });
    res.json(leads);
  } catch (error) {
    next(error);
  }
});

router.post('/', authenticate, async (req, res, next) => {
  try {
    const leadData = {
      ...req.body,
      user_id: req.user.userId
    };
    
    const lead = await Lead.create(leadData);
    res.status(201).json(lead);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const lead = await Lead.findOne({ 
      _id: req.params.id,
      user_id: req.user.userId
    });
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, user_id: req.user.userId },
      req.body,
      { new: true }
    );
    
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }
    
    res.json(lead);
  } catch (error) {
    next(error);
  }
});

module.exports = router; 