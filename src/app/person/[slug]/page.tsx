'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================
type Person = {
  id: string
  slug: string
  name: string
  role: string | null
  bio: string | null
  profile_image_url: string | null
  instagram_url: string | null
  soundcloud_url: string | null
  spotify_url: string | null
  is_verified: boolean
}

type BrandAffiliation = {
  id: string
  role: string | null
  brand: {
    id: string
    slug: string
    name: string
    profile_image_url: string | null
    is_verified: boolean
    follower_count: number
  }
}

type Event = {
  id: string
  title: string
  start_time: string
  image_url: string | null
  venue: { name: string } | null
  brand: { 
    name: string 
    slug: string 
  } | null
}

// ============================================================================
// HELPERS
// ============================================================================
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-GB', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short',
    year: 'numeric'
  })
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function PersonProfilePage() {
  const params = useParams()
  const slug = params.slug as string
  
  const [person, setPerson] = useState<Person | null>(null)
  const [affiliations, setAffiliations] = useState<BrandAffiliation[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([])
  const [pastEvents, setPastEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'about'>('upcoming')
  
  useEffect(() => {
    const loadPerson = async () => {
      // Fetch person
      const { data: personData } = await supabase
        .from('people')
        .select('*')
        .eq('slug', slug)
        .single()
      
      if (!personData) {
        setLoading(false)
        return
      }
      
      setPerson(personData)
      
      // Fetch brand affiliations
      const { data: affiliationData } = await supabase
        .from('brand_members')
        .select('*, brand:brands(id, slug, name, profile_image_url, is_verified, follower_count)')
        .eq('person_id', personData.id)
      
      setAffiliations(affiliationData || [])
      
      // Fetch events from affiliated brands
      if (affiliationData && affiliationData.length > 0) {
        const brandIds = affiliationData.map((a: any) => a.brand.id)
        const now = new Date().toISOString()
        
        const { data: upcoming } = await supabase
          .from('events')
          .select('*, venue:venues(name), brand:brands(name, slug)')
          .in('brand_id', brandIds)
          .eq('status', 'published')
          .gte('start_time', now)
          .order('start_time', { ascending: true })
          .limit(5)
        
        const { data: past } = await supabase
          .from('events')
          .select('*, venue:venues(name), brand:brands(name, slug)')
          .in('brand_id', brandIds)
          .eq('status', 'published')
          .lt('start_time', now)
          .order('start_time', { ascending: false })
          .limit(10)
        
        setUpcomingEvents(upcoming || [])
        setPastEvents(past || [])
      }
      
      setLoading(false)
    }
    
    loadPerson()
  }, [slug])
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(171,103,247,0.2)',
          borderTopColor: '#ab67f7',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
      </div>
    )
  }
  
  if (!person) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        textAlign: 'center',
        color: 'white',
      }}>
        <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>404</h1>
        <p style={{ color: '#666', marginBottom: '32px' }}>Person not found</p>
        <Link href="/" style={{
          padding: '12px 24px',
          background: '#ab67f7',
          borderRadius: '8px',
          color: 'white',
          textDecoration: 'none',
          fontWeight: 600,
        }}>
          Back to Map
        </Link>
      </div>
    )
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#000',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      
      {/* Hero Section */}
      <div style={{
        position: 'relative',
        paddingTop: '60px',
        paddingBottom: '24px',
        background: 'linear-gradient(180deg, #1a1a2e 0%, #000 100%)',
      }}>
        {/* Back Button */}
        <Link href="/" style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          width: '40px',
          height: '40px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          textDecoration: 'none',
          fontSize: '20px',
        }}>
          ←
        </Link>
        
        {/* Profile Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 20px',
        }}>
          {/* Profile Image */}
          <div style={{
            width: '140px',
            height: '140px',
            borderRadius: '50%',
            overflow: 'hidden',
            marginBottom: '20px',
            border: '4px solid rgba(171,103,247,0.3)',
            boxShadow: '0 8px 32px rgba(171,103,247,0.2)',
          }}>
            {person.profile_image_url ? (
              <img
                src={person.profile_image_url}
                alt={person.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '56px',
                fontWeight: 800,
                color: 'white',
              }}>
                {person.name.charAt(0)}
              </div>
            )}
          </div>
          
          {/* Name */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '8px',
          }}>
            <h1 style={{
              fontSize: '28px',
              fontWeight: 800,
              letterSpacing: '-0.02em',
            }}>
              {person.name}
            </h1>
            {person.is_verified && (
              <span style={{
                width: '24px',
                height: '24px',
                background: '#ab67f7',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
              }}>✓</span>
            )}
          </div>
          
          {/* Role */}
          {person.role && (
            <p style={{
              fontSize: '15px',
              color: '#ab67f7',
              marginBottom: '16px',
            }}>
              {person.role}
            </p>
          )}
          
          {/* Social Links */}
          <div style={{ display: 'flex', gap: '12px' }}>
            {person.instagram_url && (
              <a
                href={person.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  textDecoration: 'none',
                }}
              >
                📸
              </a>
            )}
            {person.soundcloud_url && (
              <a
                href={person.soundcloud_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  textDecoration: 'none',
                }}
              >
                ☁️
              </a>
            )}
            {person.spotify_url && (
              <a
                href={person.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '18px',
                  textDecoration: 'none',
                }}
              >
                🎵
              </a>
            )}
          </div>
        </div>
      </div>
      
      {/* Affiliated Brands */}
      {affiliations.length > 0 && (
        <div style={{
          padding: '20px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}>
          <h3 style={{
            fontSize: '12px',
            fontWeight: 700,
            color: '#666',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '14px',
          }}>
            Part of
          </h3>
          <div style={{ display: 'flex', gap: '12px', overflowX: 'auto' }}>
            {affiliations.map(aff => (
              <Link
                key={aff.id}
                href={`/brand/${aff.brand.slug}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 14px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  color: 'white',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  background: '#1a1a1f',
                }}>
                  {aff.brand.profile_image_url ? (
                    <img
                      src={aff.brand.profile_image_url}
                      alt={aff.brand.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '18px',
                      fontWeight: 700,
                    }}>
                      {aff.brand.name.charAt(0)}
                    </div>
                  )}
                </div>
                <div>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {aff.brand.name}
                    {aff.brand.is_verified && (
                      <span style={{
                        width: '14px',
                        height: '14px',
                        background: '#ab67f7',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '8px',
                      }}>✓</span>
                    )}
                  </p>
                  <p style={{ fontSize: '12px', color: '#888' }}>
                    {aff.role || 'Member'}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        position: 'sticky',
        top: 0,
        background: '#000',
        zIndex: 50,
      }}>
        {(['upcoming', 'past', 'about'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1,
              padding: '16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab ? '2px solid #ab67f7' : '2px solid transparent',
              color: activeTab === tab ? 'white' : '#666',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <div style={{ padding: '20px' }}>
        
        {/* Upcoming */}
        {activeTab === 'upcoming' && (
          <div>
            {upcomingEvents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#666' }}>No upcoming events</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {upcomingEvents.map(event => (
                  <Link
                    key={event.id}
                    href={`/?event=${event.id}`}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: '12px',
                      textDecoration: 'none',
                      color: 'white',
                    }}
                  >
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      background: '#1a1a1f',
                      flexShrink: 0,
                    }}>
                      {event.image_url ? (
                        <img
                          src={event.image_url}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#333',
                        }}>
                          🎵
                        </div>
                      )}
                    </div>
                    <div>
                      <p style={{ fontSize: '12px', color: '#ab67f7', marginBottom: '4px' }}>
                        {formatDate(event.start_time)}
                      </p>
                      <p style={{ fontSize: '14px', fontWeight: 600, marginBottom: '2px' }}>
                        {event.title}
                      </p>
                      <p style={{ fontSize: '12px', color: '#888' }}>
                        {event.venue?.name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Past */}
        {activeTab === 'past' && (
          <div>
            {pastEvents.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#666' }}>No past events</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pastEvents.map(event => (
                  <div
                    key={event.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.02)',
                      borderRadius: '8px',
                      opacity: 0.7,
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>{event.title}</p>
                      <p style={{ fontSize: '12px', color: '#666' }}>{event.venue?.name}</p>
                    </div>
                    <p style={{ fontSize: '12px', color: '#555' }}>
                      {formatDate(event.start_time)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* About */}
        {activeTab === 'about' && (
          <div>
            {person.bio ? (
              <p style={{
                fontSize: '15px',
                color: 'rgba(255,255,255,0.85)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
              }}>
                {person.bio}
              </p>
            ) : (
              <p style={{ color: '#666', textAlign: 'center', padding: '40px' }}>
                No bio yet
              </p>
            )}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div style={{
        padding: '40px 20px',
        textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <img src="/logo.svg" alt="Sounded Out" style={{ height: '20px', opacity: 0.4 }} />
        </Link>
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #000; color: white; }
      `}</style>
    </div>
  )
}
