from fastapi.testclient import TestClient
import json

def test_openapi_schema(client: TestClient):
    """Test that the OpenAPI schema is valid and contains all endpoints"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    
    schema = response.json()
    
    # Verify basic OpenAPI structure
    assert "openapi" in schema
    assert "info" in schema
    assert "paths" in schema
    
    # Verify required paths exist
    required_paths = [
        "/api/v1/leads/",
        "/api/v1/leads/{lead_id}",
        "/api/v1/leads/search",
        "/api/v1/analytics/overview",
        "/api/v1/analytics/conversion",
        "/api/v1/analytics/sources",
        "/api/v1/analytics/trends",
        "/api/v1/auth/login",
        "/api/v1/auth/register"
    ]
    
    for path in required_paths:
        assert any(endpoint.startswith(path) for endpoint in schema["paths"])

def test_api_documentation(client: TestClient):
    """Test that API documentation is accessible and properly formatted"""
    response = client.get("/docs")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]
    
    # Verify Swagger UI is loaded
    content = response.text
    assert "swagger-ui" in content.lower()
    
    # Verify ReDoc alternative documentation
    response = client.get("/redoc")
    assert response.status_code == 200
    assert "text/html" in response.headers["content-type"]

def test_schema_models(client: TestClient):
    """Test that all required models are defined in the OpenAPI schema"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    
    schema = response.json()
    
    # Verify required models exist
    required_models = [
        "Lead",
        "LeadCreate",
        "LeadUpdate",
        "LeadStatus",
        "LeadSource",
        "AnalyticsOverview",
        "ConversionMetrics",
        "SourceMetrics",
        "TrendData",
        "Token",
        "User",
        "UserCreate"
    ]
    
    for model in required_models:
        assert model in schema["components"]["schemas"]

def test_endpoint_responses(client: TestClient):
    """Test that endpoints have proper response definitions"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    
    schema = response.json()
    paths = schema["paths"]
    
    # Check common response codes for each endpoint
    for path, methods in paths.items():
        for method, details in methods.items():
            assert "responses" in details
            responses = details["responses"]
            
            # All endpoints should define success responses
            assert any(code.startswith("2") for code in responses.keys())
            
            # Protected endpoints should define 401/403 responses
            if path.startswith("/api/v1/") and not path.endswith(("/login", "/register")):
                assert any(code in ["401", "403"] for code in responses.keys())

def test_schema_security(client: TestClient):
    """Test that security schemes are properly defined"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    
    schema = response.json()
    
    # Verify security schemes
    assert "components" in schema
    assert "securitySchemes" in schema["components"]
    security_schemes = schema["components"]["securitySchemes"]
    
    # Verify JWT bearer auth is defined
    assert "bearerAuth" in security_schemes
    bearer = security_schemes["bearerAuth"]
    assert bearer["type"] == "http"
    assert bearer["scheme"] == "bearer"

def test_schema_parameters(client: TestClient):
    """Test that common parameters are properly defined"""
    response = client.get("/openapi.json")
    assert response.status_code == 200
    
    schema = response.json()
    paths = schema["paths"]
    
    # Check pagination parameters for list endpoints
    list_endpoints = [path for path in paths.keys() if path.endswith("/")]
    for endpoint in list_endpoints:
        if "get" in paths[endpoint]:
            parameters = paths[endpoint]["get"].get("parameters", [])
            param_names = [p["name"] for p in parameters]
            
            # List endpoints should have pagination parameters
            assert "page" in param_names
            assert "limit" in param_names 