from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from ...db.mongodb import mongodb_client
from ...models.property import Property, PropertyCreate, PropertyUpdate, PropertySearch

class PropertyRepository:
    """Repository for property operations in MongoDB."""
    
    def __init__(self):
        self.collection = mongodb_client.get_collection("properties")
    
    async def create(self, property_data: PropertyCreate, owner_id: str) -> Property:
        """Create a new property."""
        property_dict = property_data.dict()
        property_dict["owner_id"] = owner_id
        property_dict["created_at"] = datetime.utcnow()
        property_dict["updated_at"] = property_dict["created_at"]
        property_dict["listing_date"] = property_dict["created_at"]
        
        result = await self.collection.insert_one(property_dict)
        property_dict["_id"] = result.inserted_id
        
        return Property(**property_dict)
    
    async def get(self, property_id: str) -> Optional[Property]:
        """Get a property by ID."""
        property_data = await self.collection.find_one({"_id": ObjectId(property_id)})
        if property_data:
            # Increment views
            await self.collection.update_one(
                {"_id": ObjectId(property_id)},
                {"$inc": {"views": 1}}
            )
            return Property(**property_data)
        return None
    
    async def update(self, property_id: str, update_data: PropertyUpdate) -> Optional[Property]:
        """Update a property."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            # Check if status is being updated
            if "status" in update_dict:
                update_dict["last_status_change"] = update_dict["updated_at"]
                
                # If status is changed to "sold", record sold date and update days_on_market
                if update_dict["status"] == "sold":
                    update_dict["sold_date"] = update_dict["updated_at"]
                    
                    # Get the property to calculate days_on_market
                    property_data = await self.collection.find_one({"_id": ObjectId(property_id)})
                    if property_data and property_data.get("listing_date"):
                        listing_date = property_data["listing_date"]
                        days_on_market = (update_dict["updated_at"] - listing_date).days
                        update_dict["days_on_market"] = days_on_market
            
            result = await self.collection.update_one(
                {"_id": ObjectId(property_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get(property_id)
        return None
    
    async def delete(self, property_id: str) -> bool:
        """Delete a property."""
        result = await self.collection.delete_one({"_id": ObjectId(property_id)})
        return result.deleted_count > 0
    
    async def list(self, 
                  owner_id: Optional[str] = None,
                  agent_id: Optional[str] = None,
                  property_type: Optional[str] = None,
                  status: Optional[str] = None,
                  min_price: Optional[float] = None,
                  max_price: Optional[float] = None,
                  min_bedrooms: Optional[float] = None,
                  min_bathrooms: Optional[float] = None,
                  min_square_feet: Optional[float] = None,
                  features: Optional[List[str]] = None,
                  skip: int = 0,
                  limit: int = 100,
                  sort_by: str = "listing_date",
                  sort_order: int = -1) -> List[Property]:
        """List properties with filters."""
        filters = {}
        
        if owner_id:
            filters["owner_id"] = owner_id
        
        if agent_id:
            filters["agent_id"] = agent_id
        
        if property_type:
            filters["property_type"] = property_type
        
        if status:
            filters["status"] = status
        
        if min_price is not None:
            filters["price"] = {"$gte": min_price}
            
        if max_price is not None:
            if "price" in filters:
                filters["price"]["$lte"] = max_price
            else:
                filters["price"] = {"$lte": max_price}
        
        if min_bedrooms is not None:
            filters["bedrooms"] = {"$gte": min_bedrooms}
        
        if min_bathrooms is not None:
            filters["bathrooms"] = {"$gte": min_bathrooms}
        
        if min_square_feet is not None:
            filters["square_feet"] = {"$gte": min_square_feet}
        
        if features:
            filters["features"] = {"$all": features}
        
        cursor = self.collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        properties = []
        async for property_data in cursor:
            properties.append(Property(**property_data))
        
        return properties
    
    async def count(self,
                   owner_id: Optional[str] = None,
                   agent_id: Optional[str] = None,
                   property_type: Optional[str] = None,
                   status: Optional[str] = None,
                   min_price: Optional[float] = None,
                   max_price: Optional[float] = None,
                   min_bedrooms: Optional[float] = None,
                   min_bathrooms: Optional[float] = None,
                   min_square_feet: Optional[float] = None,
                   features: Optional[List[str]] = None) -> int:
        """Count properties with filters."""
        filters = {}
        
        if owner_id:
            filters["owner_id"] = owner_id
        
        if agent_id:
            filters["agent_id"] = agent_id
        
        if property_type:
            filters["property_type"] = property_type
        
        if status:
            filters["status"] = status
        
        if min_price is not None:
            filters["price"] = {"$gte": min_price}
            
        if max_price is not None:
            if "price" in filters:
                filters["price"]["$lte"] = max_price
            else:
                filters["price"] = {"$lte": max_price}
        
        if min_bedrooms is not None:
            filters["bedrooms"] = {"$gte": min_bedrooms}
        
        if min_bathrooms is not None:
            filters["bathrooms"] = {"$gte": min_bathrooms}
        
        if min_square_feet is not None:
            filters["square_feet"] = {"$gte": min_square_feet}
        
        if features:
            filters["features"] = {"$all": features}
        
        return await self.collection.count_documents(filters)
    
    async def search(self, search_params: PropertySearch, skip: int = 0, limit: int = 100) -> List[Property]:
        """Search properties with advanced filters."""
        filters = {}
        
        # Location search (requires text index on address fields)
        if search_params.location:
            filters["$text"] = {"$search": search_params.location}
        
        # Price range
        if search_params.min_price is not None or search_params.max_price is not None:
            filters["price"] = {}
            if search_params.min_price is not None:
                filters["price"]["$gte"] = search_params.min_price
            if search_params.max_price is not None:
                filters["price"]["$lte"] = search_params.max_price
        
        # Bedrooms
        if search_params.min_bedrooms is not None:
            filters["bedrooms"] = {"$gte": search_params.min_bedrooms}
        
        # Bathrooms
        if search_params.min_bathrooms is not None:
            filters["bathrooms"] = {"$gte": search_params.min_bathrooms}
        
        # Square feet
        if search_params.min_square_feet is not None:
            filters["square_feet"] = {"$gte": search_params.min_square_feet}
        
        # Property types
        if search_params.property_types:
            filters["property_type"] = {"$in": search_params.property_types}
        
        # Statuses
        if search_params.statuses:
            filters["status"] = {"$in": search_params.statuses}
        
        # Features
        if search_params.features:
            filters["features"] = {"$all": search_params.features}
        
        # Days on market
        if search_params.max_days_on_market is not None:
            filters["days_on_market"] = {"$lte": search_params.max_days_on_market}
        
        # Geospatial search (if location coordinates and radius are provided)
        # This would require a geospatial index on the location field
        # Implementation depends on how location data is stored
        
        # Sort options
        sort_field = search_params.sort_by
        sort_direction = 1 if search_params.sort_order == "asc" else -1
        
        cursor = self.collection.find(filters)
        
        # If using text search and want to sort by relevance
        if "location" in search_params.dict(exclude_none=True) and sort_field == "relevance":
            cursor = cursor.sort([("score", {"$meta": "textScore"})])
        else:
            cursor = cursor.sort(sort_field, sort_direction)
        
        cursor = cursor.skip(skip).limit(limit)
        
        properties = []
        async for property_data in cursor:
            properties.append(Property(**property_data))
        
        return properties
    
    async def favorite(self, property_id: str, user_id: str) -> bool:
        """Mark a property as favorited by a user."""
        # Increment favorites count
        result = await self.collection.update_one(
            {"_id": ObjectId(property_id)},
            {"$inc": {"favorites": 1}}
        )
        
        # Note: In a real implementation, you would also track which users have favorited
        # each property, likely in a separate collection
        
        return result.modified_count > 0
    
    async def unfavorite(self, property_id: str, user_id: str) -> bool:
        """Remove favorite mark from a property."""
        # Decrement favorites count
        result = await self.collection.update_one(
            {"_id": ObjectId(property_id)},
            {"$inc": {"favorites": -1}}
        )
        
        return result.modified_count > 0
    
    async def get_similar(self, property_id: str, limit: int = 5) -> List[Property]:
        """Get similar properties based on type, price range, and location."""
        property_data = await self.collection.find_one({"_id": ObjectId(property_id)})
        if not property_data:
            return []
        
        # Define similarity criteria
        property_type = property_data.get("property_type")
        price = property_data.get("price", 0)
        price_min = price * 0.8  # 20% below
        price_max = price * 1.2  # 20% above
        bedrooms = property_data.get("bedrooms", 0)
        bathrooms = property_data.get("bathrooms", 0)
        
        # Get city and state from address
        address = property_data.get("address", {})
        city = address.get("city")
        state = address.get("state")
        
        # Build query
        filters = {
            "_id": {"$ne": ObjectId(property_id)},  # Exclude the current property
            "property_type": property_type,
            "price": {"$gte": price_min, "$lte": price_max},
            "status": "active"  # Only active listings
        }
        
        # Add location filter if available
        if city and state:
            filters["address.city"] = city
            filters["address.state"] = state
        
        # Add bedroom and bathroom filters with some flexibility
        if bedrooms > 0:
            filters["bedrooms"] = {"$gte": bedrooms - 1, "$lte": bedrooms + 1}
        
        if bathrooms > 0:
            filters["bathrooms"] = {"$gte": bathrooms - 1, "$lte": bathrooms + 1}
        
        cursor = self.collection.find(filters).limit(limit)
        
        similar_properties = []
        async for similar in cursor:
            similar_properties.append(Property(**similar))
        
        return similar_properties 