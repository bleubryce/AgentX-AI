from typing import Dict, List
from pymongo import IndexModel, ASCENDING, DESCENDING, TEXT

class CollectionIndexes:
    """Collection indexes configuration."""
    
    @staticmethod
    def user_indexes() -> List[IndexModel]:
        """User collection indexes."""
        return [
            IndexModel([("email", ASCENDING)], unique=True),
            IndexModel([("roles", ASCENDING)]),
            IndexModel([("is_realtor", ASCENDING)]),
            IndexModel([("realtor_license", ASCENDING)], sparse=True),
            IndexModel([("full_name", TEXT)]),
            IndexModel([("is_active", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
            IndexModel([("last_login", DESCENDING)]),
        ]
    
    @staticmethod
    def lead_indexes() -> List[IndexModel]:
        """Lead collection indexes."""
        return [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
            IndexModel([("updated_at", DESCENDING)]),
            IndexModel([("property_type", ASCENDING)]),
            IndexModel([("location", "2dsphere")]),
        ]
    
    @staticmethod
    def agent_indexes() -> List[IndexModel]:
        """Agent collection indexes."""
        return [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("specialties", ASCENDING)]),
            IndexModel([("rating", DESCENDING)]),
            IndexModel([("location", "2dsphere")]),
        ]
    
    @staticmethod
    def payment_indexes() -> List[IndexModel]:
        """Payment collection indexes."""
        return [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("created_at", DESCENDING)]),
            IndexModel([("subscription_id", ASCENDING)]),
        ]
    
    @staticmethod
    def subscription_indexes() -> List[IndexModel]:
        """Subscription collection indexes."""
        return [
            IndexModel([("user_id", ASCENDING)]),
            IndexModel([("status", ASCENDING)]),
            IndexModel([("plan_type", ASCENDING)]),
            IndexModel([("expires_at", ASCENDING)]),
        ]

async def ensure_indexes(db) -> None:
    """Ensure all indexes are created."""
    collections_indexes = {
        "users": CollectionIndexes.user_indexes(),
        "leads": CollectionIndexes.lead_indexes(),
        "agents": CollectionIndexes.agent_indexes(),
        "payments": CollectionIndexes.payment_indexes(),
        "subscriptions": CollectionIndexes.subscription_indexes(),
    }
    
    for collection_name, indexes in collections_indexes.items():
        try:
            collection = db[collection_name]
            await collection.create_indexes(indexes)
            print(f"Created indexes for {collection_name}")
        except Exception as e:
            print(f"Error creating indexes for {collection_name}: {str(e)}")

# Function to be called during application startup
async def setup_indexes(db) -> None:
    """Setup all database indexes."""
    await ensure_indexes(db) 