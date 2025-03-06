#!/usr/bin/env python3
"""
Environment Check Script for Real Estate Lead Generation AI Agents

This script verifies that all required dependencies and configurations
are properly set up for the Real Estate Lead Generation AI Agents system.
"""

import os
import sys
import importlib
import subprocess
import platform
from dotenv import load_dotenv

# Define colors for terminal output
GREEN = "\033[92m"
YELLOW = "\033[93m"
RED = "\033[91m"
RESET = "\033[0m"
BOLD = "\033[1m"

def print_status(message, status, details=None):
    """Print a status message with color coding."""
    status_color = {
        "OK": GREEN,
        "WARNING": YELLOW,
        "ERROR": RED
    }.get(status, RESET)
    
    print(f"{message:<50} [{status_color}{status}{RESET}]")
    if details:
        print(f"  {details}")

def check_python_version():
    """Check if Python version is compatible."""
    required_version = (3, 9)
    current_version = sys.version_info
    
    if current_version >= required_version:
        print_status("Python version", "OK", f"v{current_version.major}.{current_version.minor}.{current_version.micro}")
        return True
    else:
        print_status("Python version", "ERROR", 
                    f"v{current_version.major}.{current_version.minor}.{current_version.micro} (Required: {required_version[0]}.{required_version[1]}+)")
        return False

def check_dependencies():
    """Check if all required packages are installed."""
    required_packages = [
        "fastapi", "uvicorn", "pydantic", "pymongo", "motor", 
        "openai", "langchain", "transformers", "requests", 
        "beautifulsoup4", "pandas", "numpy", "typer"
    ]
    
    missing_packages = []
    
    for package in required_packages:
        try:
            importlib.import_module(package)
            print_status(f"Package: {package}", "OK")
        except ImportError:
            print_status(f"Package: {package}", "ERROR", "Not installed")
            missing_packages.append(package)
    
    return len(missing_packages) == 0

def check_environment_variables():
    """Check if required environment variables are set."""
    load_dotenv()
    
    required_vars = [
        "MONGODB_URI",
        "OPENAI_API_KEY"
    ]
    
    optional_vars = [
        "ZILLOW_API_KEY",
        "REALTOR_API_KEY",
        "ATTOM_API_KEY",
        "EMAIL_HOST",
        "EMAIL_PORT",
        "EMAIL_USER",
        "EMAIL_PASSWORD"
    ]
    
    all_required_present = True
    
    for var in required_vars:
        if os.getenv(var):
            print_status(f"Environment variable: {var}", "OK")
        else:
            print_status(f"Environment variable: {var}", "ERROR", "Not set")
            all_required_present = False
    
    for var in optional_vars:
        if os.getenv(var):
            print_status(f"Environment variable: {var}", "OK")
        else:
            print_status(f"Environment variable: {var}", "WARNING", "Not set (optional)")
    
    return all_required_present

def check_mongodb_connection():
    """Check if MongoDB is accessible."""
    try:
        import pymongo
        from pymongo.errors import ConnectionFailure
        
        mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/real_estate_leads")
        client = pymongo.MongoClient(mongodb_uri, serverSelectionTimeoutMS=2000)
        client.admin.command('ping')
        print_status("MongoDB connection", "OK", f"Connected to {mongodb_uri}")
        return True
    except (ImportError, ConnectionFailure) as e:
        print_status("MongoDB connection", "ERROR", str(e))
        return False

def main():
    """Run all environment checks."""
    print(f"\n{BOLD}Real Estate Lead Generation AI Agents - Environment Check{RESET}\n")
    
    system_info = f"{platform.system()} {platform.release()} ({platform.architecture()[0]})"
    print(f"System: {system_info}")
    print(f"Python: {sys.version.split()[0]}")
    print(f"Working directory: {os.getcwd()}")
    print("\n")
    
    checks = [
        ("Python Version", check_python_version),
        ("Dependencies", check_dependencies),
        ("Environment Variables", check_environment_variables),
        ("MongoDB Connection", check_mongodb_connection)
    ]
    
    results = {}
    
    for name, check_func in checks:
        print(f"{BOLD}{name} Check:{RESET}")
        results[name] = check_func()
        print("")
    
    # Summary
    print(f"\n{BOLD}Summary:{RESET}")
    all_passed = all(results.values())
    
    for name, result in results.items():
        status = "OK" if result else "ERROR"
        print_status(name, status)
    
    if all_passed:
        print(f"\n{GREEN}All checks passed! The environment is properly set up.{RESET}")
        return 0
    else:
        print(f"\n{YELLOW}Some checks failed. Please fix the issues before running the application.{RESET}")
        return 1

if __name__ == "__main__":
    sys.exit(main()) 