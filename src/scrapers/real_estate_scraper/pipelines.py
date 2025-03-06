# Define your item pipelines here
#
# Don't forget to add your pipeline to the ITEM_PIPELINES setting
# See: https://docs.scrapy.org/en/latest/topics/item-pipeline.html


# useful for handling different item types with a single interface
from itemadapter import ItemAdapter

import os
import logging
from typing import Dict, Any
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import DuplicateKeyError
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class MongoDBPipeline:
    """Pipeline for storing scraped items in MongoDB."""
    
    def __init__(self):
        """Initialize the pipeline."""
        self.mongo_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/real_estate_leads")
        self.client = None
        self.db = None
        self.listings_collection = None
        self.logger = logging.getLogger(__name__)
    
    def open_spider(self, spider):
        """
        Called when the spider is opened.
        
        Args:
            spider: The spider being run
        """
        try:
            # Connect to MongoDB
            self.client = MongoClient(self.mongo_uri)
            
            # Get database name from URI
            db_name = self.mongo_uri.split('/')[-1]
            self.db = self.client[db_name]
            
            # Get or create listings collection
            self.listings_collection = self.db['listings']
            
            # Create indexes
            self.listings_collection.create_index([
                ('id', 1)
            ], unique=True)
            
            self.listings_collection.create_index([
                ('address.zip_code', 1),
                ('property_type', 1),
                ('price', 1)
            ])
            
            self.listings_collection.create_index([
                ('address.city', 1),
                ('address.state', 1)
            ])
            
            self.listings_collection.create_index([
                ('scraped_at', -1)
            ])
            
            self.logger.info("Connected to MongoDB")
            
        except Exception as e:
            self.logger.error(f"Error connecting to MongoDB: {str(e)}")
            raise
    
    def close_spider(self, spider):
        """
        Called when the spider is closed.
        
        Args:
            spider: The spider being run
        """
        if self.client:
            self.client.close()
            self.logger.info("Closed MongoDB connection")
    
    def process_item(self, item: Dict[str, Any], spider) -> Dict[str, Any]:
        """
        Process a scraped item.
        
        Args:
            item: The scraped item
            spider: The spider being run
            
        Returns:
            The processed item
        """
        try:
            # Add metadata
            item['updated_at'] = datetime.now().isoformat()
            item['spider'] = spider.name
            
            # Try to insert or update the item
            self.listings_collection.update_one(
                {'id': item['id']},
                {'$set': item},
                upsert=True
            )
            
            self.logger.debug(f"Saved listing {item['id']}")
            
        except DuplicateKeyError:
            self.logger.warning(f"Duplicate listing found: {item['id']}")
        except Exception as e:
            self.logger.error(f"Error saving listing {item.get('id')}: {str(e)}")
        
        return item

class DuplicateFilterPipeline:
    """Pipeline for filtering duplicate items."""
    
    def __init__(self):
        """Initialize the pipeline."""
        self.ids_seen = set()
    
    def process_item(self, item: Dict[str, Any], spider) -> Dict[str, Any]:
        """
        Process a scraped item.
        
        Args:
            item: The scraped item
            spider: The spider being run
            
        Returns:
            The processed item if not a duplicate, otherwise None
        """
        if item['id'] in self.ids_seen:
            spider.logger.debug(f"Duplicate item found: {item['id']}")
            return None
        
        self.ids_seen.add(item['id'])
        return item
