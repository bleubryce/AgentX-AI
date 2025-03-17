# Deployment Guide

This guide provides instructions for deploying the Subscription Analytics Dashboard to a production environment.

## Prerequisites

- Node.js 16+ and npm
- Python 3.9+
- PostgreSQL or MongoDB database
- Redis (for caching)
- Stripe account with API keys

## Backend Deployment

### Option 1: Traditional Server Deployment

1. **Prepare the environment**

   Create a production environment file `.env.production` with your production settings:

   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/subscription_db
   REDIS_URL=redis://localhost:6379/0
   STRIPE_API_KEY=sk_live_your_stripe_key
   STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   JWT_SECRET=your_secure_jwt_secret
   CORS_ORIGINS=https://yourdomain.com
   ```

2. **Install production dependencies**

   ```bash
   pip install -r requirements.txt
   ```

3. **Set up the database**

   ```bash
   alembic upgrade head
   ```

4. **Run with a production ASGI server**

   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker src.backend.main:app
   ```

   For better performance, consider using Uvicorn behind Nginx:

   ```bash
   uvicorn src.backend.main:app --host 0.0.0.0 --port 8000 --workers 4
   ```

### Option 2: Docker Deployment

1. **Build the Docker image**

   ```bash
   docker build -f Dockerfile.backend -t subscription-backend .
   ```

2. **Run the container**

   ```bash
   docker run -d -p 8000:8000 \
     -e DATABASE_URL=postgresql://user:password@db:5432/subscription_db \
     -e REDIS_URL=redis://redis:6379/0 \
     -e STRIPE_API_KEY=sk_live_your_stripe_key \
     -e STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret \
     -e JWT_SECRET=your_secure_jwt_secret \
     -e CORS_ORIGINS=https://yourdomain.com \
     --name subscription-backend \
     subscription-backend
   ```

### Option 3: Cloud Deployment

#### AWS Elastic Beanstalk

1. Install the EB CLI:
   ```bash
   pip install awsebcli
   ```

2. Initialize EB application:
   ```bash
   eb init -p python-3.9 subscription-backend
   ```

3. Create an environment:
   ```bash
   eb create subscription-backend-prod
   ```

4. Deploy:
   ```bash
   eb deploy
   ```

#### Heroku

1. Install Heroku CLI:
   ```bash
   npm install -g heroku
   ```

2. Login to Heroku:
   ```bash
   heroku login
   ```

3. Create a new app:
   ```bash
   heroku create subscription-backend
   ```

4. Add PostgreSQL:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

5. Add Redis:
   ```bash
   heroku addons:create heroku-redis:hobby-dev
   ```

6. Set environment variables:
   ```bash
   heroku config:set STRIPE_API_KEY=sk_live_your_stripe_key
   heroku config:set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   heroku config:set JWT_SECRET=your_secure_jwt_secret
   ```

7. Deploy:
   ```bash
   git push heroku main
   ```

## Frontend Deployment

### Option 1: Static Site Hosting

1. **Build the production bundle**

   ```bash
   npm run build
   ```

   This creates a `build` directory with optimized production files.

2. **Deploy to a static hosting service**

   - **Netlify**:
     ```bash
     npm install -g netlify-cli
     netlify deploy --prod --dir=build
     ```

   - **Vercel**:
     ```bash
     npm install -g vercel
     vercel --prod
     ```

   - **AWS S3 + CloudFront**:
     ```bash
     aws s3 sync build/ s3://your-bucket-name
     ```

### Option 2: Docker Deployment

1. **Build the Docker image**

   ```bash
   docker build -f Dockerfile.frontend -t subscription-frontend .
   ```

2. **Run the container**

   ```bash
   docker run -d -p 80:80 \
     -e REACT_APP_API_URL=https://api.yourdomain.com \
     --name subscription-frontend \
     subscription-frontend
   ```

## Setting Up Continuous Integration/Deployment

### GitHub Actions

Create a file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt
      - name: Run tests
        run: pytest
      - name: Deploy to Heroku
        uses: akhileshns/heroku-deploy@v3.12.14
        with:
          heroku_api_key: ${{ secrets.HEROKU_API_KEY }}
          heroku_app_name: "subscription-backend"
          heroku_email: ${{ secrets.HEROKU_EMAIL }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2.0
        with:
          publish-dir: './build'
          production-branch: main
          github-token: ${{ secrets.GITHUB_TOKEN }}
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## SSL Configuration

For production, always use HTTPS. If you're using Nginx as a reverse proxy:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;  # Frontend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api {
        proxy_pass http://localhost:8000;  # Backend
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Monitoring and Logging

Consider setting up:

1. **Sentry** for error tracking
2. **Prometheus** and **Grafana** for metrics
3. **ELK Stack** (Elasticsearch, Logstash, Kibana) for log management

## Database Backups

Set up automated backups for your production database:

```bash
# PostgreSQL backup example
pg_dump -U username -d subscription_db | gzip > backup_$(date +%Y-%m-%d).sql.gz

# MongoDB backup example
mongodump --uri="mongodb://username:password@localhost:27017/subscription_db" --out=backup_$(date +%Y-%m-%d)
```

## Security Considerations

1. **API Rate Limiting**: Implement rate limiting to prevent abuse
2. **Regular Security Audits**: Scan for vulnerabilities regularly
3. **Data Encryption**: Ensure sensitive data is encrypted at rest and in transit
4. **Regular Updates**: Keep all dependencies updated to patch security vulnerabilities 