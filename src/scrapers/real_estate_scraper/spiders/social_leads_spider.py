"""
Spider for scraping real estate leads from social media platforms using authenticated sessions.
"""

import scrapy
import json
from datetime import datetime
from typing import Dict, List, Optional
from urllib.parse import urlencode, quote_plus
import os

class SocialLeadsSpider(scrapy.Spider):
    """Spider for scraping real estate leads from social media using authenticated sessions."""
    
    name = "social_leads_spider"
    allowed_domains = ["twitter.com", "facebook.com"]
    
    custom_settings = {
        'USER_AGENT': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'ROBOTSTXT_OBEY': False,  # We'll be using authenticated sessions
        'CONCURRENT_REQUESTS': 4,
        'DOWNLOAD_DELAY': 3,
        'COOKIES_ENABLED': True,
        'COOKIES_DEBUG': True
    }
    
    def __init__(self, location: str = None, lead_type: str = None, *args, **kwargs):
        """Initialize the spider with location and lead type."""
        super(SocialLeadsSpider, self).__init__(*args, **kwargs)
        self.location = location
        self.lead_type = lead_type
        
        # Define search queries based on lead type
        self.search_queries = {
            'buy': [
                'looking to buy house',
                'want to buy home',
                'first time home buyer',
                'house hunting',
                'moving to'
            ],
            'sell': [
                'selling my house',
                'need to sell home',
                'looking to sell',
                'moving from',
                'relocating from'
            ],
            'refi': [
                'refinance my home',
                'refinancing house',
                'mortgage rates',
                'lower my mortgage',
                'refi options'
            ]
        }

    def start_requests(self):
        """Start by authenticating with each platform."""
        if not self.location:
            self.logger.error("No location specified")
            return

        # Start with Twitter authentication
        yield scrapy.Request(
            'https://twitter.com/i/flow/login',
            callback=self.twitter_login,
            meta={'dont_redirect': True, 'handle_httpstatus_list': [302]},
            dont_filter=True
        )

        # Start with Facebook authentication
        yield scrapy.Request(
            'https://www.facebook.com/login',
            callback=self.facebook_login,
            meta={'dont_redirect': True, 'handle_httpstatus_list': [302]},
            dont_filter=True
        )

    def twitter_login(self, response):
        """Handle Twitter login."""
        # You'll need to provide your Twitter credentials
        return scrapy.FormRequest.from_response(
            response,
            formdata={
                'username': os.getenv('TWITTER_USERNAME'),
                'password': os.getenv('TWITTER_PASSWORD')
            },
            callback=self.after_twitter_login
        )

    def facebook_login(self, response):
        """Handle Facebook login."""
        # You'll need to provide your Facebook credentials
        return scrapy.FormRequest.from_response(
            response,
            formdata={
                'email': os.getenv('FACEBOOK_EMAIL'),
                'pass': os.getenv('FACEBOOK_PASSWORD')
            },
            callback=self.after_facebook_login
        )

    def after_twitter_login(self, response):
        """Start Twitter searches after successful login."""
        queries = self.search_queries.get(self.lead_type, self.search_queries['buy'])
        for query in queries:
            search_query = f"{query} {self.location}"
            twitter_url = f"https://twitter.com/search?q={quote_plus(search_query)}&f=live"
            yield scrapy.Request(
                url=twitter_url,
                callback=self.parse_twitter,
                meta={'platform': 'twitter', 'query': search_query}
            )

    def after_facebook_login(self, response):
        """Start Facebook searches after successful login."""
        queries = self.search_queries.get(self.lead_type, self.search_queries['buy'])
        for query in queries:
            search_query = f"{query} {self.location}"
            fb_url = f"https://www.facebook.com/search/posts/?q={quote_plus(search_query)}"
            yield scrapy.Request(
                url=fb_url,
                callback=self.parse_facebook,
                meta={'platform': 'facebook', 'query': search_query}
            )

    def parse_twitter(self, response):
        """Parse Twitter search results."""
        tweets = response.css('article[data-testid="tweet"]')
        for tweet in tweets:
            text = ' '.join(tweet.css('div[data-testid="tweetText"] *::text').getall())
            if not text:
                continue
                
            yield {
                'platform': 'twitter',
                'query': response.meta['query'],
                'content': text,
                'username': tweet.css('div[data-testid="User-Name"] span::text').get(),
                'timestamp': tweet.css('time::attr(datetime)').get(),
                'url': response.urljoin(tweet.css('a[href*="/status/"]::attr(href)').get()),
                'engagement': {
                    'replies': tweet.css('div[data-testid="reply"]::text').get(),
                    'retweets': tweet.css('div[data-testid="retweet"]::text').get(),
                    'likes': tweet.css('div[data-testid="like"]::text').get()
                },
                'scraped_at': datetime.now().isoformat()
            }

        # Handle pagination
        next_page = response.css('a[href*="?cursor="]::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse_twitter, meta=response.meta)

    def parse_facebook(self, response):
        """Parse Facebook search results."""
        posts = response.css('div[role="article"]')
        for post in posts:
            content = ' '.join(post.css('div[data-ad-preview="message"] *::text').getall())
            if not content:
                continue
                
            yield {
                'platform': 'facebook',
                'query': response.meta['query'],
                'content': content,
                'username': post.css('h3 a::text').get(),
                'timestamp': post.css('span[data-testid="story-time"] a::text').get(),
                'url': post.css('span[data-testid="story-time"] a::attr(href)').get(),
                'engagement': {
                    'reactions': post.css('span[data-testid="like_reactors"]::text').get(),
                    'comments': post.css('span[data-testid="comment_count"]::text').get(),
                    'shares': post.css('span[data-testid="share_count"]::text').get()
                },
                'scraped_at': datetime.now().isoformat()
            }

        # Handle pagination
        next_page = response.css('a[href*="search/posts"][aria-label="Next"]::attr(href)').get()
        if next_page:
            yield response.follow(next_page, callback=self.parse_facebook, meta=response.meta) 