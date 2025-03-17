from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from ...db.mongodb import mongodb_client
from ...models.lead import (
    Lead, LeadCreate, LeadUpdate, LeadStatus, LeadSource,
    LeadActivity, LeadContact, LeadPreferences, LeadTimeline, LeadInteraction
)

class LeadRepository:
    """Repository for lead operations in MongoDB."""
    
    def __init__(self):
        self.collection = mongodb_client.get_collection("leads")
        self.source_collection = mongodb_client.get_collection("lead_sources")
    
    # Lead methods
    
    async def create_lead(self, lead_data: LeadCreate, created_by: str) -> Lead:
        """Create a new lead."""
        lead_dict = lead_data.dict()
        lead_dict["created_by"] = created_by
        lead_dict["created_at"] = datetime.utcnow()
        lead_dict["updated_at"] = lead_dict["created_at"]
        lead_dict["last_contact"] = None
        lead_dict["next_followup"] = None
        lead_dict["total_interactions"] = 0
        
        # Add initial activity for lead creation
        activity = {
            "activity_type": "created",
            "timestamp": lead_dict["created_at"],
            "performed_by": created_by,
            "notes": "Lead created"
        }
        
        result = await self.collection.insert_one(lead_dict)
        lead_dict["_id"] = result.inserted_id
        
        # Create activity record
        await self.add_activity(str(result.inserted_id), LeadActivity(**activity))
        
        # Increment source count
        if isinstance(lead_dict.get("source"), LeadSource):
            source_name = lead_dict["source"].value
            await self.source_collection.update_one(
                {"name": source_name},
                {"$inc": {"lead_count": 1}},
                upsert=True
            )
        
        return Lead(**lead_dict)
    
    async def get_lead(self, lead_id: str) -> Optional[Lead]:
        """Get a lead by ID."""
        lead = await self.collection.find_one({"_id": ObjectId(lead_id)})
        if lead:
            return Lead(**lead)
        return None
    
    async def update_lead(self, lead_id: str, update_data: LeadUpdate, updated_by: str) -> Optional[Lead]:
        """Update a lead."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            # Get current lead to check for status change
            current_lead = await self.get_lead(lead_id)
            if current_lead and "status" in update_dict and update_dict["status"] != current_lead.status:
                # Add activity for status change
                activity = {
                    "activity_type": "status_changed",
                    "timestamp": update_dict["updated_at"],
                    "performed_by": updated_by,
                    "notes": f"Status changed from {current_lead.status} to {update_dict['status']}",
                    "old_value": current_lead.status,
                    "new_value": update_dict["status"]
                }
                
                await self.add_activity(lead_id, LeadActivity(**activity))
            
            # Handle source change
            if current_lead and "source" in update_dict and update_dict["source"] != current_lead.source:
                # Decrement old source count
                if current_lead.source:
                    old_source = current_lead.source.value if isinstance(current_lead.source, LeadSource) else current_lead.source
                    await self.source_collection.update_one(
                        {"name": old_source},
                        {"$inc": {"lead_count": -1}}
                    )
                
                # Increment new source count
                if update_dict["source"]:
                    new_source = update_dict["source"].value if isinstance(update_dict["source"], LeadSource) else update_dict["source"]
                    await self.source_collection.update_one(
                        {"name": new_source},
                        {"$inc": {"lead_count": 1}},
                        upsert=True
                    )
            
            result = await self.collection.update_one(
                {"_id": ObjectId(lead_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get_lead(lead_id)
        return None
    
    async def delete_lead(self, lead_id: str) -> bool:
        """Delete a lead."""
        # Get lead to decrement source count
        lead = await self.get_lead(lead_id)
        if lead and lead.source:
            source_name = lead.source.value if isinstance(lead.source, LeadSource) else lead.source
            await self.source_collection.update_one(
                {"name": source_name},
                {"$inc": {"lead_count": -1}}
            )
        
        result = await self.collection.delete_one({"_id": ObjectId(lead_id)})
        return result.deleted_count > 0
    
    async def list_leads(self,
                       status: Optional[LeadStatus] = None,
                       source: Optional[LeadSource] = None,
                       assigned_agent_id: Optional[str] = None,
                       property_type: Optional[str] = None,
                       min_priority: Optional[int] = None,
                       created_after: Optional[datetime] = None,
                       created_before: Optional[datetime] = None,
                       last_contact_after: Optional[datetime] = None,
                       tags: Optional[List[str]] = None,
                       skip: int = 0,
                       limit: int = 100,
                       sort_by: str = "created_at",
                       sort_order: int = -1) -> List[Lead]:
        """List leads with filters."""
        filters = {}
        
        if status:
            filters["status"] = status
        
        if source:
            filters["source"] = source
        
        if assigned_agent_id:
            filters["assigned_agent_id"] = assigned_agent_id
        
        if property_type:
            filters["property_type"] = property_type
        
        if min_priority is not None:
            filters["priority"] = {"$gte": min_priority}
        
        if tags:
            filters["tags"] = {"$all": tags}
        
        # Date filters
        date_filter = {}
        if created_after:
            date_filter["$gte"] = created_after
        if created_before:
            date_filter["$lte"] = created_before
        if date_filter:
            filters["created_at"] = date_filter
        
        if last_contact_after:
            filters["last_contact"] = {"$gte": last_contact_after}
        
        cursor = self.collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        leads = []
        async for lead in cursor:
            leads.append(Lead(**lead))
        
        return leads
    
    async def count_leads(self,
                        status: Optional[LeadStatus] = None,
                        source: Optional[LeadSource] = None,
                        assigned_agent_id: Optional[str] = None,
                        property_type: Optional[str] = None,
                        min_priority: Optional[int] = None,
                        created_after: Optional[datetime] = None,
                        created_before: Optional[datetime] = None,
                        last_contact_after: Optional[datetime] = None,
                        tags: Optional[List[str]] = None) -> int:
        """Count leads with filters."""
        filters = {}
        
        if status:
            filters["status"] = status
        
        if source:
            filters["source"] = source
        
        if assigned_agent_id:
            filters["assigned_agent_id"] = assigned_agent_id
        
        if property_type:
            filters["property_type"] = property_type
        
        if min_priority is not None:
            filters["priority"] = {"$gte": min_priority}
        
        if tags:
            filters["tags"] = {"$all": tags}
        
        # Date filters
        date_filter = {}
        if created_after:
            date_filter["$gte"] = created_after
        if created_before:
            date_filter["$lte"] = created_before
        if date_filter:
            filters["created_at"] = date_filter
        
        if last_contact_after:
            filters["last_contact"] = {"$gte": last_contact_after}
        
        return await self.collection.count_documents(filters)
    
    async def add_activity(self, lead_id: str, activity: LeadActivity) -> Optional[Lead]:
        """Add an activity to a lead."""
        activity_dict = activity.dict()
        
        # Create a separate activities collection
        activities_collection = mongodb_client.get_collection("lead_activities")
        activity_dict["lead_id"] = ObjectId(lead_id)
        await activities_collection.insert_one(activity_dict)
        
        # Update lead's last_contact if this is a contact activity
        if activity.activity_type in ["contacted", "meeting_scheduled", "meeting_completed"]:
            await self.collection.update_one(
                {"_id": ObjectId(lead_id)},
                {
                    "$set": {
                        "last_contact": activity.timestamp,
                        "updated_at": datetime.utcnow()
                    },
                    "$inc": {"total_interactions": 1}
                }
            )
        else:
            # Just update the updated_at timestamp
            await self.collection.update_one(
                {"_id": ObjectId(lead_id)},
                {"$set": {"updated_at": datetime.utcnow()}}
            )
        
        return await self.get_lead(lead_id)
    
    async def get_lead_activities(self, lead_id: str, limit: int = 50) -> List[LeadActivity]:
        """Get activities for a lead."""
        activities_collection = mongodb_client.get_collection("lead_activities")
        cursor = activities_collection.find({"lead_id": ObjectId(lead_id)})
        cursor = cursor.sort("timestamp", -1).limit(limit)
        
        activities = []
        async for activity in cursor:
            # Remove lead_id from the activity
            activity.pop("lead_id", None)
            activities.append(LeadActivity(**activity))
        
        return activities
    
    async def update_priority(self, lead_id: str, priority: int, updated_by: str) -> Optional[Lead]:
        """Update a lead's priority."""
        # Get current lead to check current priority
        current_lead = await self.get_lead(lead_id)
        if not current_lead:
            return None
        
        # Add activity for priority change
        activity = {
            "activity_type": "priority_updated",
            "timestamp": datetime.utcnow(),
            "performed_by": updated_by,
            "notes": f"Priority updated from {current_lead.priority} to {priority}",
            "old_value": current_lead.priority,
            "new_value": priority
        }
        
        result = await self.collection.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$set": {
                    "priority": priority,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            await self.add_activity(lead_id, LeadActivity(**activity))
            return await self.get_lead(lead_id)
        return None
    
    async def assign_lead(self, lead_id: str, assigned_agent_id: str, assigned_by: str) -> Optional[Lead]:
        """Assign a lead to an agent."""
        # Get current lead to check current assignment
        current_lead = await self.get_lead(lead_id)
        if not current_lead:
            return None
        
        # Add activity for assignment
        activity = {
            "activity_type": "assigned",
            "timestamp": datetime.utcnow(),
            "performed_by": assigned_by,
            "notes": f"Lead assigned to agent {assigned_agent_id}",
            "old_value": current_lead.assigned_agent_id,
            "new_value": assigned_agent_id
        }
        
        result = await self.collection.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$set": {
                    "assigned_agent_id": assigned_agent_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            await self.add_activity(lead_id, LeadActivity(**activity))
            return await self.get_lead(lead_id)
        return None
    
    async def add_interaction(self, lead_id: str, interaction: LeadInteraction) -> Optional[Lead]:
        """Add an interaction to a lead."""
        interaction_dict = interaction.dict()
        
        # Create a separate interactions collection
        interactions_collection = mongodb_client.get_collection("lead_interactions")
        interaction_dict["lead_id"] = ObjectId(lead_id)
        await interactions_collection.insert_one(interaction_dict)
        
        # Update lead's last_contact and total_interactions
        await self.collection.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$set": {
                    "last_contact": interaction.date,
                    "updated_at": datetime.utcnow()
                },
                "$inc": {"total_interactions": 1}
            }
        )
        
        # Add activity for the interaction
        activity = {
            "activity_type": "contacted",
            "timestamp": interaction.date,
            "performed_by": interaction.agent_id or "system",
            "notes": f"Interaction: {interaction.type} - {interaction.outcome}",
            "details": interaction_dict
        }
        
        await self.add_activity(lead_id, LeadActivity(**activity))
        
        return await self.get_lead(lead_id)
    
    async def get_lead_interactions(self, lead_id: str, limit: int = 50) -> List[LeadInteraction]:
        """Get interactions for a lead."""
        interactions_collection = mongodb_client.get_collection("lead_interactions")
        cursor = interactions_collection.find({"lead_id": ObjectId(lead_id)})
        cursor = cursor.sort("date", -1).limit(limit)
        
        interactions = []
        async for interaction in cursor:
            # Remove lead_id from the interaction
            interaction.pop("lead_id", None)
            interactions.append(LeadInteraction(**interaction))
        
        return interactions
    
    async def update_next_followup(self, lead_id: str, next_followup: datetime, updated_by: str) -> Optional[Lead]:
        """Update a lead's next followup date."""
        result = await self.collection.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$set": {
                    "next_followup": next_followup,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            # Add activity for followup update
            activity = {
                "activity_type": "followup_scheduled",
                "timestamp": datetime.utcnow(),
                "performed_by": updated_by,
                "notes": f"Next followup scheduled for {next_followup.isoformat()}",
                "new_value": next_followup
            }
            
            await self.add_activity(lead_id, LeadActivity(**activity))
            return await self.get_lead(lead_id)
        return None
    
    async def add_tags(self, lead_id: str, tags: List[str], updated_by: str) -> Optional[Lead]:
        """Add tags to a lead."""
        result = await self.collection.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$addToSet": {"tags": {"$each": tags}},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            # Add activity for tag addition
            activity = {
                "activity_type": "tags_added",
                "timestamp": datetime.utcnow(),
                "performed_by": updated_by,
                "notes": f"Tags added: {', '.join(tags)}",
                "new_value": tags
            }
            
            await self.add_activity(lead_id, LeadActivity(**activity))
            return await self.get_lead(lead_id)
        return None
    
    async def remove_tags(self, lead_id: str, tags: List[str], updated_by: str) -> Optional[Lead]:
        """Remove tags from a lead."""
        result = await self.collection.update_one(
            {"_id": ObjectId(lead_id)},
            {
                "$pullAll": {"tags": tags},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            # Add activity for tag removal
            activity = {
                "activity_type": "tags_removed",
                "timestamp": datetime.utcnow(),
                "performed_by": updated_by,
                "notes": f"Tags removed: {', '.join(tags)}",
                "old_value": tags
            }
            
            await self.add_activity(lead_id, LeadActivity(**activity))
            return await self.get_lead(lead_id)
        return None
    
    # Statistics methods
    
    async def get_lead_statistics(self) -> Dict[str, Any]:
        """Get statistics about leads."""
        stats = {
            "total_count": await self.collection.count_documents({}),
            "by_status": {},
            "by_source": {},
            "by_property_type": {},
            "by_priority": {},
            "conversion_rate": 0,
            "average_interactions": 0
        }
        
        # Get counts by status
        pipeline = [
            {"$group": {"_id": "$status", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        async for doc in cursor:
            status_name = doc["_id"].value if hasattr(doc["_id"], "value") else doc["_id"]
            stats["by_status"][status_name] = doc["count"]
        
        # Get counts by source
        pipeline = [
            {"$group": {"_id": "$source", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        async for doc in cursor:
            source_name = doc["_id"].value if hasattr(doc["_id"], "value") else doc["_id"]
            source_name = source_name if source_name else "Unknown"
            stats["by_source"][source_name] = doc["count"]
        
        # Get counts by property type
        pipeline = [
            {"$group": {"_id": "$property_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        async for doc in cursor:
            type_name = doc["_id"].value if hasattr(doc["_id"], "value") else doc["_id"]
            type_name = type_name if type_name else "Unknown"
            stats["by_property_type"][type_name] = doc["count"]
        
        # Get counts by priority
        pipeline = [
            {"$group": {"_id": "$priority", "count": {"$sum": 1}}},
            {"$sort": {"_id": 1}}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        async for doc in cursor:
            stats["by_priority"][str(doc["_id"])] = doc["count"]
        
        # Calculate conversion rate (leads with status CLOSED_WON)
        converted_count = await self.collection.count_documents({"status": LeadStatus.CLOSED_WON})
        total_count = stats["total_count"]
        if total_count > 0:
            stats["conversion_rate"] = round((converted_count / total_count) * 100, 2)
        
        # Calculate average interactions
        pipeline = [
            {"$group": {"_id": None, "average_interactions": {"$avg": "$total_interactions"}}}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        async for doc in cursor:
            stats["average_interactions"] = round(doc["average_interactions"], 2)
        
        # Get recent conversion trend (last 6 months)
        stats["monthly_conversions"] = []
        now = datetime.utcnow()
        for i in range(5, -1, -1):
            month = now.month - i
            year = now.year
            while month <= 0:
                month += 12
                year -= 1
            
            start_date = datetime(year, month, 1)
            if month == 12:
                end_date = datetime(year + 1, 1, 1)
            else:
                end_date = datetime(year, month + 1, 1)
            
            count = await self.collection.count_documents({
                "status": LeadStatus.CLOSED_WON,
                "updated_at": {"$gte": start_date, "$lt": end_date}
            })
            
            stats["monthly_conversions"].append({
                "month": start_date.strftime("%b %Y"),
                "count": count
            })
        
        return stats 