#!/usr/bin/env python3
"""
Script to run the social leads spider.
"""

import os
import sys
import logging
import argparse
from dotenv import load_dotenv
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from real_estate_scraper.spiders.social_leads_spider import SocialLeadsSpider

# Load environment variables from .env file
load_dotenv()

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def check_credentials():
    """Check if required credentials are set."""
    required_vars = [
        'TWITTER_USERNAME', 'TWITTER_PASSWORD',
        'FACEBOOK_EMAIL', 'FACEBOOK_PASSWORD'
    ]
    
    missing = [var for var in required_vars if not os.getenv(var)]
    if missing:
        logger.error(f"Missing required credentials: {', '.join(missing)}")
        logger.error("Please set these in your .env file")
        sys.exit(1)

def run_spider(location: str, lead_type: str = 'buy', output_file: str = None):
    """
    Run the social leads spider.
    
    Args:
        location: Location to search for leads (city, state)
        lead_type: Type of lead to search for (buy, sell, refi)
        output_file: File to save the results to (optional)
    """
    try:
        # Check credentials before running
        check_credentials()
        
        settings = get_project_settings()
        
        # Configure output settings if specified
        if output_file:
            settings['FEEDS'] = {
                output_file: {
                    'format': 'json',
                    'encoding': 'utf8',
                    'indent': 2
                }
            }
        
        # Initialize the crawler process
        process = CrawlerProcess(settings)
        
        # Run the spider
        process.crawl(
            SocialLeadsSpider,
            location=location,
            lead_type=lead_type
        )
        
        logger.info(f"Starting spider for {lead_type} leads in {location}")
        process.start()
        
    except Exception as e:
        logger.error(f"Error running spider: {str(e)}")
        sys.exit(1)

def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(
        description='Run the social leads spider to find real estate leads on social media.'
    )
    
    parser.add_argument(
        'location',
        type=str,
        help='Location to search for leads (city, state)'
    )
    
    parser.add_argument(
        '--lead-type',
        type=str,
        choices=['buy', 'sell', 'refi'],
        default='buy',
        help='Type of lead to search for (default: buy)'
    )
    
    parser.add_argument(
        '--output',
        type=str,
        help='File to save the results to (optional)'
    )
    
    args = parser.parse_args()
    
    run_spider(
        location=args.location,
        lead_type=args.lead_type,
        output_file=args.output
    )

if __name__ == '__main__':
    main() 