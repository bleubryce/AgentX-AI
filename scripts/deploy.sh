#!/bin/bash

# Exit on error
set -e

# Load environment variables
if [ -f .env ]; then
  source .env
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "Installing Vercel CLI..."
  npm install -g vercel
fi

# Check if logged in to Vercel
if ! vercel whoami &> /dev/null; then
  echo "Please log in to Vercel first:"
  vercel login
fi

# Build the application
echo "Building application..."
npm run build

# Run tests
echo "Running tests..."
npm run test

# Deploy to Vercel
echo "Deploying to Vercel..."
vercel deploy --prod

# Verify deployment
echo "Verifying deployment..."
curl -s https://app.agentxai.com > /dev/null
if [ $? -eq 0 ]; then
  echo "Deployment successful! Visit https://app.agentxai.com"
else
  echo "Deployment verification failed. Please check the deployment status."
  exit 1
fi

# Update sitemap
echo "Updating sitemap..."
curl -s https://app.agentxai.com/sitemap.xml > /dev/null
if [ $? -eq 0 ]; then
  echo "Sitemap is accessible"
else
  echo "Sitemap verification failed"
  exit 1
fi

# Check SSL certificate
echo "Verifying SSL certificate..."
curl -s https://app.agentxai.com > /dev/null
if [ $? -eq 0 ]; then
  echo "SSL certificate is valid"
else
  echo "SSL certificate verification failed"
  exit 1
fi

echo "Deployment completed successfully!" 