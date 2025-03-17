# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
from itemadapter import ItemAdapter

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv
import json
from scrapy.exceptions import DropItem, NotConfigured
import re
import pymongo
from scrapy import Spider

# Load environment variables
load_dotenv()

class ValidationPipeline:
    """Pipeline for validating and cleaning lead data"""
    
    def __init__(self):
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, Any]:
        try:
            with open('config/spider_config.json', 'r') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Error loading spider config: {str(e)}")
            raise NotConfigured("Spider config not found or invalid")
            
    def _validate_price(self, price: str) -> Optional[float]:
        """Validate and convert price string to float"""
        try:
            # Try different price formats
            for pattern in self.config['validation']['valid_price_formats']:
                if re.match(pattern, price):
                    # Extract numeric value
                    numeric_price = float(re.sub(r'[^\d.]', '', price))
                    if self.config['scraping']['price_min'] <= numeric_price <= self.config['scraping']['price_max']:
                        return numeric_price
            return None
        except (ValueError, TypeError):
            return None
            
    def _validate_description(self, description: str) -> bool:
        """Validate description length and content"""
        if not description:
            return False
            
        # Check length
        if not (self.config['validation']['min_description_length'] <= 
                len(description) <= 
                self.config['validation']['max_description_length']):
            return False
            
        # Check for excluded terms
        for term in self.config['filters']['excluded_terms']:
            if term.lower() in description.lower():
                return False
                
        return True
        
    def _clean_text(self, text: str) -> str:
        """Clean and normalize text fields"""
        if not text:
            return ""
        # Remove extra whitespace and normalize
        return " ".join(text.split())
        
    def process_item(self, item: Dict[str, Any], spider: Spider) -> Dict[str, Any]:
        adapter = ItemAdapter(item)
        
        # Validate required fields
        for field in self.config['validation']['required_fields']:
            if not adapter.get(field):
                raise DropItem(f"Missing required field {field} in {adapter.get('url', 'unknown URL')}")
        
        # Validate and clean price
        price = self._validate_price(adapter['price'])
        if not price:
            raise DropItem(f"Invalid price format or range in {adapter.get('url', 'unknown URL')}")
        adapter['price'] = price
        
        # Validate and clean description
        if not self._validate_description(adapter['description']):
            raise DropItem(f"Invalid description in {adapter.get('url', 'unknown URL')}")
        adapter['description'] = self._clean_text(adapter['description'])
        
        # Clean other text fields
        adapter['address'] = self._clean_text(adapter['address'])
        if adapter.get('contact'):
            adapter['contact'] = self._clean_text(adapter['contact'])
            
        # Add metadata
        adapter['validated_at'] = datetime.utcnow().isoformat()
        
        return item

class MongoPipeline:
    """Pipeline for storing leads in MongoDB with proper error handling and indexing"""
    
    def __init__(self, mongo_uri: str, mongo_db: str, collection_name: str):
        self.mongo_uri = mongo_uri
        self.mongo_db = mongo_db
        self.collection_name = collection_name
        self.client = None
        self.db = None
        self.collection = None
        self.duplicate_count = 0
        self.error_count = 0
        
    @classmethod
    def from_crawler(cls, crawler):
        if not crawler.settings.get('MONGO_URI'):
            raise NotConfigured("MongoDB URI not set")
            
        return cls(
            mongo_uri=crawler.settings.get('MONGO_URI'),
            mongo_db=crawler.settings.get('MONGO_DATABASE', 'real_estate_leads'),
            collection_name=crawler.settings.get('MONGO_COLLECTION', 'leads')
        )
        
    def open_spider(self, spider: Spider) -> None:
        try:
            self.client = pymongo.MongoClient(
                self.mongo_uri,
                serverSelectionTimeoutMS=5000  # 5 second timeout
            )
            # Test connection
            self.client.server_info()
            
            self.db = self.client[self.mongo_db]
            self.collection = self.db[self.collection_name]
            
            # Create indexes
            self._create_indexes()
            
            logging.info(f"Connected to MongoDB: {self.mongo_uri}")
            
        except pymongo.errors.ServerSelectionTimeoutError as e:
            raise NotConfigured(f"Could not connect to MongoDB: {str(e)}")
        except Exception as e:
            raise NotConfigured(f"Error initializing MongoDB pipeline: {str(e)}")
            
    def _create_indexes(self) -> None:
        """Create necessary indexes for efficient querying"""
        try:
            self.collection.create_index(
                [('url', pymongo.ASCENDING)],
                unique=True,
                background=True
            )
            self.collection.create_index(
                [('source', pymongo.ASCENDING), ('created_at', pymongo.DESCENDING)],
                background=True
            )
            self.collection.create_index(
                [('price', pymongo.ASCENDING)],
                background=True
            )
            self.collection.create_index(
                [('validated_at', pymongo.DESCENDING)],
                background=True
            )
        except Exception as e:
            logging.error(f"Error creating indexes: {str(e)}")
            raise
            
    def process_item(self, item: Dict[str, Any], spider: Spider) -> Dict[str, Any]:
        try:
            adapter = ItemAdapter(item)
            data = dict(adapter)
            
            # Add metadata
            data.update({
                'updated_at': datetime.utcnow().isoformat(),
                'spider_name': spider.name,
                'spider_version': getattr(spider, 'version', '1.0')
            })
            
            # Use upsert with optimistic concurrency control
            result = self.collection.update_one(
                {
                    'url': data['url'],
                    'updated_at': {'$lt': data['updated_at']}  # Only update if newer
                },
                {'$set': data},
                upsert=True
            )
            
            if result.modified_count > 0:
                logging.debug(f"Updated lead: {data['url']}")
            elif result.upserted_id:
                logging.debug(f"Inserted new lead: {data['url']}")
            else:
                self.duplicate_count += 1
                logging.debug(f"Duplicate lead (not updated): {data['url']}")
                
            return item
            
        except pymongo.errors.DuplicateKeyError:
            self.duplicate_count += 1
            raise DropItem(f"Duplicate item found: {item.get('url', 'unknown URL')}")
            
        except Exception as e:
            self.error_count += 1
            logging.error(f"Error processing item {item.get('url', 'unknown URL')}: {str(e)}")
            raise DropItem(f"Failed to process item: {str(e)}")
            
    def close_spider(self, spider: Spider) -> None:
        if self.client:
            try:
                # Log statistics
                logging.info(f"Pipeline statistics for {spider.name}:")
                logging.info(f"- Duplicate items: {self.duplicate_count}")
                logging.info(f"- Processing errors: {self.error_count}")
                
                self.client.close()
                logging.info("Closed MongoDB connection")
                
            except Exception as e:
                logging.error(f"Error closing MongoDB connection: {str(e)}")
                raise
