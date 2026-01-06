// ============================================================================
// SOUNDED OUT - PROMOTION CHECKOUT
// POST /api/promotions/checkout
// Creates Stripe checkout session for event promotion
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

// ============================================================================
// LAZY INITIALIZATION (prevents build-time errors)
// ============================================================================

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });
}

// ============================================================================
// INTERFACES
// ============================================================================

interface CheckoutRequest {
  event_id: string;
  tier_id: string;
}

interface PromotionTier {
  id: string;
  name: string;
  price_gbp: number;
  duration_days: number;
  features: string[];
}

interface EventData {
  id: string;
  name: string;
  start_time: string;
  venue_id: string;
}

interface AvailabilityResult {
  available: boolean;
  current_count: number;
  max_allowed: number;
  reason?: string;
}

// ============================================================================
// POST - Create Checkout Session
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const body: CheckoutRequest = await request.json();
    const { event_id, tier_id } = body;

    // Validate required fields
    if (!event_id || !tier_id) {
      return NextResponse.json(
        { error: 'event_id and tier_id are required' },
        { status: 400 }
      );
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get tier details
    const { data: tier, error: tierError } = await supabase
      .from('promotion_tiers')
      .select('*')
      .eq('id', tier_id)
      .eq('is_active', true)
      .single();

    if (tierError || !tier) {
      return NextResponse.json(
        { error: 'Invalid or inactive promotion tier' },
        { status: 400 }
      );
    }

    const typedTier = tier as unknown as PromotionTier;

    // Get event details
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, name, start_time, venue_id')
      .eq('id', event_id)
      .single();

    if (eventError || !event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const typedEvent = event as unknown as EventData;

    // Check availability using database function
    const { data: availability, error: availError } = await supabase.rpc(
      'check_promotion_availability',
      { p_event_id: event_id, p_tier_id: tier_id }
    );

    if (availError) {
      console.error('Availability check error:', availError);
      return NextResponse.json(
        { error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    const availResult = availability as unknown as AvailabilityResult;

    if (!availResult.available) {
      return NextResponse.json(
        { 
          error: 'Promotion slot not available',
          reason: availResult.reason,
          current_count: availResult.current_count,
          max_allowed: availResult.max_allowed
        },
        { status: 409 }
      );
    }

    // Calculate promotion dates
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + typedTier.duration_days);

    // Create pending promotion record
    const { data: promotion, error: promoError } = await supabase
      .from('event_promotions')
      .insert({
        event_id: event_id,
        tier_id: tier_id,
        user_id: user.id,
        status: 'pending',
        payment_status: 'pending',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        amount_paid_gbp: typedTier.price_gbp,
      })
      .select('id')
      .single();

    if (promoError || !promotion) {
      console.error('Failed to create promotion:', promoError);
      return NextResponse.json(
        { error: 'Failed to create promotion record' },
        { status: 500 }
      );
    }

    // Create Stripe checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${typedTier.name} - ${typedEvent.name}`,
              description: `${typedTier.duration_days}-day promotion for your event`,
              metadata: {
                tier_id: tier_id,
                event_id: event_id,
              },
            },
            unit_amount: Math.round(typedTier.price_gbp * 100), // Convert to pence
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/promotions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/promotions/cancelled`,
      metadata: {
        promotion_id: promotion.id,
        event_id: event_id,
        tier_id: tier_id,
        user_id: user.id,
      },
      customer_email: user.email,
    });

    // Update promotion with Stripe session ID
    await supabase
      .from('event_promotions')
      .update({ stripe_session_id: session.id })
      .eq('id', promotion.id);

    return NextResponse.json({
      checkout_url: session.url,
      session_id: session.id,
      promotion_id: promotion.id,
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
