from fastapi.testclient import TestClient
from app.models.lead import LeadStatus, LeadSource

def test_create_lead(client: TestClient, headers: dict):
    response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "1234567890",
            "company": "Test Company",
            "source": LeadSource.WEBSITE.value,
            "status": LeadStatus.NEW.value,
            "notes": "Test lead"
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "john.doe@example.com"
    assert data["status"] == LeadStatus.NEW.value

def test_get_leads_list(client: TestClient, headers: dict):
    # Create test lead
    client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "List",
            "last_name": "Test",
            "email": "list.test@example.com",
            "status": LeadStatus.NEW.value
        }
    )

    # Test pagination and filtering
    response = client.get(
        "/api/v1/leads/",
        headers=headers,
        params={
            "page": 1,
            "limit": 10,
            "status": LeadStatus.NEW.value
        }
    )
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert data["page"] == 1

def test_get_lead_by_id(client: TestClient, headers: dict):
    # Create test lead
    create_response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Get",
            "last_name": "ById",
            "email": "get.byid@example.com",
            "status": LeadStatus.NEW.value
        }
    )
    lead_id = create_response.json()["id"]

    # Get lead by ID
    response = client.get(f"/api/v1/leads/{lead_id}", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == lead_id
    assert data["email"] == "get.byid@example.com"

def test_update_lead(client: TestClient, headers: dict):
    # Create test lead
    create_response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Update",
            "last_name": "Test",
            "email": "update.test@example.com",
            "status": LeadStatus.NEW.value
        }
    )
    lead_id = create_response.json()["id"]

    # Update lead
    update_data = {
        "status": LeadStatus.CONTACTED.value,
        "notes": "Updated notes"
    }
    response = client.put(
        f"/api/v1/leads/{lead_id}",
        headers=headers,
        json=update_data
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == LeadStatus.CONTACTED.value
    assert data["notes"] == "Updated notes"

def test_delete_lead(client: TestClient, headers: dict):
    # Create test lead
    create_response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Delete",
            "last_name": "Test",
            "email": "delete.test@example.com",
            "status": LeadStatus.NEW.value
        }
    )
    lead_id = create_response.json()["id"]

    # Delete lead
    response = client.delete(f"/api/v1/leads/{lead_id}", headers=headers)
    assert response.status_code == 200

    # Verify lead is deleted
    get_response = client.get(f"/api/v1/leads/{lead_id}", headers=headers)
    assert get_response.status_code == 404

def test_lead_search(client: TestClient, headers: dict):
    # Create test leads
    test_leads = [
        {
            "first_name": "Search",
            "last_name": "One",
            "email": "search.one@example.com",
            "company": "Search Corp",
            "status": LeadStatus.NEW.value
        },
        {
            "first_name": "Search",
            "last_name": "Two",
            "email": "search.two@example.com",
            "company": "Find Ltd",
            "status": LeadStatus.CONTACTED.value
        }
    ]
    
    for lead in test_leads:
        client.post("/api/v1/leads/", headers=headers, json=lead)

    # Test search by company
    response = client.get(
        "/api/v1/leads/search",
        headers=headers,
        params={"query": "Search Corp"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert any(lead["company"] == "Search Corp" for lead in data["items"])

    # Test search by email
    response = client.get(
        "/api/v1/leads/search",
        headers=headers,
        params={"query": "search.one@example.com"}
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) >= 1
    assert any(lead["email"] == "search.one@example.com" for lead in data["items"]) 