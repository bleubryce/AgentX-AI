from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from ....models.agent import (
    Agent,
    AgentCreate,
    AgentUpdate,
    AgentStatus,
    AgentSpecialty
)
from ....services.agent_service import AgentService
from ....core.auth import get_current_user, get_current_admin
from ....models.user import User
from ....core.cache import rate_limit, cached
from pydantic import BaseModel, Field
from ....agents.orchestrator import AgentOrchestrator
from ....agents.base import AgentMessage, AgentContext
from ....agents.customer_support_agent import CustomerSupportAgent
from ....agents.nlp_service import NLPService
from ....services.subscription_service import SubscriptionService
from ....services.payment_service import PaymentService
from ....utils.logger import logger

router = APIRouter()

# Models for API requests and responses
class MessageRequest(BaseModel):
    """Request model for sending a message to an agent."""
    text: str
    session_id: Optional[str] = None
    agent_id: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MessageResponse(BaseModel):
    """Response model for agent messages."""
    text: str
    session_id: str
    agent_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SessionResponse(BaseModel):
    """Response model for session creation."""
    session_id: str
    created_at: str


class AgentResponse(BaseModel):
    """Response model for agent information."""
    agent_id: str
    name: str
    description: str
    capabilities: List[str]
    is_active: bool


class ActionRequest(BaseModel):
    """Request model for executing an agent action."""
    action_name: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    session_id: str
    agent_id: str


class ActionResponse(BaseModel):
    """Response model for action execution."""
    success: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    error: Optional[str] = None


@router.post("", response_model=Agent)
@rate_limit(max_requests=50, window=3600)  # 50 agent creations per hour
async def create_agent(
    agent_in: AgentCreate,
    current_user: User = Depends(get_current_admin),
    agent_service: AgentService = Depends()
) -> Agent:
    """Create a new agent. Admin only."""
    return await agent_service.create_agent(agent_in, str(current_user.id))

