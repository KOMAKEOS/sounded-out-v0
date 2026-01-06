// ============================================================================
// SOUNDED OUT - PROMOTION AVAILABILITY API
// GET /api/promotions/availability
// Checks if a promotion slot is available for an event and tier
// Implements SATURATION CONTROL
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PromotionAvailability } from '@/types/revenue';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get('event_id');
    const tierId = searchParams.get('tier_id');

    if (!eventId || !tierId) {
      return NextResponse.json(
        { success: false, error: 'Missing event_id or tier_id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Call the availability check function
    const { data, error } = await supabase.rpc('check_promotion_availability', {
      p_event_id: eventId,
      p_tier_id: tierId
    });

    if (error) {
      console.error('Availability check error:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to check availability' },
        { status: 500 }
      );
    }

    const availability = data as unknown as PromotionAvailability;

    return NextResponse.json({
      success: true,
      availability: availability
    });
  } catch (error) {
    console.error('Availability API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
