"""
RentCast API Integration for Real Estate Lead Generation AI Agents

This module provides functions to interact with the RentCast API for property data.
API Documentation: https://developers.rentcast.io/reference/introduction
"""

import os
import json
import logging
import requests
import time
from typing import Dict, List, Optional, Union, Any
from dotenv import load_dotenv
from functools import wraps

# Import the API cache
from src.utils.api_cache import get_api_cache

# Load environment variables
load_dotenv()

# Set up logging
logger = logging.getLogger(__name__)

# API Configuration
RENTCAST_API_KEY = os.getenv("RENTCAST_API_KEY")
RENTCAST_BASE_URL = "https://api.rentcast.io/v1"
RENTCAST_RATE_LIMIT = int(os.getenv("RENTCAST_RATE_LIMIT", "5"))  # Requests per minute
RENTCAST_REQUEST_DELAY = 60.0 / RENTCAST_RATE_LIMIT  # Seconds between requests
RENTCAST_USE_CACHE = os.getenv("RENTCAST_USE_CACHE", "true").lower() == "true"
RENTCAST_CACHE_DAYS = int(os.getenv("RENTCAST_CACHE_DAYS", "30"))  # Cache TTL in days

# Track the last request time for rate limiting
_last_request_time = 0

class RentcastAPIError(Exception):
    """Exception raised for RentCast API errors."""
    pass

def rate_limited(func):
    """
    Decorator to rate limit API calls.
    """
    @wraps(func)
    def wrapper(*args, **kwargs):
        global _last_request_time
        
        # Calculate time since last request
        current_time = time.time()
        elapsed = current_time - _last_request_time
        
        # If we need to wait to respect rate limits
        if elapsed < RENTCAST_REQUEST_DELAY:
            wait_time = RENTCAST_REQUEST_DELAY - elapsed
            logger.debug(f"Rate limiting: waiting {wait_time:.2f} seconds")
            time.sleep(wait_time)
        
        # Update last request time
        _last_request_time = time.time()
        
        # Call the original function
        return func(*args, **kwargs)
    
    return wrapper

@rate_limited
def _make_request(endpoint: str, params: Optional[Dict] = None, method: str = "GET") -> Dict:
    """
    Make a request to the RentCast API.
    
    Args:
        endpoint: API endpoint to call
        params: Query parameters
        method: HTTP method (GET, POST)
        
    Returns:
        Response data as dictionary
    """
    if not RENTCAST_API_KEY:
        raise RentcastAPIError("RentCast API key not found. Please set RENTCAST_API_KEY in your .env file.")
    
    headers = {
        "X-Api-Key": RENTCAST_API_KEY,
        "Content-Type": "application/json"
    }
    
    url = f"{RENTCAST_BASE_URL}/{endpoint}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, params=params)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=params)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"RentCast API request failed: {str(e)}")
        if hasattr(e, 'response') and e.response is not None:
            logger.error(f"Response: {e.response.text}")
        raise RentcastAPIError(f"API request failed: {str(e)}")

def _cached_request(endpoint: str, params: Optional[Dict] = None, method: str = "GET") -> Dict:
    """
    Make a cached request to the RentCast API.
    
    Args:
        endpoint: API endpoint to call
        params: Query parameters
        method: HTTP method (GET, POST)
        
    Returns:
        Response data as dictionary
    """
    if not RENTCAST_USE_CACHE:
        return _make_request(endpoint, params, method)
    
    # Get the API cache
    api_cache = get_api_cache()
    
    # Define a function to make the actual API call
    def api_call():
        return _make_request(endpoint, params, method)
    
    # Make the cached API call
    return api_cache.cached_api_call("rentcast", endpoint, params or {}, api_call)

