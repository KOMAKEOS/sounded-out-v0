'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'
import { getForYouRecommendations } from '../lib/personalization'
import { trackEventClick, trackEventView } from '../lib/tracking'
import type { ForYouSection, PersonalizedEvent } from '../lib/types'

interface ForYouProps {
  onEventClick?: (eventId: string) => void
}

export default function ForYou({ onEventClick }: ForYouProps) {
  const [sections, setSections] = useState<ForYouSection[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const scrollRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
      } else {
        setLoading(false)
      }
    }
    loadUser()
  }, [])

  useEffect(() => {
    if (!user) return

    const loadRecommendations = async () => {
      const recs = await getForYouRecommendations(user.id)
      setSections(recs)
      setLoading(false)
    }

    loadRecommendations()
  }, [user])

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (date.toDateString() === now.toDateString()) return 'Today'
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  }

  const formatPrice = (min: number | null, max: number | null): string => {
    if (!min && !max) return 'Free'
    if (min === 0 && !max) return 'Free'
    if (min && !max) return '£' + min
    if (min && max && min === max) return '£' + min
    return '£' + (min || 0) + '+'
  }

  const handleEventClick = (event: PersonalizedEvent, sectionType: string) => {
    trackEventClick(event.id, { venue_id: event.venue?.id, genres: event.genres || undefined }, 'for-you', 'carousel')
    if (onEventClick) {
      onEventClick(event.id)
    }
  }

  const scroll = (sectionIndex: number, direction: 'left' | 'right') => {
    const ref = scrollRefs.current['section-' + sectionIndex]
    if (ref) {
      const scrollAmount = direction === 'left' ? -280 : 280
      ref.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Not logged in - show sign up prompt
  if (!user && !loading) {
    return (
      <div style={{
        padding: '24px 20px',
        background: 'linear-gradient(180deg, rgba(171,103,247,0.08) 0%, transparent 100%)',
        borderRadius: '16px',
        margin: '16px',
        textAlign: 'center',
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'linear-gradient(135deg, #ab67f7, #8b5cf6)',
          borderRadius: '50%',
          margin: '0 auto 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
        }}>
          ✨
        </div>
        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: 'white' }}>
          Get personalized picks
        </h3>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '20px', lineHeight: 1.5 }}>
          Sign up to get event recommendations tailored to your taste
        </p>
        <Link
          href="/signup"
          style={{
            display: 'inline-block',
            padding: '12px 32px',
            background: '#ab67f7',
            borderRadius: '50px',
            color: 'white',
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          Create free account
        </Link>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          height: '24px',
          width: '150px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '6px',
          marginBottom: '16px',
        }} />
        <div style={{ display: 'flex', gap: '12px', overflow: 'hidden' }}>
          {[1, 2, 3].map((i: number) => (
            <div
              key={i}
              style={{
                width: '260px',
                height: '200px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                flexShrink: 0,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  if (sections.length === 0) {
    return (
      <div style={{
        padding: '24px 20px',
        background: '#141416',
        borderRadius: '16px',
        margin: '16px',
        textAlign: 'center',
      }}>
        <p style={{ fontSize: '14px', color: '#888' }}>
          Keep exploring to unlock personalized recommendations
        </p>
      </div>
    )
  }

  return (
    <div style={{ paddingBottom: '16px' }}>
      {sections.map((section: ForYouSection, sectionIndex: number) => (
        <div key={section.recommendation_type + '-' + sectionIndex} style={{ marginBottom: '28px' }}>
          {/* Section Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 20px',
            marginBottom: '14px',
          }}>
            <div>
              <h3 style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'white',
                marginBottom: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                {section.title}
                {section.recommendation_type === 'for_you' && (
                  <span style={{
                    fontSize: '12px',
                    padding: '3px 8px',
                    background: 'linear-gradient(135deg, #ab67f7, #8b5cf6)',
                    borderRadius: '4px',
                    fontWeight: 500,
                  }}>
                    AI
                  </span>
                )}
              </h3>
              <p style={{ fontSize: '13px', color: '#666' }}>{section.subtitle}</p>
            </div>
            
            {/* Scroll buttons for desktop */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => scroll(sectionIndex, 'left')}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                }}
              >
                ←
              </button>
              <button
                onClick={() => scroll(sectionIndex, 'right')}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.06)',
                  border: 'none',
                  color: '#888',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                }}
              >
                →
              </button>
            </div>
          </div>

          {/* Horizontal Scroll */}
          <div
            ref={(el) => { scrollRefs.current['section-' + sectionIndex] = el }}
            style={{
              display: 'flex',
              gap: '12px',
              overflowX: 'auto',
              scrollSnapType: 'x mandatory',
              paddingLeft: '20px',
              paddingRight: '20px',
              paddingBottom: '8px',
              WebkitOverflowScrolling: 'touch',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
            }}
          >
            {section.events.map((event: PersonalizedEvent) => (
              <Link
                key={event.id}
                href={'/event/' + event.id}
                onClick={() => handleEventClick(event, section.recommendation_type)}
                style={{
                  width: '260px',
                  flexShrink: 0,
                  scrollSnapAlign: 'start',
                  background: '#141416',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  textDecoration: 'none',
                  color: 'white',
                  display: 'block',
                }}
              >
                {/* Image */}
                <div style={{
                  height: '140px',
                  background: event.image_url 
                    ? `url(${event.image_url}) center/cover` 
                    : 'linear-gradient(135deg, #1e1e24, #2a2a32)',
                  position: 'relative',
                }}>
                  {/* Match reasons badge */}
                  {event.match_reasons.length > 0 && (
                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: '8px',
                      padding: '4px 10px',
                      background: 'rgba(0,0,0,0.75)',
                      backdropFilter: 'blur(8px)',
                      borderRadius: '20px',
                      fontSize: '11px',
                      color: '#ab67f7',
                      fontWeight: 500,
                    }}>
                      {event.match_reasons[0]}
                    </div>
                  )}
                  
                  {/* Friends going badge */}
                  {event.friends_going > 0 && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      padding: '4px 10px',
                      background: 'rgba(34,197,94,0.9)',
                      borderRadius: '20px',
                      fontSize: '11px',
                      color: 'white',
                      fontWeight: 500,
                    }}>
                      {event.friends_going} friend{event.friends_going > 1 ? 's' : ''} going
                    </div>
                  )}

                  {/* Sold out */}
                  {event.sold_out && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      padding: '4px 10px',
                      background: 'rgba(239,68,68,0.9)',
                      borderRadius: '20px',
                      fontSize: '11px',
                      color: 'white',
                      fontWeight: 500,
                    }}>
                      Sold out
                    </div>
                  )}

                  {/* SO Pick */}
                  {event.so_pick && !event.sold_out && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      padding: '4px 10px',
                      background: '#ab67f7',
                      borderRadius: '20px',
                      fontSize: '11px',
                      color: 'white',
                      fontWeight: 500,
                    }}>
                      ⚡ SO Pick
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '12px' }}>
                  <p style={{
                    fontSize: '11px',
                    color: '#ab67f7',
                    fontWeight: 600,
                    marginBottom: '4px',
                  }}>
                    {formatDate(event.start_time)}
                  </p>
                  <h4 style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {event.title}
                  </h4>
                  <p style={{
                    fontSize: '13px',
                    color: '#888',
                    marginBottom: '8px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {event.venue?.name || 'Venue TBA'}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <span style={{
                      fontSize: '13px',
                      color: event.price_min === 0 || !event.price_min ? '#22c55e' : '#888',
                      fontWeight: 500,
                    }}>
                      {formatPrice(event.price_min, event.price_max)}
                    </span>
                    
                    {/* Match score indicator */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <div style={{
                        width: '40px',
                        height: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: event.relevance_score + '%',
                          height: '100%',
                          background: event.relevance_score > 70 ? '#ab67f7' : event.relevance_score > 50 ? '#f97316' : '#666',
                          borderRadius: '2px',
                        }} />
                      </div>
                      <span style={{ fontSize: '11px', color: '#666' }}>
                        {Math.round(event.relevance_score)}%
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
