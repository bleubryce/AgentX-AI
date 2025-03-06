"""
Lead Repository - Handles storage and retrieval of leads
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Union, Any

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LeadRepository")

# Try to import MongoDB client, fall back to file-based storage if not available
try:
    from pymongo import MongoClient
    from pymongo.errors import ConnectionFailure, ServerSelectionTimeoutError
    MONGODB_AVAILABLE = True
except ImportError:
    MONGODB_AVAILABLE = False

class LeadRepository:
    """
    Repository for storing and retrieving leads.
    Falls back to file-based storage if MongoDB is not available.
    """
    
    def __init__(self):
        """Initialize the lead repository"""
        self.db_client = None
        self.db = None
        
        # Try to connect to MongoDB if available
        if MONGODB_AVAILABLE:
            try:
                mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017/real_estate_leads")
                self.db_client = MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)
                self.db_client.server_info()  # Will raise exception if connection fails
                self.db = self.db_client.get_database()
                logger.info("Connected to MongoDB")
            except (ConnectionFailure, ServerSelectionTimeoutError) as e:
                logger.warning(f"Could not connect to MongoDB: {str(e)}")
                self.db_client = None
                self.db = None
        
        # Ensure data directory exists for file-based storage
        if not self.db:
            os.makedirs("data/leads", exist_ok=True)
            logger.info("Using file-based storage for leads")
    
    def save_leads(self, leads: List[Dict], agent_type: str, agent_id: str) -> None:
        """
        Save leads to the repository
        
        Args:
            leads: List of lead dictionaries
            agent_type: Type of agent that generated the leads
            agent_id: ID of the agent that generated the leads
        """
        if not leads:
            logger.warning("No leads to save")
            return
        
        # Add metadata to each lead
        timestamp = datetime.now().isoformat()
        for lead in leads:
            lead["agent_type"] = agent_type
            lead["agent_id"] = agent_id
            lead["created_at"] = timestamp
            lead["updated_at"] = timestamp
            
            # Generate a unique ID if not present
            if "_id" not in lead:
                lead["_id"] = f"{agent_type}_{agent_id}_{timestamp}_{hash(str(lead))}"
        
        # Save to MongoDB if available
        if self.db:
            try:
                collection = self.db.leads
                result = collection.insert_many(leads)
                logger.info(f"Saved {len(result.inserted_ids)} leads to MongoDB")
            except Exception as e:
                logger.error(f"Error saving leads to MongoDB: {str(e)}")
                self._save_to_file(leads, agent_type, agent_id)
        else:
            self._save_to_file(leads, agent_type, agent_id)
    
    def _save_to_file(self, leads: List[Dict], agent_type: str, agent_id: str) -> None:
        """
        Save leads to a JSON file
        
        Args:
            leads: List of lead dictionaries
            agent_type: Type of agent that generated the leads
            agent_id: ID of the agent that generated the leads
        """
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        filename = f"data/leads/{agent_type}_{agent_id}_{timestamp}.json"
        
        try:
            with open(filename, 'w') as f:
                json.dump(leads, f, indent=2)
            logger.info(f"Saved {len(leads)} leads to {filename}")
        except Exception as e:
            logger.error(f"Error saving leads to file: {str(e)}")
    
    def get_leads(self, 
                 agent_type: Optional[str] = None,
                 agent_id: Optional[str] = None,
                 start_date: Optional[str] = None,
                 end_date: Optional[str] = None,
                 limit: int = 100,
                 offset: int = 0,
                 filters: Optional[Dict] = None) -> List[Dict]:
        """
        Get leads from the repository with optional filtering
        
        Args:
            agent_type: Filter by agent type
            agent_id: Filter by agent ID
            start_date: Filter by created_at >= start_date (ISO format)
            end_date: Filter by created_at <= end_date (ISO format)
            limit: Maximum number of leads to return
            offset: Number of leads to skip
            filters: Additional filters to apply
            
        Returns:
            leads: List of lead dictionaries
        """
        # Build query
        query = {}
        if agent_type:
            query["agent_type"] = agent_type
        if agent_id:
            query["agent_id"] = agent_id
        
        date_query = {}
        if start_date:
            date_query["$gte"] = start_date
        if end_date:
            date_query["$lte"] = end_date
        if date_query:
            query["created_at"] = date_query
        
        if filters:
            query.update(filters)
        
        # Query MongoDB if available
        if self.db:
            try:
                collection = self.db.leads
                cursor = collection.find(query).skip(offset).limit(limit)
                leads = list(cursor)
                logger.info(f"Retrieved {len(leads)} leads from MongoDB")
                return leads
            except Exception as e:
                logger.error(f"Error retrieving leads from MongoDB: {str(e)}")
                return self._get_from_files(query, limit, offset)
        else:
            return self._get_from_files(query, limit, offset)
    
    def _get_from_files(self, query: Dict, limit: int, offset: int) -> List[Dict]:
        """
        Get leads from JSON files with filtering
        
        Args:
            query: Filter query
            limit: Maximum number of leads to return
            offset: Number of leads to skip
            
        Returns:
            leads: List of lead dictionaries
        """
        all_leads = []
        
        # List all lead files
        lead_files = [f for f in os.listdir("data/leads") if f.endswith(".json")]
        
        # Filter files by agent_type and agent_id if in query
        if "agent_type" in query or "agent_id" in query:
            filtered_files = []
            for file in lead_files:
                parts = file.split("_")
                if "agent_type" in query and parts[0] != query["agent_type"]:
                    continue
                if "agent_id" in query and parts[1] != query["agent_id"]:
                    continue
                filtered_files.append(file)
            lead_files = filtered_files
        
        # Load leads from files
        for file in lead_files:
            try:
                with open(f"data/leads/{file}", 'r') as f:
                    file_leads = json.load(f)
                
                # Apply filters
                for lead in file_leads:
                    if self._matches_query(lead, query):
                        all_leads.append(lead)
            except Exception as e:
                logger.error(f"Error reading leads from {file}: {str(e)}")
        
        # Apply date sorting (newest first)
        all_leads.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        
        # Apply pagination
        paginated_leads = all_leads[offset:offset + limit]
        logger.info(f"Retrieved {len(paginated_leads)} leads from files")
        
        return paginated_leads
    
    def _matches_query(self, lead: Dict, query: Dict) -> bool:
        """
        Check if a lead matches a query
        
        Args:
            lead: Lead dictionary
            query: Query dictionary
            
        Returns:
            matches: True if the lead matches the query
        """
        for key, value in query.items():
            if key not in lead:
                return False
            
            if isinstance(value, dict):
                # Handle operators like $gte, $lte
                for op, op_value in value.items():
                    if op == "$gte" and lead[key] < op_value:
                        return False
                    elif op == "$lte" and lead[key] > op_value:
                        return False
                    elif op == "$eq" and lead[key] != op_value:
                        return False
                    elif op == "$ne" and lead[key] == op_value:
                        return False
            elif lead[key] != value:
                return False
        
        return True
    
    def update_lead(self, lead_id: str, updates: Dict) -> bool:
        """
        Update a lead in the repository
        
        Args:
            lead_id: ID of the lead to update
            updates: Dictionary of fields to update
            
        Returns:
            success: True if the update was successful
        """
        updates["updated_at"] = datetime.now().isoformat()
        
        # Update in MongoDB if available
        if self.db:
            try:
                collection = self.db.leads
                result = collection.update_one({"_id": lead_id}, {"$set": updates})
                success = result.modified_count > 0
                logger.info(f"Updated lead {lead_id} in MongoDB: {success}")
                return success
            except Exception as e:
                logger.error(f"Error updating lead in MongoDB: {str(e)}")
                return self._update_in_file(lead_id, updates)
        else:
            return self._update_in_file(lead_id, updates)
    
    def _update_in_file(self, lead_id: str, updates: Dict) -> bool:
        """
        Update a lead in JSON files
        
        Args:
            lead_id: ID of the lead to update
            updates: Dictionary of fields to update
            
        Returns:
            success: True if the update was successful
        """
        lead_files = [f for f in os.listdir("data/leads") if f.endswith(".json")]
        
        for file in lead_files:
            try:
                file_path = f"data/leads/{file}"
                with open(file_path, 'r') as f:
                    leads = json.load(f)
                
                # Find and update the lead
                updated = False
                for lead in leads:
                    if lead.get("_id") == lead_id:
                        lead.update(updates)
                        updated = True
                        break
                
                if updated:
                    with open(file_path, 'w') as f:
                        json.dump(leads, f, indent=2)
                    logger.info(f"Updated lead {lead_id} in {file}")
                    return True
            except Exception as e:
                logger.error(f"Error updating lead in {file}: {str(e)}")
        
        logger.warning(f"Lead {lead_id} not found in any file")
        return False
    
    def delete_lead(self, lead_id: str) -> bool:
        """
        Delete a lead from the repository
        
        Args:
            lead_id: ID of the lead to delete
            
        Returns:
            success: True if the deletion was successful
        """
        # Delete from MongoDB if available
        if self.db:
            try:
                collection = self.db.leads
                result = collection.delete_one({"_id": lead_id})
                success = result.deleted_count > 0
                logger.info(f"Deleted lead {lead_id} from MongoDB: {success}")
                return success
            except Exception as e:
                logger.error(f"Error deleting lead from MongoDB: {str(e)}")
                return self._delete_from_file(lead_id)
        else:
            return self._delete_from_file(lead_id)
    
    def _delete_from_file(self, lead_id: str) -> bool:
        """
        Delete a lead from JSON files
        
        Args:
            lead_id: ID of the lead to delete
            
        Returns:
            success: True if the deletion was successful
        """
        lead_files = [f for f in os.listdir("data/leads") if f.endswith(".json")]
        
        for file in lead_files:
            try:
                file_path = f"data/leads/{file}"
                with open(file_path, 'r') as f:
                    leads = json.load(f)
                
                # Find and remove the lead
                original_count = len(leads)
                leads = [lead for lead in leads if lead.get("_id") != lead_id]
                
                if len(leads) < original_count:
                    with open(file_path, 'w') as f:
                        json.dump(leads, f, indent=2)
                    logger.info(f"Deleted lead {lead_id} from {file}")
                    return True
            except Exception as e:
                logger.error(f"Error deleting lead from {file}: {str(e)}")
        
        logger.warning(f"Lead {lead_id} not found in any file")
        return False
    
    def get_lead_count(self, agent_type: Optional[str] = None, agent_id: Optional[str] = None) -> int:
        """
        Get the count of leads for a specific agent
        
        Args:
            agent_type: Filter by agent type
            agent_id: Filter by agent ID
            
        Returns:
            count: Number of leads
        """
        query = {}
        if agent_type:
            query["agent_type"] = agent_type
        if agent_id:
            query["agent_id"] = agent_id
        
        # Count in MongoDB if available
        if self.db:
            try:
                collection = self.db.leads
                count = collection.count_documents(query)
                return count
            except Exception as e:
                logger.error(f"Error counting leads in MongoDB: {str(e)}")
                return self._count_in_files(query)
        else:
            return self._count_in_files(query)
    
    def _count_in_files(self, query: Dict) -> int:
        """
        Count leads in JSON files with filtering
        
        Args:
            query: Filter query
            
        Returns:
            count: Number of leads
        """
        count = 0
        lead_files = [f for f in os.listdir("data/leads") if f.endswith(".json")]
        
        # Filter files by agent_type and agent_id if in query
        if "agent_type" in query or "agent_id" in query:
            filtered_files = []
            for file in lead_files:
                parts = file.split("_")
                if "agent_type" in query and parts[0] != query["agent_type"]:
                    continue
                if "agent_id" in query and parts[1] != query["agent_id"]:
                    continue
                filtered_files.append(file)
            lead_files = filtered_files
        
        # Count leads in files
        for file in lead_files:
            try:
                with open(f"data/leads/{file}", 'r') as f:
                    file_leads = json.load(f)
                
                # Apply filters
                for lead in file_leads:
                    if self._matches_query(lead, query):
                        count += 1
            except Exception as e:
                logger.error(f"Error counting leads in {file}: {str(e)}")
        
        return count 