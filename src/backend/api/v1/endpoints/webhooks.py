from fastapi import APIRouter, Request, HTTPException, Depends, status, Header
from typing import Dict, Any
import stripe
from ....core.config import settings
from ....services.subscription_service import SubscriptionService
from ....services.payment_service import PaymentService
from ....services.user_service import UserService
from ....core.security import verify_stripe_signature
from ....core.logger import logger

router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(...),
    subscription_service: SubscriptionService = Depends(),
    payment_service: PaymentService = Depends(),
    user_service: UserService = Depends()
) -> Dict[str, str]:
    """Handle Stripe webhook events."""
    try:
        # Get the raw request body for signature verification
        payload = await request.body()
        
        # Verify the webhook signature
        event = verify_stripe_signature(payload, stripe_signature)
        
        # Handle different event types
        if event.type.startswith('customer.subscription'):
            await handle_subscription_event(event, subscription_service)
        elif event.type.startswith('invoice'):
            await handle_invoice_event(event, payment_service, subscription_service)
        elif event.type.startswith('payment_intent'):
            await handle_payment_event(event, payment_service)
            
        return {"status": "success"}
        
    except stripe.error.SignatureVerificationError:
        logger.error("Invalid Stripe webhook signature")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    except Exception as e:
        logger.error(f"Error processing webhook: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error processing webhook"
        )

async def handle_subscription_event(
    event: stripe.Event,
    subscription_service: SubscriptionService
) -> None:
    """Handle subscription-related events."""
    subscription = event.data.object
    
    if event.type == 'customer.subscription.created':
        await subscription_service.sync_subscription(subscription)
        
    elif event.type == 'customer.subscription.updated':
        await subscription_service.sync_subscription(subscription)
        
    elif event.type == 'customer.subscription.deleted':
        await subscription_service.handle_subscription_deleted(subscription)
        
    elif event.type == 'customer.subscription.trial_will_end':
        # Notify user about trial ending in 3 days
        await subscription_service.handle_trial_ending(subscription)

async def handle_invoice_event(
    event: stripe.Event,
    payment_service: PaymentService,
    subscription_service: SubscriptionService
) -> None:
    """Handle invoice-related events."""
    invoice = event.data.object
    
    if event.type == 'invoice.paid':
        await payment_service.handle_successful_payment(
            invoice.payment_intent,
            invoice.subscription
        )
        
    elif event.type == 'invoice.payment_failed':
        await subscription_service.handle_payment_failure(
            invoice.subscription,
            invoice.payment_intent
        )
        
    elif event.type == 'invoice.upcoming':
        # Notify user about upcoming invoice
        await subscription_service.handle_upcoming_invoice(invoice)

async def handle_payment_event(
    event: stripe.Event,
    payment_service: PaymentService
) -> None:
    """Handle payment-related events."""
    payment_intent = event.data.object
    
    if event.type == 'payment_intent.succeeded':
        await payment_service.update_payment_status(
            payment_intent.id,
            'completed',
            payment_intent
        )
        
    elif event.type == 'payment_intent.payment_failed':
        await payment_service.update_payment_status(
            payment_intent.id,
            'failed',
            payment_intent
        )
        
    elif event.type == 'payment_intent.canceled':
        await payment_service.update_payment_status(
            payment_intent.id,
            'cancelled',
            payment_intent
        ) 