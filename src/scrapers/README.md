# Real Estate Lead Scraper

A robust web scraping system for collecting real estate leads from various sources.

## Features

- Multi-source scraping support (Zillow, Realtor.com, etc.)
- Proxy rotation and user agent randomization
- Automatic retry mechanism for failed requests
- Data validation and cleaning
- MongoDB storage with deduplication
- Comprehensive logging
- Configurable scraping parameters
- Browser automation with Playwright
- Test coverage

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
playwright install
```

2. Configure environment variables:
- Copy `.env.example` to `.env`
- Update the variables with your settings

3. Configure sources:
- Edit `config/sources.json` to add/modify source configurations
- Update selectors as needed for each source

4. Configure proxies:
- Add your proxy list to `config/proxies.json`
- Format: `["http://proxy1:port", "http://proxy2:port"]`

5. Set up MongoDB:
```bash
# Start MongoDB (if running locally)
mongod --dbpath /path/to/data/db
```

## Usage

1. Run the spider for all sources:
```bash
python run_spider.py
```

2. Run for a specific source:
```bash
python run_spider.py zillow
```

3. Run tests:
```bash
pytest tests/
```

## Configuration Files

### sources.json
```json
{
  "source_name": {
    "start_urls": ["https://example.com"],
    "allowed_domains": ["example.com"],
    "max_leads": 1000,
    "selectors": {
      "price": "xpath_selector",
      "address": "xpath_selector",
      "description": "xpath_selector",
      "contact": "xpath_selector"
    }
  }
}
```

### spider_config.json
```json
{
  "price_min": 100000,
  "price_max": 1000000,
  "lead_indicators": ["looking to buy", "want to purchase"],
  "excluded_terms": ["not for sale", "sold"],
  "max_retries": 5,
  "request_timeout": 30
}
```

## Project Structure

```
src/scrapers/
├── config/
│   ├── sources.json
│   └── proxies.json
├── real_estate_scraper/
│   ├── spiders/
│   │   └── real_estate_spider.py
│   ├── pipelines.py
│   └── settings.py
├── tests/
│   └── test_real_estate_spider.py
├── .env
├── requirements.txt
├── run_spider.py
└── README.md
```

## Monitoring and Maintenance

1. Logs are stored in `logs/spider.log`
2. MongoDB indexes are automatically created
3. Failed requests are retried up to configured maximum
4. Duplicate leads are automatically filtered

## Error Handling

1. Network errors: Automatic retry with exponential backoff
2. Invalid data: Logged and skipped
3. Rate limiting: Handled by proxy rotation
4. Site changes: Logged for manual review

## Best Practices

1. Respect robots.txt
2. Use appropriate delays between requests
3. Rotate proxies and user agents
4. Validate and clean data
5. Monitor error rates
6. Keep logs for debugging
7. Regular maintenance of selectors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT License 