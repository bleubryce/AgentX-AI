#!/usr/bin/env python3
"""
Spider runner script with configuration and error handling
"""

import os
import sys
import json
import logging
from typing import List, Dict, Any, Optional
from scrapy.crawler import CrawlerProcess
from scrapy.utils.project import get_project_settings
from datetime import datetime
from pathlib import Path
from spiders.real_estate_spider import RealEstateSpider

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler('spider.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class SpiderRunner:
    def __init__(self, config_path: str = "config/sources.json", 
                 proxy_path: str = "config/proxies.json",
                 output_dir: str = "data/leads"):
        self.config_path = config_path
        self.proxy_path = proxy_path
        self.output_dir = output_dir
        self.sources = self._load_sources()
        self.proxies = self._load_proxies()
        self._setup_logging()
        
    def _setup_logging(self):
        """Configure logging for the spider runner"""
        log_dir = "logs"
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        log_file = os.path.join(log_dir, f"spider_run_{timestamp}.log")
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s [%(levelname)s] %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler(sys.stdout)
            ]
        )
        
    def _load_sources(self) -> Dict:
        """Load source configurations from JSON file"""
        try:
            if not os.path.exists(self.config_path):
                raise FileNotFoundError(f"Source configuration file not found: {self.config_path}")
                
            with open(self.config_path, 'r') as f:
                sources = json.load(f)
            logging.info(f"Loaded {len(sources)} source configurations")
            return sources
        except json.JSONDecodeError as e:
            logging.error(f"Error parsing source configuration: {str(e)}")
            raise
            
    def _load_proxies(self) -> List[str]:
        """Load proxy list from JSON file"""
        try:
            if not os.path.exists(self.proxy_path):
                logging.warning(f"Proxy configuration file not found: {self.proxy_path}")
                return []
                
            with open(self.proxy_path, 'r') as f:
                proxies = json.load(f)
            logging.info(f"Loaded {len(proxies)} proxies")
            return proxies
        except json.JSONDecodeError as e:
            logging.error(f"Error parsing proxy configuration: {str(e)}")
            return []
            
    def save_leads(self, leads: List[Dict], source: str):
        """Save scraped leads to JSON file"""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
            
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.join(self.output_dir, f"leads_{source}_{timestamp}.json")
        
        with open(filename, 'w') as f:
            json.dump(leads, f, indent=2)
        logging.info(f"Saved {len(leads)} leads to {filename}")
        
    def run(self, source_name: Optional[str] = None):
        """Run the spider for specified or all sources"""
        settings = get_project_settings()
        settings.update({
            'ROTATING_PROXY_LIST': self.proxies,
            'DOWNLOAD_DELAY': 2,  # Be polite with requests
            'CONCURRENT_REQUESTS_PER_DOMAIN': 2,
            'COOKIES_ENABLED': False,
            'USER_AGENT': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        })
        
        process = CrawlerProcess(settings)
        
        try:
            if source_name:
                if source_name not in self.sources:
                    raise ValueError(f"Source '{source_name}' not found in configuration")
                sources_to_crawl = {source_name: self.sources[source_name]}
            else:
                sources_to_crawl = self.sources
                
            for source, config in sources_to_crawl.items():
                logging.info(f"Starting spider for source: {source}")
                process.crawl(
                    RealEstateSpider,
                    source=source,
                    config=config,
                    callback=lambda leads, src=source: self.save_leads(leads, src)
                )
                
            process.start()
            logging.info("Spider run completed successfully")
            
        except Exception as e:
            logging.error(f"Error running spider: {str(e)}")
            raise

if __name__ == "__main__":
    try:
        runner = SpiderRunner()
        if len(sys.argv) > 1:
            runner.run(sys.argv[1])
        else:
            runner.run()
    except Exception as e:
        logging.error(f"Spider runner failed: {str(e)}")
        sys.exit(1) 