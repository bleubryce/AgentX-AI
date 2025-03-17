from typing import Dict, List, Any, Optional
import json
from datetime import datetime, timedelta

from .base import Agent, AgentMessage, AgentContext
from .nlp_service import NLPService, NLPResult
from ..services.lead_service import LeadService
from ..services.user_service import UserService
from ..utils.logger import logger
from ..utils.cache import cache


class LeadGenerationAgent(Agent):
    """
    Agent specialized in lead generation, qualification, and management.
    Handles lead capture, qualification, follow-up sequences, and provides lead insights.
    """
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        description: str,
        nlp_service: NLPService,
        lead_service: LeadService,
        user_service: UserService
    ):
        super().__init__(agent_id, name, description)
        self.nlp_service = nlp_service
        self.lead_service = lead_service
        self.user_service = user_service
        self.capabilities = [
            "lead_capture",
            "lead_qualification",
            "follow_up_scheduling",
            "lead_insights",
            "lead_assignment",
            "lead_nurturing",
            "lead_conversion_tracking"
        ]
        logger.info(f"Lead Generation Agent {self.name} ({self.agent_id}) initialized")
    
    async def process_message(self, message: AgentMessage, context: AgentContext) -> AgentMessage:
        """Process an incoming message and generate a response."""
        try:
            # Process the message text with NLP
            message_text = message.content.get("text", "")
            nlp_result = await self.nlp_service.process_text(message_text, {
                "user_id": context.user_id,
                "session_id": context.session_id,
                "capabilities": self.capabilities
            })
            
            # Determine the appropriate action based on intents
            action_result = await self._handle_intents(nlp_result, context)
            
            # Generate a response
            response_text = await self._generate_response(nlp_result, action_result, context)
            
            # Create and return the response message
            response = AgentMessage(
                sender_id=self.agent_id,
                receiver_id=message.sender_id,
                content={"text": response_text, "action_result": action_result},
                message_type="text",
                metadata={"intents": [intent.dict() for intent in nlp_result.intents]}
            )
            
            return response
        
        except Exception as e:
            logger.error(f"Error processing message in Lead Generation Agent: {str(e)}")
            # Return a fallback response in case of error
            return AgentMessage(
                sender_id=self.agent_id,
                receiver_id=message.sender_id,
                content={"text": "I'm sorry, I encountered an error while processing your request. Please try again later."},
                message_type="text",
                metadata={"error": str(e)}
            )
    
    async def _handle_intents(self, nlp_result: NLPResult, context: AgentContext) -> Dict[str, Any]:
        """Handle the detected intents and perform appropriate actions."""
        result = {"handled": False, "data": {}}
        
        # Get the primary intent (highest confidence)
        primary_intent = None
        if nlp_result.intents:
            primary_intent = max(nlp_result.intents, key=lambda x: x.confidence)
        
        if not primary_intent:
            return result
        
        # Handle different intent types
        if primary_intent.name == "lead_capture":
            result = await self._handle_lead_capture(primary_intent, nlp_result.entities, context)
        
        elif primary_intent.name == "lead_qualification":
            result = await self._handle_lead_qualification(primary_intent, nlp_result.entities, context)
        
        elif primary_intent.name == "follow_up_scheduling":
            result = await self._handle_follow_up_scheduling(primary_intent, nlp_result.entities, context)
        
        elif primary_intent.name == "lead_insights":
            result = await self._handle_lead_insights(primary_intent, nlp_result.entities, context)
        
        elif primary_intent.name == "lead_assignment":
            result = await self._handle_lead_assignment(primary_intent, nlp_result.entities, context)
        
        return result
    
    async def _handle_lead_capture(self, intent: Any, entities: List[Any], context: AgentContext) -> Dict[str, Any]:
        """Handle lead capture intent by extracting lead information and creating a new lead."""
        try:
            # Extract lead information from entities
            lead_info = self._extract_lead_info_from_entities(entities)
            
            if not lead_info.get("email") and not lead_info.get("phone"):
                return {
                    "handled": False,
                    "reason": "Insufficient contact information. Need email or phone."
                }
            
            # Create the lead
            lead = await self.lead_service.create_lead(lead_info)
            
            return {
                "handled": True,
                "data": {
                    "lead_id": lead.id,
                    "lead_info": lead.dict(),
                    "action": "created"
                }
            }
        
        except Exception as e:
            logger.error(f"Error handling lead capture: {str(e)}")
            return {"handled": False, "error": str(e)}
    
    def _extract_lead_info_from_entities(self, entities: List[Any]) -> Dict[str, Any]:
        """Extract lead information from NLP entities."""
        lead_info = {
            "source": "ai_agent",
            "status": "new",
            "created_at": datetime.utcnow().isoformat()
        }
        
        for entity in entities:
            if entity.type == "person_name":
                lead_info["name"] = entity.value
            elif entity.type == "email":
                lead_info["email"] = entity.value
            elif entity.type == "phone":
                lead_info["phone"] = entity.value
            elif entity.type == "address":
                lead_info["address"] = entity.value
            elif entity.type == "property_type":
                lead_info["property_type"] = entity.value
            elif entity.type == "budget":
                lead_info["budget"] = entity.value
            elif entity.type == "timeframe":
                lead_info["timeframe"] = entity.value
            elif entity.type == "lead_source":
                lead_info["source"] = entity.value
        
        return lead_info
    
    async def _handle_lead_qualification(self, intent: Any, entities: List[Any], context: AgentContext) -> Dict[str, Any]:
        """Handle lead qualification intent by updating lead qualification status."""
        try:
            # Extract lead ID and qualification information
            lead_id = None
            qualification_info = {}
            
            for entity in entities:
                if entity.type == "lead_id":
                    lead_id = entity.value
                elif entity.type == "qualification_status":
                    qualification_info["qualification_status"] = entity.value
                elif entity.type == "qualification_score":
                    qualification_info["qualification_score"] = entity.value
                elif entity.type == "budget_qualification":
                    qualification_info["budget_qualification"] = entity.value
                elif entity.type == "timeline_qualification":
                    qualification_info["timeline_qualification"] = entity.value
                elif entity.type == "motivation_level":
                    qualification_info["motivation_level"] = entity.value
            
            if not lead_id:
                return {
                    "handled": False,
                    "reason": "No lead ID provided for qualification"
                }
            
            # Get the lead
            lead = await self.lead_service.get_lead(lead_id)
            if not lead:
                return {
                    "handled": False,
                    "reason": f"Lead with ID {lead_id} not found"
                }
            
            # Update the lead with qualification information
            updated_lead = await self.lead_service.update_lead(
                lead_id=lead_id,
                update_data=qualification_info
            )
            
            return {
                "handled": True,
                "data": {
                    "lead_id": lead_id,
                    "qualification_info": qualification_info,
                    "updated_lead": updated_lead.dict(),
                    "action": "qualified"
                }
            }
        
        except Exception as e:
            logger.error(f"Error handling lead qualification: {str(e)}")
            return {"handled": False, "error": str(e)}
    
    async def _handle_follow_up_scheduling(self, intent: Any, entities: List[Any], context: AgentContext) -> Dict[str, Any]:
        """Handle follow-up scheduling intent by creating follow-up tasks."""
        try:
            # Extract lead ID and follow-up information
            lead_id = None
            follow_up_info = {
                "created_by": context.user_id or "ai_agent",
                "created_at": datetime.utcnow().isoformat()
            }
            
            for entity in entities:
                if entity.type == "lead_id":
                    lead_id = entity.value
                elif entity.type == "follow_up_date":
                    follow_up_info["scheduled_date"] = entity.value
                elif entity.type == "follow_up_type":
                    follow_up_info["type"] = entity.value
                elif entity.type == "follow_up_method":
                    follow_up_info["method"] = entity.value
                elif entity.type == "follow_up_notes":
                    follow_up_info["notes"] = entity.value
            
            if not lead_id:
                return {
                    "handled": False,
                    "reason": "No lead ID provided for follow-up scheduling"
                }
            
            # Get the lead
            lead = await self.lead_service.get_lead(lead_id)
            if not lead:
                return {
                    "handled": False,
                    "reason": f"Lead with ID {lead_id} not found"
                }
            
            # If no specific date was provided, default to tomorrow
            if "scheduled_date" not in follow_up_info:
                tomorrow = datetime.utcnow() + timedelta(days=1)
                follow_up_info["scheduled_date"] = tomorrow.isoformat()
            
            # Create the follow-up task
            follow_up = await self.lead_service.create_follow_up(
                lead_id=lead_id,
                follow_up_data=follow_up_info
            )
            
            return {
                "handled": True,
                "data": {
                    "lead_id": lead_id,
                    "follow_up_id": follow_up.id,
                    "follow_up_info": follow_up.dict(),
                    "action": "scheduled_follow_up"
                }
            }
        
        except Exception as e:
            logger.error(f"Error handling follow-up scheduling: {str(e)}")
            return {"handled": False, "error": str(e)}
    
    async def _handle_lead_insights(self, intent: Any, entities: List[Any], context: AgentContext) -> Dict[str, Any]:
        """Handle lead insights intent by retrieving and analyzing lead data."""
        try:
            # Extract parameters for insights
            params = {
                "period": "30d",  # Default to last 30 days
                "lead_id": None,
                "source": None,
                "status": None
            }
            
            for entity in entities:
                if entity.type == "lead_id":
                    params["lead_id"] = entity.value
                elif entity.type == "time_period":
                    params["period"] = entity.value
                elif entity.type == "lead_source":
                    params["source"] = entity.value
                elif entity.type == "lead_status":
                    params["status"] = entity.value
            
            # Get lead insights based on parameters
            insights = await self.lead_service.get_lead_insights(params)
            
            return {
                "handled": True,
                "data": {
                    "insights": insights,
                    "parameters": params,
                    "action": "retrieved_insights"
                }
            }
        
        except Exception as e:
            logger.error(f"Error handling lead insights: {str(e)}")
            return {"handled": False, "error": str(e)}
    
    async def _handle_lead_assignment(self, intent: Any, entities: List[Any], context: AgentContext) -> Dict[str, Any]:
        """Handle lead assignment intent by assigning leads to agents."""
        try:
            # Extract lead ID and agent ID
            lead_id = None
            agent_id = None
            
            for entity in entities:
                if entity.type == "lead_id":
                    lead_id = entity.value
                elif entity.type == "agent_id" or entity.type == "user_id":
                    agent_id = entity.value
            
            if not lead_id:
                return {
                    "handled": False,
                    "reason": "No lead ID provided for assignment"
                }
            
            if not agent_id:
                # If no specific agent was mentioned, try to find the best match
                agent_id = await self._find_best_agent_for_lead(lead_id)
            
            if not agent_id:
                return {
                    "handled": False,
                    "reason": "Could not determine an agent for assignment"
                }
            
            # Assign the lead to the agent
            assignment = await self.lead_service.assign_lead(
                lead_id=lead_id,
                agent_id=agent_id,
                assigned_by=context.user_id or "ai_agent"
            )
            
            # Get agent information
            agent = await self.user_service.get_user(agent_id)
            
            return {
                "handled": True,
                "data": {
                    "lead_id": lead_id,
                    "agent_id": agent_id,
                    "agent_name": agent.name if agent else "Unknown",
                    "assignment": assignment.dict(),
                    "action": "assigned_lead"
                }
            }
        
        except Exception as e:
            logger.error(f"Error handling lead assignment: {str(e)}")
            return {"handled": False, "error": str(e)}
    
    async def _find_best_agent_for_lead(self, lead_id: str) -> Optional[str]:
        """Find the best agent to handle a specific lead based on expertise and workload."""
        try:
            # Get the lead
            lead = await self.lead_service.get_lead(lead_id)
            if not lead:
                return None
            
            # Get available agents
            agents = await self.user_service.list_users(role="agent", status="active")
            if not agents:
                return None
            
            # This would be a more sophisticated algorithm in a real implementation
            # For now, we'll just return the agent with the fewest active leads
            agent_loads = await self.lead_service.get_agent_lead_counts()
            
            best_agent = None
            lowest_load = float('inf')
            
            for agent in agents:
                agent_id = str(agent.id)
                load = agent_loads.get(agent_id, 0)
                
                if load < lowest_load:
                    lowest_load = load
                    best_agent = agent_id
            
            return best_agent
        
        except Exception as e:
            logger.error(f"Error finding best agent for lead: {str(e)}")
            return None
    
    async def _generate_response(self, nlp_result: NLPResult, action_result: Dict[str, Any], context: AgentContext) -> str:
        """Generate a natural language response based on the NLP result and action result."""
        # Prepare context for response generation
        response_context = {
            "intents": [intent.dict() for intent in nlp_result.intents],
            "entities": [entity.dict() for entity in nlp_result.entities],
            "action_result": action_result,
            "user_id": context.user_id
        }
        
        # Get the primary intent
        primary_intent = None
        if nlp_result.intents:
            primary_intent = max(nlp_result.intents, key=lambda x: x.confidence)
        
        # Create a prompt based on the intent and action result
        prompt = self._create_response_prompt(nlp_result.text, primary_intent, action_result)
        
        # Generate the response
        response = await self.nlp_service.generate_response(prompt, response_context)
        return response
    
    def _create_response_prompt(self, user_message: str, primary_intent: Any, action_result: Dict[str, Any]) -> str:
        """Create a prompt for response generation based on the intent and action result."""
        intent_name = primary_intent.name if primary_intent else "unknown"
        
        prompt = f"""
        You are a helpful lead generation assistant for real estate professionals.
        
        User message: "{user_message}"
        
        Intent detected: {intent_name}
        
        Action result: {json.dumps(action_result, indent=2)}
        
        Based on the above information, provide a helpful, concise, and friendly response to the user.
        If the action was not handled successfully, apologize and offer alternative assistance.
        If the action was successful, provide the relevant information in a clear and organized way.
        """
        
        return prompt
    
    async def perform_action(self, action_name: str, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Perform a specific action with the given parameters."""
        if action_name == "create_lead":
            return await self._action_create_lead(parameters, context)
        
        elif action_name == "qualify_lead":
            return await self._action_qualify_lead(parameters, context)
        
        elif action_name == "schedule_follow_up":
            return await self._action_schedule_follow_up(parameters, context)
        
        elif action_name == "get_lead_insights":
            return await self._action_get_lead_insights(parameters, context)
        
        elif action_name == "assign_lead":
            return await self._action_assign_lead(parameters, context)
        
        elif action_name == "get_lead_details":
            return await self._action_get_lead_details(parameters, context)
        
        else:
            return {"success": False, "error": f"Unknown action: {action_name}"}
    
    async def _action_create_lead(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Create a new lead with the provided information."""
        try:
            # Validate required parameters
            if not parameters.get("name") and not parameters.get("email") and not parameters.get("phone"):
                return {
                    "success": False,
                    "error": "Insufficient lead information. Need at least name, email, or phone."
                }
            
            # Add metadata
            lead_info = {
                **parameters,
                "source": parameters.get("source", "ai_agent"),
                "status": parameters.get("status", "new"),
                "created_at": datetime.utcnow().isoformat()
            }
            
            # Create the lead
            lead = await self.lead_service.create_lead(lead_info)
            
            return {
                "success": True,
                "lead_id": lead.id,
                "lead": lead.dict()
            }
        
        except Exception as e:
            logger.error(f"Error creating lead: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _action_qualify_lead(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Qualify a lead with the provided qualification information."""
        try:
            lead_id = parameters.get("lead_id")
            if not lead_id:
                return {"success": False, "error": "No lead ID provided"}
            
            # Extract qualification information
            qualification_info = {k: v for k, v in parameters.items() if k != "lead_id"}
            
            # Update the lead
            updated_lead = await self.lead_service.update_lead(
                lead_id=lead_id,
                update_data=qualification_info
            )
            
            return {
                "success": True,
                "lead_id": lead_id,
                "updated_lead": updated_lead.dict()
            }
        
        except Exception as e:
            logger.error(f"Error qualifying lead: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _action_schedule_follow_up(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Schedule a follow-up for a lead."""
        try:
            lead_id = parameters.get("lead_id")
            if not lead_id:
                return {"success": False, "error": "No lead ID provided"}
            
            # Extract follow-up information
            follow_up_info = {
                k: v for k, v in parameters.items() if k != "lead_id"
            }
            
            # Add metadata
            follow_up_info.update({
                "created_by": context.user_id or "ai_agent",
                "created_at": datetime.utcnow().isoformat()
            })
            
            # Create the follow-up
            follow_up = await self.lead_service.create_follow_up(
                lead_id=lead_id,
                follow_up_data=follow_up_info
            )
            
            return {
                "success": True,
                "lead_id": lead_id,
                "follow_up_id": follow_up.id,
                "follow_up": follow_up.dict()
            }
        
        except Exception as e:
            logger.error(f"Error scheduling follow-up: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _action_get_lead_insights(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Get insights about leads based on parameters."""
        try:
            # Get insights
            insights = await self.lead_service.get_lead_insights(parameters)
            
            return {
                "success": True,
                "insights": insights,
                "parameters": parameters
            }
        
        except Exception as e:
            logger.error(f"Error getting lead insights: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _action_assign_lead(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Assign a lead to an agent."""
        try:
            lead_id = parameters.get("lead_id")
            agent_id = parameters.get("agent_id")
            
            if not lead_id:
                return {"success": False, "error": "No lead ID provided"}
            
            if not agent_id:
                # Try to find the best agent
                agent_id = await self._find_best_agent_for_lead(lead_id)
                
                if not agent_id:
                    return {"success": False, "error": "Could not determine an agent for assignment"}
            
            # Assign the lead
            assignment = await self.lead_service.assign_lead(
                lead_id=lead_id,
                agent_id=agent_id,
                assigned_by=context.user_id or "ai_agent"
            )
            
            # Get agent information
            agent = await self.user_service.get_user(agent_id)
            
            return {
                "success": True,
                "lead_id": lead_id,
                "agent_id": agent_id,
                "agent_name": agent.name if agent else "Unknown",
                "assignment": assignment.dict()
            }
        
        except Exception as e:
            logger.error(f"Error assigning lead: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _action_get_lead_details(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Get detailed information about a lead."""
        try:
            lead_id = parameters.get("lead_id")
            if not lead_id:
                return {"success": False, "error": "No lead ID provided"}
            
            # Get the lead
            lead = await self.lead_service.get_lead(lead_id)
            if not lead:
                return {"success": False, "error": f"Lead with ID {lead_id} not found"}
            
            # Get follow-ups
            follow_ups = await self.lead_service.get_lead_follow_ups(lead_id)
            
            # Get activities
            activities = await self.lead_service.get_lead_activities(lead_id)
            
            return {
                "success": True,
                "lead": lead.dict(),
                "follow_ups": [f.dict() for f in follow_ups],
                "activities": [a.dict() for a in activities]
            }
        
        except Exception as e:
            logger.error(f"Error getting lead details: {str(e)}")
            return {"success": False, "error": str(e)} 