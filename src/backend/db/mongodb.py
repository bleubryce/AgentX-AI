from motor.motor_asyncio import AsyncIOMotorClient
from ..core.config import settings

class MongoDBClient:
    def __init__(self):
        self.client = None
        self.db = None

    async def connect(self):
        """Connect to MongoDB."""
        self.client = AsyncIOMotorClient(settings.MONGODB_URL)
        self.db = self.client[settings.MONGODB_DB_NAME]
        # Test the connection
        await self.client.admin.command('ping')

    async def close(self):
        """Close MongoDB connection."""
        if self.client:
            self.client.close()

    def get_db(self):
        """Get database instance."""
        return self.db

    def get_collection(self, collection_name: str):
        """Get collection instance."""
        return self.db[collection_name]

# Create a singleton instance
mongodb_client = MongoDBClient() 