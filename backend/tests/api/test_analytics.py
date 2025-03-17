from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from app.models.lead import LeadStatus, LeadSource

def create_test_leads(client: TestClient, headers: dict):
    # Create leads with different statuses and sources
    leads_data = [
        {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.analytics1@example.com",
            "source": LeadSource.WEBSITE.value,
            "status": LeadStatus.NEW.value
        },
        {
            "first_name": "Jane",
            "last_name": "Smith",
            "email": "jane.analytics2@example.com",
            "source": LeadSource.REFERRAL.value,
            "status": LeadStatus.CONVERTED.value
        },
        {
            "first_name": "Bob",
            "last_name": "Johnson",
            "email": "bob.analytics3@example.com",
            "source": LeadSource.WEBSITE.value,
            "status": LeadStatus.CONVERTED.value
        }
    ]
    
    for lead_data in leads_data:
        client.post("/api/v1/leads/", headers=headers, json=lead_data)

def test_get_analytics_overview(client: TestClient, headers: dict):
    create_test_leads(client, headers)
    
    response = client.get("/api/v1/analytics/overview", headers=headers)
    assert response.status_code == 200
    content = response.json()
    
    assert "conversion_metrics" in content
    assert "source_metrics" in content
    assert "lead_trends" in content
    assert "status_distribution" in content

def test_get_conversion_metrics(client: TestClient, headers: dict):
    create_test_leads(client, headers)
    
    response = client.get("/api/v1/analytics/conversion", headers=headers)
    assert response.status_code == 200
    content = response.json()
    
    assert content["total_leads"] == 3
    assert content["converted_leads"] == 2
    assert content["conversion_rate"] == pytest.approx(66.7, rel=1e-1)

def test_get_source_metrics(client: TestClient, headers: dict):
    create_test_leads(client, headers)
    
    response = client.get("/api/v1/analytics/sources", headers=headers)
    assert response.status_code == 200
    content = response.json()
    
    assert isinstance(content, list)
    website_metrics = next(m for m in content if m["source"] == LeadSource.WEBSITE.value)
    referral_metrics = next(m for m in content if m["source"] == LeadSource.REFERRAL.value)
    
    assert website_metrics["total_leads"] == 2
    assert website_metrics["converted_leads"] == 1
    assert referral_metrics["total_leads"] == 1
    assert referral_metrics["converted_leads"] == 1

def test_get_lead_trends(client: TestClient, headers: dict):
    create_test_leads(client, headers)
    
    response = client.get("/api/v1/analytics/trends", headers=headers)
    assert response.status_code == 200
    content = response.json()
    
    assert "total_leads" in content
    assert "new_leads" in content
    assert "converted_leads" in content
    assert isinstance(content["total_leads"], list)
    assert isinstance(content["new_leads"], list)
    assert isinstance(content["converted_leads"], list)

def test_get_status_distribution(client: TestClient, headers: dict):
    create_test_leads(client, headers)
    
    response = client.get("/api/v1/analytics/status", headers=headers)
    assert response.status_code == 200
    content = response.json()
    
    assert isinstance(content, list)
    new_status = next(s for s in content if s["status"] == LeadStatus.NEW.value)
    converted_status = next(s for s in content if s["status"] == LeadStatus.CONVERTED.value)
    
    assert new_status["count"] == 1
    assert converted_status["count"] == 2
    assert new_status["percentage"] == pytest.approx(33.3, rel=1e-1)
    assert converted_status["percentage"] == pytest.approx(66.7, rel=1e-1)

def test_analytics_with_date_range(client: TestClient, headers: dict):
    create_test_leads(client, headers)
    
    # Test with date range
    start_date = datetime.utcnow() - timedelta(days=7)
    end_date = datetime.utcnow()
    
    response = client.get(
        "/api/v1/analytics/overview",
        headers=headers,
        params={
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat()
        }
    )
    assert response.status_code == 200
    content = response.json()
    
    assert "conversion_metrics" in content
    assert "source_metrics" in content
    assert "lead_trends" in content
    assert "status_distribution" in content 