def search_properties(
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_bedrooms: Optional[int] = None,
    max_bedrooms: Optional[int] = None,
    min_bathrooms: Optional[float] = None,
    max_bathrooms: Optional[float] = None,
    min_square_feet: Optional[int] = None,
    max_square_feet: Optional[int] = None,
    property_type: Optional[str] = None
) -> List[Dict]:
    """
    Search for properties using the RentCast API.
    
    Args:
        city: City name
        state: State code (e.g., CA, NY)
        zip_code: ZIP code
        limit: Maximum number of results to return
        offset: Number of results to skip
        min_price: Minimum property price
        max_price: Maximum property price
        min_bedrooms: Minimum number of bedrooms
        max_bedrooms: Maximum number of bedrooms
        min_bathrooms: Minimum number of bathrooms
        max_bathrooms: Maximum number of bathrooms
        min_square_feet: Minimum square footage
        max_square_feet: Maximum square footage
        property_type: Property type (e.g., single_family, multi_family, condo, townhouse)
        
    Returns:
        List of property dictionaries
    """
    params = {
        "limit": limit,
        "offset": offset
    }
    
    # Add location parameters
    if city:
        params["city"] = city
    if state:
        params["state"] = state
    if zip_code:
        params["zip"] = zip_code
    
    # Add property filters
    if min_price:
        params["minPrice"] = min_price
    if max_price:
        params["maxPrice"] = max_price
    if min_bedrooms:
        params["minBeds"] = min_bedrooms
    if max_bedrooms:
        params["maxBeds"] = max_bedrooms
    if min_bathrooms:
        params["minBaths"] = min_bathrooms
    if max_bathrooms:
        params["maxBaths"] = max_bathrooms
    if min_square_feet:
        params["minSquareFeet"] = min_square_feet
    if max_square_feet:
        params["maxSquareFeet"] = max_square_feet
    if property_type:
        params["propertyType"] = property_type
    
    response = _cached_request("properties", params)
    return response.get("properties", [])

def get_property_details(property_id: str) -> Dict:
    """
    Get detailed information about a specific property.
    
    Args:
        property_id: RentCast property ID
        
    Returns:
        Property details dictionary
    """
    response = _cached_request(f"properties/{property_id}")
    return response

def get_property_by_address(
    address: str,
    city: str,
    state: str,
    zip_code: Optional[str] = None
) -> Dict:
    """
    Get property information by address.
    
    Args:
        address: Street address
        city: City name
        state: State code (e.g., CA, NY)
        zip_code: ZIP code
        
    Returns:
        Property details dictionary
    """
    params = {
        "address": address,
        "city": city,
        "state": state
    }
    
    if zip_code:
        params["zip"] = zip_code
    
    response = _cached_request("properties/address", params)
    return response

def get_market_stats(
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    property_type: Optional[str] = None,
    bedrooms: Optional[int] = None
) -> Dict:
    """
    Get real estate market statistics for a location.
    
    Args:
        city: City name
        state: State code (e.g., CA, NY)
        zip_code: ZIP code
        property_type: Property type (e.g., single_family, multi_family, condo, townhouse)
        bedrooms: Number of bedrooms
        
    Returns:
        Market statistics dictionary
    """
    params = {}
    
    # Add location parameters (at least one is required)
    if city:
        params["city"] = city
    if state:
        params["state"] = state
    if zip_code:
        params["zip"] = zip_code
    
    # Add property filters
    if property_type:
        params["propertyType"] = property_type
    if bedrooms:
        params["bedrooms"] = bedrooms
    
    response = _cached_request("market-stats", params)
    return response

def get_owner_information(property_id: str) -> Dict:
    """
    Get owner information for a property.
    
    Args:
        property_id: RentCast property ID
        
    Returns:
        Owner information dictionary
    """
    response = _cached_request(f"properties/{property_id}/owner")
    return response

def get_comparable_properties(
    property_id: str,
    limit: int = 10,
    radius_miles: float = 1.0
) -> List[Dict]:
    """
    Get comparable properties for a given property.
    
    Args:
        property_id: RentCast property ID
        limit: Maximum number of comparable properties to return
        radius_miles: Search radius in miles
        
    Returns:
        List of comparable property dictionaries
    """
    params = {
        "limit": limit,
        "radiusMiles": radius_miles
    }
    
    response = _cached_request(f"properties/{property_id}/comparables", params)
    return response.get("comparables", [])

