from typing import List, Optional, Dict, Any
from bson import ObjectId
from datetime import datetime

from ...db.mongodb import mongodb_client
from ...models.document import Document, DocumentCreate, DocumentUpdate, DocumentAnalysis

class DocumentRepository:
    """Repository for document operations in MongoDB."""
    
    def __init__(self):
        self.collection = mongodb_client.get_collection("documents")
        self.analysis_collection = mongodb_client.get_collection("document_analyses")
    
    async def create(self, document: DocumentCreate, owner_id: str) -> Document:
        """Create a new document."""
        document_dict = document.dict()
        document_dict["owner_id"] = owner_id
        document_dict["created_at"] = datetime.utcnow()
        document_dict["updated_at"] = document_dict["created_at"]
        
        result = await self.collection.insert_one(document_dict)
        document_dict["_id"] = result.inserted_id
        
        return Document(**document_dict)
    
    async def get(self, document_id: str) -> Optional[Document]:
        """Get a document by ID."""
        document = await self.collection.find_one({"_id": ObjectId(document_id)})
        if document:
            # Update last_accessed
            await self.collection.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": {"last_accessed": datetime.utcnow()}}
            )
            return Document(**document)
        return None
    
    async def update(self, document_id: str, update_data: DocumentUpdate) -> Optional[Document]:
        """Update a document."""
        update_dict = update_data.dict(exclude_unset=True)
        if update_dict:
            update_dict["updated_at"] = datetime.utcnow()
            
            result = await self.collection.update_one(
                {"_id": ObjectId(document_id)},
                {"$set": update_dict}
            )
            
            if result.modified_count:
                return await self.get(document_id)
        return None
    
    async def delete(self, document_id: str) -> bool:
        """Delete a document."""
        result = await self.collection.delete_one({"_id": ObjectId(document_id)})
        return result.deleted_count > 0
    
    async def list(self, 
                  owner_id: Optional[str] = None,
                  document_type: Optional[str] = None,
                  status: Optional[str] = None,
                  tags: Optional[List[str]] = None,
                  related_entity_id: Optional[str] = None,
                  related_entity_type: Optional[str] = None,
                  analyzed: Optional[bool] = None,
                  skip: int = 0,
                  limit: int = 100,
                  sort_by: str = "created_at",
                  sort_order: int = -1) -> List[Document]:
        """List documents with filters."""
        filters = {}
        
        if owner_id:
            filters["owner_id"] = owner_id
        
        if document_type:
            filters["document_type"] = document_type
        
        if status:
            filters["status"] = status
        
        if tags:
            filters["tags"] = {"$all": tags}
        
        if related_entity_id:
            filters["related_entity_id"] = related_entity_id
        
        if related_entity_type:
            filters["related_entity_type"] = related_entity_type
        
        if analyzed is not None:
            filters["analyzed"] = analyzed
        
        cursor = self.collection.find(filters)
        cursor = cursor.sort(sort_by, sort_order).skip(skip).limit(limit)
        
        documents = []
        async for document in cursor:
            documents.append(Document(**document))
        
        return documents
    
    async def count(self,
                   owner_id: Optional[str] = None,
                   document_type: Optional[str] = None,
                   status: Optional[str] = None,
                   tags: Optional[List[str]] = None,
                   related_entity_id: Optional[str] = None,
                   related_entity_type: Optional[str] = None,
                   analyzed: Optional[bool] = None) -> int:
        """Count documents with filters."""
        filters = {}
        
        if owner_id:
            filters["owner_id"] = owner_id
        
        if document_type:
            filters["document_type"] = document_type
        
        if status:
            filters["status"] = status
        
        if tags:
            filters["tags"] = {"$all": tags}
        
        if related_entity_id:
            filters["related_entity_id"] = related_entity_id
        
        if related_entity_type:
            filters["related_entity_type"] = related_entity_type
        
        if analyzed is not None:
            filters["analyzed"] = analyzed
        
        return await self.collection.count_documents(filters)
    
    async def save_analysis(self, analysis: DocumentAnalysis) -> DocumentAnalysis:
        """Save document analysis results."""
        analysis_dict = analysis.dict()
        analysis_dict["created_at"] = datetime.utcnow()
        analysis_dict["updated_at"] = analysis_dict["created_at"]
        
        # Convert document_id to ObjectId if it's a string
        if isinstance(analysis_dict["document_id"], str):
            analysis_dict["document_id"] = ObjectId(analysis_dict["document_id"])
        
        # Check if analysis already exists
        existing = await self.analysis_collection.find_one({"document_id": analysis_dict["document_id"]})
        
        if existing:
            # Update existing analysis
            analysis_dict["_id"] = existing["_id"]
            await self.analysis_collection.replace_one(
                {"_id": existing["_id"]},
                analysis_dict
            )
        else:
            # Create new analysis
            result = await self.analysis_collection.insert_one(analysis_dict)
            analysis_dict["_id"] = result.inserted_id
        
        # Update document to mark as analyzed
        await self.collection.update_one(
            {"_id": analysis_dict["document_id"]},
            {
                "$set": {
                    "analyzed": True,
                    "analysis_results": {
                        "entities": analysis_dict["entities"],
                        "clauses": analysis_dict["clauses"],
                        "issues": analysis_dict["issues"],
                        "summary": analysis_dict["summary"],
                        "analyzed_at": analysis_dict["analyzed_at"]
                    }
                }
            }
        )
        
        return DocumentAnalysis(**analysis_dict)
    
    async def get_analysis(self, document_id: str) -> Optional[DocumentAnalysis]:
        """Get document analysis by document ID."""
        analysis = await self.analysis_collection.find_one({"document_id": ObjectId(document_id)})
        if analysis:
            return DocumentAnalysis(**analysis)
        return None
    
    async def search_by_content(self, query: str, limit: int = 10) -> List[Document]:
        """Search documents by content (requires text index on content_text field)."""
        cursor = self.analysis_collection.find(
            {"$text": {"$search": query}},
            {"score": {"$meta": "textScore"}}
        ).sort([("score", {"$meta": "textScore"})]).limit(limit)
        
        document_ids = []
        async for analysis in cursor:
            document_ids.append(analysis["document_id"])
        
        if not document_ids:
            return []
        
        documents = []
        async for document in self.collection.find({"_id": {"$in": document_ids}}):
            documents.append(Document(**document))
        
        return documents 