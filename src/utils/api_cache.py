"""
API Caching Utility for Real Estate Lead Generation AI Agents

This module provides caching functionality to minimize API requests
and make the most of limited API quotas.
"""

import os
import json
import time
import hashlib
import logging
from typing import Dict, Any, Optional, Callable
from datetime import datetime, timedelta
from pathlib import Path

# Set up logging
logger = logging.getLogger(__name__)

class APICache:
    """
    Cache API responses to disk to minimize API requests.
    """
    
    def __init__(self, cache_dir: str = "data/api_cache", ttl_days: int = 7):
        """
        Initialize the API cache.
        
        Args:
            cache_dir: Directory to store cache files
            ttl_days: Time-to-live in days for cached responses
        """
        self.cache_dir = Path(cache_dir)
        self.ttl_days = ttl_days
        self.stats = {
            "hits": 0,
            "misses": 0,
            "errors": 0
        }
        
        # Create cache directory if it doesn't exist
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Create subdirectories for different APIs
        os.makedirs(self.cache_dir / "rentcast", exist_ok=True)
        os.makedirs(self.cache_dir / "zillow", exist_ok=True)
        os.makedirs(self.cache_dir / "realtor", exist_ok=True)
        os.makedirs(self.cache_dir / "attom", exist_ok=True)
    
    def _generate_cache_key(self, api_name: str, endpoint: str, params: Dict) -> str:
        """
        Generate a unique cache key based on API name, endpoint, and parameters.
        
        Args:
            api_name: Name of the API (e.g., "rentcast", "zillow")
            endpoint: API endpoint
            params: API parameters
            
        Returns:
            Cache key string
        """
        # Convert params to a sorted, stable string representation
        param_str = json.dumps(params, sort_keys=True)
        
        # Create a hash of the endpoint and parameters
        hash_obj = hashlib.md5(f"{endpoint}:{param_str}".encode())
        hash_str = hash_obj.hexdigest()
        
        return hash_str
    
    def _get_cache_path(self, api_name: str, cache_key: str) -> Path:
        """
        Get the file path for a cache entry.
        
        Args:
            api_name: Name of the API
            cache_key: Cache key
            
        Returns:
            Path to cache file
        """
        return self.cache_dir / api_name / f"{cache_key}.json"
    
    def get(self, api_name: str, endpoint: str, params: Dict) -> Optional[Dict]:
        """
        Get a cached API response if available and not expired.
        
        Args:
            api_name: Name of the API
            endpoint: API endpoint
            params: API parameters
            
        Returns:
            Cached response or None if not found or expired
        """
        cache_key = self._generate_cache_key(api_name, endpoint, params)
        cache_path = self._get_cache_path(api_name, cache_key)
        
        if not cache_path.exists():
            self.stats["misses"] += 1
            return None
        
        try:
            with open(cache_path, 'r') as f:
                cache_data = json.load(f)
            
            # Check if cache is expired
            cached_time = datetime.fromisoformat(cache_data["cached_at"])
            expiration_time = cached_time + timedelta(days=self.ttl_days)
            
            if datetime.now() > expiration_time:
                logger.debug(f"Cache expired for {api_name}/{endpoint}")
                self.stats["misses"] += 1
                return None
            
            logger.debug(f"Cache hit for {api_name}/{endpoint}")
            self.stats["hits"] += 1
            return cache_data["response"]
            
        except Exception as e:
            logger.warning(f"Error reading cache: {str(e)}")
            self.stats["errors"] += 1
            return None
    
    def set(self, api_name: str, endpoint: str, params: Dict, response: Dict) -> None:
        """
        Cache an API response.
        
        Args:
            api_name: Name of the API
            endpoint: API endpoint
            params: API parameters
            response: API response to cache
        """
        cache_key = self._generate_cache_key(api_name, endpoint, params)
        cache_path = self._get_cache_path(api_name, cache_key)
        
        try:
            cache_data = {
                "cached_at": datetime.now().isoformat(),
                "endpoint": endpoint,
                "params": params,
                "response": response
            }
            
            with open(cache_path, 'w') as f:
                json.dump(cache_data, f, indent=2)
                
            logger.debug(f"Cached response for {api_name}/{endpoint}")
            
        except Exception as e:
            logger.warning(f"Error caching response: {str(e)}")
            self.stats["errors"] += 1
    
    def clear(self, api_name: Optional[str] = None) -> int:
        """
        Clear cached responses.
        
        Args:
            api_name: Name of the API to clear, or None to clear all
            
        Returns:
            Number of cache files deleted
        """
        count = 0
        
        if api_name:
            # Clear specific API cache
            api_cache_dir = self.cache_dir / api_name
            if api_cache_dir.exists():
                for cache_file in api_cache_dir.glob("*.json"):
                    cache_file.unlink()
                    count += 1
        else:
            # Clear all caches
            for api_dir in self.cache_dir.iterdir():
                if api_dir.is_dir():
                    for cache_file in api_dir.glob("*.json"):
                        cache_file.unlink()
                        count += 1
        
        logger.info(f"Cleared {count} cache files")
        return count
    
    def get_stats(self) -> Dict[str, int]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        return self.stats
    
    def cached_api_call(self, api_name: str, endpoint: str, params: Dict, api_func: Callable) -> Dict:
        """
        Make an API call with caching.
        
        Args:
            api_name: Name of the API
            endpoint: API endpoint
            params: API parameters
            api_func: Function to call if cache miss
            
        Returns:
            API response (from cache or fresh)
        """
        # Try to get from cache first
        cached_response = self.get(api_name, endpoint, params)
        
        if cached_response is not None:
            return cached_response
        
        # Cache miss, make the actual API call
        logger.info(f"Cache miss for {api_name}/{endpoint}, making API call")
        response = api_func()
        
        # Cache the response
        self.set(api_name, endpoint, params, response)
        
        return response

# Singleton instance
_cache_instance = None

def get_api_cache() -> APICache:
    """
    Get the singleton instance of the APICache.
    
    Returns:
        APICache instance
    """
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = APICache()
    return _cache_instance 