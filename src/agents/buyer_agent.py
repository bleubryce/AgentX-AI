"""
Buyer Lead Agent - Finds potential property buyers
"""

import os
import logging
import time
import json
import random
from typing import Dict, List, Optional, Any
from datetime import datetime

# Import agent base and utilities
from src.core.config import AgentConfig
from src.data.lead_repository import LeadRepository

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("BuyerLeadAgent")

class BuyerLeadAgent:
    """
    Agent that finds potential property buyers by analyzing various data sources
    and identifying buying signals.
    """
    
    def __init__(self, agent_id: str, config: AgentConfig):
        """
        Initialize the Buyer Lead Agent
        
        Args:
            agent_id: Unique identifier for this agent
            config: Configuration for this agent
        """
        self.agent_id = agent_id
        self.config = config
        self.lead_repository = LeadRepository()
        
        # Ensure the buyer config is set
        if not self.config.buyer_config:
            from src.core.config import BuyerAgentConfig
            self.config.buyer_config = BuyerAgentConfig()
        
        logger.info(f"Initialized Buyer Lead Agent {agent_id}")
    
    def generate_leads(self) -> List[Dict]:
        """
        Generate buyer leads by analyzing data sources
        
        Returns:
            leads: List of lead dictionaries
        """
        logger.info(f"Generating buyer leads for agent {self.agent_id}")
        
        all_leads = []
        
        # Process each data source
        for data_source in self.config.data_sources:
            if not data_source.enabled:
                continue
                
            logger.info(f"Processing data source: {data_source.name}")
            
            try:
                # Get leads from this data source
                source_leads = self._process_data_source(data_source)
                
                # Add source information to each lead
                for lead in source_leads:
                    lead["source"] = data_source.name
                
                all_leads.extend(source_leads)
                
                # Respect rate limits
                if data_source.rate_limit:
                    delay = 60.0 / data_source.rate_limit
                    time.sleep(delay)
                else:
                    time.sleep(self.config.request_delay_seconds)
                    
            except Exception as e:
                logger.error(f"Error processing data source {data_source.name}: {str(e)}")
        
        # Qualify leads
        qualified_leads = self._qualify_leads(all_leads)
        
        # Limit the number of leads
        if len(qualified_leads) > self.config.max_leads_per_run:
            qualified_leads = qualified_leads[:self.config.max_leads_per_run]
        
        logger.info(f"Generated {len(qualified_leads)} qualified buyer leads")
        return qualified_leads
    
    def _process_data_source(self, data_source: Dict) -> List[Dict]:
        """
        Process a specific data source to extract leads
        
        Args:
            data_source: Configuration for the data source
            
        Returns:
            leads: List of lead dictionaries from this source
        """
        # This would normally call APIs or scrape websites
        # For demonstration, we'll generate synthetic leads
        
        source_name = data_source.name
        leads = []
        
        if source_name == "zillow":
            leads = self._process_zillow_source(data_source)
        elif source_name == "realtor":
            leads = self._process_realtor_source(data_source)
        elif source_name == "facebook":
            leads = self._process_facebook_source(data_source)
        elif source_name == "google":
            leads = self._process_google_source(data_source)
        else:
            # Generic processing for other sources
            leads = self._generate_synthetic_leads(5, source_name)
        
        return leads
    
    def _process_zillow_source(self, data_source: Dict) -> List[Dict]:
        """Process Zillow data source"""
        # In a real implementation, this would use the Zillow API
        # For demonstration, generate synthetic leads
        
        # Example: Find people who have viewed multiple properties
        leads = self._generate_synthetic_leads(10, "zillow")
        
        # Add Zillow-specific attributes
        for lead in leads:
            lead["properties_viewed"] = random.randint(3, 15)
            lead["saved_searches"] = random.randint(0, 3)
            lead["contact_agent_clicks"] = random.randint(0, 2)
            lead["days_active"] = random.randint(1, 90)
        
        return leads
    
    def _process_realtor_source(self, data_source: Dict) -> List[Dict]:
        """Process Realtor.com data source"""
        # In a real implementation, this would use the Realtor.com API
        leads = self._generate_synthetic_leads(8, "realtor")
        
        # Add Realtor.com-specific attributes
        for lead in leads:
            lead["property_inquiries"] = random.randint(1, 5)
            lead["search_frequency"] = random.choice(["daily", "weekly", "monthly"])
            lead["preferred_neighborhoods"] = random.sample(
                ["Downtown", "Westside", "Northside", "Eastside", "Suburbs"], 
                k=random.randint(1, 3)
            )
        
        return leads
    
    def _process_facebook_source(self, data_source: Dict) -> List[Dict]:
        """Process Facebook data source"""
        # In a real implementation, this would use the Facebook Marketing API
        leads = self._generate_synthetic_leads(12, "facebook")
        
        # Add Facebook-specific attributes
        for lead in leads:
            lead["ad_campaign"] = random.choice([
                "First Time Buyers", "Luxury Properties", "Investment Properties", 
                "Relocation Services", "New Developments"
            ])
            lead["ad_interaction"] = random.choice(["click", "form_submit", "message"])
            lead["interests"] = random.sample(
                ["Real Estate", "Home Decor", "Interior Design", "DIY", "Investing", "Relocation"],
                k=random.randint(1, 4)
            )
        
        return leads
    
    def _process_google_source(self, data_source: Dict) -> List[Dict]:
        """Process Google data source"""
        # In a real implementation, this would use Google Ads API
        leads = self._generate_synthetic_leads(7, "google")
        
        # Add Google-specific attributes
        for lead in leads:
            lead["search_terms"] = random.sample([
                "homes for sale", "real estate agent", "buy house", "property listings",
                "condos for sale", "townhouses", "real estate listings", "first time home buyer"
            ], k=random.randint(1, 3))
            lead["ad_position"] = random.randint(1, 5)
            lead["landing_page"] = random.choice([
                "/buy", "/listings", "/first-time-buyers", "/contact", "/search"
            ])
        
        return leads
    
    def _generate_synthetic_leads(self, count: int, source: str) -> List[Dict]:
        """
        Generate synthetic leads for demonstration purposes
        
        Args:
            count: Number of leads to generate
            source: Name of the data source
            
        Returns:
            leads: List of synthetic lead dictionaries
        """
        leads = []
        
        first_names = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", 
                      "Linda", "William", "Elizabeth", "David", "Susan", "Richard", "Jessica", 
                      "Joseph", "Sarah", "Thomas", "Karen", "Charles", "Nancy"]
        
        last_names = ["Smith", "Johnson", "Williams", "Jones", "Brown", "Davis", "Miller", 
                     "Wilson", "Moore", "Taylor", "Anderson", "Thomas", "Jackson", "White", 
                     "Harris", "Martin", "Thompson", "Garcia", "Martinez", "Robinson"]
        
        for _ in range(count):
            first_name = random.choice(first_names)
            last_name = random.choice(last_names)
            
            # Generate geographic info based on agent config
            zip_code = None
            city = None
            state = None
            
            if self.config.geographic.zip_codes:
                zip_code = random.choice(self.config.geographic.zip_codes)
            else:
                zip_code = f"{random.randint(10000, 99999)}"
                
            if self.config.geographic.cities:
                city = random.choice(self.config.geographic.cities)
            else:
                cities = ["New York", "Los Angeles", "Chicago", "Houston", "Phoenix", 
                         "Philadelphia", "San Antonio", "San Diego", "Dallas", "San Jose"]
                city = random.choice(cities)
                
            if self.config.geographic.states:
                state = random.choice(self.config.geographic.states)
            else:
                states = ["CA", "TX", "FL", "NY", "PA", "IL", "OH", "GA", "NC", "MI"]
                state = random.choice(states)
            
            # Generate property preferences based on agent config
            property_type = random.choice(self.config.property.types)
            
            min_price = self.config.property.min_price or 100000
            max_price = self.config.property.max_price or 1000000
            price_range = [min_price, min(min_price + 100000, max_price)]
            
            min_beds = self.config.property.min_beds or 1
            max_beds = self.config.property.max_beds or 5
            beds = random.randint(min_beds, max_beds)
            
            min_baths = self.config.property.min_baths or 1
            max_baths = self.config.property.max_baths or 4
            baths = random.randint(min_baths, max_baths)
            
            # Generate buyer-specific attributes
            first_time_buyer = random.random() < 0.4
            relocating = random.random() < 0.3
            investment = random.random() < 0.2
            
            # Timeline (in months)
            if self.config.buyer_config and self.config.buyer_config.timeline_months:
                timeline = self.config.buyer_config.timeline_months
            else:
                timeline = random.choice([1, 3, 6, 12])
            
            # Create the lead
            lead = {
                "first_name": first_name,
                "last_name": last_name,
                "email": f"{first_name.lower()}.{last_name.lower()}@example.com",
                "phone": f"555-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
                "address": f"{random.randint(100, 9999)} Main St",
                "city": city,
                "state": state,
                "zip_code": zip_code,
                "property_type": property_type,
                "price_range": price_range,
                "beds": beds,
                "baths": baths,
                "first_time_buyer": first_time_buyer,
                "relocating": relocating,
                "investment": investment,
                "timeline_months": timeline,
                "lead_type": "buyer",
                "lead_status": "new",
                "lead_score": random.uniform(0.1, 0.9),  # Will be recalculated during qualification
                "notes": f"Generated from {source} data source"
            }
            
            leads.append(lead)
        
        return leads
    
    def _qualify_leads(self, leads: List[Dict]) -> List[Dict]:
        """
        Qualify leads based on the agent's qualification criteria
        
        Args:
            leads: List of lead dictionaries to qualify
            
        Returns:
            qualified_leads: List of qualified lead dictionaries
        """
        qualified_leads = []
        
        for lead in leads:
            # Calculate lead score based on various factors
            intent_score = self._calculate_intent_score(lead)
            timeline_score = self._calculate_timeline_score(lead)
            financial_score = self._calculate_financial_score(lead)
            engagement_score = self._calculate_engagement_score(lead)
            
            # Weighted average based on configuration
            lead_score = (
                intent_score * self.config.qualification.intent_weight +
                timeline_score * self.config.qualification.timeline_weight +
                financial_score * self.config.qualification.financial_weight +
                engagement_score * self.config.qualification.engagement_weight
            )
            
            # Update the lead with the calculated score
            lead["lead_score"] = lead_score
            lead["qualification_details"] = {
                "intent_score": intent_score,
                "timeline_score": timeline_score,
                "financial_score": financial_score,
                "engagement_score": engagement_score
            }
            
            # Check if the lead meets the minimum score threshold
            if lead_score >= self.config.qualification.min_score:
                qualified_leads.append(lead)
        
        # Sort by lead score (highest first)
        qualified_leads.sort(key=lambda x: x["lead_score"], reverse=True)
        
        return qualified_leads
    
    def _calculate_intent_score(self, lead: Dict) -> float:
        """Calculate intent score based on buying signals"""
        score = 0.5  # Base score
        
        # Adjust based on source-specific signals
        if lead.get("source") == "zillow":
            # More properties viewed indicates higher intent
            properties_viewed = lead.get("properties_viewed", 0)
            if properties_viewed > 10:
                score += 0.3
            elif properties_viewed > 5:
                score += 0.2
            elif properties_viewed > 0:
                score += 0.1
                
            # Saved searches indicate intent
            saved_searches = lead.get("saved_searches", 0)
            score += 0.1 * min(saved_searches, 3)
            
            # Contact agent clicks are strong signals
            contact_clicks = lead.get("contact_agent_clicks", 0)
            score += 0.15 * min(contact_clicks, 2)
            
        elif lead.get("source") == "realtor":
            # Property inquiries are strong signals
            inquiries = lead.get("property_inquiries", 0)
            score += 0.15 * min(inquiries, 3)
            
            # Search frequency indicates intent
            frequency = lead.get("search_frequency")
            if frequency == "daily":
                score += 0.25
            elif frequency == "weekly":
                score += 0.15
            elif frequency == "monthly":
                score += 0.05
                
        elif lead.get("source") == "facebook":
            # Form submissions are stronger than clicks
            interaction = lead.get("ad_interaction")
            if interaction == "form_submit":
                score += 0.3
            elif interaction == "message":
                score += 0.25
            elif interaction == "click":
                score += 0.1
                
        elif lead.get("source") == "google":
            # Specific search terms indicate intent
            search_terms = lead.get("search_terms", [])
            if "buy house" in search_terms:
                score += 0.2
            if "homes for sale" in search_terms:
                score += 0.15
            if "real estate agent" in search_terms:
                score += 0.1
        
        # Cap the score at 1.0
        return min(score, 1.0)
    
    def _calculate_timeline_score(self, lead: Dict) -> float:
        """Calculate timeline score based on how soon they want to buy"""
        timeline = lead.get("timeline_months", 12)
        
        # Shorter timeline = higher score
        if timeline <= 1:
            return 1.0
        elif timeline <= 3:
            return 0.8
        elif timeline <= 6:
            return 0.6
        elif timeline <= 9:
            return 0.4
        else:
            return 0.2
    
    def _calculate_financial_score(self, lead: Dict) -> float:
        """
        Calculate financial qualification score
        
        In a real implementation, this would check:
        - Credit score
        - Income verification
        - Pre-approval status
        - Down payment amount
        
        For demonstration, we'll use a random score
        """
        return random.uniform(0.3, 1.0)
    
    def _calculate_engagement_score(self, lead: Dict) -> float:
        """
        Calculate engagement score based on interactions
        
        In a real implementation, this would check:
        - Email opens/clicks
        - Website visits
        - Form completions
        - Call/text responses
        
        For demonstration, we'll use source-specific engagement metrics
        """
        score = 0.5  # Base score
        
        # Use source-specific engagement metrics if available
        source = lead.get("source")
        
        if source == "zillow":
            days_active = lead.get("days_active", 0)
            if days_active < 7:
                score += 0.3  # Recently active
            elif days_active < 30:
                score += 0.1
                
        elif source == "facebook":
            # Ad campaigns might have different engagement levels
            campaign = lead.get("ad_campaign")
            if campaign == "First Time Buyers":
                score += 0.2
            elif campaign == "Relocation Services":
                score += 0.3
                
        # Cap the score at 1.0
        return min(score, 1.0) 