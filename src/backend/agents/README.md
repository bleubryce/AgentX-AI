# AI Agent System

This directory contains the implementation of the AI agent system for the real estate platform.

## Overview

The agent system provides intelligent assistance to users through natural language interactions. It can help with various real estate tasks including lead generation, document management, property matching, client communication, and content creation.

## Components

### Base Components

- `base.py`: Contains the base `Agent` class and core message models
- `orchestrator.py`: Manages agent interactions and coordinates their activities
- `nlp_service.py`: Provides natural language processing capabilities

### Specialized Agents

- `customer_support_agent.py`: Handles subscription and billing inquiries
- `lead_generation_agent.py`: Manages lead capture, qualification, and follow-up sequences
- `document_management_agent.py` (planned): Analyzes contracts and identifies non-standard clauses
- `property_matching_agent.py` (planned): Analyzes buyer preferences and matches properties
- `client_communication_agent.py` (planned): Automates transaction updates and personalizes communication
- `content_creation_agent.py` (planned): Generates property descriptions and marketing content

## Supporting Services

The agent system relies on several services to perform its functions:

- **Document Service**: Manages document parsing, analysis, and organization
- **Template Service**: Provides standard templates for contracts and clauses
- **Property Service**: Manages property listings and details
- **Buyer Service**: Handles buyer preferences and property interests
- **Seller Service**: Manages seller properties and intent to sell
- **Communication Service**: Handles client communications and engagement tracking
- **Content Service**: Generates and manages marketing content
- **Media Service**: Manages visual content and recommendations

## Architecture

The agent system follows a modular architecture:

1. **Agent Orchestrator**: Central hub that routes messages and manages agent lifecycle
2. **NLP Service**: Processes natural language input to extract intents and entities
3. **Specialized Agents**: Handle specific domains and user intents
4. **Message Protocol**: Standardized format for agent communication
5. **Service Layer**: Provides domain-specific functionality to agents

## Usage

### Creating a New Agent

To create a new specialized agent:

1. Create a new file in the `agents` directory
2. Extend the base `Agent` class
3. Implement the required methods:
   - `process_message`: Handle incoming messages
   - `perform_action`: Execute specific actions

Example:

```python
from .base import Agent, AgentMessage, AgentContext

class MySpecializedAgent(Agent):
    def __init__(self, agent_id, name, description, **kwargs):
        super().__init__(agent_id, name, description)
        # Initialize agent-specific components
        
    async def process_message(self, message, context):
        # Process the message and generate a response
        return response_message
        
    async def perform_action(self, action_name, parameters, context):
        # Perform a specific action
        return result
```

### Registering an Agent

Register your agent with the orchestrator:

```python
from .orchestrator import AgentOrchestrator
from .my_specialized_agent import MySpecializedAgent

orchestrator = AgentOrchestrator()
orchestrator.register_agent_type("my_agent_type", MySpecializedAgent)

# Create an instance
agent = orchestrator.create_agent(
    agent_type="my_agent_type",
    name="My Agent",
    description="Handles specialized tasks"
)
```

## API Endpoints

The agent system exposes the following API endpoints:

- `POST /api/v1/agents/sessions`: Create a new agent session
- `GET /api/v1/agents/sessions/{session_id}`: Get session information
- `POST /api/v1/agents/messages`: Send a message to an agent
- `GET /api/v1/agents/agents`: List all available agents
- `GET /api/v1/agents/agents/{agent_id}`: Get information about a specific agent
- `POST /api/v1/agents/actions`: Execute a specific action on an agent

## Frontend Integration

The agent system integrates with the frontend through the `ChatInterface` component, which provides a user-friendly interface for interacting with agents.

## Agent Capabilities

### Lead Generation Agent

The Lead Generation Agent handles:
- Lead capture from various sources
- Lead qualification and scoring
- Follow-up scheduling and management
- Lead insights and analytics
- Lead assignment to agents

### Document Management Agent (Planned)

The Document Management Agent will handle:
- Contract analysis and review
- Identification of non-standard clauses
- Issue detection and flagging
- Document organization and retrieval

### Property Matching Agent (Planned)

The Property Matching Agent will handle:
- Buyer preference analysis
- Property matching algorithms
- Seller lead matching
- Match scoring and ranking

### Client Communication Agent (Planned)

The Client Communication Agent will handle:
- Automated transaction updates
- Personalized communication
- Engagement tracking and analysis
- Communication scheduling

### Content Creation Agent (Planned)

The Content Creation Agent will handle:
- Property description generation
- Social media content creation
- Email campaign generation
- Visual content recommendations

## Implementation Plan

See the `AGENT_IMPLEMENTATION_PLAN.md` file for details on the implementation timeline and approach for the remaining agents. 