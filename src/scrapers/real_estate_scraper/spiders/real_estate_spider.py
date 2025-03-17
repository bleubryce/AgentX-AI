import scrapy
from scrapy.spiders import CrawlSpider, Rule
from scrapy.linkextractors import LinkExtractor
from scrapy.exceptions import CloseSpider
from scrapy.http import Request
from datetime import datetime
from typing import Dict, Any, Generator, Optional, List
import json
import re
from fake_useragent import UserAgent
from urllib.parse import urljoin
import logging
from scrapy import Request, Spider
from scrapy.exceptions import IgnoreRequest, DropItem
from scrapy.http import Response
from itemloaders import ItemLoader
from itemloaders.processors import TakeFirst, Join, Compose

class LeadItem(scrapy.Item):
    id = scrapy.Field()
    source = scrapy.Field()
    price = scrapy.Field()
    address = scrapy.Field()
    description = scrapy.Field()
    contact = scrapy.Field()
    url = scrapy.Field()
    created_at = scrapy.Field()
    raw_data = scrapy.Field()

class RealEstateSpider(Spider):
    name = 'real_estate'
    custom_settings = {
        'ROBOTSTXT_OBEY': True,
        'CONCURRENT_REQUESTS_PER_DOMAIN': 1,
        'DOWNLOAD_DELAY': 5,
        'COOKIES_ENABLED': False,
        'RETRY_ENABLED': True,
        'RETRY_TIMES': 5,
        'RETRY_HTTP_CODES': [500, 502, 503, 504, 522, 524, 408, 429],
        'DOWNLOADER_MIDDLEWARES': {
            'scrapy.downloadermiddlewares.retry.RetryMiddleware': 90,
            'scrapy_rotating_proxies.middlewares.RotatingProxyMiddleware': 610,
            'scrapy.downloadermiddlewares.httpproxy.HttpProxyMiddleware': 110,
        },
        'ITEM_PIPELINES': {
            'real_estate_scraper.pipelines.LeadValidationPipeline': 300,
            'real_estate_scraper.pipelines.MongoPipeline': 400,
        }
    }

    def __init__(self, source: str, config: Dict[str, Any], *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.source = source
        self.config = config
        self.spider_config = self._load_spider_config()
        self.leads_count = 0
        self.start_urls = config['start_urls']
        self.allowed_domains = config['allowed_domains']
        
    def _load_spider_config(self) -> Dict[str, Any]:
        try:
            with open('spider_config.json', 'r') as f:
                return json.load(f)
        except Exception as e:
            logging.error(f"Error loading spider config: {str(e)}")
            raise

    def start_requests(self):
        for url in self.start_urls:
            yield Request(
                url=url,
                callback=self.parse,
                errback=self.handle_error,
                meta={'max_retries': self.spider_config['max_retries']}
            )

    def parse(self, response: Response):
        if self.leads_count >= self.config['max_leads']:
            raise CloseSpider('Reached maximum number of leads')

        try:
            # Extract listing links
            listing_links = response.xpath('//a[contains(@href, "/homes-detail/")]/@href').getall()
            
            for link in listing_links:
                if self.leads_count >= self.config['max_leads']:
                    break
                    
                absolute_url = urljoin(response.url, link)
                yield Request(
                    url=absolute_url,
                    callback=self.parse_listing,
                    errback=self.handle_error,
                    meta={'max_retries': self.spider_config['max_retries']}
                )

            # Follow pagination
            next_page = response.xpath('//a[contains(@class, "next-page")]/@href').get()
            if next_page:
                yield Request(
                    url=urljoin(response.url, next_page),
                    callback=self.parse,
                    errback=self.handle_error,
                    meta={'max_retries': self.spider_config['max_retries']}
                )

        except Exception as e:
            logging.error(f"Error parsing page {response.url}: {str(e)}")
            self.handle_error(e, response)

    def parse_listing(self, response: Response):
        try:
            loader = ItemLoader(item=LeadItem(), response=response)
            
            # Extract data using configured selectors
            for field, selector in self.config['selectors'].items():
                loader.add_xpath(field, selector)
            
            loader.add_value('source', self.source)
            loader.add_value('url', response.url)
            loader.add_value('created_at', datetime.utcnow().isoformat())
            
            item = loader.load_item()
            
            # Validate price range
            price_str = item.get('price', '').replace('$', '').replace(',', '')
            if price_str.isdigit():
                price = int(price_str)
                if self.spider_config['price_min'] <= price <= self.spider_config['price_max']:
                    self.leads_count += 1
                    yield item

        except Exception as e:
            logging.error(f"Error parsing listing {response.url}: {str(e)}")
            self.handle_error(e, response)

    def handle_error(self, failure, response=None):
        if response is None:
            response = failure.request
            
        retries = response.meta.get('retries', 0)
        max_retries = response.meta.get('max_retries', self.spider_config['max_retries'])
        
        if retries < max_retries:
            logging.warning(f"Retrying request to {response.url} (attempt {retries + 1}/{max_retries})")
            retries += 1
            new_request = response.request.copy()
            new_request.meta['retries'] = retries
            new_request.dont_filter = True
            yield new_request
        else:
            logging.error(f"Max retries reached for {response.url}: {str(failure)}")
            
    def closed(self, reason):
        logging.info(f"Spider closed: {reason}")
        logging.info(f"Total leads collected: {self.leads_count}")

    def extract_price(self, response: scrapy.http.Response) -> Optional[float]:
        """Extract price from listing"""
        try:
            # Common price selectors
            selectors = [
                '//span[contains(@class, "price")]//text()',
                '//div[contains(@class, "price")]//text()',
                '//span[contains(@class, "Price")]//text()',
                '//div[contains(@class, "Price")]//text()'
            ]
            
            for selector in selectors:
                price_text = response.xpath(selector).get()
                if price_text:
                    # Remove currency symbols and convert to float
                    price = float(re.sub(r'[^\d.]', '', price_text))
                    return price
            return None
        except Exception as e:
            self.logger.error(f'Error extracting price: {str(e)}')
            return None

    def is_valid_price(self, price: Optional[float]) -> bool:
        """Check if price is within valid range"""
        if not price:
            return False
        return self.spider_config['price_min'] <= price <= self.spider_config['price_max']

    def extract_address(self, response: scrapy.http.Response) -> Optional[str]:
        """Extract address from listing"""
        try:
            # Common address selectors
            selectors = [
                '//div[contains(@class, "address")]//text()',
                '//span[contains(@class, "address")]//text()',
                '//div[contains(@class, "location")]//text()',
                '//span[contains(@class, "location")]//text()'
            ]
            
            for selector in selectors:
                address = response.xpath(selector).get()
                if address:
                    return address.strip()
            return None
        except Exception as e:
            self.logger.error(f'Error extracting address: {str(e)}')
            return None

    def extract_description(self, response: scrapy.http.Response) -> Optional[str]:
        """Extract description from listing"""
        try:
            # Common description selectors
            selectors = [
                '//div[contains(@class, "description")]//text()',
                '//div[contains(@class, "details")]//text()',
                '//div[contains(@class, "content")]//text()'
            ]
            
            for selector in selectors:
                description = ' '.join(response.xpath(selector).getall())
                if description:
                    return description.strip()
            return None
        except Exception as e:
            self.logger.error(f'Error extracting description: {str(e)}')
            return None

    def extract_contact_info(self, response: scrapy.http.Response) -> Dict[str, Optional[str]]:
        """Extract contact information from listing"""
        try:
            # Common contact info selectors
            phone_selectors = [
                '//span[contains(@class, "phone")]//text()',
                '//div[contains(@class, "phone")]//text()',
                '//a[contains(@href, "tel:")]/@href'
            ]
            
            email_selectors = [
                '//a[contains(@href, "mailto:")]/@href',
                '//span[contains(@class, "email")]//text()',
                '//div[contains(@class, "email")]//text()'
            ]
            
            phone = None
            email = None
            
            for selector in phone_selectors:
                phone = response.xpath(selector).get()
                if phone:
                    phone = re.sub(r'[^\d]', '', phone)
                    if len(phone) >= 10:
                        break
            
            for selector in email_selectors:
                email = response.xpath(selector).get()
                if email:
                    email = email.replace('mailto:', '').strip()
                    if '@' in email:
                        break
            
            return {
                'phone': phone,
                'email': email
            }
        except Exception as e:
            self.logger.error(f'Error extracting contact info: {str(e)}')
            return {'phone': None, 'email': None}

    def extract_metadata(self, response: scrapy.http.Response) -> Dict[str, Any]:
        """Extract additional metadata from listing"""
        try:
            metadata = {
                'bedrooms': self.extract_number(response, ['bedroom', 'bed', 'bd']),
                'bathrooms': self.extract_number(response, ['bathroom', 'bath', 'ba']),
                'square_feet': self.extract_number(response, ['sqft', 'sq ft', 'square feet']),
                'property_type': self.extract_property_type(response),
                'year_built': self.extract_year(response),
                'features': self.extract_features(response)
            }
            return {k: v for k, v in metadata.items() if v is not None}
        except Exception as e:
            self.logger.error(f'Error extracting metadata: {str(e)}')
            return {}

    def extract_next_page(self, response: scrapy.http.Response) -> Optional[str]:
        """Extract next page URL"""
        try:
            # Common next page selectors
            selectors = [
                '//a[contains(@class, "next")]/@href',
                '//a[contains(@rel, "next")]/@href',
                '//link[contains(@rel, "next")]/@href'
            ]
            
            for selector in selectors:
                next_page = response.xpath(selector).get()
                if next_page:
                    return urljoin(response.url, next_page)
            return None
        except Exception as e:
            self.logger.error(f'Error extracting next page: {str(e)}')
            return None

    def extract_number(self, response: scrapy.http.Response, keywords: list) -> Optional[float]:
        """Extract numeric value based on keywords"""
        try:
            pattern = r'(\d+\.?\d*)\s*(?:' + '|'.join(keywords) + ')'
            for text in response.xpath('//*[text()]//text()').getall():
                match = re.search(pattern, text.lower())
                if match:
                    return float(match.group(1))
            return None
        except Exception:
            return None

    def extract_property_type(self, response: scrapy.http.Response) -> Optional[str]:
        """Extract property type"""
        try:
            property_types = ['single family', 'condo', 'townhouse', 'multi-family', 'apartment']
            for text in response.xpath('//*[text()]//text()').getall():
                for prop_type in property_types:
                    if prop_type in text.lower():
                        return prop_type
            return None
        except Exception:
            return None

    def extract_year(self, response: scrapy.http.Response) -> Optional[int]:
        """Extract year built"""
        try:
            pattern = r'built in (\d{4})'
            for text in response.xpath('//*[text()]//text()').getall():
                match = re.search(pattern, text.lower())
                if match:
                    year = int(match.group(1))
                    if 1800 <= year <= datetime.now().year:
                        return year
            return None
        except Exception:
            return None

    def extract_features(self, response: scrapy.http.Response) -> List[str]:
        """Extract property features"""
        try:
            features = []
            feature_selectors = [
                '//ul[contains(@class, "feature")]//li//text()',
                '//div[contains(@class, "feature")]//text()',
                '//div[contains(@class, "amenit")]//text()'
            ]
            
            for selector in feature_selectors:
                features.extend(response.xpath(selector).getall())
            
            return [f.strip() for f in features if f.strip()]
        except Exception:
            return [] 