@router.get("/{agent_id}", response_model=Agent)
@cached(key_prefix="agent", expire=300)  # Cache for 5 minutes
async def get_agent(
    agent_id: str,
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends()
) -> Agent:
    """Get agent by ID."""
    agent = await agent_service.get_by_id(agent_id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return agent

@router.put("/{agent_id}", response_model=Agent)
async def update_agent(
    agent_id: str,
    agent_in: AgentUpdate,
    current_user: User = Depends(get_current_admin),
    agent_service: AgentService = Depends()
) -> Agent:
    """Update agent. Admin only."""
    agent = await agent_service.update(agent_id, agent_in)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return agent

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_user: User = Depends(get_current_admin),
    agent_service: AgentService = Depends()
) -> Dict[str, str]:
    """Delete agent. Admin only."""
    if not await agent_service.delete(agent_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return {"message": "Agent deleted successfully"}

@router.get("", response_model=List[Agent])
@cached(
    key_prefix="agents_list",
    expire=300,
    include_query_params=True
)
async def list_agents(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[AgentStatus] = None,
    specialty: Optional[AgentSpecialty] = None,
    service_area: Optional[str] = None,
    search_query: Optional[str] = None,
    sort_by: str = Query("created_at", regex="^[a-zA-Z_]+$"),
    sort_order: int = Query(-1, ge=-1, le=1),
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends()
) -> List[Agent]:
    """List agents with filtering and pagination."""
    return await agent_service.list_agents(
        skip=skip,
        limit=limit,
        status=status,
        specialty=specialty,
        service_area=service_area,
        search_query=search_query,
        sort_by=sort_by,
        sort_order=sort_order
    )

@router.put("/{agent_id}/stats")
async def update_agent_stats(
    agent_id: str,
    stats_update: Dict[str, Any],
    current_user: User = Depends(get_current_admin),
    agent_service: AgentService = Depends()
) -> Dict[str, str]:
    """Update agent statistics. Admin only."""
    if not await agent_service.update_stats(agent_id, stats_update):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return {"message": "Agent statistics updated successfully"}

@router.post("/{agent_id}/rating")
@rate_limit(max_requests=100, window=3600)  # 100 ratings per hour
async def add_agent_rating(
    agent_id: str,
    rating: float = Query(..., ge=0, le=5),
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends()
) -> Dict[str, str]:
    """Add a rating for an agent."""
    if not await agent_service.update_rating(agent_id, rating):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return {"message": "Agent rating updated successfully"}

@router.get("/stats/top-performers", response_model=List[Agent])
@cached(key_prefix="top_agents", expire=3600)  # Cache for 1 hour
async def get_top_performers(
    limit: int = Query(10, ge=1, le=50),
    metric: str = Query("closed_deals", regex="^[a-zA-Z_]+$"),
    current_user: User = Depends(get_current_user),
    agent_service: AgentService = Depends()
) -> List[Agent]:
    """Get top performing agents."""
    try:
        return await agent_service.get_top_performers(limit, metric)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/stats/performance", response_model=Dict[str, Any])
@cached(key_prefix="agent_performance", expire=3600)  # Cache for 1 hour
async def get_performance_stats(
    current_user: User = Depends(get_current_admin),
    agent_service: AgentService = Depends()
) -> Dict[str, Any]:
    """Get overall agent performance statistics. Admin only."""
    return await agent_service.get_performance_stats()

# Dependency for getting the agent orchestrator
def get_agent_orchestrator(
    subscription_service: SubscriptionService = Depends(),
    payment_service: PaymentService = Depends()
) -> AgentOrchestrator:
    """Get or create the agent orchestrator singleton."""
    # In a real application, this would be a singleton or managed by a service container
    orchestrator = AgentOrchestrator()
    
    # Initialize NLP service
    nlp_service = NLPService()
    
    # Register agent types
    orchestrator.register_agent_type(
        "customer_support",
        lambda agent_id, name, description, **kwargs: CustomerSupportAgent(
            agent_id=agent_id,
            name=name,
            description=description,
            nlp_service=nlp_service,
            subscription_service=subscription_service,
            payment_service=payment_service
        )
    )
    
    # Create default agents if they don't exist
    if not orchestrator.agents:
        orchestrator.create_agent(
            agent_type="customer_support",
            name="Subscription Support",
            description="Helps with subscription-related inquiries and issues."
        )
    
    return orchestrator


@router.post("/sessions", response_model=SessionResponse)
async def create_session(
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new agent interaction session."""
    try:
        session_id = await orchestrator.create_session(user_id=current_user["id"])
        session = orchestrator.get_session(session_id)
        
        return SessionResponse(
            session_id=session_id,
            created_at=session.metadata.get("created_at", "")
        )
    
    except Exception as e:
        logger.error(f"Error creating session: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create session")


@router.get("/sessions/{session_id}", response_model=Dict[str, Any])
async def get_session(
    session_id: str,
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get information about a session."""
    session = orchestrator.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Check if the session belongs to the current user
    if session.user_id and session.user_id != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to access this session")
    
    # Convert conversation history to a serializable format
    conversation = [
        {
            "id": msg.id,
            "sender_id": msg.sender_id,
            "receiver_id": msg.receiver_id,
            "content": msg.content,
            "timestamp": msg.timestamp.isoformat(),
            "message_type": msg.message_type
        }
        for msg in session.conversation_history
    ]
    
    return {
        "session_id": session.session_id,
        "user_id": session.user_id,
        "conversation_history": conversation,
        "current_state": session.current_state,
        "metadata": session.metadata
    }


@router.post("/messages", response_model=MessageResponse)
async def send_message(
    message: MessageRequest,
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Send a message to an agent and get a response."""
    try:
        # Create a new session if none is provided
        session_id = message.session_id
        if not session_id:
            session_id = await orchestrator.create_session(user_id=current_user["id"])
        
        # Get the session
        session = orchestrator.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if the session belongs to the current user
        if session.user_id and session.user_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Process the message
        response = await orchestrator.process_user_message(
            session_id=session_id,
            message_content={"text": message.text, "metadata": message.metadata},
            target_agent_id=message.agent_id
        )
        
        # Return the response
        return MessageResponse(
            text=response.content.get("text", ""),
            session_id=session_id,
            agent_id=response.sender_id,
            metadata=response.metadata
        )
    
    except ValueError as e:
        logger.error(f"Value error processing message: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error(f"Error processing message: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to process message")


@router.get("/agents", response_model=List[AgentResponse])
async def list_agents(
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List all available agents."""
    agents = orchestrator.list_agents()
    
    return [
        AgentResponse(
            agent_id=agent["agent_id"],
            name=agent["name"],
            description=agent["description"],
            capabilities=agent.get("capabilities", []),
            is_active=agent.get("is_active", True)
        )
        for agent in agents
    ]


@router.get("/agents/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: str,
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get information about a specific agent."""
    agent = orchestrator.get_agent(agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    agent_data = agent.to_dict()
    
    return AgentResponse(
        agent_id=agent_data["agent_id"],
        name=agent_data["name"],
        description=agent_data["description"],
        capabilities=agent_data.get("capabilities", []),
        is_active=agent_data.get("is_active", True)
    )


@router.post("/actions", response_model=ActionResponse)
async def execute_action(
    action: ActionRequest,
    orchestrator: AgentOrchestrator = Depends(get_agent_orchestrator),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Execute a specific action on an agent."""
    try:
        # Get the session
        session = orchestrator.get_session(action.session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Check if the session belongs to the current user
        if session.user_id and session.user_id != current_user["id"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this session")
        
        # Execute the action
        result = await orchestrator.execute_agent_action(
            session_id=action.session_id,
            agent_id=action.agent_id,
            action_name=action.action_name,
            parameters=action.parameters
        )
        
        # Check if the action was successful
        if not result.get("success", False):
            return ActionResponse(
                success=False,
                data={},
                error=result.get("error", "Unknown error")
            )
        
        # Return the result
        return ActionResponse(
            success=True,
            data=result
        )
    
    except ValueError as e:
        logger.error(f"Value error executing action: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
    except Exception as e:
        logger.error(f"Error executing action: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to execute action") 