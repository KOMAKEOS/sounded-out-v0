'use client'

import { useState } from 'react'
import { trackTicketClick, trackDirectionsClick, trackShareClick, trackEventSave, trackEventUnsave } from '@/lib/analytics'

interface EventActionsProps {
  event: {
    id: string
    title: string
    start_time: string
    event_url: string | null
    sold_out?: boolean
    price_min: number | null
    price_max: number | null
    venue?: { id: string; name: string; lat: number; lng: number }
    genres?: string
    brand?: { name: string } | null
  }
  isSaved: boolean
  isLoggedIn: boolean
  onSave: (eventId: string) => void
  onShowLoginModal: () => void
  onClaim: () => void
  formatPrice: (min: number | null, max: number | null) => string | null
  getDateLabel: (date: string) => string
}

export default function EventActions({ event, isSaved, isLoggedIn, onSave, onShowLoginModal, onClaim, formatPrice, getDateLabel }: EventActionsProps) {
  const [copied, setCopied] = useState(false)
  const isFree = event.price_min === 0 || (!event.price_min && !event.price_max)
  const ticketUrl = event.event_url ? (event.event_url.startsWith('http') ? event.event_url : `https://${event.event_url}`) : null
  const mapsUrl = event.venue ? `https://www.google.com/maps/dir/?api=1&destination=${event.venue.lat},${event.venue.lng}` : null

  const handleTicketClick = () => {
    trackTicketClick(event.id, event.title, event.venue?.name || '', event.venue?.id || '', event.genres?.split(',')[0]?.trim() || '', event.genres || '', 'sounded_out', event.brand?.name || '', event.start_time, event.price_min || 0, event.event_url || '', 'detail_card')
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/event/${event.id}`
    const shareText = `Check out ${event.title} at ${event.venue?.name || ''}`
    trackShareClick(event.id, event.title, typeof navigator.share === 'function' ? 'native_share' : 'clipboard', event.venue?.name)
    try {
      if (navigator.share) { await navigator.share({ title: event.title, text: shareText, url: shareUrl }) }
      else { await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`); setCopied(true); setTimeout(() => setCopied(false), 2000) }
    } catch (err) { console.log('Share failed:', err) }
  }

  const handleSave = () => {
    if (!isLoggedIn) { onShowLoginModal(); return }
    if (isSaved) { trackEventUnsave(event.id, event.title, event.venue?.name) }
    else { trackEventSave(event.id, event.title, event.venue?.name) }
    onSave(event.id)
  }

  const handleDirections = () => { trackDirectionsClick(event.id, event.venue?.name || '', event.venue?.id, event.title) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {ticketUrl && (
        <a href={`/event/${event.id}`} target="_blank" rel="noopener noreferrer" onClick={handleTicketClick} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px 24px', background: event.sold_out ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #ab67f7, #d7b3ff)', border: 'none', borderRadius: '14px', fontSize: '16px', fontWeight: 700, color: event.sold_out ? '#666' : 'white', textDecoration: 'none', cursor: event.sold_out ? 'default' : 'pointer' }}>
          {event.sold_out ? 'Sold Out' : isFree ? 'View Event Page' : `Get Tickets · ${formatPrice(event.price_min, event.price_max)}`}
        </a>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <button onClick={handleSave} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '16px 12px', background: isSaved ? 'rgba(248,113,113,0.15)' : 'rgba(255,255,255,0.05)', border: isSaved ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', minHeight: '72px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={isSaved ? '#f87171' : 'none'} stroke={isSaved ? '#f87171' : '#999'} strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          <span style={{ fontSize: '12px', fontWeight: 600, color: isSaved ? '#f87171' : '#999' }}>{isSaved ? 'Saved' : 'Save'}</span>
        </button>
        <button onClick={handleShare} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '16px 12px', background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)', border: copied ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', minHeight: '72px' }}>
          {copied ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>}
          <span style={{ fontSize: '12px', fontWeight: 600, color: copied ? '#22c55e' : '#999' }}>{copied ? 'Copied!' : 'Share'}</span>
        </button>
        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={handleDirections} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '16px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', textDecoration: 'none', minHeight: '72px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#999' }}>Directions</span>
          </a>
        )}
        <button onClick={onClaim} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '16px 12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', cursor: 'pointer', minHeight: '72px' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#999' }}>Claim</span>
        </button>
      </div>
    </div>
  )
}
