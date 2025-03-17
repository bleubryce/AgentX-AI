from typing import Dict, List, Any, Optional
import json

from .base import Agent, AgentMessage, AgentContext
from .nlp_service import NLPService, NLPResult
from ..services.subscription_service import SubscriptionService
from ..services.payment_service import PaymentService
from ..utils.logger import logger
from ..utils.cache import cache


class CustomerSupportAgent(Agent):
    """
    Agent specialized in handling customer support inquiries related to subscriptions.
    Provides assistance with subscription issues, billing questions, and general support.
    """
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        description: str,
        nlp_service: NLPService,
        subscription_service: SubscriptionService,
        payment_service: PaymentService
    ):
        super().__init__(agent_id, name, description)
        self.nlp_service = nlp_service
        self.subscription_service = subscription_service
        self.payment_service = payment_service
        self.capabilities = [
            "subscription_inquiry",
            "billing_inquiry",
            "payment_issue",
            "refund_request",
            "plan_change",
            "cancellation",
            "general_support"
        ]
        logger.info(f"Customer Support Agent {self.name} ({self.agent_id}) initialized")
    
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
            logger.error(f"Error processing message in Customer Support Agent: {str(e)}")
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
        if primary_intent.name == "subscription_inquiry":
            result = await self._handle_subscription_inquiry(primary_intent, context)
        
        elif primary_intent.name == "billing_inquiry":
            result = await self._handle_billing_inquiry(primary_intent, context)
        
        elif primary_intent.name == "payment_issue":
            result = await self._handle_payment_issue(primary_intent, context)
        
        elif primary_intent.name == "refund_request":
            result = await self._handle_refund_request(primary_intent, context)
        
        elif primary_intent.name == "plan_change":
            result = await self._handle_plan_change(primary_intent, context)
        
        elif primary_intent.name == "cancellation":
            result = await self._handle_cancellation(primary_intent, context)
        
        return result
    
    async def _handle_subscription_inquiry(self, intent: Any, context: AgentContext) -> Dict[str, Any]:
        """Handle subscription inquiry intent."""
        if not context.user_id:
            return {"handled": False, "reason": "No user ID in context"}
        
        try:
            # Get the user's active subscription
            subscription = await self.subscription_service.get_active_subscription(context.user_id)
            
            if not subscription:
                return {
                    "handled": True,
                    "data": {"has_subscription": False}
                }
            
            # Get the subscription plan details
            plan = await self.subscription_service.get_plan(subscription.plan_id)
            
            return {
                "handled": True,
                "data": {
                    "has_subscription": True,
                    "subscription": subscription.dict(),
                    "plan": plan.dict() if plan else None
                }
            }
        
        except Exception as e:
            logger.error(f"Error handling subscription inquiry: {str(e)}")
            return {"handled": False, "error": str(e)}
    
    async def _handle_billing_inquiry(self, intent: Any, context: AgentContext) -> Dict[str, Any]:
        """Handle billing inquiry intent."""
        if not context.user_id:
            return {"handled": False, "reason": "No user ID in context"}
        
        try:
            # Get recent payments
            payments = await self.payment_service.list_payments(
                customer_id=context.user_id,
                limit=5
            )
            
            # Get active subscription for billing details
            subscription = await self.subscription_service.get_active_subscription(context.user_id)
            
            return {
                "handled": True,
                "data": {
                    "recent_payments": [payment.dict() for payment in payments],
                    "subscription": subscription.dict() if subscription else None
                }
            }
        
        except Exception as e:
            logger.error(f"Error handling billing inquiry: {str(e)}")
            return {"handled": False, "error": str(e)}
    
    async def _handle_payment_issue(self, intent: Any, context: AgentContext) -> Dict[str, Any]:
        """Handle payment issue intent."""
        # This would involve more complex logic to diagnose and resolve payment issues
        return {"handled": False, "reason": "Payment issue handling not fully implemented"}
    
    async def _handle_refund_request(self, intent: Any, context: AgentContext) -> Dict[str, Any]:
        """Handle refund request intent."""
        # This would involve validating refund eligibility and initiating the process
        return {"handled": False, "reason": "Refund request handling not fully implemented"}
    
    async def _handle_plan_change(self, intent: Any, context: AgentContext) -> Dict[str, Any]:
        """Handle plan change intent."""
        if not context.user_id:
            return {"handled": False, "reason": "No user ID in context"}
        
        try:
            # Get available plans
            plans = await self.subscription_service.list_plans(active_only=True)
            
            # Get current subscription
            subscription = await self.subscription_service.get_active_subscription(context.user_id)
            
            return {
                "handled": True,
                "data": {
                    "available_plans": [plan.dict() for plan in plans],
                    "current_subscription": subscription.dict() if subscription else None
                }
            }
        
        except Exception as e:
            logger.error(f"Error handling plan change: {str(e)}")
            return {"handled": False, "error": str(e)}
    
    async def _handle_cancellation(self, intent: Any, context: AgentContext) -> Dict[str, Any]:
        """Handle cancellation intent."""
        # This would involve providing cancellation information and options
        return {"handled": False, "reason": "Cancellation handling not fully implemented"}
    
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
        You are a helpful customer support agent for a subscription service.
        
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
        if action_name == "get_subscription_details":
            return await self._action_get_subscription_details(parameters, context)
        
        elif action_name == "get_payment_history":
            return await self._action_get_payment_history(parameters, context)
        
        elif action_name == "initiate_refund":
            return await self._action_initiate_refund(parameters, context)
        
        elif action_name == "change_plan":
            return await self._action_change_plan(parameters, context)
        
        elif action_name == "cancel_subscription":
            return await self._action_cancel_subscription(parameters, context)
        
        else:
            return {"success": False, "error": f"Unknown action: {action_name}"}
    
    async def _action_get_subscription_details(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Get subscription details for a user."""
        user_id = parameters.get("user_id") or context.user_id
        if not user_id:
            return {"success": False, "error": "No user ID provided"}
        
        try:
            subscription = await self.subscription_service.get_active_subscription(user_id)
            if not subscription:
                return {"success": True, "has_subscription": False}
            
            plan = await self.subscription_service.get_plan(subscription.plan_id)
            
            return {
                "success": True,
                "has_subscription": True,
                "subscription": subscription.dict(),
                "plan": plan.dict() if plan else None
            }
        
        except Exception as e:
            logger.error(f"Error getting subscription details: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _action_get_payment_history(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Get payment history for a user."""
        user_id = parameters.get("user_id") or context.user_id
        if not user_id:
            return {"success": False, "error": "No user ID provided"}
        
        limit = parameters.get("limit", 5)
        
        try:
            payments = await self.payment_service.list_payments(
                customer_id=user_id,
                limit=limit
            )
            
            return {
                "success": True,
                "payments": [payment.dict() for payment in payments]
            }
        
        except Exception as e:
            logger.error(f"Error getting payment history: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _action_initiate_refund(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Initiate a refund for a payment."""
        payment_id = parameters.get("payment_id")
        if not payment_id:
            return {"success": False, "error": "No payment ID provided"}
        
        reason = parameters.get("reason", "Customer requested refund")
        
        try:
            refund = await self.payment_service.process_refund(
                payment_id=payment_id,
                reason=reason
            )
            
            return {
                "success": True,
                "refund": refund.dict()
            }
        
        except Exception as e:
            logger.error(f"Error initiating refund: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _action_change_plan(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Change a user's subscription plan."""
        user_id = parameters.get("user_id") or context.user_id
        if not user_id:
            return {"success": False, "error": "No user ID provided"}
        
        plan_id = parameters.get("plan_id")
        if not plan_id:
            return {"success": False, "error": "No plan ID provided"}
        
        try:
            # Get the current subscription
            subscription = await self.subscription_service.get_active_subscription(user_id)
            if not subscription:
                return {"success": False, "error": "No active subscription found"}
            
            # Update the subscription with the new plan
            updated_subscription = await self.subscription_service.update_subscription(
                subscription_id=subscription.id,
                update_data={"plan_id": plan_id}
            )
            
            return {
                "success": True,
                "subscription": updated_subscription.dict()
            }
        
        except Exception as e:
            logger.error(f"Error changing plan: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _action_cancel_subscription(self, parameters: Dict[str, Any], context: AgentContext) -> Dict[str, Any]:
        """Cancel a user's subscription."""
        user_id = parameters.get("user_id") or context.user_id
        if not user_id:
            return {"success": False, "error": "No user ID provided"}
        
        end_now = parameters.get("end_now", False)
        reason = parameters.get("reason", "Customer requested cancellation")
        
        try:
            # Get the current subscription
            subscription = await self.subscription_service.get_active_subscription(user_id)
            if not subscription:
                return {"success": False, "error": "No active subscription found"}
            
            # Cancel the subscription
            cancelled_subscription = await self.subscription_service.cancel_subscription(
                subscription_id=subscription.id,
                immediate=end_now,
                reason=reason
            )
            
            return {
                "success": True,
                "subscription": cancelled_subscription.dict(),
                "immediate": end_now
            }
        
        except Exception as e:
            logger.error(f"Error cancelling subscription: {str(e)}")
            return {"success": False, "error": str(e)} 