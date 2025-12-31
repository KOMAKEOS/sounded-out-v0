// ============================================
// SOUNDED OUT - PERSONALIZATION ALGORITHM
// Spotify-style recommendation engine
// ============================================

import { supabase } from './supabase'
import type {
  PersonalizedEvent,
  ForYouSection,
  RecommendationType,
  GenreScores,
  VenueScores,
  RecommendationReason
} from './types'

// ============================================
// INTERFACES FOR INTERNAL USE
// ============================================

interface EventData {
  id: string
  title: string
  start_time: string
  image_url: string | null
  genres: string | null
  price_min: number | null
  price_max: number | null
  sold_out: boolean
  so_pick: boolean
  venue_id: string
  venue: {
    id: string
    name: string
  } | null
}

interface GenrePref {
  genre: string
  preference_score: number
}

interface VenuePref {
  venue_id: string
  preference_score: number
  is_following: boolean
  is_favorite: boolean
}

interface SavedEventData {
  event_id: string
}

interface EventInterestData {
  event_id: string
  user_id: string
}

interface HiddenData {
  hidden_type: string
  hidden_id: string | null
  hidden_value: string | null
}

// ============================================
// MAIN RECOMMENDATION FUNCTION
// ============================================

export async function getForYouRecommendations(userId: string): Promise<ForYouSection[]> {
  const sections: ForYouSection[] = []
  
  // Get user preferences
  const preferences = await getUserPreferences(userId)
  
  // Get all upcoming events
  const { data: eventsData } = await supabase
    .from('events')
    .select('id, title, start_time, image_url, genres, price_min, price_max, sold_out, so_pick, venue_id, venue:venues(id, name)')
    .eq('status', 'published')
    .gte('start_time', new Date().toISOString())
    .order('start_time')
    .limit(100)
  
  if (!eventsData || eventsData.length === 0) {
    return sections
  }
  
  const events = eventsData as unknown as EventData[]
  
  // Get user's hidden items
  const hiddenIds = await getHiddenEventIds(userId)
  
  // Get user's saved events
  const savedIds = await getSavedEventIds(userId)
  
  // Filter out hidden and saved
  const availableEvents: EventData[] = []
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    if (hiddenIds.indexOf(event.id) === -1 && savedIds.indexOf(event.id) === -1) {
      availableEvents.push(event)
    }
  }
  
  // Score all events
  const scoredEvents = scoreEvents(availableEvents, preferences)
  
  // Sort by score
  scoredEvents.sort((a, b) => b.relevance_score - a.relevance_score)
  
  // Section 1: Top picks for you
  const topPicks = scoredEvents.slice(0, 8)
  if (topPicks.length > 0) {
    sections.push({
      title: 'For You',
      subtitle: 'Based on your taste',
      events: topPicks,
      recommendation_type: 'for_you'
    })
  }
  
  // Section 2: From venues you follow
  const favoriteVenueEvents: PersonalizedEvent[] = []
  for (let i = 0; i < scoredEvents.length; i++) {
    const event = scoredEvents[i]
    if (event.venue && preferences.favoriteVenueIds.indexOf(event.venue.id) !== -1) {
      favoriteVenueEvents.push(event)
    }
    if (favoriteVenueEvents.length >= 6) break
  }
  
  if (favoriteVenueEvents.length > 0) {
    sections.push({
      title: 'From Your Favorites',
      subtitle: 'Venues you follow',
      events: favoriteVenueEvents,
      recommendation_type: 'new_at_favorites'
    })
  }
  
  // Section 3: Trending now (based on saves/interest)
  const trendingEvents = await getTrendingEvents(availableEvents, 6)
  if (trendingEvents.length > 0) {
    sections.push({
      title: 'Trending',
      subtitle: 'Popular this week',
      events: trendingEvents,
      recommendation_type: 'trending'
    })
  }
  
  // Section 4: Friends going (if user has follows)
  const friendsGoingEvents = await getFriendsGoingEvents(userId, availableEvents, 6)
  if (friendsGoingEvents.length > 0) {
    sections.push({
      title: 'Friends Going',
      subtitle: 'Events your friends are attending',
      events: friendsGoingEvents,
      recommendation_type: 'friends_going'
    })
  }
  
  return sections
}

