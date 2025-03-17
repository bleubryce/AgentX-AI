from datetime import datetime
from typing import List, Optional, Dict, Any
from bson import ObjectId
from fastapi import HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from ..models.lead import (
    Lead,
    LeadCreate,
    LeadUpdate,
    LeadActivity,
    LeadStatus
)
from ..core.cache import Cache

class LeadService:
    """Service for handling lead-related operations."""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.collection = db.leads
        self.activities_collection = db.lead_activities
    
    async def create_lead(
        self,
        lead_data: LeadCreate,
        created_by: str
    ) -> Lead:
        """Create a new lead."""
        # Create lead document
        lead = Lead(
            **lead_data.dict(),
            created_by=created_by,
            total_interactions=0
        )
        
        # Insert into database
        result = await self.collection.insert_one(lead.dict(by_alias=True))
        
        # Create initial activity
        await self.add_activity(
            str(result.inserted_id),
            "created",
            "Lead created",
            created_by
        )
        
        # Get created lead
        return await self.get_by_id(str(result.inserted_id))
    
    async def get_by_id(self, lead_id: str) -> Optional[Lead]:
        """Get lead by ID."""
        # Try cache first
        cache_key = f"lead:{lead_id}"
        lead_dict = await Cache.get(cache_key)
        
        if not lead_dict:
            # Get from database
            lead_dict = await self.collection.find_one(
                {"_id": ObjectId(lead_id)}
            )
            if lead_dict:
                # Cache the result
                await Cache.set(cache_key, lead_dict)
        
        return Lead(**lead_dict) if lead_dict else None
    
    async def update(
        self,
        lead_id: str,
        lead_data: LeadUpdate,
        updated_by: str
    ) -> Optional[Lead]:
        """Update lead."""
        # Get current lead
        current_lead = await self.get_by_id(lead_id)
        if not current_lead:
            return None
        
        # Prepare update data
        update_dict = lead_data.dict(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        
        # Check for status change
        if "status" in update_dict and update_dict["status"] != current_lead.status:
            await self.add_activity(
                lead_id,
                "status_change",
                f"Status changed from {current_lead.status} to {update_dict['status']}",
                updated_by
            )
        
        # Check for agent assignment change
        if "assigned_agent_id" in update_dict:
            if update_dict["assigned_agent_id"] != current_lead.assigned_agent_id:
                await self.add_activity(
                    lead_id,
                    "agent_assignment",
                    "Lead assigned to new agent",
                    updated_by,
                    {"new_agent_id": update_dict["assigned_agent_id"]}
                )
        
        # Update in database
        result = await self.collection.find_one_and_update(
            {"_id": ObjectId(lead_id)},
            {"$set": update_dict},
            return_document=True
        )
        
        if result:
            # Clear cache
            await Cache.delete(f"lead:{lead_id}")
            return Lead(**result)
        
        return None
    
    async def delete(self, lead_id: str) -> bool:
        """Delete lead."""
        result = await self.collection.delete_one(
            {"_id": ObjectId(lead_id)}
        )
        if result.deleted_count:
            # Clear cache
            await Cache.delete(f"lead:{lead_id}")
            # Delete associated activities
            await self.activities_collection.delete_many(
                {"lead_id": lead_id}
            )
            return True
        return False
    
    async def list_leads(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[LeadStatus] = None,
        assigned_agent_id: Optional[str] = None,
        property_type: Optional[str] = None,
        min_budget: Optional[float] = None,
        max_budget: Optional[float] = None,
        search_query: Optional[str] = None,
        sort_by: str = "created_at",
        sort_order: int = -1
    ) -> List[Lead]:
        """List leads with filtering and pagination."""
        # Build query
        query = {}
        
        if status:
            query["status"] = status
        
        if assigned_agent_id:
            query["assigned_agent_id"] = assigned_agent_id
        
        if property_type:
            query["property_type"] = property_type
        
        if min_budget or max_budget:
            budget_query = {}
            if min_budget:
                budget_query["$gte"] = min_budget
            if max_budget:
                budget_query["$lte"] = max_budget
            query["budget.min_amount"] = budget_query
        
        if search_query:
            query["$or"] = [
                {"full_name": {"$regex": search_query, "$options": "i"}},
                {"email": {"$regex": search_query, "$options": "i"}},
                {"phone": {"$regex": search_query, "$options": "i"}},
                {"notes": {"$regex": search_query, "$options": "i"}}
            ]
        
        # Execute query
        cursor = self.collection.find(query)
        
        # Apply sorting
        cursor = cursor.sort(sort_by, sort_order)
        
        # Apply pagination
        cursor = cursor.skip(skip).limit(limit)
        
        # Get results
        leads = await cursor.to_list(length=limit)
        return [Lead(**lead) for lead in leads]
    
    async def count_leads(
        self,
        status: Optional[LeadStatus] = None,
        assigned_agent_id: Optional[str] = None,
        property_type: Optional[str] = None
    ) -> int:
        """Count leads with filtering."""
        query = {}
        
        if status:
            query["status"] = status
        
        if assigned_agent_id:
            query["assigned_agent_id"] = assigned_agent_id
        
        if property_type:
            query["property_type"] = property_type
        
        return await self.collection.count_documents(query)
    
    async def add_activity(
        self,
        lead_id: str,
        activity_type: str,
        description: str,
        performed_by: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LeadActivity:
        """Add an activity to a lead."""
        activity = LeadActivity(
            lead_id=lead_id,
            activity_type=activity_type,
            description=description,
            performed_by=performed_by,
            metadata=metadata
        )
        
        # Insert activity
        await self.activities_collection.insert_one(
            activity.dict(by_alias=True)
        )
        
        # Increment total interactions
        await self.collection.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$inc": {"total_interactions": 1},
                "$set": {"last_contact": datetime.utcnow()}
            }
        )
        
        # Clear lead cache
        await Cache.delete(f"lead:{lead_id}")
        
        return activity
    
    async def get_activities(
        self,
        lead_id: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[LeadActivity]:
        """Get lead activities."""
        activities = await self.activities_collection.find(
            {"lead_id": lead_id}
        ).sort(
            "created_at", -1
        ).skip(skip).limit(limit).to_list(length=limit)
        
        return [LeadActivity(**activity) for activity in activities]
    
    async def update_conversion_probability(
        self,
        lead_id: str,
        probability: float
    ) -> bool:
        """Update lead's conversion probability."""
        result = await self.collection.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$set": {
                    "conversion_probability": probability,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            # Clear cache
            await Cache.delete(f"lead:{lead_id}")
            return True
        return False
    
    async def get_leads_by_status(self) -> Dict[str, int]:
        """Get lead count by status."""
        pipeline = [
            {
                "$group": {
                    "_id": "$status",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(None)
        return {result["_id"]: result["count"] for result in results}
    
    async def get_leads_by_source(self) -> Dict[str, int]:
        """Get lead count by source."""
        pipeline = [
            {
                "$group": {
                    "_id": "$source",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(None)
        return {result["_id"]: result["count"] for result in results}
    
    async def get_leads_by_property_type(self) -> Dict[str, int]:
        """Get lead count by property type."""
        pipeline = [
            {
                "$group": {
                    "_id": "$property_type",
                    "count": {"$sum": 1}
                }
            }
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(None)
        return {result["_id"]: result["count"] for result in results}
    
    async def get_conversion_rates(self) -> Dict[str, float]:
        """Get conversion rates by source."""
        pipeline = [
            {
                "$group": {
                    "_id": "$source",
                    "total": {"$sum": 1},
                    "converted": {
                        "$sum": {
                            "$cond": [
                                {"$eq": ["$status", LeadStatus.CLOSED_WON]},
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                "$project": {
                    "conversion_rate": {
                        "$multiply": [
                            {"$divide": ["$converted", "$total"]},
                            100
                        ]
                    }
                }
            }
        ]
        
        results = await self.collection.aggregate(pipeline).to_list(None)
        return {
            result["_id"]: round(result["conversion_rate"], 2)
            for result in results
        } 