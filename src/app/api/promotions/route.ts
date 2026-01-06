// ============================================================================
// SOUNDED OUT - MY PROMOTIONS API
// GET /api/promotions/my
// Returns all promotions for the authenticated user
// ============================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user's promotions with related data
    const { data, error } = await supabase
      .from('event_promotions')
      .select(`
        *,
        tier:promotion_tiers(*),
        event:events(id, name, start_time)
      `)
      .eq('promoter_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch promotions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch promotions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      promotions: data || []
    });
  } catch (error) {
    console.error('My promotions API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
