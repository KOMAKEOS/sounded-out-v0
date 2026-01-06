// ============================================================================
// SOUNDED OUT - PROMOTION TIERS API
// GET /api/promotions/tiers
// Returns all active promotion tiers
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PromotionTier } from '@/types/revenue';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('promotion_tiers')
      .select('*')
      .eq('is_active', true)
      .order('price_gbp', { ascending: true });

    if (error) {
      console.error('Failed to fetch tiers:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch tiers' },
        { status: 500 }
      );
    }

    const tiers = data as unknown as PromotionTier[];

    return NextResponse.json({
      success: true,
      tiers: tiers
    });
  } catch (error) {
    console.error('Tiers API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
