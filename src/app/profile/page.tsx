'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  is_verified: boolean
  is_premium: boolean
  created_at: string
}

interface EventInterest {
  id: string
  status: string
  event: {
    id: string
    title: string
    start_time: string
    image_url: string | null
    venue: {
      name: string
    } | null
  } | null
}

interface SavedEvent {
  id: string
  event: {
    id: string
    title: string
    start_time: string
    image_url: string | null
    venue: {
      name: string
    } | null
  } | null
}

interface FollowCount {
  followers: number
  following: number
}

interface GenrePref {
  genre: string
  preference_score: number
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'going' | 'saved' | 'taste'>('going')
  const [goingEvents, setGoingEvents] = useState<EventInterest[]>([])
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([])
  const [topGenres, setTopGenres] = useState<string[]>([])
  const [followCounts, setFollowCounts] = useState<FollowCount>({ followers: 0, following: 0 })

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
      } else {
        router.push('/login')
      }
    }
    loadUser()
  }, [router])

  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      // Get profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        setProfile(profileData as UserProfile)
      }

      // Get going events
      const { data: goingData } = await supabase
        .from('event_interests')
        .select(`
          id,
          status,
          event:events(
            id, title, start_time, image_url,
            venue:venues(name)
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['interested', 'going'])
        .order('created_at', { ascending: false })
        .limit(10)

      if (goingData) {
        const filtered: EventInterest[] = []
        const typed = goingData as unknown as EventInterest[]
        for (let i = 0; i < typed.length; i++) {
          if (typed[i].event) {
            filtered.push(typed[i])
          }
        }
        setGoingEvents(filtered)
      }

      // Get saved events
      const { data: savedData } = await supabase
        .from('saved_events')
        .select(`
          id,
          event:events(
            id, title, start_time, image_url,
            venue:venues(name)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (savedData) {
        const filtered: SavedEvent[] = []
        const typed = savedData as unknown as SavedEvent[]
        for (let i = 0; i < typed.length; i++) {
          if (typed[i].event) {
            filtered.push(typed[i])
          }
        }
        setSavedEvents(filtered)
      }

      // Get top genres
      const { data: genresData } = await supabase
        .from('user_genre_preferences')
        .select('genre, preference_score')
        .eq('user_id', user.id)
        .order('preference_score', { ascending: false })
        .limit(5)

      if (genresData) {
        const genres: string[] = []
        const typed = genresData as GenrePref[]
        for (let i = 0; i < typed.length; i++) {
          genres.push(typed[i].genre)
        }
        setTopGenres(genres)
      }

      // Get follow counts
      const { count: followersCount } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', user.id)
        .eq('status', 'active')

      const { count: followingCount } = await supabase
        .from('user_follows')
        .select('id', { count: 'exact', head: true })
        .eq('follower_id', user.id)
        .eq('status', 'active')

      setFollowCounts({
        followers: followersCount || 0,
        following: followingCount || 0
      })

      setLoading(false)
    }

    loadProfile()
  }, [user])

  const formatDate = (date: string): string => {
    const d = new Date(date)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === now.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const getMemberSince = (): string => {
    if (!profile) return ''
    return new Date(profile.created_at).toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '80px' }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px' }} />
        </Link>
        <Link
          href="/settings"
          style={{
            padding: '8px 16px',
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '8px',
            color: '#888',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          Settings
        </Link>
      </header>

      {/* Profile Header */}
      <div style={{
        padding: '24px 20px 32px',
        background: 'linear-gradient(180deg, rgba(171,103,247,0.1) 0%, transparent 100%)',
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          {/* Avatar */}
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: profile?.avatar_url ? 'none' : 'linear-gradient(135deg, #ab67f7, #8b5cf6)',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '3px solid #ab67f7',
          }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '36px', color: 'white' }}>
                {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 style={{ fontSize: '24px', fontWeight: 700, textAlign: 'center', marginBottom: '4px' }}>
            {profile?.display_name || 'Anonymous'}
            {profile?.is_verified && (
              <span style={{
                display: 'inline-flex',
                width: '20px',
                height: '20px',
                background: '#ab67f7',
                borderRadius: '50%',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '10px',
                marginLeft: '8px',
                verticalAlign: 'middle',
              }}>✓</span>
            )}
          </h1>

          {profile?.username && (
            <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', marginBottom: '12px' }}>
              @{profile.username}
            </p>
          )}

          {profile?.bio && (
            <p style={{ fontSize: '14px', color: '#aaa', textAlign: 'center', maxWidth: '300px', margin: '0 auto 16px', lineHeight: 1.5 }}>
              {profile.bio}
            </p>
          )}

          {/* Stats */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '32px',
            marginBottom: '20px',
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700 }}>{followCounts.followers}</p>
              <p style={{ fontSize: '12px', color: '#888' }}>Followers</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700 }}>{followCounts.following}</p>
              <p style={{ fontSize: '12px', color: '#888' }}>Following</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '20px', fontWeight: 700 }}>{savedEvents.length}</p>
              <p style={{ fontSize: '12px', color: '#888' }}>Saved</p>
            </div>
          </div>

          {/* Edit Button */}
          <Link
            href="/profile/edit"
            style={{
              display: 'block',
              maxWidth: '200px',
              margin: '0 auto',
              padding: '10px 24px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Edit Profile
          </Link>

          <p style={{ fontSize: '12px', color: '#555', textAlign: 'center', marginTop: '16px' }}>
            Member since {getMemberSince()}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        position: 'sticky',
        top: 0,
        background: '#0a0a0b',
        zIndex: 10,
      }}>
        <button
          onClick={() => setActiveTab('going')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'going' ? '2px solid #ab67f7' : '2px solid transparent',
            color: activeTab === 'going' ? 'white' : '#666',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Going ({goingEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'saved' ? '2px solid #ab67f7' : '2px solid transparent',
            color: activeTab === 'saved' ? 'white' : '#666',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Saved ({savedEvents.length})
        </button>
        <button
          onClick={() => setActiveTab('taste')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'taste' ? '2px solid #ab67f7' : '2px solid transparent',
            color: activeTab === 'taste' ? 'white' : '#666',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Your Taste
        </button>
      </div>

      {/* Tab Content */}
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
        {activeTab === 'going' && (
          <div>
            {goingEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>🎫</p>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                  No upcoming events yet
                </p>
                <Link
                  href="/events"
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    background: '#ab67f7',
                    borderRadius: '8px',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  Find events
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {goingEvents.map((item: EventInterest) => {
                  const event = item.event
                  if (!event) return null
                  return (
                    <Link
                      key={item.id}
                      href={'/event/' + event.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        background: '#141416',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        color: 'white',
                      }}
                    >
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        background: event.image_url ? 'none' : '#1e1e24',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        {event.image_url ? (
                          <img src={event.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>♪</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '11px', color: '#ab67f7', fontWeight: 600, marginBottom: '4px' }}>
                          {formatDate(event.start_time)}
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                          {event.title}
                        </p>
                        <p style={{ fontSize: '12px', color: '#888' }}>{event.venue?.name}</p>
                      </div>
                      <span style={{
                        padding: '4px 8px',
                        background: item.status === 'going' ? 'rgba(34,197,94,0.15)' : 'rgba(171,103,247,0.15)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 500,
                        color: item.status === 'going' ? '#22c55e' : '#ab67f7',
                        alignSelf: 'center',
                      }}>
                        {item.status === 'going' ? 'Going' : 'Interested'}
                      </span>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div>
            {savedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>♡</p>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
                  No saved events
                </p>
                <Link
                  href="/events"
                  style={{
                    display: 'inline-block',
                    padding: '10px 20px',
                    background: '#ab67f7',
                    borderRadius: '8px',
                    color: 'white',
                    textDecoration: 'none',
                    fontSize: '14px',
                  }}
                >
                  Browse events
                </Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {savedEvents.map((item: SavedEvent) => {
                  const event = item.event
                  if (!event) return null
                  return (
                    <Link
                      key={item.id}
                      href={'/event/' + event.id}
                      style={{
                        display: 'flex',
                        gap: '12px',
                        padding: '12px',
                        background: '#141416',
                        borderRadius: '12px',
                        textDecoration: 'none',
                        color: 'white',
                      }}
                    >
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '8px',
                        background: event.image_url ? 'none' : '#1e1e24',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        {event.image_url ? (
                          <img src={event.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>♪</div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '11px', color: '#ab67f7', fontWeight: 600, marginBottom: '4px' }}>
                          {formatDate(event.start_time)}
                        </p>
                        <p style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '2px' }}>
                          {event.title}
                        </p>
                        <p style={{ fontSize: '12px', color: '#888' }}>{event.venue?.name}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'taste' && (
          <div>
            <div style={{
              background: '#141416',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Your Top Genres</h3>
              {topGenres.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#666' }}>
                  Start exploring events to build your taste profile
                </p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {topGenres.map((genre: string, index: number) => (
                    <span
                      key={genre}
                      style={{
                        padding: '8px 16px',
                        background: index === 0 ? '#ab67f7' : 'rgba(171,103,247,0.15)',
                        borderRadius: '20px',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: index === 0 ? 'white' : '#ab67f7',
                        textTransform: 'capitalize',
                      }}
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Link
              href="/profile/edit"
              style={{
                display: 'block',
                padding: '16px',
                background: '#141416',
                borderRadius: '12px',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, marginBottom: '4px' }}>Update your preferences</p>
                  <p style={{ fontSize: '12px', color: '#666' }}>Fine-tune your recommendations</p>
                </div>
                <span style={{ color: '#666' }}>→</span>
              </div>
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
