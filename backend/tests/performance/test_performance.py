import time
import asyncio
import pytest
from fastapi.testclient import TestClient
from app.models.lead import LeadStatus, LeadSource
from concurrent.futures import ThreadPoolExecutor

def test_lead_creation_performance(client: TestClient, headers: dict):
    # Test single lead creation performance
    start_time = time.time()
    response = client.post(
        "/api/v1/leads/",
        headers=headers,
        json={
            "first_name": "Performance",
            "last_name": "Test",
            "email": "perf.test@example.com",
            "status": LeadStatus.NEW.value
        }
    )
    end_time = time.time()
    
    assert response.status_code == 200
    creation_time = end_time - start_time
    assert creation_time < 0.5  # Lead creation should take less than 500ms

def test_lead_list_performance(client: TestClient, headers: dict):
    # Create multiple test leads
    for i in range(50):
        client.post(
            "/api/v1/leads/",
            headers=headers,
            json={
                "first_name": f"Perf{i}",
                "last_name": "Test",
                "email": f"perf{i}.test@example.com",
                "status": LeadStatus.NEW.value
            }
        )

    # Test list retrieval performance
    start_time = time.time()
    response = client.get("/api/v1/leads/", headers=headers)
    end_time = time.time()
    
    assert response.status_code == 200
    list_time = end_time - start_time
    assert list_time < 1.0  # List retrieval should take less than 1 second

def test_analytics_performance(client: TestClient, headers: dict):
    # Test analytics endpoint performance
    start_time = time.time()
    response = client.get("/api/v1/analytics/overview", headers=headers)
    end_time = time.time()
    
    assert response.status_code == 200
    analytics_time = end_time - start_time
    assert analytics_time < 2.0  # Analytics should take less than 2 seconds

def test_concurrent_requests(client: TestClient, headers: dict):
    def make_request():
        return client.post(
            "/api/v1/leads/",
            headers=headers,
            json={
                "first_name": "Concurrent",
                "last_name": "Test",
                "email": f"concurrent.{time.time()}@example.com",
                "status": LeadStatus.NEW.value
            }
        )

    # Test concurrent lead creation
    with ThreadPoolExecutor(max_workers=10) as executor:
        start_time = time.time()
        futures = [executor.submit(make_request) for _ in range(10)]
        responses = [future.result() for future in futures]
        end_time = time.time()

    # Verify all requests succeeded
    assert all(response.status_code == 200 for response in responses)
    
    # Check total time for 10 concurrent requests
    total_time = end_time - start_time
    assert total_time < 5.0  # 10 concurrent requests should take less than 5 seconds

@pytest.mark.asyncio
async def test_search_performance(client: TestClient, headers: dict):
    # Create test data
    test_companies = ["Performance Corp", "Speed Ltd", "Quick Solutions"]
    for company in test_companies:
        client.post(
            "/api/v1/leads/",
            headers=headers,
            json={
                "first_name": "Search",
                "last_name": "Performance",
                "email": f"search.{company.lower().replace(' ', '')}@example.com",
                "company": company,
                "status": LeadStatus.NEW.value
            }
        )

    # Test search performance
    start_time = time.time()
    response = client.get(
        "/api/v1/leads/search",
        headers=headers,
        params={"query": "Performance"}
    )
    end_time = time.time()
    
    assert response.status_code == 200
    search_time = end_time - start_time
    assert search_time < 0.5  # Search should take less than 500ms

def test_database_connection_performance(client: TestClient, headers: dict):
    # Test database connection and query performance
    start_time = time.time()
    
    # Perform a series of database operations
    operations = [
        lambda: client.get("/api/v1/leads/", headers=headers),
        lambda: client.get("/api/v1/analytics/overview", headers=headers),
        lambda: client.get("/api/v1/analytics/conversion", headers=headers)
    ]
    
    for operation in operations:
        response = operation()
        assert response.status_code == 200
    
    end_time = time.time()
    total_time = end_time - start_time
    
    # All database operations should complete within 3 seconds
    assert total_time < 3.0 