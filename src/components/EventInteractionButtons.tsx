'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  trackEventSave, 
  trackEventUnsave, 
  trackEventInterested, 
  trackEventGoing,
  trackShare,
  trackHide 
} from '../lib/tracking'

interface EventData {
  id: string
  title: string
  venue_id?: string
  genres?: string
}

interface EventInteractionButtonsProps {
  event: EventData
  size?: 'small' | 'large'
  showLabels?: boolean
  onHide?: () => void
}

type InterestStatus = 'none' | 'interested' | 'going'

export default function EventInteractionButtons({ 
  event, 
  size = 'large',
  showLabels = true,
  onHide
}: EventInteractionButtonsProps) {
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [isSaved, setIsSaved] = useState(false)
  const [interestStatus, setInterestStatus] = useState<InterestStatus>('none')
  const [saveCount, setSaveCount] = useState(0)
  const [interestedCount, setInterestedCount] = useState(0)
  const [goingCount, setGoingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showHideMenu, setShowHideMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      // Get user
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        setUser(userData.user)

        // Check if saved
        const { data: savedData } = await supabase
          .from('saved_events')
          .select('id')
          .eq('user_id', userData.user.id)
          .eq('event_id', event.id)
          .single()
        
        setIsSaved(!!savedData)

        // Check interest status
        const { data: interestData } = await supabase
          .from('event_interests')
          .select('status')
          .eq('user_id', userData.user.id)
          .eq('event_id', event.id)
          .single()
        
        if (interestData) {
          setInterestStatus(interestData.status as InterestStatus)
        }
      }

      // Get counts
      const { count: saves } = await supabase
        .from('saved_events')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
      
      setSaveCount(saves || 0)

      const { count: interested } = await supabase
        .from('event_interests')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'interested')
      
      setInterestedCount(interested || 0)

      const { count: going } = await supabase
        .from('event_interests')
        .select('id', { count: 'exact', head: true })
        .eq('event_id', event.id)
        .eq('status', 'going')
      
      setGoingCount(going || 0)

      setLoading(false)
    }

    loadData()
  }, [event.id])

  const handleSave = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    if (isSaved) {
      await supabase
        .from('saved_events')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id)
      
      setIsSaved(false)
      setSaveCount(Math.max(0, saveCount - 1))
      trackEventUnsave(event.id)
    } else {
      await supabase.from('saved_events').insert({
        user_id: user.id,
        event_id: event.id
      })
      
      setIsSaved(true)
      setSaveCount(saveCount + 1)
      trackEventSave(event.id, { venue_id: event.venue_id, genres: event.genres })
    }
  }

  const handleInterested = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    if (interestStatus === 'interested') {
      await supabase
        .from('event_interests')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id)
      
      setInterestStatus('none')
      setInterestedCount(Math.max(0, interestedCount - 1))
    } else {
      const wasGoing = interestStatus === 'going'
      
      await supabase.from('event_interests').upsert({
        user_id: user.id,
        event_id: event.id,
        status: 'interested'
      })
      
      setInterestStatus('interested')
      setInterestedCount(interestedCount + 1)
      if (wasGoing) {
        setGoingCount(Math.max(0, goingCount - 1))
      }
      trackEventInterested(event.id, { venue_id: event.venue_id, genres: event.genres })
    }
  }

  const handleGoing = async () => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    if (interestStatus === 'going') {
      await supabase
        .from('event_interests')
        .delete()
        .eq('user_id', user.id)
        .eq('event_id', event.id)
      
      setInterestStatus('none')
      setGoingCount(Math.max(0, goingCount - 1))
    } else {
      const wasInterested = interestStatus === 'interested'
      
      await supabase.from('event_interests').upsert({
        user_id: user.id,
        event_id: event.id,
        status: 'going'
      })
      
      setInterestStatus('going')
      setGoingCount(goingCount + 1)
      if (wasInterested) {
        setInterestedCount(Math.max(0, interestedCount - 1))
      }
      trackEventGoing(event.id, { venue_id: event.venue_id, genres: event.genres })
    }
  }

  const handleShare = async (method: 'copy' | 'native') => {
    const url = window.location.origin + '/event/' + event.id
    const text = event.title + ' - Sounded Out'

    if (method === 'copy') {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } else if (navigator.share) {
      await navigator.share({ title: text, url })
    }

    trackShare('event', event.id)
    setShowShareMenu(false)
  }

  const handleHide = async (reason: string) => {
    if (!user) {
      window.location.href = '/login'
      return
    }

    await supabase.from('user_hidden_items').insert({
      user_id: user.id,
      hidden_type: 'event',
      hidden_id: event.id,
      reason: reason
    })

    trackHide('event', event.id, reason)
    setShowHideMenu(false)
    
    if (onHide) {
      onHide()
    }
  }

  const isSmall = size === 'small'

  const buttonStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: isSmall ? '4px' : '8px',
    padding: isSmall ? '8px 12px' : '12px 20px',
    background: 'rgba(255,255,255,0.06)',
    border: 'none',
    borderRadius: isSmall ? '8px' : '10px',
    color: 'white',
    fontSize: isSmall ? '12px' : '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }

  const activeButtonStyle = {
    ...buttonStyle,
    background: '#ab67f7',
  }

  if (loading) {
    return <div style={{ height: isSmall ? '36px' : '48px' }} />
  }

  return (
    <div style={{ 
      display: 'flex', 
      gap: isSmall ? '8px' : '10px', 
      flexWrap: 'wrap',
      position: 'relative',
    }}>
      {/* Save Button */}
      <button
        onClick={handleSave}
        style={isSaved ? activeButtonStyle : buttonStyle}
      >
        <span>{isSaved ? '♥' : '♡'}</span>
        {showLabels && <span>{isSaved ? 'Saved' : 'Save'}</span>}
        {saveCount > 0 && <span style={{ opacity: 0.7 }}>({saveCount})</span>}
      </button>

      {/* Interested Button */}
      <button
        onClick={handleInterested}
        style={{
          ...buttonStyle,
          background: interestStatus === 'interested' ? 'rgba(171,103,247,0.2)' : buttonStyle.background,
          border: interestStatus === 'interested' ? '1px solid #ab67f7' : 'none',
        }}
      >
        <span>{interestStatus === 'interested' ? '★' : '☆'}</span>
        {showLabels && <span>Interested</span>}
        {interestedCount > 0 && <span style={{ opacity: 0.7 }}>({interestedCount})</span>}
      </button>

      {/* Going Button */}
      <button
        onClick={handleGoing}
        style={{
          ...buttonStyle,
          background: interestStatus === 'going' ? '#22c55e' : buttonStyle.background,
        }}
      >
        <span>{interestStatus === 'going' ? '✓' : '○'}</span>
        {showLabels && <span>Going</span>}
        {goingCount > 0 && <span style={{ opacity: 0.7 }}>({goingCount})</span>}
      </button>

      {/* Share Button */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => setShowShareMenu(!showShareMenu)}
          style={buttonStyle}
        >
          <span>↗</span>
          {showLabels && <span>{copied ? 'Copied!' : 'Share'}</span>}
        </button>

        {showShareMenu && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '8px',
            background: '#1a1a1e',
            borderRadius: '10px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            overflow: 'hidden',
            zIndex: 100,
            minWidth: '160px',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <button
              onClick={() => handleShare('copy')}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              📋 Copy link
            </button>
            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                onClick={() => handleShare('native')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  color: 'white',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                ↗ Share via...
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hide Button (small) */}
      {user && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowHideMenu(!showHideMenu)}
            style={{
              ...buttonStyle,
              padding: isSmall ? '8px 10px' : '12px 14px',
            }}
          >
            <span>✕</span>
          </button>

          {showHideMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              background: '#1a1a1e',
              borderRadius: '10px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              zIndex: 100,
              minWidth: '180px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{
                padding: '12px 16px',
                fontSize: '12px',
                color: '#888',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                Hide this event
              </p>
              <button
                onClick={() => handleHide('not_interested')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  color: 'white',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Not interested
              </button>
              <button
                onClick={() => handleHide('seen_already')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  color: 'white',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Seen it already
              </button>
              <button
                onClick={() => handleHide('other')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  color: '#f87171',
                  fontSize: '14px',
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                Something wrong
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
