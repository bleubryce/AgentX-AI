"""
AI Email Follow-up Generator for Real Estate Leads
"""

from typing import Dict, List, Optional
import openai
from datetime import datetime
from ..config import (
    OPENAI_API_KEY,
    GPT_MODEL,
    TEMPERATURE,
    MAX_TOKENS,
    FOLLOW_UP_TEMPLATE
)

class FollowUpGenerator:
    """AI-powered email follow-up generator for real estate leads."""
    
    def __init__(self):
        """Initialize the follow-up generator with OpenAI API."""
        openai.api_key = OPENAI_API_KEY
        self.model = GPT_MODEL
        self.temperature = TEMPERATURE
        self.max_tokens = MAX_TOKENS
    
    async def generate_follow_up(
        self,
        lead_data: Dict,
        previous_communication: Optional[List[Dict[str, str]]] = None,
        property_details: Optional[Dict] = None
    ) -> Dict:
        """
        Generate a personalized follow-up email for a lead.
        
        Args:
            lead_data: Dictionary containing lead information
            previous_communication: List of previous communication messages
            property_details: Optional dictionary containing property details
            
        Returns:
            Dict containing email content and metadata
        """
        try:
            # Prepare context for GPT
            context = self._prepare_context(lead_data, previous_communication, property_details)
            
            # Generate personalized content
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_prompt()},
                    {"role": "user", "content": context}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            # Parse and structure the response
            email_content = self._parse_response(response.choices[0].message.content)
            
            # Format the email using the template
            formatted_email = self._format_email(email_content, lead_data)
            
            return {
                "subject": email_content["subject"],
                "body": formatted_email,
                "generated_at": datetime.now().isoformat(),
                "personalization_score": self._calculate_personalization(email_content)
            }
            
        except Exception as e:
            print(f"Error generating follow-up: {str(e)}")
            return self._generate_fallback_email(lead_data)
    
    def _prepare_context(
        self,
        lead_data: Dict,
        previous_communication: Optional[List[Dict[str, str]]],
        property_details: Optional[Dict]
    ) -> str:
        """Prepare context for GPT prompt."""
        context_parts = [
            "Lead Information:",
            f"Name: {lead_data.get('name', 'Unknown')}",
            f"Intent: {lead_data.get('intent', 'Unknown')}",
            f"Timeline: {lead_data.get('timeline', 'Unknown')}",
            f"Budget: {lead_data.get('budget_range', 'Unknown')}",
            f"Location: {', '.join(lead_data.get('location_preferences', []))}",
            f"Urgency: {lead_data.get('urgency', 'Unknown')}"
        ]
        
        if previous_communication:
            context_parts.append("\nPrevious Communication:")
            for msg in previous_communication:
                context_parts.append(f"{msg['role']}: {msg['content']}")
        
        if property_details:
            context_parts.append("\nProperty Details:")
            for key, value in property_details.items():
                context_parts.append(f"{key}: {value}")
        
        return "\n".join(context_parts)
    
    def _get_system_prompt(self) -> str:
        """Get the system prompt for GPT."""
        return """
        You are an AI assistant helping to generate personalized follow-up emails for real estate leads.
        Your task is to:
        1. Analyze the lead's information and previous communication
        2. Generate a personalized subject line
        3. Create engaging, relevant content that:
           - References previous interactions
           - Addresses the lead's specific needs and interests
           - Provides value (market insights, property updates, etc.)
           - Includes a clear call to action
        4. Maintain a professional yet friendly tone
        5. Keep the email concise and focused
        
        Format your response as:
        SUBJECT: [subject line]
        CONTENT: [email content]
        CALL_TO_ACTION: [specific next step]
        """
    
    def _parse_response(self, response: str) -> Dict:
        """Parse GPT response into structured email content."""
        lines = response.split("\n")
        email_content = {
            "subject": "",
            "content": "",
            "call_to_action": ""
        }
        
        current_section = None
        for line in lines:
            line = line.strip()
            if line.startswith("SUBJECT:"):
                current_section = "subject"
                email_content["subject"] = line.replace("SUBJECT:", "").strip()
            elif line.startswith("CONTENT:"):
                current_section = "content"
            elif line.startswith("CALL_TO_ACTION:"):
                current_section = "call_to_action"
                email_content["call_to_action"] = line.replace("CALL_TO_ACTION:", "").strip()
            elif line and current_section == "content":
                email_content["content"] += line + "\n"
        
        return email_content
    
    def _format_email(self, email_content: Dict, lead_data: Dict) -> str:
        """Format the email using the template."""
        return FOLLOW_UP_TEMPLATE.format(
            name=lead_data.get("name", "there"),
            property_type=lead_data.get("property_type", "property"),
            location=", ".join(lead_data.get("location_preferences", [])),
            topic=lead_data.get("intent", "real estate"),
            personalized_content=email_content["content"],
            agent_name=lead_data.get("agent_name", "Your Agent")
        )
    
    def _calculate_personalization(self, email_content: Dict) -> float:
        """Calculate personalization score for the email."""
        # Simple scoring based on content length and structure
        score = 0.0
        
        # Check subject line
        if email_content["subject"]:
            score += 0.3
        
        # Check main content
        if email_content["content"]:
            content_length = len(email_content["content"])
            if content_length > 100:
                score += 0.4
            elif content_length > 50:
                score += 0.2
        
        # Check call to action
        if email_content["call_to_action"]:
            score += 0.3
        
        return min(score, 1.0)
    
    def _generate_fallback_email(self, lead_data: Dict) -> Dict:
        """Generate a basic fallback email."""
        return {
            "subject": f"Following up about your {lead_data.get('intent', 'real estate')} interest",
            "body": FOLLOW_UP_TEMPLATE.format(
                name=lead_data.get("name", "there"),
                property_type=lead_data.get("property_type", "property"),
                location=", ".join(lead_data.get("location_preferences", [])),
                topic=lead_data.get("intent", "real estate"),
                personalized_content="I wanted to follow up on our previous conversation and see if you have any questions.",
                agent_name=lead_data.get("agent_name", "Your Agent")
            ),
            "generated_at": datetime.now().isoformat(),
            "personalization_score": 0.3
        } 