def get_rental_listings(
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_bedrooms: Optional[int] = None,
    max_bedrooms: Optional[int] = None,
    property_type: Optional[str] = None
) -> List[Dict]:
    """
    Get active rental listings for a location.
    
    Args:
        city: City name
        state: State code (e.g., CA, NY)
        zip_code: ZIP code
        limit: Maximum number of results to return
        offset: Number of results to skip
        min_price: Minimum rental price
        max_price: Maximum rental price
        min_bedrooms: Minimum number of bedrooms
        max_bedrooms: Maximum number of bedrooms
        property_type: Property type (e.g., single_family, multi_family, condo, townhouse)
        
    Returns:
        List of rental listing dictionaries
    """
    params = {
        "limit": limit,
        "offset": offset
    }
    
    # Add location parameters
    if city:
        params["city"] = city
    if state:
        params["state"] = state
    if zip_code:
        params["zip"] = zip_code
    
    # Add property filters
    if min_price:
        params["minPrice"] = min_price
    if max_price:
        params["maxPrice"] = max_price
    if min_bedrooms:
        params["minBeds"] = min_bedrooms
    if max_bedrooms:
        params["maxBeds"] = max_bedrooms
    if property_type:
        params["propertyType"] = property_type
    
    response = _cached_request("listings/rental", params)
    return response.get("listings", [])

def get_sale_listings(
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    min_price: Optional[int] = None,
    max_price: Optional[int] = None,
    min_bedrooms: Optional[int] = None,
    max_bedrooms: Optional[int] = None,
    property_type: Optional[str] = None
) -> List[Dict]:
    """
    Get active sale listings for a location.
    
    Args:
        city: City name
        state: State code (e.g., CA, NY)
        zip_code: ZIP code
        limit: Maximum number of results to return
        offset: Number of results to skip
        min_price: Minimum sale price
        max_price: Maximum sale price
        min_bedrooms: Minimum number of bedrooms
        max_bedrooms: Maximum number of bedrooms
        property_type: Property type (e.g., single_family, multi_family, condo, townhouse)
        
    Returns:
        List of sale listing dictionaries
    """
    params = {
        "limit": limit,
        "offset": offset
    }
    
    # Add location parameters
    if city:
        params["city"] = city
    if state:
        params["state"] = state
    if zip_code:
        params["zip"] = zip_code
    
    # Add property filters
    if min_price:
        params["minPrice"] = min_price
    if max_price:
        params["maxPrice"] = max_price
    if min_bedrooms:
        params["minBeds"] = min_bedrooms
    if max_bedrooms:
        params["maxBeds"] = max_bedrooms
    if property_type:
        params["propertyType"] = property_type
    
    response = _cached_request("listings/sale", params)
    return response.get("listings", [])

def get_property_valuation(
    property_id: Optional[str] = None,
    address: Optional[str] = None,
    city: Optional[str] = None,
    state: Optional[str] = None,
    zip_code: Optional[str] = None,
    bedrooms: Optional[int] = None,
    bathrooms: Optional[float] = None,
    square_feet: Optional[int] = None,
    property_type: Optional[str] = None,
    year_built: Optional[int] = None
) -> Dict:
    """
    Get property valuation (estimated value and rent).
    
    Args:
        property_id: RentCast property ID (if known)
        address: Street address (required if property_id not provided)
        city: City name (required if property_id not provided)
        state: State code (required if property_id not provided)
        zip_code: ZIP code
        bedrooms: Number of bedrooms
        bathrooms: Number of bathrooms
        square_feet: Property square footage
        property_type: Property type
        year_built: Year the property was built
        
    Returns:
        Property valuation dictionary
    """
    if property_id:
        endpoint = f"properties/{property_id}/valuation"
        params = {}
    elif address and city and state:
        endpoint = "valuations"
        params = {
            "address": address,
            "city": city,
            "state": state
        }
        
        if zip_code:
            params["zip"] = zip_code
        if bedrooms:
            params["bedrooms"] = bedrooms
        if bathrooms:
            params["bathrooms"] = bathrooms
        if square_feet:
            params["squareFeet"] = square_feet
        if property_type:
            params["propertyType"] = property_type
        if year_built:
            params["yearBuilt"] = year_built
    else:
        raise ValueError("Either property_id or (address, city, state) must be provided")
    
    response = _cached_request(endpoint, params)
    return response

