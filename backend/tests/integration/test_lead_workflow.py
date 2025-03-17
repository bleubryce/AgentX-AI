from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from app.models.lead import LeadStatus, LeadSource

def test_complete_lead_lifecycle(client: TestClient, headers: dict):
    # 1. Create a new lead
    create_response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Alice",
            "last_name": "Johnson",
            "email": "alice.workflow@example.com",
            "phone": "1234567890",
            "company": "Test Corp",
            "source": LeadSource.WEBSITE.value,
            "status": LeadStatus.NEW.value,
            "notes": "Initial contact from website"
        }
    )
    assert create_response.status_code == 200
    lead_id = create_response.json()["id"]

    # 2. Verify lead creation in analytics
    analytics_response = client.get(
        "/api/v1/analytics/overview",
        headers=headers
    )
    assert analytics_response.status_code == 200
    analytics_data = analytics_response.json()
    assert analytics_data["conversion_metrics"]["total_leads"] >= 1

    # 3. Update lead status to CONTACTED
    update_response = client.put(
        f"/api/v1/leads/{lead_id}",
        headers=headers,
        json={
            "status": LeadStatus.CONTACTED.value,
            "notes": "Initial call completed"
        }
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == LeadStatus.CONTACTED.value

    # 4. Update lead status to QUALIFIED
    update_response = client.put(
        f"/api/v1/leads/{lead_id}",
        headers=headers,
        json={
            "status": LeadStatus.QUALIFIED.value,
            "notes": "Qualified after discussion"
        }
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == LeadStatus.QUALIFIED.value

    # 5. Convert the lead
    update_response = client.put(
        f"/api/v1/leads/{lead_id}",
        headers=headers,
        json={
            "status": LeadStatus.CONVERTED.value,
            "notes": "Successfully converted"
        }
    )
    assert update_response.status_code == 200
    assert update_response.json()["status"] == LeadStatus.CONVERTED.value

    # 6. Verify analytics after conversion
    analytics_response = client.get(
        "/api/v1/analytics/conversion",
        headers=headers
    )
    assert analytics_response.status_code == 200
    conversion_data = analytics_response.json()
    assert conversion_data["converted_leads"] >= 1

def test_lead_source_tracking(client: TestClient, headers: dict):
    # Create leads from different sources
    sources = [LeadSource.WEBSITE, LeadSource.REFERRAL, LeadSource.SOCIAL]
    for idx, source in enumerate(sources):
        response = client.post(
            "/api/v1/leads/",
            headers=headers,
            json={
                "first_name": f"User{idx}",
                "last_name": f"Test{idx}",
                "email": f"user{idx}.source@example.com",
                "source": source.value,
                "status": LeadStatus.NEW.value
            }
        )
        assert response.status_code == 200

    # Verify source metrics
    response = client.get("/api/v1/analytics/sources", headers=headers)
    assert response.status_code == 200
    source_metrics = response.json()

    # Check each source has correct count
    for source in sources:
        metric = next(m for m in source_metrics if m["source"] == source.value)
        assert metric["total_leads"] >= 1

def test_lead_conversion_timeline(client: TestClient, headers: dict):
    # Create a lead
    create_response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Timeline",
            "last_name": "Test",
            "email": "timeline.test@example.com",
            "source": LeadSource.WEBSITE.value,
            "status": LeadStatus.NEW.value
        }
    )
    assert create_response.status_code == 200
    lead_id = create_response.json()["id"]

    # Progress through statuses with delays
    statuses = [
        LeadStatus.CONTACTED,
        LeadStatus.QUALIFIED,
        LeadStatus.CONVERTED
    ]

    for status in statuses:
        # Add a small delay to simulate real-world progression
        response = client.put(
            f"/api/v1/leads/{lead_id}",
            headers=headers,
            json={
                "status": status.value,
                "notes": f"Updated to {status.value}"
            }
        )
        assert response.status_code == 200

    # Verify lead trends
    response = client.get(
        "/api/v1/analytics/trends",
        headers=headers,
        params={
            "start_date": (datetime.utcnow() - timedelta(days=1)).isoformat(),
            "end_date": datetime.utcnow().isoformat()
        }
    )
    assert response.status_code == 200
    trends = response.json()
    
    # Verify trend data includes our lead
    assert any(point["value"] > 0 for point in trends["converted_leads"])

def test_bulk_lead_operations(client: TestClient, headers: dict):
    # Create multiple leads
    leads = []
    for i in range(5):
        response = client.post(
            "/api/v1/leads/",
            headers=headers,
            json={
                "first_name": f"Bulk{i}",
                "last_name": "Test",
                "email": f"bulk{i}.test@example.com",
                "source": LeadSource.WEBSITE.value,
                "status": LeadStatus.NEW.value
            }
        )
        assert response.status_code == 200
        leads.append(response.json())

    # Update leads in sequence
    for lead in leads:
        response = client.put(
            f"/api/v1/leads/{lead['id']}",
            headers=headers,
            json={
                "status": LeadStatus.CONVERTED.value,
                "notes": "Bulk conversion"
            }
        )
        assert response.status_code == 200

    # Verify analytics reflect bulk changes
    response = client.get("/api/v1/analytics/overview", headers=headers)
    assert response.status_code == 200
    analytics = response.json()
    
    assert analytics["conversion_metrics"]["total_leads"] >= 5
    assert analytics["conversion_metrics"]["converted_leads"] >= 5 