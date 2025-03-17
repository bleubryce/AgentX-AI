from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from ...db.mongodb import mongodb_client
from ...models.seller import Seller, SellerCreate, SellerUpdate, MarketAnalysis

class SellerRepository:
    """Repository for seller operations in MongoDB."""
    
    def __init__(self):
        self.collection = mongodb_client.get_collection("sellers")
    
    async def create(self, seller_data: SellerCreate) -> Seller:
        """Create a new seller."""
        seller_dict = seller_data.dict()
        seller_dict["created_at"] = datetime.utcnow()
        seller_dict["updated_at"] = seller_dict["created_at"]
        
        result = await self.collection.insert_one(seller_dict)
        seller_dict["_id"] = result.inserted_id
        
        return Seller(**seller_dict)
    
    async def get(self, seller_id: str) -> Optional[Seller]:
        """Get a seller by ID."""
        seller = await self.collection.find_one({"_id": ObjectId(seller_id)})
        if seller:
            # Update last_active
            await self.collection.update_one(
                {"_id": ObjectId(seller_id)},
                {"$set": {"last_active": datetime.utcnow()}}
            )
            return Seller(**seller)
        return None
    
    async def get_by_user_id(self, user_id: str) -> Optional[Seller]:
        """Get a seller by user ID."""
        seller = await self.collection.find_one({"user_id": user_id})
        if seller:
            # Update last_active
            await self.collection.update_one(
                {"_id": seller["_id"]},
                {"$set": {"last_active": datetime.utcnow()}}
            )
            return Seller(**seller)
        return None
    
    async def update(self, seller_id: str, update_data: SellerUpdate) -> Optional[Seller]:
        """Update a seller."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": ObjectId(seller_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get(seller_id)
        return None
    
    async def delete(self, seller_id: str) -> bool:
        """Delete a seller."""
        result = await self.collection.delete_one({"_id": ObjectId(seller_id)})
        return result.deleted_count > 0
    
    async def list(self, 
                  agent_id: Optional[str] = None,
                  status: Optional[str] = None,
                  timeline: Optional[str] = None,
                  property_type: Optional[str] = None,
                  min_value: Optional[float] = None,
                  max_value: Optional[float] = None,
                  skip: int = 0,
                  limit: int = 100,
                  sort_by: str = "created_at",
                  sort_order: int = -1) -> List[Seller]:
        """List sellers with filters."""
        filters = {}
        
        if agent_id:
            filters["agent_id"] = agent_id
        
        if status:
            filters["status"] = status
        
        if timeline:
            filters["selling_info.timeline"] = timeline
        
        if property_type:
            filters["property_info.property_type"] = property_type
        
        if min_value is not None:
            filters["property_info.estimated_value"] = {"$gte": min_value}
            
        if max_value is not None:
            if "property_info.estimated_value" in filters:
                filters["property_info.estimated_value"]["$lte"] = max_value
            else:
                filters["property_info.estimated_value"] = {"$lte": max_value}
        
        cursor = self.collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        sellers = []
        async for seller in cursor:
            sellers.append(Seller(**seller))
        
        return sellers
    
    async def count(self,
                   agent_id: Optional[str] = None,
                   status: Optional[str] = None,
                   timeline: Optional[str] = None,
                   property_type: Optional[str] = None,
                   min_value: Optional[float] = None,
                   max_value: Optional[float] = None) -> int:
        """Count sellers with filters."""
        filters = {}
        
        if agent_id:
            filters["agent_id"] = agent_id
        
        if status:
            filters["status"] = status
        
        if timeline:
            filters["selling_info.timeline"] = timeline
        
        if property_type:
            filters["property_info.property_type"] = property_type
        
        if min_value is not None:
            filters["property_info.estimated_value"] = {"$gte": min_value}
            
        if max_value is not None:
            if "property_info.estimated_value" in filters:
                filters["property_info.estimated_value"]["$lte"] = max_value
            else:
                filters["property_info.estimated_value"] = {"$lte": max_value}
        
        return await self.collection.count_documents(filters)
    
    async def save_market_analysis(self, seller_id: str, analysis: MarketAnalysis) -> Optional[Seller]:
        """Save market analysis for a seller's property."""
        analysis_dict = analysis.dict()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(seller_id)},
            {
                "$set": {
                    "market_analysis": analysis_dict,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            return await self.get(seller_id)
        return None
    
    async def add_listing_history(self, seller_id: str, listing_data: Dict[str, Any]) -> Optional[Seller]:
        """Add an entry to the seller's listing history."""
        listing_entry = listing_data.copy()
        listing_entry["timestamp"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(seller_id)},
            {
                "$push": {"listing_history": listing_entry},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            return await self.get(seller_id)
        return None
    
    async def add_showing_history(self, seller_id: str, showing_data: Dict[str, Any]) -> Optional[Seller]:
        """Add an entry to the seller's showing history."""
        showing_entry = showing_data.copy()
        showing_entry["timestamp"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(seller_id)},
            {
                "$push": {"showing_history": showing_entry},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            return await self.get(seller_id)
        return None
    
    async def add_offer_history(self, seller_id: str, offer_data: Dict[str, Any]) -> Optional[Seller]:
        """Add an entry to the seller's offer history."""
        offer_entry = offer_data.copy()
        offer_entry["timestamp"] = datetime.utcnow()
        
        result = await self.collection.update_one(
            {"_id": ObjectId(seller_id)},
            {
                "$push": {"offer_history": offer_entry},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            return await self.get(seller_id)
        return None
    
    async def get_sellers_by_property_type(self, property_type: str, limit: int = 10) -> List[Seller]:
        """Get sellers by property type."""
        cursor = self.collection.find(
            {
                "property_info.property_type": property_type,
                "status": "active"
            }
        ).limit(limit)
        
        sellers = []
        async for seller in cursor:
            sellers.append(Seller(**seller))
        
        return sellers
    
    async def get_sellers_by_price_range(self, min_price: float, max_price: float, limit: int = 10) -> List[Seller]:
        """Get sellers by desired price range."""
        cursor = self.collection.find(
            {
                "property_info.desired_price": {"$gte": min_price, "$lte": max_price},
                "status": "active"
            }
        ).limit(limit)
        
        sellers = []
        async for seller in cursor:
            sellers.append(Seller(**seller))
        
        return sellers
    
    async def get_sellers_by_timeline(self, timeline: str, limit: int = 10) -> List[Seller]:
        """Get sellers by selling timeline."""
        cursor = self.collection.find(
            {
                "selling_info.timeline": timeline,
                "status": "active"
            }
        ).limit(limit)
        
        sellers = []
        async for seller in cursor:
            sellers.append(Seller(**seller))
        
        return sellers 