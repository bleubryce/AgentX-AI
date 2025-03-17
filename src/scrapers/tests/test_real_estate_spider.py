import json
import os
from datetime import datetime
from unittest.mock import Mock, patch

import pytest
from scrapy.http import Request, Response, TextResponse
from scrapy.exceptions import DropItem

from real_estate_scraper.spiders.real_estate_spider import RealEstateSpider, LeadItem

@pytest.fixture
def spider_config():
    return {
        'price_min': 100000,
        'price_max': 1000000,
        'lead_indicators': [
            'looking to buy',
            'want to purchase'
        ],
        'excluded_terms': [
            'not for sale',
            'sold'
        ],
        'max_retries': 3
    }

@pytest.fixture
def source_config():
    return {
        'start_urls': ['https://example.com'],
        'allowed_domains': ['example.com'],
        'max_leads': 100,
        'selectors': {
            'price': '//span[@class="price"]/text()',
            'address': '//div[@class="address"]/text()',
            'description': '//div[@class="description"]/text()',
            'contact': '//div[@class="contact"]/text()'
        }
    }

@pytest.fixture
def spider(spider_config, source_config):
    with patch('real_estate_scraper.spiders.real_estate_spider.RealEstateSpider._load_spider_config') as mock_config:
        mock_config.return_value = spider_config
        spider = RealEstateSpider('test_source', source_config)
        return spider

def create_response(url, body, status=200):
    request = Request(url=url)
    return TextResponse(
        url=url,
        body=body.encode('utf-8'),
        encoding='utf-8',
        request=request,
        status=status
    )

def test_spider_initialization(spider, source_config):
    assert spider.name == 'real_estate'
    assert spider.start_urls == source_config['start_urls']
    assert spider.allowed_domains == source_config['allowed_domains']
    assert spider.source == 'test_source'
    assert spider.config == source_config

def test_parse_listing_valid(spider):
    html = """
    <html>
        <body>
            <span class="price">$500,000</span>
            <div class="address">123 Test St</div>
            <div class="description">Beautiful home for sale</div>
            <div class="contact">Contact: test@example.com</div>
        </body>
    </html>
    """
    response = create_response('https://example.com/listing/1', html)
    
    results = list(spider.parse_listing(response))
    assert len(results) == 1
    
    item = results[0]
    assert isinstance(item, LeadItem)
    assert item['price'] == '$500,000'
    assert item['address'] == '123 Test St'
    assert item['description'] == 'Beautiful home for sale'
    assert item['contact'] == 'Contact: test@example.com'
    assert item['source'] == 'test_source'
    assert item['url'] == 'https://example.com/listing/1'

def test_parse_listing_invalid_price(spider):
    html = """
    <html>
        <body>
            <span class="price">$50,000</span>
            <div class="address">123 Test St</div>
            <div class="description">Beautiful home for sale</div>
            <div class="contact">Contact: test@example.com</div>
        </body>
    </html>
    """
    response = create_response('https://example.com/listing/1', html)
    
    results = list(spider.parse_listing(response))
    assert len(results) == 0

def test_parse_listing_excluded_terms(spider):
    html = """
    <html>
        <body>
            <span class="price">$500,000</span>
            <div class="address">123 Test St</div>
            <div class="description">This property is not for sale</div>
            <div class="contact">Contact: test@example.com</div>
        </body>
    </html>
    """
    response = create_response('https://example.com/listing/1', html)
    
    results = list(spider.parse_listing(response))
    assert len(results) == 0

def test_handle_error_retry(spider):
    request = Request('https://example.com')
    response = Response('https://example.com', request=request)
    response.meta['retries'] = 1
    response.meta['max_retries'] = 3
    
    results = list(spider.handle_error(None, response))
    assert len(results) == 1
    assert isinstance(results[0], Request)
    assert results[0].meta['retries'] == 2

def test_handle_error_max_retries(spider):
    request = Request('https://example.com')
    response = Response('https://example.com', request=request)
    response.meta['retries'] = 3
    response.meta['max_retries'] = 3
    
    results = list(spider.handle_error(None, response))
    assert len(results) == 0

def test_closed_callback(spider):
    reason = 'finished'
    spider.leads_count = 50
    
    with patch('logging.info') as mock_log:
        spider.closed(reason)
        assert mock_log.call_count == 2
        mock_log.assert_any_call('Spider closed: finished')
        mock_log.assert_any_call('Total leads collected: 50') 