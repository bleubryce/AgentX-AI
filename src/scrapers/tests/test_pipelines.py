import json
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock

import pytest
from pymongo.errors import DuplicateKeyError
from scrapy.exceptions import DropItem, NotConfigured

from real_estate_scraper.pipelines import ValidationPipeline, MongoPipeline

@pytest.fixture
def spider_config():
    return {
        'scraping': {
            'price_min': 100000,
            'price_max': 1000000
        },
        'validation': {
            'required_fields': ['price', 'address', 'description'],
            'valid_price_formats': [
                '\\$[0-9,]+',
                '[0-9,.]+\\s*USD'
            ],
            'min_description_length': 50,
            'max_description_length': 5000
        },
        'filters': {
            'excluded_terms': ['not for sale', 'sold']
        }
    }

@pytest.fixture
def valid_item():
    return {
        'url': 'https://example.com/listing/123',
        'price': '$500,000',
        'address': '123 Test St, City, State 12345',
        'description': 'A beautiful home with 3 bedrooms and 2 bathrooms. ' * 3,  # Long enough description
        'contact': 'agent@example.com',
        'source': 'test_source'
    }

class TestValidationPipeline:
    @pytest.fixture(autouse=True)
    def setup_pipeline(self, spider_config):
        with patch('builtins.open', Mock(return_value=MagicMock())) as mock_file:
            mock_file.return_value.__enter__.return_value.read.return_value = json.dumps(spider_config)
            self.pipeline = ValidationPipeline()
            self.spider = Mock()

    def test_validate_valid_item(self, valid_item):
        processed_item = self.pipeline.process_item(valid_item, self.spider)
        assert processed_item is not None
        assert isinstance(processed_item['price'], float)
        assert processed_item['price'] == 500000.0

    def test_validate_missing_required_field(self, valid_item):
        del valid_item['price']
        with pytest.raises(DropItem, match='Missing required field'):
            self.pipeline.process_item(valid_item, self.spider)

    def test_validate_invalid_price_format(self, valid_item):
        valid_item['price'] = 'invalid price'
        with pytest.raises(DropItem, match='Invalid price format'):
            self.pipeline.process_item(valid_item, self.spider)

    def test_validate_price_out_of_range(self, valid_item):
        valid_item['price'] = '$50,000'  # Below minimum
        with pytest.raises(DropItem, match='Invalid price format or range'):
            self.pipeline.process_item(valid_item, self.spider)

    def test_validate_excluded_term_in_description(self, valid_item):
        valid_item['description'] = 'This property is not for sale'
        with pytest.raises(DropItem, match='Invalid description'):
            self.pipeline.process_item(valid_item, self.spider)

    def test_clean_text_fields(self, valid_item):
        valid_item['address'] = '  123 Test St  \n  City, State  '
        processed_item = self.pipeline.process_item(valid_item, self.spider)
        assert processed_item['address'] == '123 Test St City, State'

class TestMongoPipeline:
    @pytest.fixture(autouse=True)
    def setup_pipeline(self):
        self.settings = {
            'MONGO_URI': 'mongodb://localhost:27017',
            'MONGO_DATABASE': 'test_db',
            'MONGO_COLLECTION': 'test_leads'
        }
        self.crawler = Mock()
        self.crawler.settings = self.settings
        self.spider = Mock()
        self.spider.name = 'test_spider'

    def test_from_crawler_missing_uri(self):
        self.crawler.settings = {}
        with pytest.raises(NotConfigured, match='MongoDB URI not set'):
            MongoPipeline.from_crawler(self.crawler)

    def test_from_crawler_valid_settings(self):
        pipeline = MongoPipeline.from_crawler(self.crawler)
        assert pipeline.mongo_uri == self.settings['MONGO_URI']
        assert pipeline.mongo_db == self.settings['MONGO_DATABASE']
        assert pipeline.collection_name == self.settings['MONGO_COLLECTION']

    @patch('pymongo.MongoClient')
    def test_open_spider_success(self, mock_client):
        pipeline = MongoPipeline.from_crawler(self.crawler)
        pipeline.open_spider(self.spider)
        mock_client.assert_called_once_with(
            self.settings['MONGO_URI'],
            serverSelectionTimeoutMS=5000
        )

    @patch('pymongo.MongoClient')
    def test_open_spider_connection_error(self, mock_client):
        mock_client.side_effect = Exception('Connection failed')
        pipeline = MongoPipeline.from_crawler(self.crawler)
        with pytest.raises(NotConfigured, match='Error initializing MongoDB'):
            pipeline.open_spider(self.spider)

    @patch('pymongo.MongoClient')
    def test_process_item_success(self, mock_client, valid_item):
        pipeline = MongoPipeline.from_crawler(self.crawler)
        pipeline.open_spider(self.spider)
        
        # Mock the update_one method
        mock_collection = Mock()
        mock_collection.update_one.return_value = Mock(modified_count=1)
        pipeline.collection = mock_collection
        
        processed_item = pipeline.process_item(valid_item, self.spider)
        assert processed_item == valid_item
        mock_collection.update_one.assert_called_once()

    @patch('pymongo.MongoClient')
    def test_process_item_duplicate(self, mock_client, valid_item):
        pipeline = MongoPipeline.from_crawler(self.crawler)
        pipeline.open_spider(self.spider)
        
        # Mock the update_one method to raise DuplicateKeyError
        mock_collection = Mock()
        mock_collection.update_one.side_effect = DuplicateKeyError('Duplicate key error')
        pipeline.collection = mock_collection
        
        with pytest.raises(DropItem, match='Duplicate item found'):
            pipeline.process_item(valid_item, self.spider)

    @patch('pymongo.MongoClient')
    def test_close_spider_success(self, mock_client):
        pipeline = MongoPipeline.from_crawler(self.crawler)
        pipeline.open_spider(self.spider)
        pipeline.close_spider(self.spider)
        mock_client.return_value.close.assert_called_once() 