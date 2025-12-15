import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Venue = {
  id: string
  name: string
  address: string
  city: string
  lat: number
  lng: number
  venue_type: string
  website_url: string | null
  instagram_url: string | null
  image_url: string | null
  status: string
  created_at: string
}

export type Event = {
  id: string
  venue_id: string
  title: string
  start_time: string
  end_time: string | null
  genres: string | null
  event_url: string | null
  image_url: string | null
  price_min: number | null
  price_max: number | null
  status: string
  last_verified_at: string | null
  created_at: string
  venue?: Venue
}