// ============================================
// USER PREFERENCES
// ============================================

interface UserPreferences {
  genreScores: GenreScores
  venueScores: VenueScores
  favoriteVenueIds: string[]
  prefersFree: boolean
  priceMax: number
}

async function getUserPreferences(userId: string): Promise<UserPreferences> {
  // Get genre preferences
  const { data: genreData } = await supabase
    .from('user_genre_preferences')
    .select('genre, preference_score')
    .eq('user_id', userId)
  
  const genreScores: GenreScores = {}
  if (genreData) {
    const genres = genreData as GenrePref[]
    for (let i = 0; i < genres.length; i++) {
      genreScores[genres[i].genre] = genres[i].preference_score
    }
  }
  
  // Get venue preferences
  const { data: venueData } = await supabase
    .from('user_venue_preferences')
    .select('venue_id, preference_score, is_following, is_favorite')
    .eq('user_id', userId)
    .eq('is_hidden', false)
  
  const venueScores: VenueScores = {}
  const favoriteVenueIds: string[] = []
  
  if (venueData) {
    const venues = venueData as VenuePref[]
    for (let i = 0; i < venues.length; i++) {
      venueScores[venues[i].venue_id] = venues[i].preference_score
      if (venues[i].is_following || venues[i].is_favorite) {
        favoriteVenueIds.push(venues[i].venue_id)
      }
    }
  }
  
  // Get price preferences from onboarding
  const { data: onboarding } = await supabase
    .from('user_onboarding')
    .select('price_preference')
    .eq('user_id', userId)
    .single()
  
  let prefersFree = false
  let priceMax = 100
  
  if (onboarding) {
    if (onboarding.price_preference === 'free') {
      prefersFree = true
      priceMax = 0
    } else if (onboarding.price_preference === 'budget') {
      priceMax = 15
    } else if (onboarding.price_preference === 'premium') {
      priceMax = 100
    }
  }
  
  return {
    genreScores,
    venueScores,
    favoriteVenueIds,
    prefersFree,
    priceMax
  }
}

// ============================================
// EVENT SCORING
// ============================================

function scoreEvents(
  events: EventData[],
  preferences: UserPreferences
): PersonalizedEvent[] {
  const scored: PersonalizedEvent[] = []
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const { score, reasons } = calculateEventScore(event, preferences)
    
    scored.push({
      id: event.id,
      title: event.title,
      start_time: event.start_time,
      image_url: event.image_url,
      genres: event.genres,
      price_min: event.price_min,
      price_max: event.price_max,
      sold_out: event.sold_out,
      so_pick: event.so_pick,
      venue: event.venue,
      relevance_score: score,
      match_reasons: reasons,
      friends_interested: 0,
      friends_going: 0
    })
  }
  
  return scored
}

interface ScoreResult {
  score: number
  reasons: string[]
}

