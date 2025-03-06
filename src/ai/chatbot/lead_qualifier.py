"""
AI Chatbot for Lead Qualification
"""

from typing import Dict, List, Optional
import openai
from datetime import datetime
from ..config import (
    OPENAI_API_KEY,
    GPT_MODEL,
    TEMPERATURE,
    MAX_TOKENS,
    LEAD_QUALIFICATION_PROMPT
)

class LeadQualifier:
    """AI-powered lead qualification chatbot."""
    
    def __init__(self):
        """Initialize the lead qualifier with OpenAI API."""
        openai.api_key = OPENAI_API_KEY
        self.model = GPT_MODEL
        self.temperature = TEMPERATURE
        self.max_tokens = MAX_TOKENS
    
    async def qualify_lead(self, conversation: List[Dict[str, str]]) -> Dict:
        """
        Qualify a lead based on conversation history.
        
        Args:
            conversation: List of message dictionaries with 'role' and 'content'
            
        Returns:
            Dict containing lead qualification details
        """
        try:
            # Format conversation for GPT
            formatted_conversation = "\n".join([
                f"{msg['role']}: {msg['content']}"
                for msg in conversation
            ])
            
            # Create prompt with conversation context
            prompt = f"{LEAD_QUALIFICATION_PROMPT}\n\nConversation:\n{formatted_conversation}"
            
            # Get GPT response
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": LEAD_QUALIFICATION_PROMPT},
                    {"role": "user", "content": formatted_conversation}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            # Parse and structure the response
            qualification = self._parse_qualification(response.choices[0].message.content)
            
            # Add metadata
            qualification.update({
                "qualified_at": datetime.now().isoformat(),
                "confidence_score": self._calculate_confidence(qualification)
            })
            
            return qualification
            
        except Exception as e:
            # Log error and return basic qualification
            print(f"Error qualifying lead: {str(e)}")
            return {
                "intent": "unknown",
                "timeline": "unknown",
                "budget_range": "unknown",
                "location_preferences": [],
                "urgency": "unknown",
                "requirements": [],
                "qualified_at": datetime.now().isoformat(),
                "confidence_score": 0.0
            }
    
    def _parse_qualification(self, response: str) -> Dict:
        """Parse GPT response into structured qualification data."""
        # TODO: Implement more robust parsing
        # This is a simple example
        lines = response.split("\n")
        qualification = {
            "intent": "unknown",
            "timeline": "unknown",
            "budget_range": "unknown",
            "location_preferences": [],
            "urgency": "unknown",
            "requirements": []
        }
        
        for line in lines:
            line = line.strip().lower()
            if "intent" in line:
                qualification["intent"] = line.split(":")[-1].strip()
            elif "timeline" in line:
                qualification["timeline"] = line.split(":")[-1].strip()
            elif "budget" in line:
                qualification["budget_range"] = line.split(":")[-1].strip()
            elif "location" in line:
                qualification["location_preferences"] = [
                    loc.strip() for loc in line.split(":")[-1].split(",")
                ]
            elif "urgency" in line:
                qualification["urgency"] = line.split(":")[-1].strip()
            elif "requirements" in line:
                qualification["requirements"] = [
                    req.strip() for req in line.split(":")[-1].split(",")
                ]
        
        return qualification
    
    def _calculate_confidence(self, qualification: Dict) -> float:
        """Calculate confidence score for the qualification."""
        # Simple scoring based on completeness
        required_fields = [
            "intent", "timeline", "budget_range",
            "location_preferences", "urgency", "requirements"
        ]
        
        score = 0.0
        for field in required_fields:
            if qualification[field] != "unknown" and qualification[field]:
                score += 1.0
        
        return score / len(required_fields)
    
    async def generate_follow_up_questions(self, qualification: Dict) -> List[str]:
        """Generate follow-up questions based on qualification gaps."""
        gaps = []
        
        if qualification["intent"] == "unknown":
            gaps.append("Are you looking to buy, sell, or refinance?")
        if qualification["timeline"] == "unknown":
            gaps.append("When are you planning to make a move?")
        if qualification["budget_range"] == "unknown":
            gaps.append("What's your target price range?")
        if not qualification["location_preferences"]:
            gaps.append("Which areas are you interested in?")
        if qualification["urgency"] == "unknown":
            gaps.append("How soon do you need to complete this transaction?")
        
        return gaps 