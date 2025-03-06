from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from ....models.agent import Agent, AgentConfig, AgentRequest, AgentResponse
from ....services.agent_service import AgentService
from ....core.deps import get_current_active_user
from ....models.user import User

router = APIRouter()
agent_service = AgentService()

@router.get("/", response_model=List[Agent])
async def list_agents(
    current_user: User = Depends(get_current_active_user)
):
    """List all agents for the current user."""
    return await agent_service.list_agents(current_user.id)

@router.get("/{agent_id}", response_model=Agent)
async def get_agent(
    agent_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get a specific agent by ID."""
    agent = await agent_service.get_agent(agent_id, current_user.id)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return agent

@router.post("/", response_model=Agent)
async def create_agent(
    name: str,
    description: str,
    config: AgentConfig,
    current_user: User = Depends(get_current_active_user)
):
    """Create a new agent."""
    agent = await agent_service.create_agent(
        current_user.id,
        name,
        description,
        config
    )
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An agent with this name already exists"
        )
    return agent

@router.put("/{agent_id}", response_model=Agent)
async def update_agent(
    agent_id: str,
    updates: dict,
    current_user: User = Depends(get_current_active_user)
):
    """Update an agent."""
    agent = await agent_service.update_agent(agent_id, current_user.id, updates)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return agent

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: str,
    current_user: User = Depends(get_current_active_user)
):
    """Delete an agent."""
    success = await agent_service.delete_agent(agent_id, current_user.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    return {"status": "success"}

@router.post("/{agent_id}/process", response_model=AgentResponse)
async def process_request(
    agent_id: str,
    request: AgentRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Process a request using an agent."""
    response = await agent_service.process_request(agent_id, current_user.id, request)
    if not response:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to process request. Check rate limits and usage limits."
        )
    return response 