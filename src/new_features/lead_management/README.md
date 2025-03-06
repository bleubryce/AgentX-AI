# Lead Management Feature

## Overview
The Lead Management feature provides comprehensive lead tracking and management capabilities for real estate agents. It integrates with the market analysis system to provide insights and automates communication workflows.

## Components

### Models
- `LeadContact`: Contact information for leads
- `LeadPreferences`: Property and location preferences
- `LeadTimeline`: Timeline and urgency information
- `LeadInteraction`: Interaction history and follow-up tracking
- `Lead`: Main lead model combining all components
- `LeadCreate`: Model for creating new leads
- `LeadUpdate`: Model for updating existing leads
- `LeadResponse`: Response model for lead operations
- `LeadListResponse`: Response model for lead list operations

### Services
- `LeadManagementService`: Handles lead management operations
- Methods:
  - `create_lead`: Create a new lead
  - `get_lead`: Retrieve a lead by ID
  - `update_lead`: Update an existing lead
  - `list_leads`: List leads with filtering and pagination
  - `add_interaction`: Record a lead interaction

### API Endpoints
- `POST /api/v2/leads`: Create a new lead
- `GET /api/v2/leads/{lead_id}`: Get a lead by ID
- `PUT /api/v2/leads/{lead_id}`: Update a lead
- `GET /api/v2/leads`: List leads with filtering
- `POST /api/v2/leads/{lead_id}/interactions`: Add an interaction

### Integration
- `LeadManagementIntegration`: Integrates with market analysis and CRM
- Features:
  - Automatic market analysis for new leads
  - Lead scoring based on market conditions
  - Automated communication workflows
  - CRM synchronization

## Usage

### Creating a Lead
```python
from new_features.lead_management.models import LeadCreate, LeadContact, LeadPreferences, LeadTimeline

# Create lead data
lead_data = LeadCreate(
    contact=LeadContact(
        first_name="John",
        last_name="Doe",
        email="john@example.com",
        phone="+1234567890"
    ),
    lead_type="buyer",
    source="website",
    preferences=LeadPreferences(
        property_type=["Single Family"],
        min_price=300000.0,
        max_price=500000.0,
        preferred_locations=["San Francisco"]
    ),
    timeline=LeadTimeline(
        urgency_level="normal",
        financing_status="not_started"
    )
)

# Create lead
response = await service.create_lead(lead_data)
```

### Updating a Lead
```python
from new_features.lead_management.models import LeadUpdate

# Update lead data
update_data = LeadUpdate(
    status="contacted",
    preferences=LeadPreferences(
        property_type=["Single Family", "Condo"],
        preferred_locations=["San Francisco", "Oakland"]
    )
)

# Update lead
response = await service.update_lead(lead_id, update_data)
```

### Adding an Interaction
```python
from new_features.lead_management.models import LeadInteraction

# Create interaction
interaction = LeadInteraction(
    type="call",
    summary="Initial contact made",
    next_steps="Schedule property viewing",
    created_by="agent1"
)

# Add interaction
response = await service.add_interaction(lead_id, interaction)
```

## API Reference

### POST /api/v2/leads
Create a new lead.

**Request Body:**
```json
{
    "contact": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890"
    },
    "lead_type": "buyer",
    "source": "website",
    "preferences": {
        "property_type": ["Single Family"],
        "min_price": 300000.0,
        "max_price": 500000.0,
        "preferred_locations": ["San Francisco"]
    },
    "timeline": {
        "urgency_level": "normal",
        "financing_status": "not_started"
    }
}
```

**Response:**
```json
{
    "lead": {
        "id": "lead_123",
        "contact": {...},
        "lead_type": "buyer",
        "source": "website",
        "status": "new",
        "preferences": {...},
        "timeline": {...},
        "interactions": [],
        "created_at": "2024-02-20T12:00:00Z",
        "updated_at": "2024-02-20T12:00:00Z",
        "metadata": {
            "market_analysis": {...},
            "lead_insights": {...}
        }
    },
    "metadata": {
        "source": "crm",
        "version": "2.0"
    },
    "processing_time": 0.5
}
```

### GET /api/v2/leads/{lead_id}
Get a lead by ID.

**Response:**
```json
{
    "lead": {...},
    "metadata": {...},
    "processing_time": 0.2
}
```

### PUT /api/v2/leads/{lead_id}
Update an existing lead.

**Request Body:**
```json
{
    "status": "contacted",
    "preferences": {
        "property_type": ["Single Family", "Condo"],
        "preferred_locations": ["San Francisco", "Oakland"]
    }
}
```

**Response:**
```json
{
    "lead": {...},
    "metadata": {...},
    "processing_time": 0.3
}
```

### GET /api/v2/leads
List leads with filtering and pagination.

**Query Parameters:**
- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 20)
- `status`: Filter by status
- `lead_type`: Filter by lead type
- `assigned_to`: Filter by assigned agent

**Response:**
```json
{
    "leads": [...],
    "total_count": 100,
    "page": 1,
    "page_size": 20,
    "metadata": {...},
    "processing_time": 0.4
}
```

### POST /api/v2/leads/{lead_id}/interactions
Add an interaction to a lead.

**Request Body:**
```json
{
    "type": "call",
    "summary": "Initial contact made",
    "next_steps": "Schedule property viewing",
    "created_by": "agent1",
    "notes": "Client interested in single-family homes"
}
```

**Response:**
```json
{
    "lead": {...},
    "metadata": {...},
    "processing_time": 0.2
}
```

## Testing
The feature includes comprehensive tests covering:
- Model validation
- Service functionality
- API endpoints
- Integration layer
- Error handling

Run tests with:
```bash
pytest src/new_features/lead_management/tests/
```

## Dependencies
- FastAPI
- Pydantic
- pytest
- pytest-asyncio
- Material-UI
- Recharts

## Error Handling
The API includes proper error handling for:
- Invalid input data
- Service failures
- Data validation errors
- Integration issues

## Performance Considerations
- Lead operations are asynchronous
- Results are cached for frequently accessed leads
- Processing time is tracked and reported
- Batch operations are supported

## Security
- Input validation using Pydantic models
- Rate limiting on API endpoints
- Authentication required for sensitive operations
- Data sanitization for user inputs

## Future Enhancements
1. Advanced lead scoring
2. Automated follow-up scheduling
3. Integration with more CRM systems
4. Enhanced reporting capabilities
5. Mobile app support 