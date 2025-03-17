import json
import os
import pytest
from unittest.mock import mock_open, patch

from real_estate_scraper.utils.validators import ConfigValidator, ConfigurationError

@pytest.fixture
def valid_spider_config():
    return {
        "scraping": {
            "price_min": 100000,
            "price_max": 1000000,
            "max_retries": 5,
            "request_timeout": 30
        },
        "filters": {
            "lead_indicators": ["looking to buy"],
            "excluded_terms": ["not for sale"]
        },
        "validation": {
            "required_fields": ["price", "address"],
            "valid_price_formats": ["\\$[0-9,]+"]
        },
        "export": {
            "formats": ["json"]
        },
        "monitoring": {
            "stats_collection": True
        }
    }

@pytest.fixture
def valid_sources_config():
    return {
        "zillow": {
            "start_urls": ["https://www.zillow.com/homes"],
            "allowed_domains": ["zillow.com"],
            "max_leads": 1000,
            "selectors": {
                "price": "//span[@class='price']",
                "address": "//div[@class='address']",
                "description": "//div[@class='description']"
            }
        }
    }

@pytest.fixture
def valid_proxy_config():
    return [
        "http://proxy1.example.com:8080",
        "http://proxy2.example.com:8080"
    ]

class TestConfigValidator:
    def test_validate_spider_config_valid(self, valid_spider_config):
        with patch("builtins.open", mock_open(read_data=json.dumps(valid_spider_config))):
            config = ConfigValidator.validate_spider_config()
            assert config == valid_spider_config

    def test_validate_spider_config_missing_section(self, valid_spider_config):
        del valid_spider_config['scraping']
        with patch("builtins.open", mock_open(read_data=json.dumps(valid_spider_config))):
            with pytest.raises(ConfigurationError, match="Missing required section: scraping"):
                ConfigValidator.validate_spider_config()

    def test_validate_spider_config_invalid_price(self, valid_spider_config):
        valid_spider_config['scraping']['price_min'] = -100
        with patch("builtins.open", mock_open(read_data=json.dumps(valid_spider_config))):
            with pytest.raises(ConfigurationError, match="Invalid price_min"):
                ConfigValidator.validate_spider_config()

    def test_validate_sources_config_valid(self, valid_sources_config):
        with patch("builtins.open", mock_open(read_data=json.dumps(valid_sources_config))):
            config = ConfigValidator.validate_sources_config()
            assert config == valid_sources_config

    def test_validate_sources_config_missing_field(self, valid_sources_config):
        del valid_sources_config['zillow']['start_urls']
        with patch("builtins.open", mock_open(read_data=json.dumps(valid_sources_config))):
            with pytest.raises(ConfigurationError, match="Missing required field 'start_urls'"):
                ConfigValidator.validate_sources_config()

    def test_validate_sources_config_invalid_url(self, valid_sources_config):
        valid_sources_config['zillow']['start_urls'] = ["invalid-url"]
        with patch("builtins.open", mock_open(read_data=json.dumps(valid_sources_config))):
            with pytest.raises(ConfigurationError, match="Invalid URL"):
                ConfigValidator.validate_sources_config()

    def test_validate_proxy_config_valid(self, valid_proxy_config):
        with patch("builtins.open", mock_open(read_data=json.dumps(valid_proxy_config))):
            proxies = ConfigValidator.validate_proxy_config()
            assert proxies == valid_proxy_config

    def test_validate_proxy_config_invalid_format(self):
        invalid_config = {"proxies": ["not-a-list"]}
        with patch("builtins.open", mock_open(read_data=json.dumps(invalid_config))):
            with pytest.raises(ConfigurationError, match="Proxy configuration must be a list"):
                ConfigValidator.validate_proxy_config()

    def test_validate_environment_variables_missing(self):
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ConfigurationError, match="Missing required environment variables"):
                ConfigValidator.validate_environment_variables()

    def test_validate_environment_variables_valid(self):
        env_vars = {
            'MONGO_URI': 'mongodb://localhost:27017',
            'MONGO_DATABASE': 'test_db'
        }
        with patch.dict(os.environ, env_vars, clear=True):
            ConfigValidator.validate_environment_variables()  # Should not raise

    def test_validate_all_valid(self, valid_spider_config, valid_sources_config, valid_proxy_config):
        env_vars = {
            'MONGO_URI': 'mongodb://localhost:27017',
            'MONGO_DATABASE': 'test_db'
        }
        with patch.dict(os.environ, env_vars, clear=True), \
             patch("builtins.open") as mock_file:
            # Configure mock to return different content for different files
            def mock_json_load(filename):
                if 'spider_config.json' in str(filename):
                    return valid_spider_config
                elif 'sources.json' in str(filename):
                    return valid_sources_config
                elif 'proxies.json' in str(filename):
                    return valid_proxy_config
                raise FileNotFoundError(f"Mock file not found: {filename}")

            mock_file.side_effect = [
                mock_open(read_data=json.dumps(valid_spider_config)).return_value,
                mock_open(read_data=json.dumps(valid_sources_config)).return_value,
                mock_open(read_data=json.dumps(valid_proxy_config)).return_value
            ]

            result = ConfigValidator.validate_all()
            assert result['status'] == 'valid'
            assert 'spider_config' in result
            assert 'sources_config' in result
            assert 'proxy_list' in result

    def test_validate_all_invalid(self, valid_spider_config, valid_sources_config, valid_proxy_config):
        # Make spider config invalid
        del valid_spider_config['scraping']
        
        with patch.dict(os.environ, {'MONGO_URI': 'mongodb://localhost:27017', 'MONGO_DATABASE': 'test_db'}), \
             patch("builtins.open") as mock_file:
            mock_file.side_effect = [
                mock_open(read_data=json.dumps(valid_spider_config)).return_value
            ]

            result = ConfigValidator.validate_all()
            assert result['status'] == 'invalid'
            assert 'error' in result 