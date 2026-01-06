// ============================================================================
// SOUNDED OUT - PROMOTION CHECKOUT API
// POST /api/promotions/checkout
// Creates a Stripe Checkout session for event promotion
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Stripe from 'stripe';
import type { 
  PromotionTier, 
  EventPromotion,
  CreatePromotionResponse 
} from '@/types/revenue';

// Initialize Stripe lazily (not at build time)
function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-02-24.acacia',
  });
}

// ============================================================================
// INTERFACES
// ============================================================================

interface CheckoutRequestBody {
  event_id: string;
  tier_id: 'boost' | 'featured' | 'spotlight';
}

interface EventData {
  id: string;
  name: string;
  start_time: string;
  venue_id: string;
}

interface AvailabilityResult {
  available: boolean;
  reason?: string;
  slots_used: number;
  slots_max: number;
  slots_remaining?: number;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<CreatePromotionResponse>> {
  try {
    // 1. Get authenticated user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: CheckoutRequestBody = await request.json();
    const { event_id, tier_id } = body;

    if (!event_id || !tier_id) {
      return NextResponse.json(
        { success: false, error: 'Missing event_id or tier_id' },
        { status: 400 }
      );
    }

    // 3. Validate tier exists
    const validTiers: string[] = ['boost', 'featured', 'spotlight'];
    let tierIsValid = false;
    for (let i = 0; i < validTiers.length; i++) {
      if (validTiers[i] === tier_id) {
        tierIsValid = true;
        break;
      }
    }
    
    if (!tierIsValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid tier_id' },
        { status: 400 }
      );
    }

    // 4. Fetch event details
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, name, start_time, venue_id')
      .eq('id', event_id)
      .single();

    if (eventError || !eventData) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const event = eventData as unknown as EventData;

    // 5. Fetch tier details
    const { data: tierData, error: tierError } = await supabase
      .from('promotion_tiers')
      .select('*')
      .eq('id', tier_id)
      .eq('is_active', true)
      .single();

    if (tierError || !tierData) {
      return NextResponse.json(
        { success: false, error: 'Tier not found or inactive' },
        { status: 404 }
      );
    }

    const tier = tierData as unknown as PromotionTier;

    // 6. Check slot availability (SATURATION CONTROL)
    const { data: availabilityData, error: availabilityError } = await supabase
      .rpc('check_promotion_availability', {
        p_event_id: event_id,
        p_tier_id: tier_id
      });

    if (availabilityError) {
      console.error('Availability check error:', availabilityError);
      return NextResponse.json(
        { success: false, error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    const availability = availabilityData as unknown as AvailabilityResult;

    if (!availability.available) {
      return NextResponse.json(
        { 
          success: false, 
          error: availability.reason || 'Promotion slots full for this date' 
        },
        { status: 409 }
      );
    }

    // 7. Calculate promotion dates
    const startsAt = new Date();
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + tier.duration_days);

    // 8. Create pending promotion record
    const { data: promotionData, error: promotionError } = await supabase
      .from('event_promotions')
      .insert({
        event_id: event_id,
        promoter_id: user.id,
        tier_id: tier_id,
        amount_paid_gbp: tier.price_gbp,
        payment_status: 'pending',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single();

    if (promotionError || !promotionData) {
      console.error('Failed to create promotion:', promotionError);
      return NextResponse.json(
        { success: false, error: 'Failed to create promotion' },
        { status: 500 }
      );
    }

    const promotion = promotionData as unknown as EventPromotion;

    // 9. Create Stripe Checkout Session
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    
    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            product_data: {
              name: `${tier.name} Promotion`,
              description: `${tier.duration_days}-day ${tier.name.toLowerCase()} promotion for "${event.name}"`,
              metadata: {
                tier_id: tier_id,
                event_id: event_id,
                promotion_id: promotion.id
              }
            },
            unit_amount: tier.price_gbp,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${baseUrl}/promotions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/event/${event_id}?promotion=cancelled`,
      customer_email: user.email || undefined,
      metadata: {
        promotion_id: promotion.id,
        event_id: event_id,
        tier_id: tier_id,
        user_id: user.id
      }
    });

    // 10. Update promotion with checkout session ID
    await supabase
      .from('event_promotions')
      .update({ stripe_checkout_session_id: session.id })
      .eq('id', promotion.id);

    // 11. Return checkout URL
    return NextResponse.json({
      success: true,
      checkout_url: session.url || undefined,
      promotion_id: promotion.id
    });

  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
