from datetime import datetime
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from .base import BaseDBModel

class Dimensions(BaseModel):
    """Model for media dimensions."""
    width: int = Field(..., description="Width in pixels")
    height: int = Field(..., description="Height in pixels")

class MediaItemBase(BaseModel):
    """Base media item model with common fields."""
    title: str = Field(..., description="Media title")
    description: Optional[str] = Field(None, description="Media description")
    media_type: str = Field(..., description="Type of media")
    file_path: str = Field(..., description="Path to the media file")
    file_url: Optional[str] = Field(None, description="URL to access the media")
    file_size: int = Field(..., description="Size of the media in bytes")
    file_format: str = Field(..., description="Format of the media (jpg, png, mp4, etc.)")
    dimensions: Optional[Dimensions] = Field(None, description="Media dimensions")
    duration: Optional[float] = Field(None, description="Duration in seconds (for video/audio)")
    tags: List[str] = Field(default_factory=list, description="Media tags")
    categories: List[str] = Field(default_factory=list, description="Media categories")
    related_entity_id: Optional[str] = Field(None, description="ID of related entity (property, content, etc.)")
    related_entity_type: Optional[str] = Field(None, description="Type of related entity")
    created_by: str = Field(..., description="ID of the user who created the media")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    @validator('media_type')
    def validate_media_type(cls, v):
        valid_types = {"image", "video", "audio", "document", "other"}
        if v not in valid_types:
            raise ValueError(f"Invalid media type. Must be one of: {valid_types}")
        return v

class MediaItemCreate(MediaItemBase):
    """Model for creating a new media item."""
    pass

class MediaItemUpdate(BaseModel):
    """Model for updating an existing media item."""
    title: Optional[str] = None
    description: Optional[str] = None
    file_url: Optional[str] = None
    dimensions: Optional[Dimensions] = None
    duration: Optional[float] = None
    tags: Optional[List[str]] = None
    categories: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None

class MediaItem(MediaItemBase, BaseDBModel):
    """Complete media item model with database fields."""
    views: int = Field(default=0, description="Number of views")
    downloads: int = Field(default=0, description="Number of downloads")
    last_accessed: Optional[datetime] = Field(None, description="When the media was last accessed")
    is_featured: bool = Field(default=False, description="Whether the media is featured")
    alt_text: Optional[str] = Field(None, description="Alternative text for accessibility")
    caption: Optional[str] = Field(None, description="Media caption")
    attribution: Optional[str] = Field(None, description="Media attribution/credit")

class MediaItemResponse(MediaItem):
    """Model for media item API responses."""
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class MediaCollectionBase(BaseModel):
    """Base media collection model with common fields."""
    name: str = Field(..., description="Collection name")
    description: Optional[str] = Field(None, description="Collection description")
    collection_type: str = Field(..., description="Type of collection")
    media_ids: List[str] = Field(default_factory=list, description="IDs of media items in the collection")
    related_entity_id: Optional[str] = Field(None, description="ID of related entity (property, content, etc.)")
    related_entity_type: Optional[str] = Field(None, description="Type of related entity")
    created_by: str = Field(..., description="ID of the user who created the collection")
    
    @validator('collection_type')
    def validate_collection_type(cls, v):
        valid_types = {"property", "listing", "gallery", "album", "portfolio", "other"}
        if v not in valid_types:
            raise ValueError(f"Invalid collection type. Must be one of: {valid_types}")
        return v

class MediaCollectionCreate(MediaCollectionBase):
    """Model for creating a new media collection."""
    pass

class MediaCollectionUpdate(BaseModel):
    """Model for updating an existing media collection."""
    name: Optional[str] = None
    description: Optional[str] = None
    media_ids: Optional[List[str]] = None

class MediaCollection(MediaCollectionBase, BaseDBModel):
    """Complete media collection model with database fields."""
    cover_media_id: Optional[str] = Field(None, description="ID of the cover media item")
    is_public: bool = Field(default=True, description="Whether the collection is public")
    views: int = Field(default=0, description="Number of views")
    last_accessed: Optional[datetime] = Field(None, description="When the collection was last accessed")

class MediaCollectionResponse(MediaCollection):
    """Model for media collection API responses."""
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class MediaTagBase(BaseModel):
    """Base media tag model with common fields."""
    name: str = Field(..., description="Tag name")
    description: Optional[str] = Field(None, description="Tag description")
    category: Optional[str] = Field(None, description="Tag category")

class MediaTagCreate(MediaTagBase):
    """Model for creating a new media tag."""
    pass

class MediaTagUpdate(BaseModel):
    """Model for updating an existing media tag."""
    description: Optional[str] = None
    category: Optional[str] = None

class MediaTag(MediaTagBase, BaseDBModel):
    """Complete media tag model with database fields."""
    usage_count: int = Field(default=0, description="Number of times the tag has been used")

class MediaSearch(BaseModel):
    """Model for media search parameters."""
    query: Optional[str] = Field(None, description="Search query")
    media_types: Optional[List[str]] = Field(None, description="Media types to include")
    tags: Optional[List[str]] = Field(None, description="Tags to filter by")
    categories: Optional[List[str]] = Field(None, description="Categories to filter by")
    created_by: Optional[str] = Field(None, description="Filter by creator")
    related_entity_id: Optional[str] = Field(None, description="Filter by related entity ID")
    related_entity_type: Optional[str] = Field(None, description="Filter by related entity type")
    min_width: Optional[int] = Field(None, description="Minimum width in pixels")
    min_height: Optional[int] = Field(None, description="Minimum height in pixels")
    min_duration: Optional[float] = Field(None, description="Minimum duration in seconds")
    max_duration: Optional[float] = Field(None, description="Maximum duration in seconds")
    sort_by: Optional[str] = Field("created_at", description="Field to sort by")
    sort_order: Optional[str] = Field("desc", description="Sort order (asc or desc)")
    
    @validator('media_types')
    def validate_media_types(cls, v):
        if v is not None:
            valid_types = {"image", "video", "audio", "document", "other"}
            for media_type in v:
                if media_type not in valid_types:
                    raise ValueError(f"Invalid media type: {media_type}. Must be one of: {valid_types}")
        return v
    
    @validator('sort_by')
    def validate_sort_by(cls, v):
        valid_fields = {
            "created_at", "title", "file_size", "views", "downloads"
        }
        if v not in valid_fields:
            raise ValueError(f"Invalid sort field. Must be one of: {valid_fields}")
        return v
    
    @validator('sort_order')
    def validate_sort_order(cls, v):
        valid_orders = {"asc", "desc"}
        if v not in valid_orders:
            raise ValueError(f"Invalid sort order. Must be one of: {valid_orders}")
        return v 