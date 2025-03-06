const express = require('express');
const router = express.Router();
const User = require('@/models/user');
const { hashPassword, verifyPassword } = require('@/core/security');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !await verifyPassword(password, user.password)) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, roles: user.roles },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({ token, user: { id: user._id, email: user.email, roles: user.roles } });
  } catch (error) {
    next(error);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email,
      password: hashedPassword,
      full_name,
      roles: ['user']
    });
    
    res.status(201).json({ 
      message: 'User registered successfully',
      user: { id: user._id, email: user.email, roles: user.roles }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router; 