// ============================================
// SOUNDED OUT - PERSONALIZATION TYPES
// Strict TypeScript interfaces
// ============================================

// ============================================
// USER TYPES
// ============================================

export interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  home_city: string
  latitude: number | null
  longitude: number | null
  push_notifications: boolean
  email_notifications: boolean
  weekly_digest: boolean
  profile_public: boolean
  show_activity: boolean
  show_saved_events: boolean
  is_verified: boolean
  is_premium: boolean
  onboarding_complete: boolean
  created_at: string
  updated_at: string
  last_active_at: string
}

export interface UserProfileUpdate {
  username?: string
  display_name?: string
  bio?: string
  avatar_url?: string
  home_city?: string
  latitude?: number
  longitude?: number
  push_notifications?: boolean
  email_notifications?: boolean
  weekly_digest?: boolean
  profile_public?: boolean
  show_activity?: boolean
  show_saved_events?: boolean
}

// ============================================
// PREFERENCE TYPES
// ============================================

export interface GenrePreference {
  id: string
  user_id: string
  genre: string
  preference_score: number
  is_manual: boolean
  click_count: number
  view_count: number
  save_count: number
  attend_count: number
  created_at: string
  updated_at: string
}

export interface VenuePreference {
  id: string
  user_id: string
  venue_id: string
  is_following: boolean
  is_favorite: boolean
  is_hidden: boolean
  preference_score: number
  click_count: number
  view_count: number
  event_save_count: number
  event_attend_count: number
  created_at: string
  updated_at: string
}

// ============================================
// INTERACTION TYPES
// ============================================

export type InteractionType = 
  | 'view' 
  | 'click' 
  | 'save' 
  | 'unsave' 
  | 'share' 
  | 'interested' 
  | 'going'
  | 'attend' 
  | 'hide'
  | 'search'

export type TargetType = 
  | 'event' 
  | 'venue' 
  | 'brand' 
  | 'genre' 
  | 'search'
  | 'user'

export type SourcePage = 
  | 'map' 
  | 'events' 
  | 'venues'
  | 'venue' 
  | 'event'
  | 'search' 
  | 'saved'
  | 'profile'
  | 'for-you'

export type SourceComponent = 
  | 'card' 
  | 'marker' 
  | 'list' 
  | 'carousel'
  | 'preview'
  | 'detail'
  | 'search-result'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

export interface UserInteraction {
  id: string
  user_id: string | null
  session_id: string | null
  interaction_type: InteractionType
  target_type: TargetType
  target_id: string | null
  target_data: Record<string, unknown> | null
  source_page: SourcePage | null
  source_component: SourceComponent | null
  view_duration_ms: number | null
  device_type: DeviceType | null
  created_at: string
}

export interface TrackInteractionParams {
  interaction_type: InteractionType
  target_type: TargetType
  target_id?: string
  target_data?: Record<string, unknown>
  source_page?: SourcePage
  source_component?: SourceComponent
  view_duration_ms?: number
}

// ============================================
// EVENT INTEREST TYPES
// ============================================

export type EventInterestStatus = 'interested' | 'going' | 'went'

export interface EventInterest {
  id: string
  user_id: string
  event_id: string
  status: EventInterestStatus
  visible_to_friends: boolean
  created_at: string
  updated_at: string
}

// ============================================
// SOCIAL TYPES
// ============================================

export type FollowStatus = 'active' | 'pending' | 'blocked'

export interface UserFollow {
  id: string
  follower_id: string
  following_id: string
  status: FollowStatus
  notify_events: boolean
  created_at: string
}

export interface UserFollowWithProfile extends UserFollow {
  following: UserProfile
}

export interface FollowerWithProfile extends UserFollow {
  follower: UserProfile
}

// ============================================
// HIDDEN ITEMS TYPES
// ============================================

export type HiddenType = 'event' | 'venue' | 'brand' | 'genre' | 'user'

export interface HiddenItem {
  id: string
  user_id: string
  hidden_type: HiddenType
  hidden_id: string | null
  hidden_value: string | null
  reason: string | null
  created_at: string
}

// ============================================
// PERSONALIZATION SCORE TYPES
// ============================================

export interface GenreScores {
  [genre: string]: number
}

export interface VenueScores {
  [venueId: string]: number
}

export interface TimeScores {
  [timeSlot: string]: number // e.g., "friday_night": 90
}

export interface PricePreference {
  min: number
  max: number
  free_preference: number
}

export interface PersonalizationScores {
  id: string
  user_id: string
  preferred_genres: GenreScores
  preferred_venues: VenueScores
  preferred_times: TimeScores
  preferred_price_range: PricePreference
  avg_events_per_month: number
  typical_booking_advance_days: number
  click_to_save_ratio: number
  computed_at: string
  interaction_count_at_compute: number
}

// ============================================
// RECOMMENDATION TYPES
// ============================================

export type RecommendationType = 
  | 'for_you' 
  | 'similar_to_saved' 
  | 'friends_going' 
  | 'trending'
  | 'new_at_favorites'

export interface RecommendationReason {
  type: string // 'genre_match', 'venue_favorite', 'friend_going', 'trending', 'new'
  label: string
  score_contribution: number
}

export interface EventScore {
  score: number
  reasons: RecommendationReason[]
}

export interface RecommendationScores {
  [eventId: string]: EventScore
}

export interface UserRecommendation {
  id: string
  user_id: string
  recommendation_type: RecommendationType
  event_ids: string[]
  venue_ids: string[]
  scores: RecommendationScores
  generated_at: string
  expires_at: string
}

// ============================================
// ONBOARDING TYPES
// ============================================

export type PricePreferenceOption = 'free' | 'budget' | 'any' | 'premium'
export type DayPreference = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
export type TimePreference = 'afternoon' | 'evening' | 'late_night'

export interface UserOnboarding {
  id: string
  user_id: string
  selected_genres: string[]
  selected_venues: string[]
  preferred_days: DayPreference[]
  preferred_times: TimePreference[]
  price_preference: PricePreferenceOption
  completed_at: string | null
}

// ============================================
// GENRE OPTIONS
// ============================================

export interface GenreOption {
  id: string
  label: string
  emoji: string | null
  color: string | null
  sort_order: number
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PersonalizedEvent {
  id: string
  title: string
  start_time: string
  image_url: string | null
  genres: string | null
  price_min: number | null
  price_max: number | null
  sold_out: boolean
  so_pick: boolean
  venue: {
    id: string
    name: string
  } | null
  // Personalization data
  relevance_score: number
  match_reasons: string[]
  friends_interested: number
  friends_going: number
}

export interface ForYouSection {
  title: string
  subtitle: string
  events: PersonalizedEvent[]
  recommendation_type: RecommendationType
}

// ============================================
// SESSION TYPES
// ============================================

export interface SessionData {
  id: string
  user_id: string | null
  device_type: DeviceType
  started_at: string
  last_active_at: string
}

// ============================================
// SEARCH TYPES
// ============================================

export interface SearchHistoryItem {
  id: string
  user_id: string | null
  session_id: string | null
  query: string
  result_count: number
  clicked_result_id: string | null
  clicked_result_type: string | null
  created_at: string
}
