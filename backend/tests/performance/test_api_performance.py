from locust import HttpUser, task, between
from typing import Dict, Any
import json

class LeadAPIUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login to get token
        response = self.client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "testpassword123"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def get_leads(self):
        self.client.get("/api/v1/leads/", headers=self.headers)
    
    @task(2)
    def get_analytics(self):
        self.client.get("/api/v1/analytics/overview", headers=self.headers)
    
    @task(1)
    def create_lead(self):
        lead_data: Dict[str, Any] = {
            "email": f"test_{self.user_count}@example.com",
            "first_name": "Test",
            "last_name": "User",
            "phone": "1234567890",
            "source": "WEBSITE",
            "status": "NEW"
        }
        self.client.post("/api/v1/leads/", json=lead_data, headers=self.headers)

class AnalyticsAPIUser(HttpUser):
    wait_time = between(2, 5)
    
    def on_start(self):
        # Login to get token
        response = self.client.post("/api/v1/auth/login", json={
            "email": "analyst@example.com",
            "password": "testpassword123"
        })
        self.token = response.json()["access_token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(2)
    def get_conversion_metrics(self):
        self.client.get("/api/v1/analytics/conversion", headers=self.headers)
    
    @task(2)
    def get_source_performance(self):
        self.client.get("/api/v1/analytics/sources", headers=self.headers)
    
    @task(1)
    def get_detailed_report(self):
        params = {
            "start_date": "2024-01-01",
            "end_date": "2024-03-17"
        }
        self.client.get("/api/v1/analytics/detailed-report", 
                       params=params, 
                       headers=self.headers) 