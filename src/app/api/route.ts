// ============================================================================
// SOUNDED OUT - STRIPE WEBHOOK HANDLER
// POST /api/webhooks/stripe
// Handles payment confirmations and activates promotions
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

// Use service role for webhook (no user context)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ============================================================================
// INTERFACES
// ============================================================================

interface PromotionMetadata {
  promotion_id: string;
  event_id: string;
  tier_id: string;
  user_id: string;
}

interface ActivationResult {
  success: boolean;
  promotion_id?: string;
  baseline_views?: number;
  baseline_saves?: number;
  error?: string;
}

// ============================================================================
// WEBHOOK HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', errorMessage);
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    );
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.expired':
        await handleCheckoutExpired(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

// ============================================================================
// EVENT HANDLERS
// ============================================================================

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata as unknown as PromotionMetadata;
  
  if (!metadata || !metadata.promotion_id) {
    console.error('Missing promotion_id in session metadata');
    return;
  }

  const promotionId = metadata.promotion_id;
  const paymentIntentId = session.payment_intent as string;

  console.log(`Activating promotion ${promotionId} after successful payment`);

  // Call the activation function
  const { data, error } = await supabase.rpc('activate_promotion', {
    p_promotion_id: promotionId,
    p_stripe_payment_intent_id: paymentIntentId
  });

  if (error) {
    console.error('Failed to activate promotion:', error);
    return;
  }

  const result = data as unknown as ActivationResult;

  if (result.success) {
    console.log(`Promotion ${promotionId} activated successfully`);
    console.log(`Baseline: ${result.baseline_views} views, ${result.baseline_saves} saves`);
    
    // TODO: Send confirmation email to promoter
    // await sendPromotionConfirmationEmail(metadata.user_id, promotionId);
  } else {
    console.error(`Promotion activation failed: ${result.error}`);
  }
}

async function handleCheckoutExpired(session: Stripe.Checkout.Session): Promise<void> {
  const metadata = session.metadata as unknown as PromotionMetadata;
  
  if (!metadata || !metadata.promotion_id) {
    return;
  }

  const promotionId = metadata.promotion_id;

  console.log(`Cancelling expired promotion ${promotionId}`);

  const { error } = await supabase
    .from('event_promotions')
    .update({
      status: 'cancelled',
      payment_status: 'failed',
      updated_at: new Date().toISOString()
    })
    .eq('id', promotionId);

  if (error) {
    console.error('Failed to cancel promotion:', error);
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const metadata = paymentIntent.metadata as unknown as PromotionMetadata;
  
  if (!metadata || !metadata.promotion_id) {
    return;
  }

  const promotionId = metadata.promotion_id;

  console.log(`Marking promotion ${promotionId} as failed`);

  const { error } = await supabase
    .from('event_promotions')
    .update({
      payment_status: 'failed',
      stripe_payment_intent_id: paymentIntent.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', promotionId);

  if (error) {
    console.error('Failed to update promotion:', error);
  }
}

// ============================================================================
// CONFIG: Disable body parsing for Stripe webhook
// ============================================================================

export const config = {
  api: {
    bodyParser: false,
  },
};
