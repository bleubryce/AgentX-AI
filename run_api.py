#!/usr/bin/env python3
"""
Run the API server for the Real Estate Lead Generation AI Agents
"""

import os
import sys
import uvicorn

if __name__ == "__main__":
    # Initialize the database
    print("Initializing database...")
    os.system("python src/data/init_db.py")
    
    # Run the API server
    print("Starting API server...")
    uvicorn.run("src.api.main:app", host="0.0.0.0", port=8000, reload=True) 