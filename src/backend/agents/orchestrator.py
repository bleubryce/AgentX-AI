from typing import Dict, List, Any, Optional, Type
import asyncio
import uuid
from datetime import datetime

from .base import Agent, AgentMessage, AgentContext
from ..utils.logger import logger
from ..utils.cache import cache


class AgentOrchestrator:
    """
    Orchestrates the interactions between agents and manages their lifecycle.
    Acts as a central hub for agent communication and task delegation.
    """
    
    def __init__(self):
        self.agents: Dict[str, Agent] = {}
        self.active_sessions: Dict[str, AgentContext] = {}
        self.message_router = asyncio.Queue()
        self.running = False
        self.agent_types: Dict[str, Type[Agent]] = {}
        logger.info("Agent Orchestrator initialized")
    
    def register_agent_type(self, agent_type: str, agent_class: Type[Agent]) -> None:
        """Register an agent type that can be instantiated."""
        self.agent_types[agent_type] = agent_class
        logger.info(f"Registered agent type: {agent_type}")
    
    def register_agent(self, agent: Agent) -> None:
        """Register an agent with the orchestrator."""
        self.agents[agent.agent_id] = agent
        logger.info(f"Registered agent: {agent.name} ({agent.agent_id})")
    
    def unregister_agent(self, agent_id: str) -> None:
        """Unregister an agent from the orchestrator."""
        if agent_id in self.agents:
            agent = self.agents.pop(agent_id)
            logger.info(f"Unregistered agent: {agent.name} ({agent.agent_id})")
    
    def get_agent(self, agent_id: str) -> Optional[Agent]:
        """Get an agent by ID."""
        return self.agents.get(agent_id)
    
    def list_agents(self) -> List[Dict[str, Any]]:
        """List all registered agents."""
        return [agent.to_dict() for agent in self.agents.values()]
    
    def create_agent(self, agent_type: str, name: str, description: str, **kwargs) -> Agent:
        """Create a new agent of the specified type."""
        if agent_type not in self.agent_types:
            raise ValueError(f"Unknown agent type: {agent_type}")
        
        agent_id = str(uuid.uuid4())
        agent_class = self.agent_types[agent_type]
        agent = agent_class(agent_id=agent_id, name=name, description=description, **kwargs)
        self.register_agent(agent)
        return agent
    
    async def start(self) -> None:
        """Start the orchestrator."""
        self.running = True
        logger.info("Agent Orchestrator started")
        await self._message_router_loop()
    
    async def stop(self) -> None:
        """Stop the orchestrator."""
        self.running = False
        logger.info("Agent Orchestrator stopped")
    
    async def _message_router_loop(self) -> None:
        """Main loop for routing messages between agents."""
        while self.running:
            try:
                message = await self.message_router.get()
                await self._route_message(message)
            except Exception as e:
                logger.error(f"Error in message router: {str(e)}")
    
    async def _route_message(self, message: AgentMessage) -> None:
        """Route a message to its intended recipient."""
        if message.receiver_id and message.receiver_id in self.agents:
            receiver = self.agents[message.receiver_id]
            await receiver.send_message(message)
            logger.debug(f"Routed message {message.id} from {message.sender_id} to {message.receiver_id}")
        else:
            logger.warning(f"Cannot route message {message.id}: unknown receiver {message.receiver_id}")
    
    async def send_message(self, message: AgentMessage) -> None:
        """Send a message through the orchestrator."""
        await self.message_router.put(message)
    
    async def create_session(self, user_id: Optional[str] = None) -> str:
        """Create a new agent session."""
        session_id = str(uuid.uuid4())
        context = AgentContext(
            session_id=session_id,
            user_id=user_id,
            conversation_history=[],
            current_state={},
            metadata={"created_at": datetime.utcnow().isoformat()}
        )
        self.active_sessions[session_id] = context
        logger.info(f"Created session {session_id} for user {user_id}")
        return session_id
    
    def get_session(self, session_id: str) -> Optional[AgentContext]:
        """Get a session by ID."""
        return self.active_sessions.get(session_id)
    
    async def process_user_message(self, session_id: str, message_content: Dict[str, Any], 
                                  target_agent_id: Optional[str] = None) -> AgentMessage:
        """Process a message from a user and route it to the appropriate agent."""
        context = self.get_session(session_id)
        if not context:
            raise ValueError(f"Unknown session: {session_id}")
        
        # Create a message from the user
        user_message = AgentMessage(
            sender_id=context.user_id or "user",
            receiver_id=target_agent_id,
            content=message_content,
            message_type="text"
        )
        
        # Add to conversation history
        context.conversation_history.append(user_message)
        
        # If no specific agent is targeted, route to the most appropriate one
        if not target_agent_id:
            target_agent_id = await self._select_agent_for_message(user_message, context)
        
        if target_agent_id and target_agent_id in self.agents:
            agent = self.agents[target_agent_id]
            response = await agent.process_message(user_message, context)
            context.conversation_history.append(response)
            return response
        else:
            # Create a fallback response if no agent can handle the message
            fallback_response = AgentMessage(
                sender_id="orchestrator",
                receiver_id=context.user_id or "user",
                content={"text": "I'm sorry, I couldn't find an agent to handle your request."},
                message_type="text"
            )
            context.conversation_history.append(fallback_response)
            return fallback_response
    
    @cache(ttl=60)
    async def _select_agent_for_message(self, message: AgentMessage, context: AgentContext) -> Optional[str]:
        """Select the most appropriate agent to handle a message based on content and context."""
        # This would be implemented with more sophisticated logic, possibly using NLP
        # For now, we'll just return the first active agent or None if there are no agents
        for agent_id, agent in self.agents.items():
            if agent.is_active:
                return agent_id
        return None
    
    async def execute_agent_action(self, session_id: str, agent_id: str, 
                                  action_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a specific action on an agent."""
        context = self.get_session(session_id)
        if not context:
            raise ValueError(f"Unknown session: {session_id}")
        
        agent = self.get_agent(agent_id)
        if not agent:
            raise ValueError(f"Unknown agent: {agent_id}")
        
        result = await agent.perform_action(action_name, parameters, context)
        return result 