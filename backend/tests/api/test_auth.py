from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.core.security import get_password_hash

def test_login_success(client: TestClient, test_user: dict):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user["email"],
            "password": "test123"
        }
    )
    assert response.status_code == 200
    content = response.json()
    assert "access_token" in content
    assert content["token_type"] == "bearer"

def test_login_incorrect_password(client: TestClient, test_user: dict):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": test_user["email"],
            "password": "wrong_password"
        }
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "HTTP_ERROR"

def test_login_invalid_email(client: TestClient):
    response = client.post(
        "/api/v1/auth/login",
        data={
            "username": "nonexistent@example.com",
            "password": "test123"
        }
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "HTTP_ERROR"

def test_register_success(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "new_user@example.com",
            "password": "newpass123",
            "full_name": "New User"
        }
    )
    assert response.status_code == 200
    content = response.json()
    assert content["email"] == "new_user@example.com"
    assert content["full_name"] == "New User"
    assert "id" in content

def test_register_existing_email(client: TestClient, test_user: dict):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": test_user["email"],
            "password": "test123",
            "full_name": "Duplicate User"
        }
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "HTTP_ERROR"
    assert "already exists" in response.json()["error"]["message"]

def test_register_invalid_email(client: TestClient):
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": "invalid_email",
            "password": "test123",
            "full_name": "Invalid Email User"
        }
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR" 