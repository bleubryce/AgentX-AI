#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
  source .env
fi

# Run linting
echo "Running linting..."
npm run lint

# Run type checking
echo "Running type checking..."
npm run type-check

# Run unit tests
echo "Running unit tests..."
npm run test:unit

# Run integration tests
echo "Running integration tests..."
npm run test:integration

# Run end-to-end tests
echo "Running end-to-end tests..."
npm run test:e2e

# Generate coverage report
echo "Generating coverage report..."
npm run test:coverage

# Check for security vulnerabilities
echo "Checking for security vulnerabilities..."
npm audit

# Run performance tests
echo "Running performance tests..."
npm run test:perf

echo "All tests completed successfully!" 