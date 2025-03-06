"""
AI Social Media Post Generator for Real Estate
"""

from typing import Dict, List, Optional
import openai
from datetime import datetime
from ..config import (
    OPENAI_API_KEY,
    GPT_MODEL,
    TEMPERATURE,
    MAX_TOKENS,
    SOCIAL_POST_TEMPLATE
)

class SocialPostGenerator:
    """AI-powered social media post generator for real estate properties."""
    
    def __init__(self):
        """Initialize the social post generator with OpenAI API."""
        openai.api_key = OPENAI_API_KEY
        self.model = GPT_MODEL
        self.temperature = TEMPERATURE
        self.max_tokens = MAX_TOKENS
    
    async def generate_post(
        self,
        property_data: Dict,
        platform: str = "instagram",
        post_type: str = "listing",
        tone: str = "professional",
        hashtags: Optional[List[str]] = None
    ) -> Dict:
        """
        Generate a social media post for a property.
        
        Args:
            property_data: Dictionary containing property details
            platform: Target platform ("instagram", "facebook", "twitter")
            post_type: Type of post ("listing", "sold", "open_house")
            tone: Desired tone ("professional", "casual", "luxury")
            hashtags: Optional list of custom hashtags
            
        Returns:
            Dict containing post content and metadata
        """
        try:
            # Prepare context for GPT
            context = self._prepare_context(
                property_data, platform, post_type, tone, hashtags
            )
            
            # Generate post content
            response = await openai.ChatCompletion.acreate(
                model=self.model,
                messages=[
                    {"role": "system", "content": self._get_system_prompt(platform, post_type, tone)},
                    {"role": "user", "content": context}
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            # Parse and structure the response
            post = self._parse_response(response.choices[0].message.content)
            
            # Add metadata
            post.update({
                "generated_at": datetime.now().isoformat(),
                "platform": platform,
                "post_type": post_type,
                "tone": tone,
                "engagement_score": self._calculate_engagement(post)
            })
            
            return post
            
        except Exception as e:
            print(f"Error generating social post: {str(e)}")
            return self._generate_fallback_post(property_data, platform)
    
    def _prepare_context(
        self,
        property_data: Dict,
        platform: str,
        post_type: str,
        tone: str,
        hashtags: Optional[List[str]]
    ) -> str:
        """Prepare context for GPT prompt."""
        context_parts = [
            f"Platform: {platform}",
            f"Post Type: {post_type}",
            f"Tone: {tone}",
            "\nProperty Details:"
        ]
        
        # Add property details
        for key, value in property_data.items():
            if isinstance(value, dict):
                context_parts.append(f"\n{key.title()}:")
                for subkey, subvalue in value.items():
                    context_parts.append(f"{subkey}: {subvalue}")
            else:
                context_parts.append(f"{key}: {value}")
        
        # Add custom hashtags if provided
        if hashtags:
            context_parts.append("\nCustom Hashtags:")
            for tag in hashtags:
                context_parts.append(f"- {tag}")
        
        return "\n".join(context_parts)
    
    def _get_system_prompt(self, platform: str, post_type: str, tone: str) -> str:
        """Get the system prompt for GPT based on platform and post type."""
        base_prompt = """
        You are an AI social media content creator for real estate.
        Create engaging content that:
        1. Highlights key property features
        2. Uses appropriate tone and style
        3. Includes relevant hashtags
        4. Follows platform best practices
        """
        
        # Platform-specific guidelines
        if platform == "instagram":
            platform_guidelines = """
            - Focus on visual appeal
            - Use emojis sparingly
            - Include location tags
            - Use Instagram-specific formatting
            """
        elif platform == "facebook":
            platform_guidelines = """
            - Include detailed descriptions
            - Add call-to-action
            - Share market insights
            - Use Facebook's rich media features
            """
        else:  # twitter
            platform_guidelines = """
            - Keep content concise
            - Use trending hashtags
            - Focus on key highlights
            - Include property link
            """
        
        # Post type-specific content
        if post_type == "sold":
            post_guidelines = """
            - Celebrate the successful sale
            - Include final price
            - Thank all parties involved
            - Share market success story
            """
        elif post_type == "open_house":
            post_guidelines = """
            - Highlight event details
            - Emphasize unique features
            - Include RSVP information
            - Create urgency
            """
        else:  # listing
            post_guidelines = """
            - Showcase property highlights
            - Include price and key details
            - Add contact information
            - Create interest
            """
        
        # Tone-specific language
        if tone == "casual":
            tone_guidelines = "Use friendly, conversational language"
        elif tone == "luxury":
            tone_guidelines = "Use sophisticated, elegant language"
        else:  # professional
            tone_guidelines = "Use clear, professional language"
        
        return f"{base_prompt}\n\n{platform_guidelines}\n\n{post_guidelines}\n\n{tone_guidelines}"
    
    def _parse_response(self, response: str) -> Dict:
        """Parse GPT response into structured post data."""
        sections = {
            "caption": "",
            "hashtags": [],
            "call_to_action": "",
            "location_tag": "",
            "mentions": []
        }
        
        current_section = None
        for line in response.split("\n"):
            line = line.strip()
            if not line:
                continue
                
            if line.lower().startswith("caption:"):
                current_section = "caption"
                continue
            elif line.lower().startswith("hashtags:"):
                current_section = "hashtags"
                continue
            elif line.lower().startswith("call to action:"):
                current_section = "call_to_action"
                continue
            elif line.lower().startswith("location:"):
                current_section = "location_tag"
                continue
            elif line.lower().startswith("mentions:"):
                current_section = "mentions"
                continue
            
            if current_section == "caption":
                sections["caption"] += line + " "
            elif current_section == "hashtags":
                if line.startswith("#"):
                    sections["hashtags"].append(line)
            elif current_section == "call_to_action":
                sections["call_to_action"] = line
            elif current_section == "location_tag":
                sections["location_tag"] = line
            elif current_section == "mentions":
                if line.startswith("@"):
                    sections["mentions"].append(line)
        
        return sections
    
    def _calculate_engagement(self, post: Dict) -> float:
        """Calculate engagement score for the post."""
        score = 0.0
        
        # Check caption
        if post["caption"]:
            caption_length = len(post["caption"])
            if 50 <= caption_length <= 200:
                score += 0.3
            elif caption_length > 200:
                score += 0.2
        
        # Check hashtags
        if post["hashtags"]:
            score += 0.2
        
        # Check call to action
        if post["call_to_action"]:
            score += 0.2
        
        # Check location tag
        if post["location_tag"]:
            score += 0.15
        
        # Check mentions
        if post["mentions"]:
            score += 0.15
        
        return min(score, 1.0)
    
    def _generate_fallback_post(self, property_data: Dict, platform: str) -> Dict:
        """Generate a basic fallback post."""
        return {
            "caption": f"Check out this {property_data.get('property_type', 'property')} in {property_data.get('location', '')}!",
            "hashtags": ["#RealEstate", "#HomesForSale"],
            "call_to_action": "Contact me for more details",
            "location_tag": "",
            "mentions": [],
            "generated_at": datetime.now().isoformat(),
            "platform": platform,
            "post_type": "listing",
            "tone": "professional",
            "engagement_score": 0.3
        } 