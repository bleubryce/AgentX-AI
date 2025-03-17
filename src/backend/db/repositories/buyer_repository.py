from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from ...db.mongodb import mongodb_client
from ...models.buyer import Buyer, BuyerCreate, BuyerUpdate, PropertyMatch

class BuyerRepository:
    """Repository for buyer operations in MongoDB."""
    
    def __init__(self):
        self.collection = mongodb_client.get_collection("buyers")
    
    async def create(self, buyer_data: BuyerCreate) -> Buyer:
        """Create a new buyer."""
        buyer_dict = buyer_data.dict()
        buyer_dict["created_at"] = datetime.utcnow()
        buyer_dict["updated_at"] = buyer_dict["created_at"]
        
        result = await self.collection.insert_one(buyer_dict)
        buyer_dict["_id"] = result.inserted_id
        
        return Buyer(**buyer_dict)
    
    async def get(self, buyer_id: str) -> Optional[Buyer]:
        """Get a buyer by ID."""
        buyer = await self.collection.find_one({"_id": ObjectId(buyer_id)})
        if buyer:
            # Update last_active
            await self.collection.update_one(
                {"_id": ObjectId(buyer_id)},
                {"$set": {"last_active": datetime.utcnow()}}
            )
            return Buyer(**buyer)
        return None
    
    async def get_by_user_id(self, user_id: str) -> Optional[Buyer]:
        """Get a buyer by user ID."""
        buyer = await self.collection.find_one({"user_id": user_id})
        if buyer:
            # Update last_active
            await self.collection.update_one(
                {"_id": buyer["_id"]},
                {"$set": {"last_active": datetime.utcnow()}}
            )
            return Buyer(**buyer)
        return None
    
    async def update(self, buyer_id: str, update_data: BuyerUpdate) -> Optional[Buyer]:
        """Update a buyer."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": ObjectId(buyer_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get(buyer_id)
        return None
    
    async def delete(self, buyer_id: str) -> bool:
        """Delete a buyer."""
        result = await self.collection.delete_one({"_id": ObjectId(buyer_id)})
        return result.deleted_count > 0
    
    async def list(self, 
                  agent_id: Optional[str] = None,
                  status: Optional[str] = None,
                  timeline: Optional[str] = None,
                  min_price: Optional[float] = None,
                  max_price: Optional[float] = None,
                  property_types: Optional[List[str]] = None,
                  locations: Optional[List[str]] = None,
                  skip: int = 0,
                  limit: int = 100,
                  sort_by: str = "created_at",
                  sort_order: int = -1) -> List[Buyer]:
        """List buyers with filters."""
        filters = {}
        
        if agent_id:
            filters["agent_id"] = agent_id
        
        if status:
            filters["status"] = status
        
        if timeline:
            filters["timeline"] = timeline
        
        # Price range filters
        if min_price is not None:
            filters["preferences.max_price"] = {"$gte": min_price}
        
        if max_price is not None:
            filters["preferences.min_price"] = {"$lte": max_price}
        
        # Property type filters
        if property_types:
            filters["preferences.property_types"] = {"$in": property_types}
        
        # Location filters
        if locations:
            filters["preferences.locations"] = {"$in": locations}
        
        cursor = self.collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        buyers = []
        async for buyer in cursor:
            buyers.append(Buyer(**buyer))
        
        return buyers
    
    async def count(self,
                   agent_id: Optional[str] = None,
                   status: Optional[str] = None,
                   timeline: Optional[str] = None,
                   min_price: Optional[float] = None,
                   max_price: Optional[float] = None,
                   property_types: Optional[List[str]] = None,
                   locations: Optional[List[str]] = None) -> int:
        """Count buyers with filters."""
        filters = {}
        
        if agent_id:
            filters["agent_id"] = agent_id
        
        if status:
            filters["status"] = status
        
        if timeline:
            filters["timeline"] = timeline
        
        # Price range filters
        if min_price is not None:
            filters["preferences.max_price"] = {"$gte": min_price}
        
        if max_price is not None:
            filters["preferences.min_price"] = {"$lte": max_price}
        
        # Property type filters
        if property_types:
            filters["preferences.property_types"] = {"$in": property_types}
        
        # Location filters
        if locations:
            filters["preferences.locations"] = {"$in": locations}
        
        return await self.collection.count_documents(filters)
    
    async def add_property_match(self, buyer_id: str, property_match: PropertyMatch) -> Optional[Buyer]:
        """Add a property match to a buyer."""
        match_dict = property_match.dict()
        match_dict["created_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(buyer_id)},
            {
                "$push": {"property_matches": match_dict},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            return await self.get(buyer_id)
        return None
    
    async def update_property_match(self, buyer_id: str, property_id: str, 
                                   update_data: Dict[str, Any]) -> Optional[Buyer]:
        """Update a property match."""
        # Prepare update dictionary with dot notation for nested fields
        update_dict = {}
        for key, value in update_data.items():
            update_dict[f"property_matches.$.{key}"] = value
        
        update_dict["updated_at"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {
                "_id": ObjectId(buyer_id),
                "property_matches.property_id": property_id
            },
            {"$set": update_dict}
        )
        
        if result.modified_count:
            return await self.get(buyer_id)
        return None
    
    async def remove_property_match(self, buyer_id: str, property_id: str) -> Optional[Buyer]:
        """Remove a property match from a buyer."""
        result = await self.collection.update_one(
            {"_id": ObjectId(buyer_id)},
            {
                "$pull": {"property_matches": {"property_id": property_id}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            return await self.get(buyer_id)
        return None
    
    async def add_property_view(self, buyer_id: str, property_id: str) -> Optional[Buyer]:
        """Add a property to a buyer's viewed properties."""
        result = await self.collection.update_one(
            {"_id": ObjectId(buyer_id)},
            {
                "$addToSet": {"property_views": property_id},
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "last_active": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            return await self.get(buyer_id)
        return None
    
    async def add_property_favorite(self, buyer_id: str, property_id: str) -> Optional[Buyer]:
        """Add a property to a buyer's favorited properties."""
        result = await self.collection.update_one(
            {"_id": ObjectId(buyer_id)},
            {
                "$addToSet": {"property_favorites": property_id},
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "last_active": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            return await self.get(buyer_id)
        return None
    
    async def remove_property_favorite(self, buyer_id: str, property_id: str) -> Optional[Buyer]:
        """Remove a property from a buyer's favorited properties."""
        result = await self.collection.update_one(
            {"_id": ObjectId(buyer_id)},
            {
                "$pull": {"property_favorites": property_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            return await self.get(buyer_id)
        return None
    
    async def add_search_history(self, buyer_id: str, search_params: Dict[str, Any]) -> Optional[Buyer]:
        """Add a search to a buyer's search history."""
        search_entry = {
            "params": search_params,
            "timestamp": datetime.utcnow()
        }
        
        result = await self.collection.update_one(
            {"_id": ObjectId(buyer_id)},
            {
                "$push": {
                    "search_history": {
                        "$each": [search_entry],
                        "$slice": -20  # Keep only the last 20 searches
                    }
                },
                "$set": {
                    "updated_at": datetime.utcnow(),
                    "last_active": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            return await self.get(buyer_id)
        return None 