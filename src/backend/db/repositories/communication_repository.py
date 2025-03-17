from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from ...db.mongodb import mongodb_client
from ...models.communication import (
    Communication, CommunicationCreate, CommunicationUpdate,
    CommunicationTemplate, CommunicationTemplateCreate, CommunicationTemplateUpdate,
    CommunicationSequence, CommunicationSequenceCreate, CommunicationSequenceUpdate,
    SequenceStep, SequenceStepCreate, SequenceStepUpdate,
    ClientEngagement
)

class CommunicationRepository:
    """Repository for communication operations in MongoDB."""
    
    def __init__(self):
        self.collection = mongodb_client.get_collection("communications")
        self.template_collection = mongodb_client.get_collection("communication_templates")
        self.sequence_collection = mongodb_client.get_collection("communication_sequences")
        self.engagement_collection = mongodb_client.get_collection("client_engagements")
    
    # Communication methods
    
    async def create_communication(self, communication_data: CommunicationCreate) -> Communication:
        """Create a new communication."""
        communication_dict = communication_data.dict()
        communication_dict["created_at"] = datetime.utcnow()
        communication_dict["updated_at"] = communication_dict["created_at"]
        
        result = await self.collection.insert_one(communication_dict)
        communication_dict["_id"] = result.inserted_id
        
        return Communication(**communication_dict)
    
    async def get_communication(self, communication_id: str) -> Optional[Communication]:
        """Get a communication by ID."""
        communication = await self.collection.find_one({"_id": ObjectId(communication_id)})
        if communication:
            return Communication(**communication)
        return None
    
    async def update_communication(self, communication_id: str, update_data: CommunicationUpdate) -> Optional[Communication]:
        """Update a communication."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": ObjectId(communication_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get_communication(communication_id)
        return None
    
    async def delete_communication(self, communication_id: str) -> bool:
        """Delete a communication."""
        result = await self.collection.delete_one({"_id": ObjectId(communication_id)})
        return result.deleted_count > 0
    
    async def list_communications(self, 
                                client_id: Optional[str] = None,
                                communication_type: Optional[str] = None,
                                status: Optional[str] = None,
                                template_id: Optional[str] = None,
                                sequence_id: Optional[str] = None,
                                start_date: Optional[datetime] = None,
                                end_date: Optional[datetime] = None,
                                skip: int = 0,
                                limit: int = 100,
                                sort_by: str = "created_at",
                                sort_order: int = -1) -> List[Communication]:
        """List communications with filters."""
        filters = {}
        
        if client_id:
            filters["client_id"] = client_id
        
        if communication_type:
            filters["communication_type"] = communication_type
        
        if status:
            filters["status"] = status
        
        if template_id:
            filters["template_id"] = template_id
        
        if sequence_id:
            filters["sequence_id"] = sequence_id
        
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            filters["created_at"] = date_filter
        
        cursor = self.collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        communications = []
        async for communication in cursor:
            communications.append(Communication(**communication))
        
        return communications
    
    async def count_communications(self,
                                 client_id: Optional[str] = None,
                                 communication_type: Optional[str] = None,
                                 status: Optional[str] = None,
                                 template_id: Optional[str] = None,
                                 sequence_id: Optional[str] = None,
                                 start_date: Optional[datetime] = None,
                                 end_date: Optional[datetime] = None) -> int:
        """Count communications with filters."""
        filters = {}
        
        if client_id:
            filters["client_id"] = client_id
        
        if communication_type:
            filters["communication_type"] = communication_type
        
        if status:
            filters["status"] = status
        
        if template_id:
            filters["template_id"] = template_id
        
        if sequence_id:
            filters["sequence_id"] = sequence_id
        
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            filters["created_at"] = date_filter
        
        return await self.collection.count_documents(filters)
    
    async def mark_as_sent(self, communication_id: str) -> Optional[Communication]:
        """Mark a communication as sent."""
        now = datetime.utcnow()
        result = await self.collection.update_one(
            {"_id": ObjectId(communication_id)},
            {
                "$set": {
                    "status": "sent",
                    "sent_at": now,
                    "updated_at": now
                }
            }
        )
        
        if result.modified_count:
            return await self.get_communication(communication_id)
        return None
    
    async def mark_as_delivered(self, communication_id: str) -> Optional[Communication]:
        """Mark a communication as delivered."""
        now = datetime.utcnow()
        result = await self.collection.update_one(
            {"_id": ObjectId(communication_id)},
            {
                "$set": {
                    "status": "delivered",
                    "delivered_at": now,
                    "updated_at": now
                }
            }
        )
        
        if result.modified_count:
            return await self.get_communication(communication_id)
        return None
    
    # Template methods
    
    async def create_template(self, template_data: CommunicationTemplateCreate) -> CommunicationTemplate:
        """Create a new communication template."""
        template_dict = template_data.dict()
        template_dict["created_at"] = datetime.utcnow()
        template_dict["updated_at"] = template_dict["created_at"]
        template_dict["usage_count"] = 0
        
        result = await self.template_collection.insert_one(template_dict)
        template_dict["_id"] = result.inserted_id
        
        return CommunicationTemplate(**template_dict)
    
    async def get_template(self, template_id: str) -> Optional[CommunicationTemplate]:
        """Get a template by ID."""
        template = await self.template_collection.find_one({"_id": ObjectId(template_id)})
        if template:
            return CommunicationTemplate(**template)
        return None
    
    async def update_template(self, template_id: str, update_data: CommunicationTemplateUpdate) -> Optional[CommunicationTemplate]:
        """Update a template."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await self.template_collection.update_one(
                {"_id": ObjectId(template_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get_template(template_id)
        return None
    
    async def delete_template(self, template_id: str) -> bool:
        """Delete a template."""
        result = await self.template_collection.delete_one({"_id": ObjectId(template_id)})
        return result.deleted_count > 0
    
    async def list_templates(self,
                           template_type: Optional[str] = None,
                           skip: int = 0,
                           limit: int = 100,
                           sort_by: str = "created_at",
                           sort_order: int = -1) -> List[CommunicationTemplate]:
        """List templates with filters."""
        filters = {}
        
        if template_type:
            filters["template_type"] = template_type
        
        cursor = self.template_collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        templates = []
        async for template in cursor:
            templates.append(CommunicationTemplate(**template))
        
        return templates
    
    async def increment_template_usage(self, template_id: str) -> Optional[CommunicationTemplate]:
        """Increment the usage count of a template."""
        now = datetime.utcnow()
        result = await self.template_collection.update_one(
            {"_id": ObjectId(template_id)},
            {
                "$inc": {"usage_count": 1},
                "$set": {"last_used": now, "updated_at": now}
            }
        )
        
        if result.modified_count:
            return await self.get_template(template_id)
        return None
    
    # Sequence methods
    
    async def create_sequence(self, sequence_data: CommunicationSequenceCreate) -> CommunicationSequence:
        """Create a new communication sequence."""
        sequence_dict = sequence_data.dict(exclude={"steps"})
        sequence_dict["created_at"] = datetime.utcnow()
        sequence_dict["updated_at"] = sequence_dict["created_at"]
        sequence_dict["usage_count"] = 0
        
        # Insert the sequence first to get an ID
        result = await self.sequence_collection.insert_one(sequence_dict)
        sequence_id = result.inserted_id
        sequence_dict["_id"] = sequence_id
        
        # Process steps if any
        steps = []
        if sequence_data.steps:
            for step_data in sequence_data.steps:
                step_dict = step_data.dict()
                step_dict["sequence_id"] = str(sequence_id)
                step_dict["created_at"] = datetime.utcnow()
                step_dict["updated_at"] = step_dict["created_at"]
                
                step_result = await self.sequence_collection.insert_one(step_dict)
                step_dict["_id"] = step_result.inserted_id
                steps.append(SequenceStep(**step_dict))
        
        sequence_dict["steps"] = steps
        
        return CommunicationSequence(**sequence_dict)
    
    async def get_sequence(self, sequence_id: str) -> Optional[CommunicationSequence]:
        """Get a sequence by ID."""
        sequence = await self.sequence_collection.find_one({"_id": ObjectId(sequence_id)})
        if not sequence:
            return None
        
        # Get all steps for this sequence
        steps_cursor = self.sequence_collection.find({"sequence_id": str(sequence["_id"])})
        steps = []
        async for step in steps_cursor:
            steps.append(SequenceStep(**step))
        
        # Sort steps by order
        steps.sort(key=lambda x: x.step_order)
        
        sequence["steps"] = steps
        return CommunicationSequence(**sequence)
    
    async def update_sequence(self, sequence_id: str, update_data: CommunicationSequenceUpdate) -> Optional[CommunicationSequence]:
        """Update a sequence."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await self.sequence_collection.update_one(
                {"_id": ObjectId(sequence_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get_sequence(sequence_id)
        return None
    
    async def delete_sequence(self, sequence_id: str) -> bool:
        """Delete a sequence and all its steps."""
        # Delete all steps first
        await self.sequence_collection.delete_many({"sequence_id": sequence_id})
        
        # Then delete the sequence
        result = await self.sequence_collection.delete_one({"_id": ObjectId(sequence_id)})
        return result.deleted_count > 0
    
    async def list_sequences(self,
                           trigger_type: Optional[str] = None,
                           is_active: Optional[bool] = None,
                           skip: int = 0,
                           limit: int = 100,
                           sort_by: str = "created_at",
                           sort_order: int = -1) -> List[CommunicationSequence]:
        """List sequences with filters."""
        filters = {}
        
        if trigger_type:
            filters["trigger_type"] = trigger_type
        
        if is_active is not None:
            filters["is_active"] = is_active
        
        cursor = self.sequence_collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        sequences = []
        async for sequence_data in cursor:
            sequence = await self.get_sequence(str(sequence_data["_id"]))
            if sequence:
                sequences.append(sequence)
        
        return sequences
    
    async def increment_sequence_usage(self, sequence_id: str) -> Optional[CommunicationSequence]:
        """Increment the usage count of a sequence."""
        now = datetime.utcnow()
        result = await self.sequence_collection.update_one(
            {"_id": ObjectId(sequence_id)},
            {
                "$inc": {"usage_count": 1},
                "$set": {"last_used": now, "updated_at": now}
            }
        )
        
        if result.modified_count:
            return await self.get_sequence(sequence_id)
        return None
    
    # Sequence step methods
    
    async def create_step(self, step_data: SequenceStepCreate) -> SequenceStep:
        """Create a new sequence step."""
        step_dict = step_data.dict()
        step_dict["created_at"] = datetime.utcnow()
        step_dict["updated_at"] = step_dict["created_at"]
        
        result = await self.sequence_collection.insert_one(step_dict)
        step_dict["_id"] = result.inserted_id
        
        return SequenceStep(**step_dict)
    
    async def get_step(self, step_id: str) -> Optional[SequenceStep]:
        """Get a step by ID."""
        step = await self.sequence_collection.find_one({"_id": ObjectId(step_id)})
        if step:
            return SequenceStep(**step)
        return None
    
    async def update_step(self, step_id: str, update_data: SequenceStepUpdate) -> Optional[SequenceStep]:
        """Update a step."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await self.sequence_collection.update_one(
                {"_id": ObjectId(step_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get_step(step_id)
        return None
    
    async def delete_step(self, step_id: str) -> bool:
        """Delete a step."""
        result = await self.sequence_collection.delete_one({"_id": ObjectId(step_id)})
        return result.deleted_count > 0
    
    # Client engagement methods
    
    async def record_engagement(self, engagement_data: ClientEngagement) -> ClientEngagement:
        """Record client engagement with a communication."""
        engagement_dict = engagement_data.dict()
        engagement_dict["created_at"] = datetime.utcnow()
        engagement_dict["updated_at"] = engagement_dict["created_at"]
        
        result = await self.engagement_collection.insert_one(engagement_dict)
        engagement_dict["_id"] = result.inserted_id
        
        # Update the communication with the engagement info
        action_type = engagement_dict["action_type"]
        action_timestamp = engagement_dict["action_timestamp"]
        
        update_dict = {
            "updated_at": datetime.utcnow()
        }
        
        if action_type == "open":
            update_dict["opened_at"] = action_timestamp
        elif action_type == "click":
            update_dict["clicked_at"] = action_timestamp
        elif action_type == "reply":
            update_dict["replied_at"] = action_timestamp
        
        await self.collection.update_one(
            {"_id": ObjectId(engagement_dict["communication_id"])},
            {"$set": update_dict}
        )
        
        return ClientEngagement(**engagement_dict)
    
    async def get_client_engagements(self, 
                                   client_id: str,
                                   communication_id: Optional[str] = None,
                                   action_type: Optional[str] = None,
                                   start_date: Optional[datetime] = None,
                                   end_date: Optional[datetime] = None,
                                   skip: int = 0,
                                   limit: int = 100) -> List[ClientEngagement]:
        """Get client engagements with filters."""
        filters = {"client_id": client_id}
        
        if communication_id:
            filters["communication_id"] = communication_id
        
        if action_type:
            filters["action_type"] = action_type
        
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            filters["action_timestamp"] = date_filter
        
        cursor = self.engagement_collection.find(filters)
        cursor = cursor.sort("action_timestamp", -1).skip(skip).limit(limit)
        
        engagements = []
        async for engagement in cursor:
            engagements.append(ClientEngagement(**engagement))
        
        return engagements 