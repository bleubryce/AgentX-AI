from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from ...db.mongodb import mongodb_client
from ...models.content import (
    Content, ContentCreate, ContentUpdate,
    ContentTemplate, ContentTemplateCreate, ContentTemplateUpdate,
    ContentPerformance
)

class ContentRepository:
    """Repository for content operations in MongoDB."""
    
    def __init__(self):
        self.collection = mongodb_client.get_collection("content")
        self.template_collection = mongodb_client.get_collection("content_templates")
        self.performance_collection = mongodb_client.get_collection("content_performance")
    
    # Content methods
    
    async def create_content(self, content_data: ContentCreate, created_by: str) -> Content:
        """Create a new content item."""
        content_dict = content_data.dict()
        content_dict["created_by"] = created_by
        content_dict["created_at"] = datetime.utcnow()
        content_dict["updated_at"] = content_dict["created_at"]
        
        result = await self.collection.insert_one(content_dict)
        content_dict["_id"] = result.inserted_id
        
        # Initialize performance metrics
        performance = {
            "content_id": str(result.inserted_id),
            "views": 0,
            "likes": 0,
            "shares": 0,
            "comments": 0,
            "clicks": 0,
            "conversions": 0,
            "engagement_rate": 0.0,
            "performance_by_platform": {},
            "performance_by_demographic": {},
            "last_updated": datetime.utcnow(),
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await self.performance_collection.insert_one(performance)
        
        return Content(**content_dict)
    
    async def get_content(self, content_id: str) -> Optional[Content]:
        """Get a content item by ID."""
        content = await self.collection.find_one({"_id": ObjectId(content_id)})
        if content:
            return Content(**content)
        return None
    
    async def update_content(self, content_id: str, update_data: ContentUpdate, updated_by: str) -> Optional[Content]:
        """Update a content item."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            update_dict["last_updated_by"] = updated_by
            
            # If status is changing to published, record published_at
            if update_dict.get("status") == "published":
                update_dict["published_at"] = update_dict["updated_at"]
            
            # Get current content to track revision history
            current_content = await self.get_content(content_id)
            if current_content:
                # Increment version
                update_dict["version"] = current_content.version + 1
                
                # Add to revision history
                revision = {
                    "version": current_content.version,
                    "updated_at": current_content.updated_at,
                    "updated_by": current_content.last_updated_by or current_content.created_by,
                    "changes": {k: v for k, v in update_dict.items() if k not in ["updated_at", "last_updated_by", "version"]}
                }
                
                result = await self.collection.update_one(
                    {"_id": ObjectId(content_id)},
                    {
                        "$set": update_dict,
                        "$push": {"revision_history": revision}
                    }
                )
                
                if result.modified_count:
                    return await self.get_content(content_id)
        return None
    
    async def delete_content(self, content_id: str) -> bool:
        """Delete a content item."""
        # Delete performance metrics first
        await self.performance_collection.delete_one({"content_id": content_id})
        
        # Then delete the content
        result = await self.collection.delete_one({"_id": ObjectId(content_id)})
        return result.deleted_count > 0
    
    async def list_content(self, 
                         content_type: Optional[str] = None,
                         status: Optional[str] = None,
                         created_by: Optional[str] = None,
                         tags: Optional[List[str]] = None,
                         related_entity_id: Optional[str] = None,
                         related_entity_type: Optional[str] = None,
                         start_date: Optional[datetime] = None,
                         end_date: Optional[datetime] = None,
                         skip: int = 0,
                         limit: int = 100,
                         sort_by: str = "created_at",
                         sort_order: int = -1) -> List[Content]:
        """List content items with filters."""
        filters = {}
        
        if content_type:
            filters["content_type"] = content_type
        
        if status:
            filters["status"] = status
        
        if created_by:
            filters["created_by"] = created_by
        
        if tags:
            filters["tags"] = {"$all": tags}
        
        if related_entity_id:
            filters["related_entity_id"] = related_entity_id
        
        if related_entity_type:
            filters["related_entity_type"] = related_entity_type
        
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            filters["created_at"] = date_filter
        
        cursor = self.collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        content_items = []
        async for content in cursor:
            content_items.append(Content(**content))
        
        return content_items
    
    async def count_content(self,
                          content_type: Optional[str] = None,
                          status: Optional[str] = None,
                          created_by: Optional[str] = None,
                          tags: Optional[List[str]] = None,
                          related_entity_id: Optional[str] = None,
                          related_entity_type: Optional[str] = None,
                          start_date: Optional[datetime] = None,
                          end_date: Optional[datetime] = None) -> int:
        """Count content items with filters."""
        filters = {}
        
        if content_type:
            filters["content_type"] = content_type
        
        if status:
            filters["status"] = status
        
        if created_by:
            filters["created_by"] = created_by
        
        if tags:
            filters["tags"] = {"$all": tags}
        
        if related_entity_id:
            filters["related_entity_id"] = related_entity_id
        
        if related_entity_type:
            filters["related_entity_type"] = related_entity_type
        
        if start_date or end_date:
            date_filter = {}
            if start_date:
                date_filter["$gte"] = start_date
            if end_date:
                date_filter["$lte"] = end_date
            filters["created_at"] = date_filter
        
        return await self.collection.count_documents(filters)
    
    async def publish_content(self, content_id: str, updated_by: str) -> Optional[Content]:
        """Publish a content item."""
        now = datetime.utcnow()
        
        # Get current content
        current_content = await self.get_content(content_id)
        if not current_content:
            return None
        
        # Add to revision history
        revision = {
            "version": current_content.version,
            "updated_at": current_content.updated_at,
            "updated_by": current_content.last_updated_by or current_content.created_by,
            "changes": {"status": "published"}
        }
        
        result = await self.collection.update_one(
            {"_id": ObjectId(content_id)},
            {
                "$set": {
                    "status": "published",
                    "published_at": now,
                    "updated_at": now,
                    "last_updated_by": updated_by,
                    "version": current_content.version + 1
                },
                "$push": {"revision_history": revision}
            }
        )
        
        if result.modified_count:
            return await self.get_content(content_id)
        return None
    
    async def archive_content(self, content_id: str, updated_by: str) -> Optional[Content]:
        """Archive a content item."""
        now = datetime.utcnow()
        
        # Get current content
        current_content = await self.get_content(content_id)
        if not current_content:
            return None
        
        # Add to revision history
        revision = {
            "version": current_content.version,
            "updated_at": current_content.updated_at,
            "updated_by": current_content.last_updated_by or current_content.created_by,
            "changes": {"status": "archived"}
        }
        
        result = await self.collection.update_one(
            {"_id": ObjectId(content_id)},
            {
                "$set": {
                    "status": "archived",
                    "updated_at": now,
                    "last_updated_by": updated_by,
                    "version": current_content.version + 1
                },
                "$push": {"revision_history": revision}
            }
        )
        
        if result.modified_count:
            return await self.get_content(content_id)
        return None
    
    async def search_content(self, query: str, limit: int = 10) -> List[Content]:
        """Search content by text (requires text index on title, body, summary)."""
        cursor = self.collection.find(
            {"$text": {"$search": query}},
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)
        
        content_items = []
        async for content in cursor:
            content_items.append(Content(**content))
        
        return content_items
    
    # Template methods
    
    async def create_template(self, template_data: ContentTemplateCreate) -> ContentTemplate:
        """Create a new content template."""
        template_dict = template_data.dict()
        template_dict["created_at"] = datetime.utcnow()
        template_dict["updated_at"] = template_dict["created_at"]
        template_dict["usage_count"] = 0
        
        result = await self.template_collection.insert_one(template_dict)
        template_dict["_id"] = result.inserted_id
        
        return ContentTemplate(**template_dict)
    
    async def get_template(self, template_id: str) -> Optional[ContentTemplate]:
        """Get a template by ID."""
        template = await self.template_collection.find_one({"_id": ObjectId(template_id)})
        if template:
            return ContentTemplate(**template)
        return None
    
    async def update_template(self, template_id: str, update_data: ContentTemplateUpdate) -> Optional[ContentTemplate]:
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
                           content_type: Optional[str] = None,
                           skip: int = 0,
                           limit: int = 100,
                           sort_by: str = "created_at",
                           sort_order: int = -1) -> List[ContentTemplate]:
        """List templates with filters."""
        filters = {}
        
        if content_type:
            filters["content_type"] = content_type
        
        cursor = self.template_collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        templates = []
        async for template in cursor:
            templates.append(ContentTemplate(**template))
        
        return templates
    
    async def increment_template_usage(self, template_id: str) -> Optional[ContentTemplate]:
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
    
    # Performance methods
    
    async def get_content_performance(self, content_id: str) -> Optional[ContentPerformance]:
        """Get performance metrics for a content item."""
        performance = await self.performance_collection.find_one({"content_id": content_id})
        if performance:
            return ContentPerformance(**performance)
        return None
    
    async def update_content_performance(self, content_id: str, metrics: Dict[str, Any]) -> Optional[ContentPerformance]:
        """Update performance metrics for a content item."""
        metrics["last_updated"] = datetime.utcnow()
        metrics["updated_at"] = metrics["last_updated"]
        
        # Calculate engagement rate if we have views
        if "views" in metrics and metrics["views"] > 0:
            engagement_actions = sum([
                metrics.get("likes", 0),
                metrics.get("shares", 0),
                metrics.get("comments", 0),
                metrics.get("clicks", 0)
            ])
            metrics["engagement_rate"] = engagement_actions / metrics["views"]
        
        result = await self.performance_collection.update_one(
            {"content_id": content_id},
            {"$set": metrics}
        )
        
        if result.modified_count:
            return await self.get_content_performance(content_id)
        return None
    
    async def increment_performance_metric(self, content_id: str, metric: str, value: int = 1) -> Optional[ContentPerformance]:
        """Increment a specific performance metric."""
        now = datetime.utcnow()
        
        # Get current metrics to calculate engagement rate
        current = await self.get_content_performance(content_id)
        if not current:
            return None
        
        update_dict = {
            f"{metric}": {"$inc": value},
            "last_updated": now,
            "updated_at": now
        }
        
        # Recalculate engagement rate if we're updating a relevant metric
        if metric in ["views", "likes", "shares", "comments", "clicks"]:
            views = current.views + (value if metric == "views" else 0)
            if views > 0:
                engagement_actions = sum([
                    current.likes + (value if metric == "likes" else 0),
                    current.shares + (value if metric == "shares" else 0),
                    current.comments + (value if metric == "comments" else 0),
                    current.clicks + (value if metric == "clicks" else 0)
                ])
                update_dict["engagement_rate"] = engagement_actions / views
        
        result = await self.performance_collection.update_one(
            {"content_id": content_id},
            {
                "$inc": {metric: value},
                "$set": {
                    "last_updated": now,
                    "updated_at": now,
                    **({
                        "engagement_rate": update_dict.get("engagement_rate")
                    } if "engagement_rate" in update_dict else {})
                }
            }
        )
        
        if result.modified_count:
            return await self.get_content_performance(content_id)
        return None
    
    async def get_top_performing_content(self, 
                                       content_type: Optional[str] = None,
                                       metric: str = "views",
                                       limit: int = 10) -> List[Dict[str, Any]]:
        """Get top performing content based on a specific metric."""
        # Build pipeline for aggregation
        pipeline = []
        
        # Join with content collection
        pipeline.append({
            "$lookup": {
                "from": "content",
                "localField": "content_id",
                "foreignField": "_id",
                "as": "content_data"
            }
        })
        
        # Unwind the content_data array
        pipeline.append({"$unwind": "$content_data"})
        
        # Filter by content type if specified
        if content_type:
            pipeline.append({
                "$match": {"content_data.content_type": content_type}
            })
        
        # Sort by the specified metric
        pipeline.append({"$sort": {metric: -1}})
        
        # Limit results
        pipeline.append({"$limit": limit})
        
        # Project the fields we want
        pipeline.append({
            "$project": {
                "content_id": 1,
                "title": "$content_data.title",
                "content_type": "$content_data.content_type",
                "status": "$content_data.status",
                "created_at": "$content_data.created_at",
                "views": 1,
                "likes": 1,
                "shares": 1,
                "comments": 1,
                "clicks": 1,
                "conversions": 1,
                "engagement_rate": 1
            }
        })
        
        cursor = self.performance_collection.aggregate(pipeline)
        
        results = []
        async for doc in cursor:
            # Convert ObjectId to string for content_id
            if isinstance(doc["content_id"], ObjectId):
                doc["content_id"] = str(doc["content_id"])
            results.append(doc)
        
        return results 