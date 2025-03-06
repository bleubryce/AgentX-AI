"""
API for the Real Estate Lead Generation AI Agents
"""

import os
from typing import Dict, List, Optional, Union
from fastapi import FastAPI, HTTPException, Depends, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Import agent manager and configuration
from src.core.agent_manager import get_agent_manager
from src.core.config import (
    AgentConfig, BuyerAgentConfig, SellerAgentConfig, RefinanceAgentConfig,
    DEFAULT_BUYER_CONFIG, DEFAULT_SELLER_CONFIG, DEFAULT_REFINANCE_CONFIG
)

# Create FastAPI app
app = FastAPI(
    title="Real Estate Lead Generation AI Agents API",
    description="API for managing AI agents that generate real estate leads",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict this to your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for API requests/responses
class AgentCreateRequest(BaseModel):
    """Request to create a new agent"""
    name: str
    description: Optional[str] = None
    agent_type: str = Field(..., description="Type of agent: 'buyer', 'seller', or 'refinance'")
    config: Optional[Dict] = Field(default_factory=dict, description="Agent configuration")

class AgentResponse(BaseModel):
    """Response with agent information"""
    id: str
    name: str
    description: Optional[str] = None
    agent_type: str
    config: Dict
    lead_count: int = 0
    scheduled: bool = False

class LeadResponse(BaseModel):
    """Response with lead information"""
    id: str
    first_name: str
    last_name: str
    email: str
    phone: Optional[str] = None
    lead_type: str
    lead_status: str
    lead_score: float
    source: str
    created_at: str
    agent_id: str
    agent_type: str
    # Additional fields will be included in the actual response

class ErrorResponse(BaseModel):
    """Error response"""
    detail: str

# Routes
@app.get("/", response_model=Dict)
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Real Estate Lead Generation AI Agents API",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.post("/agents", response_model=AgentResponse)
async def create_agent(request: AgentCreateRequest):
    """Create a new agent"""
    agent_manager = get_agent_manager()
    
    # Validate agent type
    if request.agent_type not in ["buyer", "seller", "refinance"]:
        raise HTTPException(status_code=400, detail=f"Invalid agent type: {request.agent_type}")
    
    # Create agent config based on type and provided config
    if request.agent_type == "buyer":
        base_config = DEFAULT_BUYER_CONFIG.copy(deep=True)
    elif request.agent_type == "seller":
        base_config = DEFAULT_SELLER_CONFIG.copy(deep=True)
    else:  # refinance
        base_config = DEFAULT_REFINANCE_CONFIG.copy(deep=True)
    
    # Update with provided config
    base_config.name = request.name
    if request.description:
        base_config.description = request.description
    
    # Update nested config if provided
    if request.config:
        # This is simplified - in a real implementation, you'd need to handle
        # updating nested Pydantic models properly
        for key, value in request.config.items():
            if hasattr(base_config, key):
                setattr(base_config, key, value)
    
    # Create the agent
    agent_id = agent_manager.create_agent(request.agent_type, base_config)
    
    # Get agent status for response
    agent_status = agent_manager.get_agent_status(request.agent_type, agent_id)
    
    return {
        "id": agent_id,
        "name": base_config.name,
        "description": base_config.description,
        "agent_type": request.agent_type,
        "config": agent_status.get("config", {}),
        "lead_count": agent_status.get("lead_count", 0),
        "scheduled": agent_status.get("scheduled", False)
    }

@app.get("/agents", response_model=List[AgentResponse])
async def list_agents(agent_type: Optional[str] = None):
    """List all agents or filter by type"""
    agent_manager = get_agent_manager()
    
    if agent_type and agent_type not in ["buyer", "seller", "refinance"]:
        raise HTTPException(status_code=400, detail=f"Invalid agent type: {agent_type}")
    
    # Get agent status
    status = agent_manager.get_agent_status(agent_type)
    
    # Format response
    agents = []
    
    if agent_type:
        # Single type
        for agent_id, agent_info in status.items():
            agents.append({
                "id": agent_id,
                "name": agent_info.get("config", {}).get("name", "Unnamed Agent"),
                "description": agent_info.get("config", {}).get("description"),
                "agent_type": agent_type,
                "config": agent_info.get("config", {}),
                "lead_count": agent_info.get("lead_count", 0),
                "scheduled": agent_info.get("scheduled", False)
            })
    else:
        # All types
        for agent_type, agents_of_type in status.items():
            for agent_id, agent_info in agents_of_type.items():
                agents.append({
                    "id": agent_id,
                    "name": agent_info.get("config", {}).get("name", "Unnamed Agent"),
                    "description": agent_info.get("config", {}).get("description"),
                    "agent_type": agent_type,
                    "config": agent_info.get("config", {}),
                    "lead_count": agent_info.get("lead_count", 0),
                    "scheduled": agent_info.get("scheduled", False)
                })
    
    return agents

@app.get("/agents/{agent_type}/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_type: str, agent_id: str):
    """Get information about a specific agent"""
    agent_manager = get_agent_manager()
    
    if agent_type not in ["buyer", "seller", "refinance"]:
        raise HTTPException(status_code=400, detail=f"Invalid agent type: {agent_type}")
    
    # Get agent status
    status = agent_manager.get_agent_status(agent_type, agent_id)
    
    if not status:
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")
    
    return {
        "id": agent_id,
        "name": status.get("config", {}).get("name", "Unnamed Agent"),
        "description": status.get("config", {}).get("description"),
        "agent_type": agent_type,
        "config": status.get("config", {}),
        "lead_count": status.get("lead_count", 0),
        "scheduled": status.get("scheduled", False)
    }

@app.post("/agents/{agent_type}/{agent_id}/run", response_model=Dict)
async def run_agent(agent_type: str, agent_id: str):
    """Run an agent to generate leads"""
    agent_manager = get_agent_manager()
    
    if agent_type not in ["buyer", "seller", "refinance"]:
        raise HTTPException(status_code=400, detail=f"Invalid agent type: {agent_type}")
    
    try:
        leads = agent_manager.run_agent(agent_type, agent_id)
        return {
            "success": True,
            "message": f"Agent {agent_id} generated {len(leads)} leads",
            "lead_count": len(leads)
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running agent: {str(e)}")

@app.post("/agents/{agent_type}/{agent_id}/schedule", response_model=Dict)
async def schedule_agent(
    agent_type: str, 
    agent_id: str, 
    frequency: str = Body(..., embed=True),
    time_str: Optional[str] = Body(None, embed=True)
):
    """Schedule an agent to run on a recurring basis"""
    agent_manager = get_agent_manager()
    
    if agent_type not in ["buyer", "seller", "refinance"]:
        raise HTTPException(status_code=400, detail=f"Invalid agent type: {agent_type}")
    
    if frequency not in ["hourly", "daily", "weekly"]:
        raise HTTPException(status_code=400, detail=f"Invalid frequency: {frequency}")
    
    try:
        agent_manager.schedule_agent(agent_type, agent_id, frequency, time_str)
        return {
            "success": True,
            "message": f"Agent {agent_id} scheduled to run {frequency}"
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scheduling agent: {str(e)}")

@app.post("/agents/{agent_type}/{agent_id}/stop", response_model=Dict)
async def stop_agent(agent_type: str, agent_id: str):
    """Stop a scheduled agent"""
    agent_manager = get_agent_manager()
    
    if agent_type not in ["buyer", "seller", "refinance"]:
        raise HTTPException(status_code=400, detail=f"Invalid agent type: {agent_type}")
    
    try:
        agent_manager.stop_agent(agent_type, agent_id)
        return {
            "success": True,
            "message": f"Agent {agent_id} stopped"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error stopping agent: {str(e)}")

@app.get("/leads", response_model=List[LeadResponse])
async def get_leads(
    agent_type: Optional[str] = None,
    agent_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """Get leads with optional filtering"""
    from src.data.lead_repository import LeadRepository
    lead_repo = LeadRepository()
    
    if agent_type and agent_type not in ["buyer", "seller", "refinance"]:
        raise HTTPException(status_code=400, detail=f"Invalid agent type: {agent_type}")
    
    leads = lead_repo.get_leads(
        agent_type=agent_type,
        agent_id=agent_id,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset
    )
    
    # Convert MongoDB _id to id for API response
    for lead in leads:
        if "_id" in lead:
            lead["id"] = lead.pop("_id")
    
    return leads

@app.get("/leads/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str):
    """Get a specific lead by ID"""
    from src.data.lead_repository import LeadRepository
    lead_repo = LeadRepository()
    
    leads = lead_repo.get_leads(filters={"_id": lead_id}, limit=1)
    
    if not leads:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found")
    
    lead = leads[0]
    
    # Convert MongoDB _id to id for API response
    if "_id" in lead:
        lead["id"] = lead.pop("_id")
    
    return lead

@app.put("/leads/{lead_id}", response_model=Dict)
async def update_lead(lead_id: str, updates: Dict = Body(...)):
    """Update a lead"""
    from src.data.lead_repository import LeadRepository
    lead_repo = LeadRepository()
    
    # Don't allow updating certain fields
    for field in ["_id", "id", "agent_type", "agent_id", "created_at"]:
        if field in updates:
            updates.pop(field)
    
    success = lead_repo.update_lead(lead_id, updates)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found")
    
    return {
        "success": True,
        "message": f"Lead {lead_id} updated"
    }

@app.delete("/leads/{lead_id}", response_model=Dict)
async def delete_lead(lead_id: str):
    """Delete a lead"""
    from src.data.lead_repository import LeadRepository
    lead_repo = LeadRepository()
    
    success = lead_repo.delete_lead(lead_id)
    
    if not success:
        raise HTTPException(status_code=404, detail=f"Lead {lead_id} not found")
    
    return {
        "success": True,
        "message": f"Lead {lead_id} deleted"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 