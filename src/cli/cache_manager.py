#!/usr/bin/env python3
"""
Cache Manager CLI for Real Estate Lead Generation AI Agents

This script provides a command-line interface to manage the API cache.
"""

import os
import sys
import argparse
import logging
from typing import Dict, List, Optional

# Add parent directory to path to allow imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import API cache and utilities
from src.utils.api_cache import get_api_cache
from src.utils.rentcast_api import get_api_usage, clear_cache as clear_rentcast_cache

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("CacheManager")

def show_stats(args):
    """Show cache statistics"""
    api_cache = get_api_cache()
    stats = api_cache.get_stats()
    
    print("=== API Cache Statistics ===")
    print(f"Cache Hits: {stats['hits']}")
    print(f"Cache Misses: {stats['misses']}")
    print(f"Cache Errors: {stats['errors']}")
    
    # Calculate efficiency
    total_requests = stats['hits'] + stats['misses']
    if total_requests > 0:
        efficiency = stats['hits'] / total_requests * 100
        print(f"Cache Efficiency: {efficiency:.2f}%")
    else:
        print("Cache Efficiency: N/A (no requests)")
    
    # Show RentCast API usage
    try:
        rentcast_usage = get_api_usage()
        print("\n=== RentCast API Usage ===")
        print(f"API Key Present: {rentcast_usage['api_key_present']}")
        print(f"Cache Enabled: {rentcast_usage['cache_enabled']}")
        print(f"Cache TTL: {rentcast_usage['cache_ttl_days']} days")
        print(f"Rate Limit: {rentcast_usage['rate_limit']} requests per minute")
    except Exception as e:
        logger.error(f"Error getting RentCast API usage: {str(e)}")

def clear_cache(args):
    """Clear the API cache"""
    api_cache = get_api_cache()
    
    if args.api:
        # Clear specific API cache
        if args.api.lower() == "rentcast":
            count = clear_rentcast_cache()
        else:
            count = api_cache.clear(args.api.lower())
        print(f"Cleared {count} cache files for {args.api}")
    else:
        # Clear all caches
        count = api_cache.clear()
        print(f"Cleared {count} cache files")

def list_cache(args):
    """List cache files"""
    cache_dir = args.dir or "data/api_cache"
    
    if not os.path.exists(cache_dir):
        print(f"Cache directory {cache_dir} does not exist")
        return
    
    api_dirs = []
    
    # Get all API directories
    for item in os.listdir(cache_dir):
        item_path = os.path.join(cache_dir, item)
        if os.path.isdir(item_path):
            api_dirs.append((item, item_path))
    
    if not api_dirs:
        print("No API cache directories found")
        return
    
    # Print cache information
    for api_name, api_dir in api_dirs:
        cache_files = [f for f in os.listdir(api_dir) if f.endswith('.json')]
        cache_size = sum(os.path.getsize(os.path.join(api_dir, f)) for f in cache_files)
        
        print(f"=== {api_name.capitalize()} Cache ===")
        print(f"Files: {len(cache_files)}")
        print(f"Size: {cache_size / 1024:.2f} KB")
        
        if args.verbose and cache_files:
            print("Cache Files:")
            for cache_file in sorted(cache_files):
                file_path = os.path.join(api_dir, cache_file)
                file_size = os.path.getsize(file_path)
                file_time = os.path.getmtime(file_path)
                print(f"  - {cache_file} ({file_size / 1024:.2f} KB)")

def main():
    """Main entry point for the CLI"""
    parser = argparse.ArgumentParser(description="API Cache Manager")
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Stats command
    stats_parser = subparsers.add_parser("stats", help="Show cache statistics")
    stats_parser.set_defaults(func=show_stats)
    
    # Clear command
    clear_parser = subparsers.add_parser("clear", help="Clear the cache")
    clear_parser.add_argument("--api", help="API to clear (e.g., rentcast, zillow)")
    clear_parser.set_defaults(func=clear_cache)
    
    # List command
    list_parser = subparsers.add_parser("list", help="List cache files")
    list_parser.add_argument("--dir", help="Cache directory (default: data/api_cache)")
    list_parser.add_argument("--verbose", "-v", action="store_true", help="Show detailed information")
    list_parser.set_defaults(func=list_cache)
    
    # Parse arguments
    args = parser.parse_args()
    
    # Run the appropriate function
    if hasattr(args, "func"):
        args.func(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main() 