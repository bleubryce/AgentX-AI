# Installation Guide

This guide will help you set up the Real Estate Lead Generation AI Agents system on your local machine.

## Prerequisites

- Python 3.9+ installed
- MongoDB installed and running
- Node.js 16+ (for the frontend)
- API keys for various services (details below)

## Step 1: Clone the Repository

```bash
git clone https://github.com/yourusername/real-estate-lead-agents.git
cd real-estate-lead-agents
```

## Step 2: Set Up Python Environment

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

## Step 3: Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Database Configuration
MONGODB_URI=mongodb://localhost:27017/real_estate_leads

# API Keys
OPENAI_API_KEY=your_openai_api_key
ZILLOW_API_KEY=your_zillow_api_key
REALTOR_API_KEY=your_realtor_api_key
ATTOM_API_KEY=your_attom_api_key

# Email Configuration (for lead engagement)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Web Scraping Configuration
PROXY_SERVICE=your_proxy_service_url
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36
```

## Step 4: Initialize the Database

```bash
python src/data/init_db.py
```

## Step 5: Run the Backend

```bash
uvicorn src.api.main:app --reload
```

## Step 6: Set Up the Frontend (Optional)

If you want to use the web interface:

```bash
cd ui
npm install
npm start
```

## Step 7: Run the Agent System

```bash
python src/core/agent_manager.py
```

## Troubleshooting

- **MongoDB Connection Issues**: Ensure MongoDB is running and the connection string is correct
- **API Rate Limiting**: If you encounter rate limiting, adjust the `REQUEST_DELAY` in the config
- **Selenium Issues**: Make sure you have the appropriate webdriver installed for your browser

## Next Steps

Once installation is complete, refer to the [User Guide](user_guide.md) for instructions on how to use the system. 