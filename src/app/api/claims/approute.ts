// ============================================================================
// SOUNDED OUT - PROMOTION DETAIL API
// GET /api/promotions/[id]
// Returns details of a specific promotion
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing promotion ID' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch promotion with related data
    const { data, error } = await supabase
      .from('event_promotions')
      .select(`
        *,
        tier:promotion_tiers(*),
        event:events(id, name, start_time)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Failed to fetch promotion:', error);
      return NextResponse.json(
        { success: false, error: 'Promotion not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (data.promoter_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Not authorized to view this promotion' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      promotion: data
    });
  } catch (error) {
    console.error('Promotion detail API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
