"""
Spider for scraping real estate listings from Realtor.com.
"""

import scrapy
import json
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urlencode

class ListingsSpider(scrapy.Spider):
    """Spider for scraping real estate listings from Realtor.com."""
    
    name = "listings_spider"
    allowed_domains = ["realtor.com"]
    
    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'ROBOTSTXT_OBEY': True,
        'CONCURRENT_REQUESTS': 16,
        'DOWNLOAD_DELAY': 1,
        'COOKIES_ENABLED': False
    }
    
    def __init__(self, location: str = None, property_type: str = None, *args, **kwargs):
        """
        Initialize the spider.
        
        Args:
            location: Location to search (city, state, or ZIP code)
            property_type: Type of property to search for (e.g., single-family, condo)
        """
        super(ListingsSpider, self).__init__(*args, **kwargs)
        self.location = location
        self.property_type = property_type
        
        # Base URL for the Realtor.com API
        self.base_url = "https://api.realtor.com/v2/property-search"
    
    def start_requests(self):
        """Generate initial requests."""
        if not self.location:
            self.logger.error("No location specified")
            return
        
        # Build search parameters for Realtor.com API
        params = {
            'location': self.location,
            'offset': 0,
            'limit': 50,
            'sort': 'relevance'
        }
        
        if self.property_type:
            params['prop_type'] = self.property_type
        
        # Add required headers for Realtor.com API
        headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        # Make the initial request
        url = f"{self.base_url}?{urlencode(params)}"
        yield scrapy.Request(
            url=url,
            callback=self.parse_search_results,
            headers=headers,
            meta={'offset': 0, 'params': params}
        )
    
    def parse_search_results(self, response):
        """
        Parse search results page.
        
        Args:
            response: Response object
        """
        try:
            # Parse JSON response
            data = json.loads(response.text)
            
            # Extract listings
            listings = data.get('properties', [])
            for listing in listings:
                yield self.parse_listing(listing)
            
            # Check for next page
            current_offset = response.meta['offset']
            total_results = data.get('matching_rows', 0)
            
            if current_offset + 50 < total_results:
                # Update parameters for next page
                params = response.meta['params'].copy()
                params['offset'] = current_offset + 50
                
                # Make request for next page
                url = f"{self.base_url}?{urlencode(params)}"
                yield scrapy.Request(
                    url=url,
                    callback=self.parse_search_results,
                    headers=response.request.headers,
                    meta={'offset': current_offset + 50, 'params': params}
                )
                
        except json.JSONDecodeError:
            self.logger.error(f"Failed to parse JSON response: {response.text[:100]}...")
        except Exception as e:
            self.logger.error(f"Error parsing search results: {str(e)}")
    
    def parse_listing(self, listing_data: Dict) -> Dict:
        """
        Parse individual listing data from Realtor.com format.
        
        Args:
            listing_data: Raw listing data
            
        Returns:
            Parsed listing data
        """
        try:
            return {
                'id': listing_data.get('property_id'),
                'url': listing_data.get('rdc_web_url'),
                'address': {
                    'street': listing_data.get('address', {}).get('line'),
                    'city': listing_data.get('address', {}).get('city'),
                    'state': listing_data.get('address', {}).get('state_code'),
                    'zip_code': listing_data.get('address', {}).get('postal_code'),
                    'latitude': listing_data.get('location', {}).get('lat'),
                    'longitude': listing_data.get('location', {}).get('lon')
                },
                'price': listing_data.get('list_price'),
                'bedrooms': listing_data.get('description', {}).get('beds'),
                'bathrooms': listing_data.get('description', {}).get('baths'),
                'square_feet': listing_data.get('description', {}).get('sqft'),
                'lot_size': listing_data.get('description', {}).get('lot_sqft'),
                'year_built': listing_data.get('description', {}).get('year_built'),
                'property_type': listing_data.get('description', {}).get('type'),
                'listing_type': listing_data.get('listing_type'),
                'status': listing_data.get('status'),
                'days_on_market': listing_data.get('list_date_delta'),
                'description': listing_data.get('description', {}).get('text'),
                'features': listing_data.get('features', []),
                'photos': [
                    photo.get('href') for photo in listing_data.get('photos', [])
                ],
                'agent': {
                    'name': listing_data.get('advertisers', [{}])[0].get('name'),
                    'phone': listing_data.get('advertisers', [{}])[0].get('phone'),
                    'email': listing_data.get('advertisers', [{}])[0].get('email'),
                    'company': listing_data.get('advertisers', [{}])[0].get('company')
                },
                'scraped_at': datetime.now().isoformat()
            }
        except Exception as e:
            self.logger.error(f"Error parsing listing: {str(e)}")
            return None
