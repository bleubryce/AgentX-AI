from fastapi import APIRouter, Request, HTTPException, status
from typing import Dict, Any
import stripe
from ....core.config import settings
from ....services.payment_service import PaymentService
from ....models.payment import PaymentTransaction
from datetime import datetime

router = APIRouter()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    payment_service: PaymentService = Depends()
) -> Dict[str, Any]:
    """Handle Stripe webhook events."""
    # Get the webhook secret from settings
    webhook_secret = settings.STRIPE_WEBHOOK_SECRET
    
    # Get the raw request body
    payload = await request.body()
    
    # Get the Stripe signature from headers
    sig_header = request.headers.get("stripe-signature")
    
    try:
        # Verify the webhook signature
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid payload"
        )
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid signature"
        )
    
    # Handle the event
    try:
        if event.type == "customer.subscription.created":
            await handle_subscription_created(event.data.object, payment_service)
        elif event.type == "customer.subscription.updated":
            await handle_subscription_updated(event.data.object, payment_service)
        elif event.type == "customer.subscription.deleted":
            await handle_subscription_deleted(event.data.object, payment_service)
        elif event.type == "invoice.paid":
            await handle_invoice_paid(event.data.object, payment_service)
        elif event.type == "invoice.payment_failed":
            await handle_invoice_payment_failed(event.data.object, payment_service)
        elif event.type == "payment_intent.succeeded":
            await handle_payment_intent_succeeded(event.data.object, payment_service)
        elif event.type == "payment_intent.payment_failed":
            await handle_payment_intent_failed(event.data.object, payment_service)
        
        return {"status": "success"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

async def handle_subscription_created(
    subscription: stripe.Subscription,
    payment_service: PaymentService
) -> None:
    """Handle subscription.created event."""
    # Update subscription status in database
    await payment_service.subscriptions_collection.update_one(
        {"stripe_subscription_id": subscription.id},
        {
            "$set": {
                "status": subscription.status,
                "current_period_start": datetime.fromtimestamp(subscription.current_period_start),
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "canceled_at": datetime.fromtimestamp(subscription.canceled_at) if subscription.canceled_at else None,
                "trial_end": datetime.fromtimestamp(subscription.trial_end) if subscription.trial_end else None,
                "quantity": subscription.quantity,
                "updated_at": datetime.utcnow()
            }
        }
    )

async def handle_subscription_updated(
    subscription: stripe.Subscription,
    payment_service: PaymentService
) -> None:
    """Handle subscription.updated event."""
    await handle_subscription_created(subscription, payment_service)

async def handle_subscription_deleted(
    subscription: stripe.Subscription,
    payment_service: PaymentService
) -> None:
    """Handle subscription.deleted event."""
    await payment_service.subscriptions_collection.update_one(
        {"stripe_subscription_id": subscription.id},
        {
            "$set": {
                "status": "canceled",
                "canceled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )

async def handle_invoice_paid(
    invoice: stripe.Invoice,
    payment_service: PaymentService
) -> None:
    """Handle invoice.paid event."""
    # Record the transaction
    await payment_service.record_transaction(
        user_id=invoice.metadata.get("user_id"),
        subscription_id=invoice.subscription,
        amount=invoice.amount_paid / 100,  # Convert from cents
        currency=invoice.currency,
        stripe_payment_intent_id=invoice.payment_intent,
        status="succeeded",
        payment_method=invoice.payment_method_types[0],
        description=f"Invoice payment for {invoice.description}",
        metadata={
            "invoice_id": invoice.id,
            "subscription_id": invoice.subscription,
            "billing_reason": invoice.billing_reason
        }
    )

async def handle_invoice_payment_failed(
    invoice: stripe.Invoice,
    payment_service: PaymentService
) -> None:
    """Handle invoice.payment_failed event."""
    # Update subscription status
    await payment_service.subscriptions_collection.update_one(
        {"stripe_subscription_id": invoice.subscription},
        {
            "$set": {
                "status": "past_due",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # Record the failed transaction
    await payment_service.record_transaction(
        user_id=invoice.metadata.get("user_id"),
        subscription_id=invoice.subscription,
        amount=invoice.amount_due / 100,
        currency=invoice.currency,
        stripe_payment_intent_id=invoice.payment_intent,
        status="failed",
        payment_method=invoice.payment_method_types[0],
        description=f"Failed payment for {invoice.description}",
        metadata={
            "invoice_id": invoice.id,
            "subscription_id": invoice.subscription,
            "billing_reason": invoice.billing_reason,
            "failure_reason": invoice.last_payment_error.get("message") if invoice.last_payment_error else None
        }
    )

async def handle_payment_intent_succeeded(
    payment_intent: stripe.PaymentIntent,
    payment_service: PaymentService
) -> None:
    """Handle payment_intent.succeeded event."""
    # Record the transaction if not already recorded
    if payment_intent.metadata.get("recorded") != "true":
        await payment_service.record_transaction(
            user_id=payment_intent.metadata.get("user_id"),
            subscription_id=payment_intent.metadata.get("subscription_id"),
            amount=payment_intent.amount / 100,
            currency=payment_intent.currency,
            stripe_payment_intent_id=payment_intent.id,
            status="succeeded",
            payment_method=payment_intent.payment_method_types[0],
            description=payment_intent.description,
            metadata={
                "payment_intent_id": payment_intent.id,
                "subscription_id": payment_intent.metadata.get("subscription_id"),
                "recorded": "true"
            }
        )

async def handle_payment_intent_failed(
    payment_intent: stripe.PaymentIntent,
    payment_service: PaymentService
) -> None:
    """Handle payment_intent.payment_failed event."""
    # Record the failed transaction
    await payment_service.record_transaction(
        user_id=payment_intent.metadata.get("user_id"),
        subscription_id=payment_intent.metadata.get("subscription_id"),
        amount=payment_intent.amount / 100,
        currency=payment_intent.currency,
        stripe_payment_intent_id=payment_intent.id,
        status="failed",
        payment_method=payment_intent.payment_method_types[0],
        description=payment_intent.description,
        metadata={
            "payment_intent_id": payment_intent.id,
            "subscription_id": payment_intent.metadata.get("subscription_id"),
            "failure_reason": payment_intent.last_payment_error.get("message") if payment_intent.last_payment_error else None
        }
    ) 