"""
Tests for Lead Management Feature
"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from ..models import (
    Lead, LeadCreate, LeadUpdate, LeadResponse, LeadListResponse,
    LeadContact, LeadPreferences, LeadTimeline, LeadInteraction,
    LeadSource, LeadStatus, LeadType
)
from ..services import LeadManagementService
from ..routes import router
from fastapi.testclient import TestClient
from ..existing.crm.crm_client import CRMClient
from ..existing.email.email_service import EmailService
from ..existing.market.market_analyzer import MarketAnalyzer

@pytest.fixture
def mock_crm_client():
    """Create a mock CRM client"""
    client = AsyncMock(spec=CRMClient)
    client.create_lead.return_value = "test_lead_id"
    client.get_lead.return_value = {
        "id": "test_lead_id",
        "contact": {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john@example.com",
            "phone": "+1234567890",
            "preferred_contact_method": "email",
            "best_time_to_contact": "morning"
        },
        "lead_type": "buyer",
        "source": "website",
        "status": "new",
        "preferences": {
            "property_type": ["Single Family"],
            "min_price": 300000.0,
            "max_price": 500000.0,
            "preferred_locations": ["San Francisco"],
            "bedrooms": 3,
            "bathrooms": 2,
            "square_feet": 2000.0,
            "must_have_features": ["garage", "garden"],
            "nice_to_have_features": ["pool", "smart_home"]
        },
        "timeline": {
            "desired_move_in_date": "2024-06-01T00:00:00Z",
            "urgency_level": "normal",
            "financing_status": "not_started",
            "pre_approval_amount": None
        },
        "interactions": [],
        "created_at": "2024-02-20T12:00:00Z",
        "updated_at": "2024-02-20T12:00:00Z",
        "assigned_to": None,
        "tags": [],
        "metadata": {}
    }
    return client

@pytest.fixture
def mock_email_service():
    """Create a mock email service"""
    service = AsyncMock(spec=EmailService)
    service.send_email.return_value = True
    return service

@pytest.fixture
def mock_market_analyzer():
    """Create a mock market analyzer"""
    analyzer = AsyncMock(spec=MarketAnalyzer)
    analyzer.analyze_market.return_value = {
        "price_trends": {
            "current_price": 400000.0,
            "price_change_percentage": 5.2,
            "historical_prices": [
                {"date": "2024-01-01", "price": 380000.0},
                {"date": "2024-02-01", "price": 390000.0}
            ],
            "forecast_prices": [
                {"date": "2024-03-01", "price": 410000.0},
                {"date": "2024-04-01", "price": 420000.0}
            ]
        },
        "market_indicators": {
            "days_on_market": 45,
            "inventory_level": 120,
            "market_health_score": 0.85,
            "demand_score": 0.9,
            "supply_score": 0.8
        },
        "confidence_score": 0.92
    }
    return analyzer

@pytest.fixture
def lead_management_service(mock_crm_client, mock_email_service):
    """Create a lead management service with mock dependencies"""
    return LeadManagementService(mock_crm_client, mock_email_service)

@pytest.fixture
def test_client(mock_crm_client, mock_email_service):
    """Create a test client with mock dependencies"""
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[CRMClient] = lambda: mock_crm_client
    app.dependency_overrides[EmailService] = lambda: mock_email_service
    return TestClient(app)

class TestLeadManagementModels:
    """Test lead management models"""
    
    def test_lead_contact_model(self):
        """Test lead contact model creation and validation"""
        contact = LeadContact(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            phone="+1234567890",
            preferred_contact_method="email",
            best_time_to_contact="morning"
        )
        assert contact.first_name == "John"
        assert contact.last_name == "Doe"
        assert contact.email == "john@example.com"
        assert contact.phone == "+1234567890"

    def test_lead_preferences_model(self):
        """Test lead preferences model creation and validation"""
        preferences = LeadPreferences(
            property_type=["Single Family"],
            min_price=300000.0,
            max_price=500000.0,
            preferred_locations=["San Francisco"],
            bedrooms=3,
            bathrooms=2,
            square_feet=2000.0,
            must_have_features=["garage", "garden"],
            nice_to_have_features=["pool", "smart_home"]
        )
        assert preferences.property_type == ["Single Family"]
        assert preferences.min_price == 300000.0
        assert preferences.max_price == 500000.0
        assert preferences.preferred_locations == ["San Francisco"]

    def test_lead_timeline_model(self):
        """Test lead timeline model creation and validation"""
        timeline = LeadTimeline(
            desired_move_in_date=datetime.utcnow(),
            urgency_level="normal",
            financing_status="not_started",
            pre_approval_amount=None
        )
        assert timeline.urgency_level == "normal"
        assert timeline.financing_status == "not_started"

    def test_lead_model(self):
        """Test lead model creation and validation"""
        lead = Lead(
            id="test_lead_id",
            contact=LeadContact(
                first_name="John",
                last_name="Doe",
                email="john@example.com"
            ),
            lead_type=LeadType.BUYER,
            source=LeadSource.WEBSITE,
            status=LeadStatus.NEW,
            preferences=LeadPreferences(
                property_type=["Single Family"],
                preferred_locations=["San Francisco"]
            ),
            timeline=LeadTimeline()
        )
        assert lead.id == "test_lead_id"
        assert lead.lead_type == LeadType.BUYER
        assert lead.source == LeadSource.WEBSITE
        assert lead.status == LeadStatus.NEW

class TestLeadManagementService:
    """Test lead management service"""
    
    @pytest.mark.asyncio
    async def test_create_lead(self, lead_management_service):
        """Test creating a new lead"""
        lead_data = LeadCreate(
            contact=LeadContact(
                first_name="John",
                last_name="Doe",
                email="john@example.com"
            ),
            lead_type=LeadType.BUYER,
            source=LeadSource.WEBSITE,
            preferences=LeadPreferences(
                property_type=["Single Family"],
                preferred_locations=["San Francisco"]
            ),
            timeline=LeadTimeline()
        )
        response = await lead_management_service.create_lead(lead_data)
        
        assert isinstance(response, LeadResponse)
        assert response.lead.id == "test_lead_id"
        assert response.lead.lead_type == LeadType.BUYER
        assert "processing_time" in response.dict()
        assert "metadata" in response.dict()

    @pytest.mark.asyncio
    async def test_get_lead(self, lead_management_service):
        """Test getting a lead"""
        response = await lead_management_service.get_lead("test_lead_id")
        
        assert isinstance(response, LeadResponse)
        assert response.lead.id == "test_lead_id"
        assert response.lead.contact.first_name == "John"
        assert response.lead.contact.email == "john@example.com"

    @pytest.mark.asyncio
    async def test_update_lead(self, lead_management_service):
        """Test updating a lead"""
        update_data = LeadUpdate(
            status=LeadStatus.CONTACTED,
            preferences=LeadPreferences(
                property_type=["Single Family", "Condo"],
                preferred_locations=["San Francisco", "Oakland"]
            )
        )
        response = await lead_management_service.update_lead(
            "test_lead_id",
            update_data
        )
        
        assert isinstance(response, LeadResponse)
        assert response.lead.status == LeadStatus.CONTACTED
        assert len(response.lead.preferences.property_type) == 2
        assert len(response.lead.preferences.preferred_locations) == 2

    @pytest.mark.asyncio
    async def test_list_leads(self, lead_management_service):
        """Test listing leads"""
        response = await lead_management_service.list_leads(
            page=1,
            page_size=20,
            status=LeadStatus.NEW,
            lead_type=LeadType.BUYER
        )
        
        assert isinstance(response, LeadListResponse)
        assert response.page == 1
        assert response.page_size == 20
        assert "processing_time" in response.dict()
        assert "metadata" in response.dict()

    @pytest.mark.asyncio
    async def test_add_interaction(self, lead_management_service):
        """Test adding an interaction"""
        interaction = LeadInteraction(
            type="call",
            summary="Initial contact made",
            next_steps="Schedule property viewing",
            next_follow_up=datetime.utcnow(),
            created_by="agent1",
            notes="Client interested in single-family homes"
        )
        response = await lead_management_service.add_interaction(
            "test_lead_id",
            interaction
        )
        
        assert isinstance(response, LeadResponse)
        assert len(response.lead.interactions) > 0
        assert response.lead.interactions[0].type == "call"

class TestLeadManagementAPI:
    """Test lead management API endpoints"""
    
    def test_create_lead_endpoint(self, test_client):
        """Test create lead endpoint"""
        response = test_client.post(
            "/api/v2/leads",
            json={
                "contact": {
                    "first_name": "John",
                    "last_name": "Doe",
                    "email": "john@example.com"
                },
                "lead_type": "buyer",
                "source": "website",
                "preferences": {
                    "property_type": ["Single Family"],
                    "preferred_locations": ["San Francisco"]
                },
                "timeline": {}
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "lead" in data
        assert "metadata" in data
        assert "processing_time" in data

    def test_get_lead_endpoint(self, test_client):
        """Test get lead endpoint"""
        response = test_client.get("/api/v2/leads/test_lead_id")
        assert response.status_code == 200
        data = response.json()
        assert "lead" in data
        assert data["lead"]["id"] == "test_lead_id"

    def test_update_lead_endpoint(self, test_client):
        """Test update lead endpoint"""
        response = test_client.put(
            "/api/v2/leads/test_lead_id",
            json={
                "status": "contacted",
                "preferences": {
                    "property_type": ["Single Family", "Condo"],
                    "preferred_locations": ["San Francisco", "Oakland"]
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["lead"]["status"] == "contacted"
        assert len(data["lead"]["preferences"]["property_type"]) == 2

    def test_list_leads_endpoint(self, test_client):
        """Test list leads endpoint"""
        response = test_client.get(
            "/api/v2/leads",
            params={
                "page": 1,
                "page_size": 20,
                "status": "new",
                "lead_type": "buyer"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "leads" in data
        assert "total_count" in data
        assert "page" in data
        assert "page_size" in data

    def test_add_interaction_endpoint(self, test_client):
        """Test add interaction endpoint"""
        response = test_client.post(
            "/api/v2/leads/test_lead_id/interactions",
            json={
                "type": "call",
                "summary": "Initial contact made",
                "next_steps": "Schedule property viewing",
                "next_follow_up": datetime.utcnow().isoformat(),
                "created_by": "agent1",
                "notes": "Client interested in single-family homes"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data["lead"]["interactions"]) > 0
        assert data["lead"]["interactions"][0]["type"] == "call"

class TestLeadManagementIntegration:
    """Test lead management integration"""
    
    @pytest.fixture
    def integration(self, mock_crm_client, mock_email_service, mock_market_analyzer):
        """Create lead management integration with mock dependencies"""
        from ..integration import LeadManagementIntegration
        return LeadManagementIntegration(
            mock_crm_client,
            mock_email_service,
            mock_market_analyzer
        )

    @pytest.mark.asyncio
    async def test_integration_create_lead(self, integration):
        """Test integration lead creation with market analysis"""
        lead_data = LeadCreate(
            contact=LeadContact(
                first_name="John",
                last_name="Doe",
                email="john@example.com"
            ),
            lead_type=LeadType.BUYER,
            source=LeadSource.WEBSITE,
            preferences=LeadPreferences(
                property_type=["Single Family"],
                preferred_locations=["San Francisco"],
                min_price=300000.0,
                max_price=500000.0
            ),
            timeline=LeadTimeline()
        )
        response = await integration.create_lead(lead_data)
        
        assert isinstance(response, LeadResponse)
        assert response.lead.id == "test_lead_id"
        assert "market_analysis" in response.lead.metadata
        assert "lead_insights" in response.lead.metadata["market_analysis"]

    @pytest.mark.asyncio
    async def test_integration_get_lead(self, integration):
        """Test integration lead retrieval with market analysis"""
        response = await integration.get_lead("test_lead_id")
        
        assert isinstance(response, LeadResponse)
        assert response.lead.id == "test_lead_id"
        assert "market_analysis" in response.lead.metadata
        assert "lead_insights" in response.lead.metadata["market_analysis"]

    @pytest.mark.asyncio
    async def test_integration_update_lead(self, integration):
        """Test integration lead update with market analysis"""
        update_data = LeadUpdate(
            preferences=LeadPreferences(
                property_type=["Single Family", "Condo"],
                preferred_locations=["San Francisco", "Oakland"],
                min_price=350000.0,
                max_price=600000.0
            )
        )
        response = await integration.update_lead(
            "test_lead_id",
            update_data
        )
        
        assert isinstance(response, LeadResponse)
        assert "market_analysis" in response.lead.metadata
        assert "last_market_analysis" in response.lead.metadata
        assert "lead_insights" in response.lead.metadata["market_analysis"] 