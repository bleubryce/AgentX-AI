from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
import uuid
import json
import asyncio
from pydantic import BaseModel, Field

from ..utils.logger import logger
from ..utils.cache import cache


class AgentMessage(BaseModel):
    """Message exchanged between agents or between agents and users."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    receiver_id: Optional[str] = None
    content: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    message_type: str = "text"  # text, action, request, response
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AgentContext(BaseModel):
    """Context information for agent operations."""
    session_id: str
    user_id: Optional[str] = None
    conversation_history: List[AgentMessage] = Field(default_factory=list)
    current_state: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class Agent(ABC):
    """Base class for all agents in the system."""
    
    def __init__(self, agent_id: str, name: str, description: str):
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.is_active = True
        self.created_at = datetime.utcnow()
        self.capabilities = []
        self.message_queue = asyncio.Queue()
        logger.info(f"Agent {self.name} ({self.agent_id}) initialized")
    
    @abstractmethod
    async def process_message(self, message: AgentMessage, context: AgentContext) -> AgentMessage:
        """Process an incoming message and generate a response."""
        pass
    
    @abstractmethod
    async def perform_action(self, action_name: str, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Perform a specific action with the given parameters."""
        pass
    
    async def send_message(self, message: AgentMessage) -> None:
        """Send a message to another agent or to the orchestrator."""
        await self.message_queue.put(message)
        logger.debug(f"Agent {self.agent_id} sent message: {message.id}")
    
    async def receive_message(self) -> AgentMessage:
        """Receive a message from the message queue."""
        message = await self.message_queue.get()
        logger.debug(f"Agent {self.agent_id} received message: {message.id}")
        return message
    
    async def update_context(self, context: AgentContext, updates: Dict[str, Any]) -> AgentContext:
        """Update the agent context with new information."""
        for key, value in updates.items():
            if key == "conversation_history" and isinstance(value, AgentMessage):
                context.conversation_history.append(value)
            elif key == "current_state" and isinstance(value, dict):
                context.current_state.update(value)
            elif key == "metadata" and isinstance(value, dict):
                context.metadata.update(value)
            else:
                setattr(context, key, value)
        return context
    
    @cache(ttl=3600)
    async def get_knowledge(self, query: str, context: AgentContext) -> Dict[str, Any]:
        """Retrieve knowledge relevant to the query from the knowledge base."""
        # This would be implemented by specific agents or use a knowledge service
        logger.debug(f"Agent {self.agent_id} retrieving knowledge for: {query}")
        return {"query": query, "results": []}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert agent to dictionary representation."""
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "description": self.description,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "capabilities": self.capabilities
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Agent':
        """Create an agent instance from a dictionary."""
        # This would be implemented by specific agent subclasses
        raise NotImplementedError("Must be implemented by subclasses")
    
    def __repr__(self) -> str:
        return f"<Agent {self.name} ({self.agent_id})>" 