// ============================================================================
// SOUNDED OUT - REVENUE MODELS TYPES
// Strict TypeScript: Explicit interfaces, no .filter() arrows
// ============================================================================

// ============================================================================
// PROMOTION TYPES
// ============================================================================

export interface PromotionTier {
  id: 'boost' | 'featured' | 'spotlight';
  name: string;
  description: string;
  price_gbp: number; // in pence
  duration_days: number;
  features: string[];
  map_highlight: string;
  priority_score: number;
  max_per_night: number;
  is_active: boolean;
  created_at: string;
}

export interface EventPromotion {
  id: string;
  event_id: string;
  promoter_id: string;
  tier_id: 'boost' | 'featured' | 'spotlight';
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  amount_paid_gbp: number;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  starts_at: string;
  ends_at: string;
  views_at_start: number;
  saves_at_start: number;
  clicks_at_start: number;
  views_at_end: number | null;
  saves_at_end: number | null;
  clicks_at_end: number | null;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface PromotionWithTier extends EventPromotion {
  tier: PromotionTier;
}

export interface PromotionAvailability {
  available: boolean;
  reason?: string;
  slots_used: number;
  slots_max: number;
  slots_remaining?: number;
}

export interface PromotionResults {
  views_gained: number;
  saves_gained: number;
  clicks_gained: number;
  lift_percentage: number;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface EventAnalytics {
  id: string;
  event_id: string;
  date: string;
  views: number;
  unique_views: number;
  saves: number;
  unsaves: number;
  clicks_ticket: number;
  clicks_venue: number;
  shares: number;
  views_from_map: number;
  views_from_tonight: number;
  views_from_featured: number;
  views_from_search: number;
  views_from_email: number;
  created_at: string;
  updated_at: string;
}

export interface EventAnalyticsSummary {
  total_views: number;
  total_saves: number;
  total_clicks: number;
  avg_daily_views: number;
  top_source: string;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// CLAIM TYPES
// ============================================================================

export interface VenueClaim {
  id: string;
  venue_id: string;
  claimed_by: string;
  verification_method: 'email' | 'website' | 'instagram' | 'manual' | null;
  verification_proof: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  subscription_tier: 'basic' | 'pro' | null;
  subscription_expires_at: string | null;
  stripe_subscription_id: string | null;
  can_edit_venue: boolean;
  can_manage_events: boolean;
  can_add_team_members: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EventClaim {
  id: string;
  event_id: string;
  claimed_by: string;
  verification_method: 'ticket_link' | 'instagram' | 'venue_approval' | null;
  verification_proof: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_at: string | null;
  rejection_reason: string | null;
  approved_by_venue: boolean;
  venue_claim_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClaimTeamMember {
  id: string;
  venue_claim_id: string | null;
  event_claim_id: string | null;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  invited_by: string | null;
  invited_at: string;
  accepted_at: string | null;
  created_at: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

export interface CreatePromotionRequest {
  event_id: string;
  tier_id: 'boost' | 'featured' | 'spotlight';
}

export interface CreatePromotionResponse {
  success: boolean;
  checkout_url?: string;
  promotion_id?: string;
  error?: string;
}

export interface CreateClaimRequest {
  type: 'venue' | 'event';
  target_id: string; // venue_id or event_id
  verification_method: string;
  verification_proof: string;
}

export interface CreateClaimResponse {
  success: boolean;
  claim_id?: string;
  status?: string;
  error?: string;
}

// ============================================================================
// UI COMPONENT PROPS
// ============================================================================

export interface PromotionTierCardProps {
  tier: PromotionTier;
  eventId: string;
  isSelected: boolean;
  isAvailable: boolean;
  slotsRemaining: number;
  onSelect: (tierId: string) => void;
}

export interface PromotionCheckoutProps {
  eventId: string;
  eventName: string;
  selectedTier: PromotionTier;
  onSuccess: (promotionId: string) => void;
  onCancel: () => void;
}

export interface ClaimFlowProps {
  type: 'venue' | 'event';
  targetId: string;
  targetName: string;
  onSuccess: (claimId: string) => void;
  onCancel: () => void;
}

export interface PromotionResultsCardProps {
  promotion: EventPromotion;
  results: PromotionResults;
}

// ============================================================================
// PRICE FORMATTING HELPERS
// ============================================================================

export function formatPriceGBP(pence: number): string {
  const pounds = pence / 100;
  return `£${pounds.toFixed(pounds % 1 === 0 ? 0 : 2)}`;
}

export function formatPriceToPence(pounds: number): number {
  return Math.round(pounds * 100);
}

// ============================================================================
// TIER HELPERS
// ============================================================================

export const TIER_ORDER: Record<string, number> = {
  'boost': 1,
  'featured': 2,
  'spotlight': 3
};

export function sortTiersByPrice(tiers: PromotionTier[]): PromotionTier[] {
  const sorted: PromotionTier[] = [];
  for (let i = 0; i < tiers.length; i++) {
    const tier: PromotionTier = tiers[i];
    let insertIndex = 0;
    for (let j = 0; j < sorted.length; j++) {
      if (tier.price_gbp > sorted[j].price_gbp) {
        insertIndex = j + 1;
      }
    }
    sorted.splice(insertIndex, 0, tier);
  }
  return sorted;
}

// ============================================================================
// SATURATION HELPERS
// ============================================================================

export interface SaturationStatus {
  tier_id: string;
  event_date: string;
  slots_used: number;
  slots_max: number;
  slots_available: number;
  percentage_used: number;
}

export function calculateSaturationPercentage(used: number, max: number): number {
  if (max === 0) return 100;
  return Math.round((used / max) * 100);
}

export function getSaturationColor(percentage: number): string {
  if (percentage >= 100) return 'text-red-500';
  if (percentage >= 66) return 'text-amber-500';
  return 'text-green-500';
}
