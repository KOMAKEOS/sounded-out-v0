// ============================================================================
// SOUNDED OUT - CLAIMS API
// POST /api/claims
// Handles venue and event claim submissions
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { 
  VenueClaim, 
  EventClaim,
  CreateClaimRequest,
  CreateClaimResponse 
} from '@/types/revenue';

// ============================================================================
// INTERFACES
// ============================================================================

interface VenueData {
  id: string;
  name: string;
}

interface EventData {
  id: string;
  name: string;
  venue_id: string;
}

// ============================================================================
// POST - Create a new claim
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse<CreateClaimResponse>> {
  try {
    // 1. Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: CreateClaimRequest = await request.json();
    const { type, target_id, verification_method, verification_proof } = body;

    // 3. Validate request
    if (!type || !target_id) {
      return NextResponse.json(
        { success: false, error: 'Missing type or target_id' },
        { status: 400 }
      );
    }

    if (type !== 'venue' && type !== 'event') {
      return NextResponse.json(
        { success: false, error: 'Invalid claim type' },
        { status: 400 }
      );
    }

    // 4. Route to appropriate handler
    if (type === 'venue') {
      return handleVenueClaim(supabase, user.id, target_id, verification_method, verification_proof);
    } else {
      return handleEventClaim(supabase, user.id, target_id, verification_method, verification_proof);
    }

  } catch (error) {
    console.error('Claims error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// VENUE CLAIM HANDLER
// ============================================================================

async function handleVenueClaim(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  venueId: string,
  verificationMethod: string,
  verificationProof: string
): Promise<NextResponse<CreateClaimResponse>> {
  
  // 1. Check venue exists
  const { data: venueData, error: venueError } = await supabase
    .from('venues')
    .select('id, name')
    .eq('id', venueId)
    .single();

  if (venueError || !venueData) {
    return NextResponse.json(
      { success: false, error: 'Venue not found' },
      { status: 404 }
    );
  }

  // 2. Check for existing claim
  const { data: existingClaim } = await supabase
    .from('venue_claims')
    .select('id, claimed_by, verification_status')
    .eq('venue_id', venueId)
    .single();

  if (existingClaim) {
    const claim = existingClaim as unknown as VenueClaim;
    
    if (claim.claimed_by === userId) {
      return NextResponse.json(
        { success: false, error: 'You have already claimed this venue', status: claim.verification_status },
        { status: 409 }
      );
    }
    
    if (claim.verification_status === 'verified') {
      return NextResponse.json(
        { success: false, error: 'This venue is already claimed by another user' },
        { status: 409 }
      );
    }
  }

  // 3. Validate verification method
  const validMethods: string[] = ['email', 'website', 'instagram', 'manual'];
  let methodIsValid = false;
  for (let i = 0; i < validMethods.length; i++) {
    if (validMethods[i] === verificationMethod) {
      methodIsValid = true;
      break;
    }
  }

  if (!methodIsValid) {
    return NextResponse.json(
      { success: false, error: 'Invalid verification method' },
      { status: 400 }
    );
  }

  // 4. Create claim
  const { data: claimData, error: claimError } = await supabase
    .from('venue_claims')
    .insert({
      venue_id: venueId,
      claimed_by: userId,
      verification_method: verificationMethod,
      verification_proof: verificationProof,
      verification_status: 'pending',
      can_edit_venue: true,
      can_manage_events: true,
      can_add_team_members: false,
      is_active: true
    })
    .select()
    .single();

  if (claimError) {
    console.error('Failed to create venue claim:', claimError);
    
    if (claimError.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'This venue is already claimed' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create claim' },
      { status: 500 }
    );
  }

  const claim = claimData as unknown as VenueClaim;

  return NextResponse.json({
    success: true,
    claim_id: claim.id,
    status: 'pending'
  });
}

// ============================================================================
// EVENT CLAIM HANDLER
// ============================================================================

async function handleEventClaim(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  eventId: string,
  verificationMethod: string,
  verificationProof: string
): Promise<NextResponse<CreateClaimResponse>> {
  
  // 1. Check event exists
  const { data: eventData, error: eventError } = await supabase
    .from('events')
    .select('id, name, venue_id')
    .eq('id', eventId)
    .single();

  if (eventError || !eventData) {
    return NextResponse.json(
      { success: false, error: 'Event not found' },
      { status: 404 }
    );
  }

  const event = eventData as unknown as EventData;

  // 2. Check for existing claim
  const { data: existingClaim } = await supabase
    .from('event_claims')
    .select('id, claimed_by, verification_status')
    .eq('event_id', eventId)
    .single();

  if (existingClaim) {
    const claim = existingClaim as unknown as EventClaim;
    
    if (claim.claimed_by === userId) {
      return NextResponse.json(
        { success: false, error: 'You have already claimed this event', status: claim.verification_status },
        { status: 409 }
      );
    }
    
    if (claim.verification_status === 'verified') {
      return NextResponse.json(
        { success: false, error: 'This event is already claimed by another user' },
        { status: 409 }
      );
    }
  }

  // 3. Validate verification method
  const validMethods: string[] = ['ticket_link', 'instagram', 'venue_approval'];
  let methodIsValid = false;
  for (let i = 0; i < validMethods.length; i++) {
    if (validMethods[i] === verificationMethod) {
      methodIsValid = true;
      break;
    }
  }

  if (!methodIsValid) {
    return NextResponse.json(
      { success: false, error: 'Invalid verification method' },
      { status: 400 }
    );
  }

  // 4. Check if venue has a claim (for auto-approval flow)
  let venueClaimId: string | null = null;
  let approvedByVenue = false;

  const { data: venueClaimData } = await supabase
    .from('venue_claims')
    .select('id, claimed_by, verification_status')
    .eq('venue_id', event.venue_id)
    .eq('verification_status', 'verified')
    .single();

  if (venueClaimData) {
    const venueClaim = venueClaimData as unknown as VenueClaim;
    venueClaimId = venueClaim.id;
    
    if (venueClaim.claimed_by === userId) {
      approvedByVenue = true;
    }
  }

  // 5. Create claim
  const claimStatus = approvedByVenue ? 'verified' : 'pending';
  
  const { data: claimData, error: claimError } = await supabase
    .from('event_claims')
    .insert({
      event_id: eventId,
      claimed_by: userId,
      verification_method: verificationMethod,
      verification_proof: verificationProof,
      verification_status: claimStatus,
      verified_at: approvedByVenue ? new Date().toISOString() : null,
      approved_by_venue: approvedByVenue,
      venue_claim_id: venueClaimId,
      is_active: true
    })
    .select()
    .single();

  if (claimError) {
    console.error('Failed to create event claim:', claimError);
    
    if (claimError.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'This event is already claimed' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create claim' },
      { status: 500 }
    );
  }

  const claim = claimData as unknown as EventClaim;

  return NextResponse.json({
    success: true,
    claim_id: claim.id,
    status: claimStatus
  });
}

// ============================================================================
// GET - Fetch user's claims
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch venue claims
    const { data: venueClaims, error: venueError } = await supabase
      .from('venue_claims')
      .select(`
        *,
        venues (id, name, address)
      `)
      .eq('claimed_by', user.id);

    // Fetch event claims
    const { data: eventClaims, error: eventError } = await supabase
      .from('event_claims')
      .select(`
        *,
        events (id, name, start_time)
      `)
      .eq('claimed_by', user.id);

    if (venueError || eventError) {
      console.error('Claims fetch error:', venueError || eventError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch claims' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      venue_claims: venueClaims || [],
      event_claims: eventClaims || []
    });

  } catch (error) {
    console.error('GET claims error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
