const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const hashPassword = async (password) => {
  if (!password) {
    throw new Error('Password is required for hashing');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

const verifyPassword = async (password, hashedPassword) => {
  // Input validation
  if (!password) {
    throw new Error('Password is required for verification');
  }
  if (!hashedPassword) {
    throw new Error('Hashed password is required for verification');
  }
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }
  if (typeof hashedPassword !== 'string') {
    throw new Error('Hashed password must be a string');
  }

  // Verify password
  try {
    return await bcrypt.compare(password, hashedPassword);
  } catch (error) {
    throw new Error('Password verification failed: Invalid password format');
  }
};

const createAccessToken = (user) => {
  if (!user || (!user.id && !user._id)) {
    throw new Error('User object with id is required');
  }
  return jwt.sign(
    { userId: user._id || user.id },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' });
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ message: 'Invalid authorization format' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    next(error);
  }
}

module.exports = {
  hashPassword,
  verifyPassword,
  createAccessToken,
  verifyToken,
  authenticate
}; 