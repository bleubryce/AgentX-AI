#!/usr/bin/env python3
"""
RentCast API Demo Script

This script demonstrates how to use the RentCast API with caching
to efficiently use the limited free tier of 50 requests per month.
"""

import os
import sys
import time
import logging
import argparse
from dotenv import load_dotenv

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("RentcastDemo")

# Import RentCast API utilities
from src.utils.rentcast_api import (
    search_properties,
    get_property_details,
    get_market_stats,
    get_comparable_properties,
    get_rental_listings,
    get_sale_listings,
    get_property_valuation,
    get_api_usage,
    clear_cache
)

def demo_property_search(args):
    """Demonstrate property search functionality"""
    logger.info("Searching for properties...")
    
    # First API call - will be a cache miss
    properties = search_properties(
        zip_code=args.zip_code,
        limit=args.limit,
        min_bedrooms=args.min_beds,
        property_type=args.property_type
    )
    
    print(f"\nFound {len(properties)} properties:")
    for i, prop in enumerate(properties[:5], 1):
        print(f"{i}. {prop.get('address')}, {prop.get('city')}, {prop.get('state')} - ${prop.get('price'):,}")
    
    # Second API call - should be a cache hit
    logger.info("Searching again (should use cache)...")
    start_time = time.time()
    properties_cached = search_properties(
        zip_code=args.zip_code,
        limit=args.limit,
        min_bedrooms=args.min_beds,
        property_type=args.property_type
    )
    elapsed = time.time() - start_time
    
    print(f"\nCache retrieval time: {elapsed:.4f} seconds")
    print(f"Retrieved {len(properties_cached)} properties from cache")
    
    # Show API usage
    usage = get_api_usage()
    print(f"\nAPI Usage:")
    print(f"- Cache Hits: {usage['cache_hits']}")
    print(f"- Cache Misses: {usage['cache_misses']}")
    print(f"- Cache Efficiency: {usage['cache_efficiency']:.2%}")
    
    return properties

def demo_property_details(args, properties=None):
    """Demonstrate property details functionality"""
    if not properties:
        properties = search_properties(
            zip_code=args.zip_code,
            limit=1,
            min_bedrooms=args.min_beds,
            property_type=args.property_type
        )
    
    if not properties:
        logger.error("No properties found")
        return
    
    # Get the first property ID
    property_id = properties[0].get("id")
    
    logger.info(f"Getting details for property ID: {property_id}")
    details = get_property_details(property_id)
    
    print(f"\nProperty Details for {details.get('address')}:")
    print(f"- Beds: {details.get('bedrooms')}")
    print(f"- Baths: {details.get('bathrooms')}")
    print(f"- SqFt: {details.get('squareFeet')}")
    print(f"- Year Built: {details.get('yearBuilt')}")
    print(f"- Last Sale: ${details.get('lastSalePrice'):,} on {details.get('lastSaleDate')}")
    
    return details

def demo_market_stats(args):
    """Demonstrate market statistics functionality"""
    logger.info(f"Getting market stats for ZIP code: {args.zip_code}")
    
    stats = get_market_stats(
        zip_code=args.zip_code,
        property_type=args.property_type
    )
    
    print(f"\nMarket Stats for {args.zip_code}:")
    print(f"- Median List Price: ${stats.get('medianListPrice'):,}")
    print(f"- Median Sale Price: ${stats.get('medianSalePrice'):,}")
    print(f"- Median Rent: ${stats.get('medianRent'):,}")
    print(f"- Price to Rent Ratio: {stats.get('priceToRentRatio')}")
    print(f"- Days on Market: {stats.get('daysOnMarket')}")
    print(f"- Inventory: {stats.get('inventory')}")
    
    return stats

def demo_comparable_properties(args, properties=None):
    """Demonstrate comparable properties functionality"""
    if not properties:
        properties = search_properties(
            zip_code=args.zip_code,
            limit=1,
            min_bedrooms=args.min_beds,
            property_type=args.property_type
        )
    
    if not properties:
        logger.error("No properties found")
        return
    
    # Get the first property ID
    property_id = properties[0].get("id")
    
    logger.info(f"Getting comparable properties for property ID: {property_id}")
    comps = get_comparable_properties(
        property_id=property_id,
        limit=args.limit,
        radius_miles=args.radius
    )
    
    print(f"\nFound {len(comps)} comparable properties:")
    for i, comp in enumerate(comps[:5], 1):
        print(f"{i}. {comp.get('address')}, {comp.get('city')} - ${comp.get('price'):,}")
    
    return comps

