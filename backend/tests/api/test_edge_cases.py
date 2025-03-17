from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from app.models.lead import LeadStatus, LeadSource

def test_invalid_token(client: TestClient):
    headers = {"Authorization": "Bearer invalid_token"}
    response = client.get("/api/v1/leads/", headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "AUTHENTICATION_ERROR"

def test_expired_token(client: TestClient, test_user: dict):
    # Create an expired token (backdated by 9 days, beyond the 8-day expiry)
    from app.core.security import create_access_token
    expired_token = create_access_token(
        test_user["id"],
        expires_delta=timedelta(days=-1)
    )
    headers = {"Authorization": f"Bearer {expired_token}"}
    
    response = client.get("/api/v1/leads/", headers=headers)
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "AUTHENTICATION_ERROR"

def test_malformed_lead_data(client: TestClient, headers: dict):
    # Test missing required fields
    response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Test"
            # Missing last_name and email
        }
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    # Test invalid email format
    response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Test",
            "last_name": "User",
            "email": "invalid_email_format"
        }
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

    # Test invalid status
    response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Test",
            "last_name": "User",
            "email": "test@example.com",
            "status": "invalid_status"
        }
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

def test_concurrent_lead_updates(client: TestClient, headers: dict):
    # Create a test lead
    create_response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Concurrent",
            "last_name": "Test",
            "email": "concurrent.test@example.com",
            "status": LeadStatus.NEW.value
        }
    )
    assert create_response.status_code == 200
    lead_id = create_response.json()["id"]

    # Simulate concurrent updates
    status_updates = [LeadStatus.CONTACTED, LeadStatus.QUALIFIED]
    for status in status_updates:
        response = client.put(
            f"/api/v1/leads/{lead_id}",
            headers=headers,
            json={"status": status.value}
        )
        assert response.status_code == 200

    # Verify final state
    response = client.get(f"/api/v1/leads/{lead_id}", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == LeadStatus.QUALIFIED.value

def test_analytics_edge_cases(client: TestClient, headers: dict):
    # Test analytics with no leads
    response = client.get("/api/v1/analytics/overview", headers=headers)
    assert response.status_code == 200
    content = response.json()
    assert content["conversion_metrics"]["total_leads"] == 0
    assert content["conversion_metrics"]["conversion_rate"] == 0

    # Test analytics with future date range
    future_start = datetime.utcnow() + timedelta(days=1)
    future_end = future_start + timedelta(days=1)
    
    response = client.get(
        "/api/v1/analytics/overview",
        headers=headers,
        params={
            "start_date": future_start.isoformat(),
            "end_date": future_end.isoformat()
        }
    )
    assert response.status_code == 200
    content = response.json()
    assert content["conversion_metrics"]["total_leads"] == 0

def test_resource_not_found(client: TestClient, headers: dict):
    # Test non-existent lead
    response = client.get("/api/v1/leads/99999", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"

    # Test update non-existent lead
    response = client.put(
        "/api/v1/leads/99999",
        headers=headers,
        json={"status": LeadStatus.CONVERTED.value}
    )
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RESOURCE_NOT_FOUND"

    # Test delete non-existent lead
    response = client.delete("/api/v1/leads/99999", headers=headers)
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "RESOURCE_NOT_FOUND" 