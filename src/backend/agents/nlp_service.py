from typing import Dict, List, Any, Optional, Tuple
import json
import aiohttp
import os
from pydantic import BaseModel, Field

from ..utils.logger import logger
from ..utils.cache import cache


class Intent(BaseModel):
    """Represents a detected intent in user input."""
    name: str
    confidence: float
    parameters: Dict[str, Any] = Field(default_factory=dict)


class Entity(BaseModel):
    """Represents an entity extracted from user input."""
    type: str
    value: Any
    start: int
    end: int
    confidence: float


class NLPResult(BaseModel):
    """Result of NLP processing on user input."""
    text: str
    intents: List[Intent] = Field(default_factory=list)
    entities: List[Entity] = Field(default_factory=list)
    sentiment: float = 0.0  # -1.0 to 1.0
    language: str = "en"
    processed_text: str = ""
    metadata: Dict[str, Any] = Field(default_factory=dict)


class NLPService:
    """
    Service for natural language processing tasks.
    Provides intent recognition, entity extraction, and other NLP capabilities.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-3.5-turbo"):
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        self.api_url = "https://api.openai.com/v1/chat/completions"
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        logger.info(f"NLP Service initialized with model: {self.model}")
    
    @cache(ttl=300)
    async def process_text(self, text: str, context: Optional[Dict[str, Any]] = None) -> NLPResult:
        """Process text to extract intents, entities, and other information."""
        try:
            # Extract intents and entities
            intents, entities = await self._extract_intents_entities(text, context)
            
            # Analyze sentiment
            sentiment = await self._analyze_sentiment(text)
            
            # Detect language
            language = await self._detect_language(text)
            
            # Create and return the NLP result
            result = NLPResult(
                text=text,
                intents=intents,
                entities=entities,
                sentiment=sentiment,
                language=language,
                processed_text=text,  # In a real implementation, this might be normalized or corrected text
                metadata={"model": self.model}
            )
            
            return result
        
        except Exception as e:
            logger.error(f"Error processing text with NLP service: {str(e)}")
            # Return a minimal result in case of error
            return NLPResult(
                text=text,
                metadata={"error": str(e)}
            )
    
    async def _extract_intents_entities(self, text: str, context: Optional[Dict[str, Any]] = None) -> Tuple[List[Intent], List[Entity]]:
        """Extract intents and entities from text using the language model."""
        prompt = self._create_intent_entity_prompt(text, context)
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are an AI assistant that extracts intents and entities from text."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 500
            }
            
            async with session.post(self.api_url, headers=self.headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"API error: {response.status} - {error_text}")
                    return [], []
                
                result = await response.json()
                content = result["choices"][0]["message"]["content"]
                
                try:
                    # Parse the JSON response
                    data = json.loads(content)
                    
                    # Extract intents
                    intents = [
                        Intent(
                            name=intent["name"],
                            confidence=intent["confidence"],
                            parameters=intent.get("parameters", {})
                        )
                        for intent in data.get("intents", [])
                    ]
                    
                    # Extract entities
                    entities = [
                        Entity(
                            type=entity["type"],
                            value=entity["value"],
                            start=entity["start"],
                            end=entity["end"],
                            confidence=entity["confidence"]
                        )
                        for entity in data.get("entities", [])
                    ]
                    
                    return intents, entities
                
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse JSON from model response: {content}")
                    return [], []
                except KeyError as e:
                    logger.error(f"Missing key in model response: {str(e)}")
                    return [], []
    
    async def _analyze_sentiment(self, text: str) -> float:
        """Analyze the sentiment of the text."""
        # In a production system, this would use a dedicated sentiment analysis model
        # For now, we'll use a simple prompt to the language model
        
        prompt = f"Analyze the sentiment of the following text and return a single number between -1.0 (very negative) and 1.0 (very positive):\n\n{text}"
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are an AI assistant that analyzes sentiment."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.1,
                "max_tokens": 10
            }
            
            async with session.post(self.api_url, headers=self.headers, json=payload) as response:
                if response.status != 200:
                    return 0.0
                
                result = await response.json()
                content = result["choices"][0]["message"]["content"].strip()
                
                try:
                    # Try to parse the sentiment value
                    sentiment = float(content)
                    # Ensure it's in the range [-1.0, 1.0]
                    return max(-1.0, min(1.0, sentiment))
                except ValueError:
                    logger.error(f"Failed to parse sentiment value: {content}")
                    return 0.0
    
    async def _detect_language(self, text: str) -> str:
        """Detect the language of the text."""
        # In a production system, this would use a dedicated language detection model
        # For simplicity, we'll assume English for now
        return "en"
    
    def _create_intent_entity_prompt(self, text: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Create a prompt for intent and entity extraction."""
        context_str = ""
        if context:
            context_str = f"\nContext: {json.dumps(context)}"
        
        return f"""
        Extract intents and entities from the following text{context_str}:
        
        Text: "{text}"
        
        Return the result as a JSON object with the following structure:
        {{
            "intents": [
                {{
                    "name": "intent_name",
                    "confidence": 0.95,
                    "parameters": {{
                        "param1": "value1",
                        "param2": "value2"
                    }}
                }}
            ],
            "entities": [
                {{
                    "type": "entity_type",
                    "value": "entity_value",
                    "start": 10,
                    "end": 15,
                    "confidence": 0.9
                }}
            ]
        }}
        
        Only return the JSON object, nothing else.
        """
    
    @cache(ttl=3600)
    async def generate_response(self, prompt: str, context: Optional[Dict[str, Any]] = None) -> str:
        """Generate a response using the language model."""
        context_str = ""
        if context:
            context_str = f"\nContext: {json.dumps(context)}"
        
        full_prompt = f"{prompt}{context_str}"
        
        async with aiohttp.ClientSession() as session:
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": "You are a helpful AI assistant."},
                    {"role": "user", "content": full_prompt}
                ],
                "temperature": 0.7,
                "max_tokens": 500
            }
            
            async with session.post(self.api_url, headers=self.headers, json=payload) as response:
                if response.status != 200:
                    error_text = await response.text()
                    logger.error(f"API error: {response.status} - {error_text}")
                    return "I'm sorry, I encountered an error while generating a response."
                
                result = await response.json()
                content = result["choices"][0]["message"]["content"]
                return content 