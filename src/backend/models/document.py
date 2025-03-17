from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from .base import BaseDBModel

class DocumentBase(BaseModel):
    """Base document model with common fields."""
    title: str = Field(..., description="Document title")
    description: Optional[str] = Field(None, description="Document description")
    document_type: str = Field(..., description="Type of document (contract, listing, disclosure, etc.)")
    file_path: str = Field(..., description="Path to the document file")
    file_url: Optional[str] = Field(None, description="URL to access the document")
    file_size: int = Field(..., description="Size of the document in bytes")
    file_format: str = Field(..., description="Format of the document (pdf, docx, etc.)")
    tags: List[str] = Field(default_factory=list, description="Tags associated with the document")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    owner_id: str = Field(..., description="ID of the document owner")
    related_entity_id: Optional[str] = Field(None, description="ID of related entity (property, lead, etc.)")
    related_entity_type: Optional[str] = Field(None, description="Type of related entity")
    status: str = Field(default="active", description="Document status (active, archived, deleted)")
    
    @validator('document_type')
    def validate_document_type(cls, v):
        valid_types = {"contract", "listing", "disclosure", "agreement", "addendum", "other"}
        if v not in valid_types:
            raise ValueError(f"Invalid document type. Must be one of: {valid_types}")
        return v
    
    @validator('status')
    def validate_status(cls, v):
        valid_statuses = {"active", "archived", "deleted"}
        if v not in valid_statuses:
            raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v

class DocumentCreate(DocumentBase):
    """Model for creating a new document."""
    pass

class DocumentUpdate(BaseModel):
    """Model for updating an existing document."""
    title: Optional[str] = None
    description: Optional[str] = None
    document_type: Optional[str] = None
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    
    @validator('document_type')
    def validate_document_type(cls, v):
        if v is not None:
            valid_types = {"contract", "listing", "disclosure", "agreement", "addendum", "other"}
            if v not in valid_types:
                raise ValueError(f"Invalid document type. Must be one of: {valid_types}")
        return v
    
    @validator('status')
    def validate_status(cls, v):
        if v is not None:
            valid_statuses = {"active", "archived", "deleted"}
            if v not in valid_statuses:
                raise ValueError(f"Invalid status. Must be one of: {valid_statuses}")
        return v

class Document(DocumentBase, BaseDBModel):
    """Complete document model with database fields."""
    analyzed: bool = Field(default=False, description="Whether the document has been analyzed")
    analysis_results: Dict[str, Any] = Field(default_factory=dict, description="Results of document analysis")
    last_accessed: Optional[datetime] = Field(None, description="When the document was last accessed")
    version: int = Field(default=1, description="Document version number")
    
class DocumentResponse(Document):
    """Model for document API responses."""
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()}

class DocumentAnalysis(BaseModel):
    """Model for document analysis results."""
    document_id: str = Field(..., description="ID of the analyzed document")
    content_text: str = Field(..., description="Extracted text content")
    entities: Dict[str, Any] = Field(default_factory=dict, description="Extracted entities")
    clauses: List[Dict[str, Any]] = Field(default_factory=list, description="Identified clauses")
    issues: List[Dict[str, Any]] = Field(default_factory=list, description="Identified issues")
    summary: Optional[str] = Field(None, description="Document summary")
    analyzed_at: datetime = Field(default_factory=datetime.utcnow, description="When analysis was performed")
    
    class Config:
        json_encoders = {datetime: lambda v: v.isoformat()} 