function calculateEventScore(
  event: EventData,
  preferences: UserPreferences
): ScoreResult {
  let score = 50 // Base score
  const reasons: string[] = []
  
  // Genre matching (up to +30 points)
  if (event.genres) {
    const eventGenres = event.genres.toLowerCase().split(',')
    let genreScore = 0
    let matchedGenres = 0
    
    for (let i = 0; i < eventGenres.length; i++) {
      const genre = eventGenres[i].trim()
      if (preferences.genreScores[genre]) {
        genreScore += preferences.genreScores[genre]
        matchedGenres++
      }
    }
    
    if (matchedGenres > 0) {
      const avgGenreScore = genreScore / matchedGenres
      const genreBoost = ((avgGenreScore - 50) / 50) * 30 // -30 to +30
      score += genreBoost
      
      if (genreBoost > 10) {
        reasons.push('Matches your taste')
      }
    }
  }
  
  // Venue preference (up to +20 points)
  if (event.venue_id && preferences.venueScores[event.venue_id]) {
    const venueScore = preferences.venueScores[event.venue_id]
    const venueBoost = ((venueScore - 50) / 50) * 20
    score += venueBoost
    
    if (preferences.favoriteVenueIds.indexOf(event.venue_id) !== -1) {
      score += 15
      reasons.push('From a venue you follow')
    }
  }
  
  // SO Pick bonus (+10 points)
  if (event.so_pick) {
    score += 10
    reasons.push('Curated pick')
  }
  
  // Price matching (up to +10 points)
  const isFree = !event.price_min || event.price_min === 0
  
  if (preferences.prefersFree && isFree) {
    score += 10
    reasons.push('Free event')
  } else if (!preferences.prefersFree && event.price_min && event.price_min <= preferences.priceMax) {
    score += 5
  }
  
  // Time proximity bonus (events sooner get slight boost)
  const daysUntil = (new Date(event.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysUntil <= 3) {
    score += 8
    reasons.push('Coming up soon')
  } else if (daysUntil <= 7) {
    score += 5
    reasons.push('This week')
  }
  
  // Weekend bonus
  const eventDay = new Date(event.start_time).getDay()
  if (eventDay === 5 || eventDay === 6) { // Friday or Saturday
    score += 3
  }
  
  // Sold out penalty
  if (event.sold_out) {
    score -= 20
  }
  
  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score))
  
  return { score, reasons }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function getHiddenEventIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_hidden_items')
    .select('hidden_type, hidden_id')
    .eq('user_id', userId)
    .eq('hidden_type', 'event')
  
  const ids: string[] = []
  if (data) {
    const hidden = data as HiddenData[]
    for (let i = 0; i < hidden.length; i++) {
      if (hidden[i].hidden_id) {
        ids.push(hidden[i].hidden_id as string)
      }
    }
  }
  return ids
}

async function getSavedEventIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('saved_events')
    .select('event_id')
    .eq('user_id', userId)
  
  const ids: string[] = []
  if (data) {
    const saved = data as SavedEventData[]
    for (let i = 0; i < saved.length; i++) {
      ids.push(saved[i].event_id)
    }
  }
  return ids
}

async function getTrendingEvents(
  events: EventData[],
  limit: number
): Promise<PersonalizedEvent[]> {
  // Get save counts for events
  const eventIds: string[] = []
  for (let i = 0; i < events.length; i++) {
    eventIds.push(events[i].id)
  }
  
  const { data: saveCounts } = await supabase
    .from('saved_events')
    .select('event_id')
    .in('event_id', eventIds)
  
  // Count saves per event
  const counts: Record<string, number> = {}
  if (saveCounts) {
    const saves = saveCounts as SavedEventData[]
    for (let i = 0; i < saves.length; i++) {
      const id = saves[i].event_id
      counts[id] = (counts[id] || 0) + 1
    }
  }
  
  // Sort events by save count
  const sortedEvents: EventData[] = []
  for (let i = 0; i < events.length; i++) {
    sortedEvents.push(events[i])
  }
  
  sortedEvents.sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0))
  
  // Take top N
  const trending: PersonalizedEvent[] = []
  for (let i = 0; i < Math.min(limit, sortedEvents.length); i++) {
    const event = sortedEvents[i]
    const saveCount = counts[event.id] || 0
    
    if (saveCount > 0) {
      trending.push({
        id: event.id,
        title: event.title,
        start_time: event.start_time,
        image_url: event.image_url,
        genres: event.genres,
        price_min: event.price_min,
        price_max: event.price_max,
        sold_out: event.sold_out,
        so_pick: event.so_pick,
        venue: event.venue,
        relevance_score: 70 + saveCount * 5,
        match_reasons: [saveCount + ' people saved'],
        friends_interested: 0,
        friends_going: 0
      })
    }
  }
  
  return trending
}