def get_api_usage() -> Dict:
    """
    Get information about API usage and limits.
    
    Returns:
        Dictionary with API usage information
    """
    # Get the API cache
    api_cache = get_api_cache()
    
    # Get cache statistics
    cache_stats = api_cache.get_stats()
    
    # Calculate total requests and cache efficiency
    total_requests = cache_stats["hits"] + cache_stats["misses"]
    cache_efficiency = cache_stats["hits"] / total_requests if total_requests > 0 else 0
    
    return {
        "cache_hits": cache_stats["hits"],
        "cache_misses": cache_stats["misses"],
        "cache_errors": cache_stats["errors"],
        "cache_efficiency": cache_efficiency,
        "api_key_present": bool(RENTCAST_API_KEY),
        "cache_enabled": RENTCAST_USE_CACHE,
        "cache_ttl_days": RENTCAST_CACHE_DAYS,
        "rate_limit": RENTCAST_RATE_LIMIT
    }

def clear_cache() -> int:
    """
    Clear the RentCast API cache.
    
    Returns:
        Number of cache files deleted
    """
    api_cache = get_api_cache()
    return api_cache.clear("rentcast")

# Example usage
if __name__ == "__main__":
    # Set up logging for testing
    logging.basicConfig(level=logging.INFO)
    
    try:
        # Example: Search for properties in a specific ZIP code
        properties = search_properties(
            zip_code="90210",
            limit=5,
            min_bedrooms=3,
            property_type="single_family"
        )
        
        print(f"Found {len(properties)} properties:")
        for prop in properties:
            print(f"- {prop.get('address')}, {prop.get('city')}, {prop.get('state')} - ${prop.get('price'):,}")
        
        # Example: Get market stats for a ZIP code
        if properties:
            # Get the first property ID
            property_id = properties[0].get("id")
            
            # Get property details
            details = get_property_details(property_id)
            print(f"\nProperty Details for {details.get('address')}:")
            print(f"- Beds: {details.get('bedrooms')}")
            print(f"- Baths: {details.get('bathrooms')}")
            print(f"- SqFt: {details.get('squareFeet')}")
            print(f"- Year Built: {details.get('yearBuilt')}")
            print(f"- Last Sale: ${details.get('lastSalePrice'):,} on {details.get('lastSaleDate')}")
            
            # Get comparable properties
            comps = get_comparable_properties(property_id, limit=3)
            print(f"\nComparable Properties:")
            for comp in comps:
                print(f"- {comp.get('address')}, {comp.get('city')} - ${comp.get('price'):,}")
        
        # Example: Get market stats
        stats = get_market_stats(zip_code="90210", property_type="single_family")
        print(f"\nMarket Stats for 90210:")
        print(f"- Median List Price: ${stats.get('medianListPrice'):,}")
        print(f"- Median Sale Price: ${stats.get('medianSalePrice'):,}")
        print(f"- Median Rent: ${stats.get('medianRent'):,}")
        print(f"- Price to Rent Ratio: {stats.get('priceToRentRatio')}")
        
        # Print API usage information
        usage = get_api_usage()
        print(f"\nAPI Usage Information:")
        print(f"- Cache Hits: {usage['cache_hits']}")
        print(f"- Cache Misses: {usage['cache_misses']}")
        print(f"- Cache Efficiency: {usage['cache_efficiency']:.2%}")
        
    except RentcastAPIError as e:
        logger.error(f"API Error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}") 