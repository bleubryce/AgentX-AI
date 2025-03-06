const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: Object.values(err.errors).map(e => ({
        field: e.path,
        message: e.message
      }))
    });
  }

  // Handle duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(409).json({
      error: 'Duplicate Error',
      message: `A record with this ${field} already exists`
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Authentication Error',
      message: 'Token expired'
    });
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError') {
    return res.status(500).json({
      error: 'Database Error',
      message: 'An error occurred while accessing the database'
    });
  }

  // Handle mongoose errors
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: 'Invalid Input',
      message: `Invalid ${err.path}: ${err.value}`
    });
  }

  // Handle custom application errors
  if (err.status) {
    return res.status(err.status).json({
      error: err.name || 'Application Error',
      message: err.message
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
};

module.exports = {
  errorHandler
}; 