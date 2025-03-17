from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from ...db.mongodb import mongodb_client
from ...models.media import (
    MediaItem, MediaItemCreate, MediaItemUpdate,
    MediaCollection, MediaCollectionCreate, MediaCollectionUpdate,
    MediaTag, MediaTagCreate, MediaTagUpdate,
    MediaSearch
)

class MediaRepository:
    """Repository for media operations in MongoDB."""
    
    def __init__(self):
        self.collection = mongodb_client.get_collection("media_items")
        self.collection_collection = mongodb_client.get_collection("media_collections")
        self.tag_collection = mongodb_client.get_collection("media_tags")
    
    # Media item methods
    
    async def create_media_item(self, media_data: MediaItemCreate, created_by: str) -> MediaItem:
        """Create a new media item."""
        media_dict = media_data.dict()
        media_dict["created_by"] = created_by
        media_dict["created_at"] = datetime.utcnow()
        media_dict["updated_at"] = media_dict["created_at"]
        
        result = await self.collection.insert_one(media_dict)
        media_dict["_id"] = result.inserted_id
        
        # Increment usage count for tags
        if media_dict.get("tags"):
            for tag in media_dict["tags"]:
                await self.tag_collection.update_one(
                    {"name": tag},
                    {"$inc": {"usage_count": 1}},
                    upsert=True
                )
        
        return MediaItem(**media_dict)
    
    async def get_media_item(self, media_id: str) -> Optional[MediaItem]:
        """Get a media item by ID."""
        media = await self.collection.find_one({"_id": ObjectId(media_id)})
        if media:
            # Update last_accessed and increment views
            await self.collection.update_one(
                {"_id": ObjectId(media_id)},
                {
                    "$set": {"last_accessed": datetime.utcnow()},
                    "$inc": {"views": 1}
                }
            )
            return MediaItem(**media)
        return None
    
    async def update_media_item(self, media_id: str, update_data: MediaItemUpdate) -> Optional[MediaItem]:
        """Update a media item."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            # Handle tag updates
            if "tags" in update_dict:
                # Get current media to compare tags
                current_media = await self.get_media_item(media_id)
                if current_media:
                    # Decrement usage count for removed tags
                    removed_tags = set(current_media.tags) - set(update_dict["tags"])
                    for tag in removed_tags:
                        await self.tag_collection.update_one(
                            {"name": tag},
                            {"$inc": {"usage_count": -1}}
                        )
                    
                    # Increment usage count for new tags
                    new_tags = set(update_dict["tags"]) - set(current_media.tags)
                    for tag in new_tags:
                        await self.tag_collection.update_one(
                            {"name": tag},
                            {"$inc": {"usage_count": 1}},
                            upsert=True
                        )
            
            result = await self.collection.update_one(
                {"_id": ObjectId(media_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get_media_item(media_id)
        return None
    
    async def delete_media_item(self, media_id: str) -> bool:
        """Delete a media item."""
        # Get media item to decrement tag usage
        media = await self.get_media_item(media_id)
        if media and media.tags:
            for tag in media.tags:
                await self.tag_collection.update_one(
                    {"name": tag},
                    {"$inc": {"usage_count": -1}}
                )
        
        # Remove from all collections
        await self.collection_collection.update_many(
            {"media_ids": media_id},
            {"$pull": {"media_ids": media_id}}
        )
        
        # Delete the media item
        result = await self.collection.delete_one({"_id": ObjectId(media_id)})
        return result.deleted_count > 0
    
    async def list_media_items(self, 
                             media_type: Optional[str] = None,
                             tags: Optional[List[str]] = None,
                             categories: Optional[List[str]] = None,
                             created_by: Optional[str] = None,
                             related_entity_id: Optional[str] = None,
                             related_entity_type: Optional[str] = None,
                             is_featured: Optional[bool] = None,
                             min_width: Optional[int] = None,
                             min_height: Optional[int] = None,
                             skip: int = 0,
                             limit: int = 100,
                             sort_by: str = "created_at",
                             sort_order: int = -1) -> List[MediaItem]:
        """List media items with filters."""
        filters = {}
        
        if media_type:
            filters["media_type"] = media_type
        
        if tags:
            filters["tags"] = {"$all": tags}
        
        if categories:
            filters["categories"] = {"$all": categories}
        
        if created_by:
            filters["created_by"] = created_by
        
        if related_entity_id:
            filters["related_entity_id"] = related_entity_id
        
        if related_entity_type:
            filters["related_entity_type"] = related_entity_type
        
        if is_featured is not None:
            filters["is_featured"] = is_featured
        
        # Dimension filters
        if min_width is not None:
            filters["dimensions.width"] = {"$gte": min_width}
        
        if min_height is not None:
            filters["dimensions.height"] = {"$gte": min_height}
        
        cursor = self.collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        media_items = []
        async for media in cursor:
            media_items.append(MediaItem(**media))
        
        return media_items
    
    async def count_media_items(self,
                              media_type: Optional[str] = None,
                              tags: Optional[List[str]] = None,
                              categories: Optional[List[str]] = None,
                              created_by: Optional[str] = None,
                              related_entity_id: Optional[str] = None,
                              related_entity_type: Optional[str] = None,
                              is_featured: Optional[bool] = None) -> int:
        """Count media items with filters."""
        filters = {}
        
        if media_type:
            filters["media_type"] = media_type
        
        if tags:
            filters["tags"] = {"$all": tags}
        
        if categories:
            filters["categories"] = {"$all": categories}
        
        if created_by:
            filters["created_by"] = created_by
        
        if related_entity_id:
            filters["related_entity_id"] = related_entity_id
        
        if related_entity_type:
            filters["related_entity_type"] = related_entity_type
        
        if is_featured is not None:
            filters["is_featured"] = is_featured
        
        return await self.collection.count_documents(filters)
    
    async def search_media(self, search_params: MediaSearch, skip: int = 0, limit: int = 100) -> List[MediaItem]:
        """Search media items with advanced filters."""
        filters = {}
        
        # Text search
        if search_params.query:
            filters["$text"] = {"$search": search_params.query}
        
        # Media types
        if search_params.media_types:
            filters["media_type"] = {"$in": search_params.media_types}
        
        # Tags
        if search_params.tags:
            filters["tags"] = {"$all": search_params.tags}
        
        # Categories
        if search_params.categories:
            filters["categories"] = {"$all": search_params.categories}
        
        # Creator
        if search_params.created_by:
            filters["created_by"] = search_params.created_by
        
        # Related entity
        if search_params.related_entity_id:
            filters["related_entity_id"] = search_params.related_entity_id
        
        if search_params.related_entity_type:
            filters["related_entity_type"] = search_params.related_entity_type
        
        # Dimensions
        if search_params.min_width is not None:
            filters["dimensions.width"] = {"$gte": search_params.min_width}
        
        if search_params.min_height is not None:
            filters["dimensions.height"] = {"$gte": search_params.min_height}
        
        # Duration
        if search_params.min_duration is not None or search_params.max_duration is not None:
            filters["duration"] = {}
            if search_params.min_duration is not None:
                filters["duration"]["$gte"] = search_params.min_duration
            if search_params.max_duration is not None:
                filters["duration"]["$lte"] = search_params.max_duration
        
        # Sort options
        sort_field = search_params.sort_by
        sort_direction = 1 if search_params.sort_order == "asc" else -1
        
        cursor = self.collection.find(filters)
        
        # If using text search and want to sort by relevance
        if search_params.query and sort_field == "relevance":
            cursor = cursor.sort([("score", {"$meta": "textScore"})])
        else:
            cursor = cursor.sort(sort_field, sort_direction)
        
        cursor = cursor.skip(skip).limit(limit)
        
        media_items = []
        async for media in cursor:
            media_items.append(MediaItem(**media))
        
        return media_items
    
    async def increment_downloads(self, media_id: str) -> Optional[MediaItem]:
        """Increment the download count of a media item."""
        result = await self.collection.update_one(
            {"_id": ObjectId(media_id)},
            {
                "$inc": {"downloads": 1},
                "$set": {"last_accessed": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            return await self.get_media_item(media_id)
        return None
    
    async def toggle_featured(self, media_id: str, is_featured: bool) -> Optional[MediaItem]:
        """Toggle the featured status of a media item."""
        result = await self.collection.update_one(
            {"_id": ObjectId(media_id)},
            {"$set": {"is_featured": is_featured, "updated_at": datetime.utcnow()}}
        )
        
        if result.modified_count:
            return await self.get_media_item(media_id)
        return None
    
    # Media collection methods
    
    async def create_collection(self, collection_data: MediaCollectionCreate, created_by: str) -> MediaCollection:
        """Create a new media collection."""
        collection_dict = collection_data.dict()
        collection_dict["created_by"] = created_by
        collection_dict["created_at"] = datetime.utcnow()
        collection_dict["updated_at"] = collection_dict["created_at"]
        
        result = await self.collection_collection.insert_one(collection_dict)
        collection_dict["_id"] = result.inserted_id
        
        return MediaCollection(**collection_dict)
    
    async def get_collection(self, collection_id: str) -> Optional[MediaCollection]:
        """Get a media collection by ID."""
        collection = await self.collection_collection.find_one({"_id": ObjectId(collection_id)})
        if collection:
            # Update last_accessed and increment views
            await self.collection_collection.update_one(
                {"_id": ObjectId(collection_id)},
                {
                    "$set": {"last_accessed": datetime.utcnow()},
                    "$inc": {"views": 1}
                }
            )
            return MediaCollection(**collection)
        return None
    
    async def update_collection(self, collection_id: str, update_data: MediaCollectionUpdate) -> Optional[MediaCollection]:
        """Update a media collection."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await self.collection_collection.update_one(
                {"_id": ObjectId(collection_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get_collection(collection_id)
        return None
    
    async def delete_collection(self, collection_id: str) -> bool:
        """Delete a media collection."""
        result = await self.collection_collection.delete_one({"_id": ObjectId(collection_id)})
        return result.deleted_count > 0
    
    async def list_collections(self,
                             collection_type: Optional[str] = None,
                             created_by: Optional[str] = None,
                             related_entity_id: Optional[str] = None,
                             related_entity_type: Optional[str] = None,
                             is_public: Optional[bool] = None,
                             skip: int = 0,
                             limit: int = 100,
                             sort_by: str = "created_at",
                             sort_order: int = -1) -> List[MediaCollection]:
        """List media collections with filters."""
        filters = {}
        
        if collection_type:
            filters["collection_type"] = collection_type
        
        if created_by:
            filters["created_by"] = created_by
        
        if related_entity_id:
            filters["related_entity_id"] = related_entity_id
        
        if related_entity_type:
            filters["related_entity_type"] = related_entity_type
        
        if is_public is not None:
            filters["is_public"] = is_public
        
        cursor = self.collection_collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        collections = []
        async for collection in cursor:
            collections.append(MediaCollection(**collection))
        
        return collections
    
    async def add_to_collection(self, collection_id: str, media_id: str) -> Optional[MediaCollection]:
        """Add a media item to a collection."""
        result = await self.collection_collection.update_one(
            {"_id": ObjectId(collection_id)},
            {
                "$addToSet": {"media_ids": media_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            return await self.get_collection(collection_id)
        return None
    
    async def remove_from_collection(self, collection_id: str, media_id: str) -> Optional[MediaCollection]:
        """Remove a media item from a collection."""
        result = await self.collection_collection.update_one(
            {"_id": ObjectId(collection_id)},
            {
                "$pull": {"media_ids": media_id},
                "$set": {"updated_at": datetime.utcnow()}
            }
        )
        
        if result.modified_count:
            return await self.get_collection(collection_id)
        return None
    
    async def set_collection_cover(self, collection_id: str, media_id: str) -> Optional[MediaCollection]:
        """Set the cover media item for a collection."""
        result = await self.collection_collection.update_one(
            {"_id": ObjectId(collection_id)},
            {
                "$set": {
                    "cover_media_id": media_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        if result.modified_count:
            return await self.get_collection(collection_id)
        return None
    
    # Media tag methods
    
    async def create_tag(self, tag_data: MediaTagCreate) -> MediaTag:
        """Create a new media tag."""
        tag_dict = tag_data.dict()
        tag_dict["created_at"] = datetime.utcnow()
        tag_dict["updated_at"] = tag_dict["created_at"]
        tag_dict["usage_count"] = 0
        
        # Check if tag already exists
        existing_tag = await self.tag_collection.find_one({"name": tag_dict["name"]})
        if existing_tag:
            return MediaTag(**existing_tag)
        
        result = await self.tag_collection.insert_one(tag_dict)
        tag_dict["_id"] = result.inserted_id
        
        return MediaTag(**tag_dict)
    
    async def get_tag(self, tag_id: str) -> Optional[MediaTag]:
        """Get a media tag by ID."""
        tag = await self.tag_collection.find_one({"_id": ObjectId(tag_id)})
        if tag:
            return MediaTag(**tag)
        return None
    
    async def get_tag_by_name(self, name: str) -> Optional[MediaTag]:
        """Get a media tag by name."""
        tag = await self.tag_collection.find_one({"name": name})
        if tag:
            return MediaTag(**tag)
        return None
    
    async def update_tag(self, tag_id: str, update_data: MediaTagUpdate) -> Optional[MediaTag]:
        """Update a media tag."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await self.tag_collection.update_one(
                {"_id": ObjectId(tag_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get_tag(tag_id)
        return None
    
    async def delete_tag(self, tag_id: str) -> bool:
        """Delete a media tag."""
        # Get tag to remove from media items
        tag = await self.get_tag(tag_id)
        if tag:
            # Remove tag from all media items
            await self.collection.update_many(
                {"tags": tag.name},
                {"$pull": {"tags": tag.name}}
            )
        
        result = await self.tag_collection.delete_one({"_id": ObjectId(tag_id)})
        return result.deleted_count > 0
    
    async def list_tags(self,
                      category: Optional[str] = None,
                      min_usage: Optional[int] = None,
                      skip: int = 0,
                      limit: int = 100,
                      sort_by: str = "name",
                      sort_order: int = 1) -> List[MediaTag]:
        """List media tags with filters."""
        filters = {}
        
        if category:
            filters["category"] = category
        
        if min_usage is not None:
            filters["usage_count"] = {"$gte": min_usage}
        
        cursor = self.tag_collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        tags = []
        async for tag in cursor:
            tags.append(MediaTag(**tag))
        
        return tags
    
    async def get_popular_tags(self, limit: int = 20) -> List[MediaTag]:
        """Get the most popular tags based on usage count."""
        cursor = self.tag_collection.find().sort("usage_count", -1).limit(limit)
        
        tags = []
        async for tag in cursor:
            tags.append(MediaTag(**tag))
        
        return tags
    
    # Statistics methods
    
    async def get_media_statistics(self) -> Dict[str, Any]:
        """Get statistics about media items."""
        stats = {
            "total_count": await self.collection.count_documents({}),
            "by_type": {},
            "total_size": 0,
            "featured_count": await self.collection.count_documents({"is_featured": True}),
            "collection_count": await self.collection_collection.count_documents({}),
            "tag_count": await self.tag_collection.count_documents({})
        }
        
        # Get counts by media type
        pipeline = [
            {"$group": {"_id": "$media_type", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        async for doc in cursor:
            stats["by_type"][doc["_id"]] = doc["count"]
        
        # Calculate total size
        pipeline = [
            {"$group": {"_id": None, "total_size": {"$sum": "$file_size"}}}
        ]
        
        cursor = self.collection.aggregate(pipeline)
        async for doc in cursor:
            stats["total_size"] = doc["total_size"]
        
        # Get most viewed media
        pipeline = [
            {"$sort": {"views": -1}},
            {"$limit": 5},
            {"$project": {"_id": 1, "title": 1, "views": 1, "media_type": 1}}
        ]
        
        stats["most_viewed"] = []
        cursor = self.collection.aggregate(pipeline)
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            stats["most_viewed"].append(doc)
        
        # Get most downloaded media
        pipeline = [
            {"$sort": {"downloads": -1}},
            {"$limit": 5},
            {"$project": {"_id": 1, "title": 1, "downloads": 1, "media_type": 1}}
        ]
        
        stats["most_downloaded"] = []
        cursor = self.collection.aggregate(pipeline)
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            stats["most_downloaded"].append(doc)
        
        return stats 