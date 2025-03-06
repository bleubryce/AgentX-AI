#!/usr/bin/env python3
"""
Database Initialization Script for the Real Estate Lead Generation AI Agents
"""

import os
import sys
import logging
from typing import Dict, List, Optional, Any

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import lead repository
from src.data.lead_repository import LeadRepository

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("InitDB")

def init_mongodb():
    """Initialize MongoDB database"""
    try:
        from pymongo import MongoClient
        from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
        
        # Try to connect to MongoDB
        mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/real_estate_leads")
        client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
        client.server_info()  # Will raise exception if connection fails
        
        # Get database
        db = client.get_database()
        
        # Create collections if they don't exist
        if "leads" not in db.list_collection_names():
            db.create_collection("leads")
            logger.info("Created 'leads' collection")
        
        # Create indexes
        db.leads.create_index("agent_type")
        db.leads.create_index("agent_id")
        db.leads.create_index("created_at")
        db.leads.create_index("lead_type")
        db.leads.create_index("lead_status")
        db.leads.create_index("lead_score")
        db.leads.create_index([("agent_type", 1), ("agent_id", 1)])
        logger.info("Created indexes on 'leads' collection")
        
        # Create TTL index for old leads (optional)
        # This will automatically delete leads older than 1 year
        # db.leads.create_index("created_at", expireAfterSeconds=31536000)
        # logger.info("Created TTL index on 'leads' collection")
        
        logger.info("MongoDB initialization complete")
        return True
    except (ImportError, ConnectionFailure, ServerSelectionTimeoutError) as e:
        logger.warning(f"Could not initialize MongoDB: {str(e)}")
        return False

def init_file_storage():
    """Initialize file-based storage"""
    try:
        # Create necessary directories
        os.makedirs("data/leads", exist_ok=True)
        logger.info("Created 'data/leads' directory")
        
        # Create empty README file to explain the directory structure
        readme_path = "data/README.md"
        if not os.path.exists(readme_path):
            with open(readme_path, 'w') as f:
                f.write("""# Data Directory

This directory contains the file-based storage for the Real Estate Lead Generation AI Agents.

## Structure

- `leads/`: Contains JSON files with lead data
  - Format: `{agent_type}_{agent_id}_{timestamp}.json`

## Notes

- This file-based storage is used when MongoDB is not available
- Each file contains an array of lead objects
- Files are named based on the agent that generated the leads and the timestamp
""")
            logger.info("Created README file in data directory")
        
        logger.info("File storage initialization complete")
        return True
    except Exception as e:
        logger.error(f"Could not initialize file storage: {str(e)}")
        return False

def main():
    """Main entry point for the script"""
    logger.info("Initializing database...")
    
    # Try to initialize MongoDB
    mongodb_success = init_mongodb()
    
    # Initialize file storage (as fallback or primary storage)
    file_storage_success = init_file_storage()
    
    if mongodb_success:
        logger.info("Database initialization complete (MongoDB)")
    elif file_storage_success:
        logger.info("Database initialization complete (File Storage)")
    else:
        logger.error("Database initialization failed")
        sys.exit(1)

if __name__ == "__main__":
    main() 