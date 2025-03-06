const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const routes = require('../../src/backend/api/v1/routes');
const { errorHandler } = require('../../src/backend/api/v1/middleware/error');

function createTestServer() {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  
  // API Routes
  app.use('/api/v1', routes);
  
  // Error handling
  app.use(errorHandler);
  
  return app;
}

module.exports = { createTestServer }; 