async function getFriendsGoingEvents(
  userId: string,
  events: EventData[],
  limit: number
): Promise<PersonalizedEvent[]> {
  // Get user's following list
  const { data: followsData } = await supabase
    .from('user_follows')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'active')
  
  if (!followsData || followsData.length === 0) {
    return []
  }
  
  const followingIds: string[] = []
  for (let i = 0; i < followsData.length; i++) {
    followingIds.push((followsData[i] as { following_id: string }).following_id)
  }
  
  // Get events where friends are going
  const eventIds: string[] = []
  for (let i = 0; i < events.length; i++) {
    eventIds.push(events[i].id)
  }
  
  const { data: interestsData } = await supabase
    .from('event_interests')
    .select('event_id, user_id')
    .in('event_id', eventIds)
    .in('user_id', followingIds)
    .in('status', ['interested', 'going'])
  
  if (!interestsData || interestsData.length === 0) {
    return []
  }
  
  // Count friends per event
  const friendCounts: Record<string, number> = {}
  const interests = interestsData as EventInterestData[]
  for (let i = 0; i < interests.length; i++) {
    const id = interests[i].event_id
    friendCounts[id] = (friendCounts[id] || 0) + 1
  }
  
  // Get events with friends
  const friendsEvents: PersonalizedEvent[] = []
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    const friendCount = friendCounts[event.id] || 0
    
    if (friendCount > 0) {
      friendsEvents.push({
        id: event.id,
        title: event.title,
        start_time: event.start_time,
        image_url: event.image_url,
        genres: event.genres,
        price_min: event.price_min,
        price_max: event.price_max,
        sold_out: event.sold_out,
        so_pick: event.so_pick,
        venue: event.venue,
        relevance_score: 80 + friendCount * 10,
        match_reasons: [friendCount + ' friend' + (friendCount > 1 ? 's' : '') + ' interested'],
        friends_interested: friendCount,
        friends_going: friendCount
      })
    }
  }
  
  // Sort by friend count
  friendsEvents.sort((a, b) => b.friends_going - a.friends_going)
  
  return friendsEvents.slice(0, limit)
}

// ============================================
// SIMILAR EVENTS
// ============================================

export async function getSimilarEvents(
  eventId: string,
  limit: number = 6
): Promise<PersonalizedEvent[]> {
  // Get the source event
  const { data: sourceData } = await supabase
    .from('events')
    .select('genres, venue_id, price_min, price_max')
    .eq('id', eventId)
    .single()
  
  if (!sourceData) return []
  
  const source = sourceData as { genres: string | null; venue_id: string; price_min: number | null; price_max: number | null }
  
  // Get upcoming events
  const { data: eventsData } = await supabase
    .from('events')
    .select('id, title, start_time, image_url, genres, price_min, price_max, sold_out, so_pick, venue_id, venue:venues(id, name)')
    .eq('status', 'published')
    .neq('id', eventId)
    .gte('start_time', new Date().toISOString())
    .order('start_time')
    .limit(50)
  
  if (!eventsData) return []
  
  const events = eventsData as unknown as EventData[]
  
  // Score by similarity
  const sourceGenres: string[] = []
  if (source.genres) {
    const parts = source.genres.toLowerCase().split(',')
    for (let i = 0; i < parts.length; i++) {
      sourceGenres.push(parts[i].trim())
    }
  }
  
  const scored: PersonalizedEvent[] = []
  
  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    let score = 0
    const reasons: string[] = []
    
    // Same venue (+30)
    if (event.venue_id === source.venue_id) {
      score += 30
      reasons.push('Same venue')
    }
    
    // Genre overlap (+20 per match)
    if (event.genres) {
      const eventGenres = event.genres.toLowerCase().split(',')
      for (let j = 0; j < eventGenres.length; j++) {
        const g = eventGenres[j].trim()
        if (sourceGenres.indexOf(g) !== -1) {
          score += 20
          reasons.push('Similar genre')
          break
        }
      }
    }
    
    // Similar price range (+10)
    const sourceMid = ((source.price_min || 0) + (source.price_max || source.price_min || 0)) / 2
    const eventMid = ((event.price_min || 0) + (event.price_max || event.price_min || 0)) / 2
    if (Math.abs(sourceMid - eventMid) <= 10) {
      score += 10
      reasons.push('Similar price')
    }
    
    if (score > 0) {
      scored.push({
        id: event.id,
        title: event.title,
        start_time: event.start_time,
        image_url: event.image_url,
        genres: event.genres,
        price_min: event.price_min,
        price_max: event.price_max,
        sold_out: event.sold_out,
        so_pick: event.so_pick,
        venue: event.venue,
        relevance_score: score,
        match_reasons: reasons,
        friends_interested: 0,
        friends_going: 0
      })
    }
  }
  
  // Sort by score
  scored.sort((a, b) => b.relevance_score - a.relevance_score)
  
  return scored.slice(0, limit)
}
