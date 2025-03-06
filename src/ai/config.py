"""
Configuration settings for AI Realtor Assistant
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# API Keys and Credentials
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
CALENDLY_API_KEY = os.getenv("CALENDLY_API_KEY")
ZILLOW_API_KEY = os.getenv("ZILLOW_API_KEY")
CANVA_API_KEY = os.getenv("CANVA_API_KEY")
HOOTSUITE_API_KEY = os.getenv("HOOTSUITE_API_KEY")
DOCUSIGN_API_KEY = os.getenv("DOCUSIGN_API_KEY")
HUBSPOT_API_KEY = os.getenv("HUBSPOT_API_KEY")
MARKET_DATA_API_KEY = os.getenv("MARKET_DATA_API_KEY")
ZOHO_CRM_API_KEY = os.getenv("ZOHO_CRM_API_KEY")
ZOHO_CRM_ACCOUNT_ID = os.getenv("ZOHO_CRM_ACCOUNT_ID")
ZOHO_CRM_MODULE = os.getenv("ZOHO_CRM_MODULE", "Leads")  # Default to "Leads" module
EMAIL_SERVICE_API_KEY = os.getenv("EMAIL_SERVICE_API_KEY")

# Report Settings
REPORT_SETTINGS = {
    "default_format": "pdf",
    "available_formats": ["pdf", "excel", "html"],
    "templates": {
        "market_analysis": "templates/reports/market_analysis.html",
        "lead_performance": "templates/reports/lead_performance.html",
        "financial_summary": "templates/reports/financial_summary.html",
        "trend_analysis": "templates/reports/trend_analysis.html"
    },
    "scheduling": {
        "default_frequency": "weekly",
        "available_frequencies": ["daily", "weekly", "monthly", "quarterly"],
        "retention_days": 90
    },
    "customization": {
        "company_logo": "assets/logo.png",
        "color_scheme": "default",
        "font_family": "Arial",
        "font_size": 12
    }
}

# Analytics Settings
ANALYTICS_SETTINGS = {
    "default_timeframe": "6m",
    "confidence_threshold": 0.8,
    "market_health_threshold": 0.7,
    "update_interval": 3600,  # 1 hour in seconds
    "data_retention_days": 90,
    "metrics": {
        "price_trends": True,
        "market_indicators": True,
        "investment_potential": True,
        "neighborhood_stats": True,
        "lead_analytics": True,
        "performance_metrics": True
    },
    "visualization": {
        "chart_types": ["line", "bar", "scatter", "heatmap"],
        "default_chart": "line",
        "color_scheme": "viridis",
        "interactive": True
    }
}

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/ai_realtor")

# AI Model Configuration
GPT_MODEL = "gpt-4"  # or "gpt-3.5-turbo" for cost optimization
TEMPERATURE = 0.7
MAX_TOKENS = 1000

# Lead Generation Settings
LEAD_QUALIFICATION_PROMPT = """
You are an AI assistant helping to qualify real estate leads. 
Analyze the following conversation and determine:
1. The lead's intent (buy, sell, or refinance)
2. Their timeline
3. Their budget range
4. Their location preferences
5. Their urgency level
6. Any specific requirements or constraints

Provide a structured response with these details.
"""

# Email Templates
FOLLOW_UP_TEMPLATE = """
Hi {name},

Thank you for your interest in {property_type} in {location}. 
I wanted to follow up on our previous conversation about {topic}.

{personalized_content}

Would you like to schedule a call to discuss this further?

Best regards,
{agent_name}
"""

# Social Media Templates
SOCIAL_POST_TEMPLATE = """
🏠 New {property_type} in {location}!

{property_description}

Key Features:
{features}

Contact me for more details!
#RealEstate #{location} #HomesForSale
"""

# Market Analysis Settings
MARKET_ANALYSIS_PROMPT = """
Analyze the following market data for {location}:
1. Recent sales trends
2. Price per square foot
3. Days on market
4. Inventory levels
5. Market conditions

Provide insights and recommendations for pricing strategy.
"""

# Contract Templates
CONTRACT_TEMPLATE = """
REAL ESTATE CONTRACT
Date: {date}
Property: {property_address}
Buyer: {buyer_name}
Seller: {seller_name}
Price: ${price}
Terms: {terms}
"""

# CRM Integration Settings
CRM_SYNC_INTERVAL = 300  # 5 minutes in seconds
LEAD_SCORING_CRITERIA = {
    "budget_match": 0.3,
    "timeline_match": 0.2,
    "location_match": 0.2,
    "urgency": 0.15,
    "engagement": 0.15
}

# Logging Configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"

# Rate Limiting
RATE_LIMIT = {
    "requests_per_minute": 60,
    "requests_per_hour": 1000
}

# Cache Settings
CACHE_TTL = 3600  # 1 hour in seconds

# Alert Settings
ALERT_SETTINGS = {
    "check_interval": 300,  # 5 minutes in seconds
    "alert_types": {
        "price_change": {
            "threshold": 0.05,  # 5% change
            "severity": "high"
        },
        "inventory_change": {
            "threshold": 0.1,  # 10% change
            "severity": "medium"
        },
        "market_trend": {
            "threshold": 0.03,  # 3% change
            "severity": "low"
        }
    },
    "notification_channels": ["email", "sms", "push"],
    "default_channel": "email",
    "alert_history_retention_days": 30,
    "max_alerts_per_hour": 10
} 