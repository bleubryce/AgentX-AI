#!/usr/bin/env python3
"""
Run the Agent Manager for the Real Estate Lead Generation AI Agents
"""

import os
import sys
import time
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("AgentRunner")

if __name__ == "__main__":
    # Initialize the database
    logger.info("Initializing database...")
    os.system("python src/data/init_db.py")
    
    # Import the agent manager
    logger.info("Starting Agent Manager...")
    from src.core.agent_manager import get_agent_manager
    
    # Get the agent manager
    agent_manager = get_agent_manager()
    
    logger.info("Agent Manager running. Press Ctrl+C to exit.")
    
    try:
        # Keep the main thread alive
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Agent Manager shutting down") 