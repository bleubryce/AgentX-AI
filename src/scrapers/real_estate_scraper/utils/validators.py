import json
import os
from typing import Dict, Any, List, Optional
from urllib.parse import urlparse

class ConfigurationError(Exception):
    """Raised when configuration is invalid"""
    pass

class ConfigValidator:
    """Validates configuration files and settings"""
    
    @staticmethod
    def validate_spider_config(config_path: str = 'config/spider_config.json') -> Dict[str, Any]:
        """Validate spider configuration file"""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                
            required_sections = ['scraping', 'filters', 'validation', 'export', 'monitoring']
            for section in required_sections:
                if section not in config:
                    raise ConfigurationError(f"Missing required section: {section}")
                    
            # Validate scraping settings
            scraping = config['scraping']
            if not isinstance(scraping['price_min'], (int, float)) or scraping['price_min'] < 0:
                raise ConfigurationError("Invalid price_min: must be a positive number")
            if not isinstance(scraping['price_max'], (int, float)) or scraping['price_max'] <= scraping['price_min']:
                raise ConfigurationError("Invalid price_max: must be greater than price_min")
                
            # Validate filters
            filters = config['filters']
            if not isinstance(filters['lead_indicators'], list):
                raise ConfigurationError("lead_indicators must be a list")
            if not isinstance(filters['excluded_terms'], list):
                raise ConfigurationError("excluded_terms must be a list")
                
            # Validate validation settings
            validation = config['validation']
            if not isinstance(validation['required_fields'], list):
                raise ConfigurationError("required_fields must be a list")
            if not all(isinstance(pattern, str) for pattern in validation['valid_price_formats']):
                raise ConfigurationError("valid_price_formats must be a list of strings")
                
            return config
            
        except FileNotFoundError:
            raise ConfigurationError(f"Configuration file not found: {config_path}")
        except json.JSONDecodeError as e:
            raise ConfigurationError(f"Invalid JSON in configuration file: {str(e)}")
            
    @staticmethod
    def validate_sources_config(config_path: str = 'config/sources.json') -> Dict[str, Any]:
        """Validate sources configuration file"""
        try:
            with open(config_path, 'r') as f:
                config = json.load(f)
                
            if not isinstance(config, dict):
                raise ConfigurationError("Sources configuration must be a dictionary")
                
            for source_name, source_config in config.items():
                # Validate required fields
                required_fields = ['start_urls', 'allowed_domains', 'max_leads', 'selectors']
                for field in required_fields:
                    if field not in source_config:
                        raise ConfigurationError(f"Missing required field '{field}' for source '{source_name}'")
                        
                # Validate URLs
                if not isinstance(source_config['start_urls'], list):
                    raise ConfigurationError(f"start_urls must be a list for source '{source_name}'")
                for url in source_config['start_urls']:
                    try:
                        parsed = urlparse(url)
                        if not all([parsed.scheme, parsed.netloc]):
                            raise ConfigurationError(f"Invalid URL '{url}' for source '{source_name}'")
                    except Exception as e:
                        raise ConfigurationError(f"Invalid URL format '{url}' for source '{source_name}': {str(e)}")
                        
                # Validate selectors
                required_selectors = ['price', 'address', 'description']
                for selector in required_selectors:
                    if selector not in source_config['selectors']:
                        raise ConfigurationError(f"Missing required selector '{selector}' for source '{source_name}'")
                        
            return config
            
        except FileNotFoundError:
            raise ConfigurationError(f"Configuration file not found: {config_path}")
        except json.JSONDecodeError as e:
            raise ConfigurationError(f"Invalid JSON in configuration file: {str(e)}")
            
    @staticmethod
    def validate_environment_variables() -> None:
        """Validate required environment variables"""
        required_vars = {
            'MONGO_URI': "MongoDB connection URI",
            'MONGO_DATABASE': "MongoDB database name"
        }
        
        missing_vars = []
        for var, description in required_vars.items():
            if not os.getenv(var):
                missing_vars.append(f"{var} ({description})")
                
        if missing_vars:
            raise ConfigurationError(f"Missing required environment variables: {', '.join(missing_vars)}")
            
    @staticmethod
    def validate_proxy_config(config_path: str = 'config/proxies.json') -> List[str]:
        """Validate proxy configuration file"""
        try:
            with open(config_path, 'r') as f:
                proxies = json.load(f)
                
            if not isinstance(proxies, list):
                raise ConfigurationError("Proxy configuration must be a list")
                
            for proxy in proxies:
                if not isinstance(proxy, str):
                    raise ConfigurationError(f"Invalid proxy format: {proxy}")
                try:
                    parsed = urlparse(proxy)
                    if not all([parsed.scheme, parsed.netloc]):
                        raise ConfigurationError(f"Invalid proxy URL format: {proxy}")
                except Exception as e:
                    raise ConfigurationError(f"Invalid proxy URL: {proxy} - {str(e)}")
                    
            return proxies
            
        except FileNotFoundError:
            raise ConfigurationError(f"Configuration file not found: {config_path}")
        except json.JSONDecodeError as e:
            raise ConfigurationError(f"Invalid JSON in configuration file: {str(e)}")
            
    @classmethod
    def validate_all(cls) -> Dict[str, Any]:
        """Validate all configuration files and settings"""
        try:
            # Validate environment variables first
            cls.validate_environment_variables()
            
            # Validate all configuration files
            spider_config = cls.validate_spider_config()
            sources_config = cls.validate_sources_config()
            proxy_list = cls.validate_proxy_config()
            
            return {
                'spider_config': spider_config,
                'sources_config': sources_config,
                'proxy_list': proxy_list,
                'status': 'valid'
            }
            
        except ConfigurationError as e:
            return {
                'status': 'invalid',
                'error': str(e)
            } 