def demo_rental_listings(args):
    """Demonstrate rental listings functionality"""
    logger.info(f"Getting rental listings for ZIP code: {args.zip_code}")
    
    rentals = get_rental_listings(
        zip_code=args.zip_code,
        limit=args.limit,
        min_bedrooms=args.min_beds,
        property_type=args.property_type
    )
    
    print(f"\nFound {len(rentals)} rental listings:")
    for i, rental in enumerate(rentals[:5], 1):
        print(f"{i}. {rental.get('address')}, {rental.get('city')} - ${rental.get('price'):,}/month")
    
    return rentals

def demo_sale_listings(args):
    """Demonstrate sale listings functionality"""
    logger.info(f"Getting sale listings for ZIP code: {args.zip_code}")
    
    sales = get_sale_listings(
        zip_code=args.zip_code,
        limit=args.limit,
        min_bedrooms=args.min_beds,
        property_type=args.property_type
    )
    
    print(f"\nFound {len(sales)} sale listings:")
    for i, sale in enumerate(sales[:5], 1):
        print(f"{i}. {sale.get('address')}, {sale.get('city')} - ${sale.get('price'):,}")
    
    return sales

def demo_property_valuation(args, properties=None):
    """Demonstrate property valuation functionality"""
    if not properties:
        properties = search_properties(
            zip_code=args.zip_code,
            limit=1,
            min_bedrooms=args.min_beds,
            property_type=args.property_type
        )
    
    if not properties:
        logger.error("No properties found")
        return
    
    # Get the first property
    property_data = properties[0]
    property_id = property_data.get("id")
    
    logger.info(f"Getting valuation for property ID: {property_id}")
    valuation = get_property_valuation(property_id=property_id)
    
    print(f"\nValuation for {property_data.get('address')}:")
    print(f"- Estimated Value: ${valuation.get('value'):,}")
    print(f"- Estimated Rent: ${valuation.get('rent'):,}/month")
    print(f"- Cap Rate: {valuation.get('capRate'):.2%}")
    print(f"- Gross Yield: {valuation.get('grossYield'):.2%}")
    
    return valuation

def run_all_demos(args):
    """Run all demo functions"""
    # Clear cache if requested
    if args.clear_cache:
        logger.info("Clearing cache...")
        count = clear_cache()
        print(f"Cleared {count} cache files")
    
    # Run all demos
    properties = demo_property_search(args)
    demo_property_details(args, properties)
    demo_market_stats(args)
    demo_comparable_properties(args, properties)
    demo_rental_listings(args)
    demo_sale_listings(args)
    demo_property_valuation(args, properties)
    
    # Show final API usage
    usage = get_api_usage()
    print(f"\nFinal API Usage:")
    print(f"- Cache Hits: {usage['cache_hits']}")
    print(f"- Cache Misses: {usage['cache_misses']}")
    print(f"- Cache Efficiency: {usage['cache_efficiency']:.2%}")

def main():
    """Main entry point for the script"""
    # Load environment variables
    load_dotenv()
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description="RentCast API Demo")
    parser.add_argument("--zip-code", default="90210", help="ZIP code to search")
    parser.add_argument("--limit", type=int, default=5, help="Maximum number of results")
    parser.add_argument("--min-beds", type=int, default=3, help="Minimum number of bedrooms")
    parser.add_argument("--property-type", default="single_family", help="Property type")
    parser.add_argument("--radius", type=float, default=1.0, help="Search radius in miles")
    parser.add_argument("--clear-cache", action="store_true", help="Clear cache before running")
    parser.add_argument("--demo", choices=["search", "details", "market", "comps", "rentals", "sales", "valuation", "all"], default="all", help="Demo to run")
    
    args = parser.parse_args()
    
    # Check if RentCast API key is set
    if not os.getenv("RENTCAST_API_KEY"):
        logger.error("RentCast API key not found. Please set RENTCAST_API_KEY in your .env file.")
        return 1
    
    # Run the requested demo
    try:
        if args.demo == "search":
            demo_property_search(args)
        elif args.demo == "details":
            demo_property_details(args)
        elif args.demo == "market":
            demo_market_stats(args)
        elif args.demo == "comps":
            demo_comparable_properties(args)
        elif args.demo == "rentals":
            demo_rental_listings(args)
        elif args.demo == "sales":
            demo_sale_listings(args)
        elif args.demo == "valuation":
            demo_property_valuation(args)
        else:  # "all"
            run_all_demos(args)
    except Exception as e:
        logger.error(f"Error running demo: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 