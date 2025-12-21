'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import Link from 'next/link'

// ============================================================================
// TYPES
// ============================================================================
type ClaimRequest = {
  id: string
  claim_type: 'venue' | 'event'
  venue_id: string | null
  event_id: string | null
  requested_by_name: string
  requested_by_email: string
  requested_by_phone: string | null
  role: string
  proof_url: string | null
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  // Joined data
  venue?: { name: string } | null
  event?: { title: string } | null
}

type Profile = {
  id: string
  email: string
  role: 'admin' | 'partner'
}

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================
export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState<ClaimRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  
  // ============================================================================
  // AUTH & DATA LOADING
  // ============================================================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user.id)
      }
    })
    
    return () => subscription.unsubscribe()
  }, [])
  
  const loadProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    
    if (data) {
      setProfile(data)
      if (data.role === 'admin') {
        loadClaims()
      }
    }
    setLoading(false)
  }
  
  const loadClaims = async () => {
    let query = supabase
      .from('claim_requests')
      .select(`
        *,
        venue:venues(name),
        event:events(title)
      `)
      .order('created_at', { ascending: false })
    
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }
    
    const { data, error } = await query
    
    if (data) {
      setClaims(data)
    }
  }
  
  useEffect(() => {
    if (profile?.role === 'admin') {
      loadClaims()
    }
  }, [statusFilter, profile])
  
  // ============================================================================
  // ACTIONS
  // ============================================================================
  const handleApprove = async (claim: ClaimRequest) => {
    setActionLoading(true)
    
    try {
      // 1. Update claim status
      await supabase
        .from('claim_requests')
        .update({ 
          status: 'approved',
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', claim.id)
      
      // 2. Check if user already exists with this email
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', claim.requested_by_email)
        .single()
      
      let userId = existingUser?.id
      
      // 3. If no user exists, we'll need to invite them (magic link)
      if (!userId) {
        // For now, just create a placeholder - they'll get invited via magic link
        // In production, you'd trigger the magic link invitation here
        alert(`User doesn't exist yet. Send them a magic link invite to: ${claim.requested_by_email}`)
      } else {
        // 4. Create entity_claim to grant ownership
        await supabase
          .from('entity_claims')
          .insert({
            user_id: userId,
            claim_type: claim.claim_type,
            venue_id: claim.venue_id,
            event_id: claim.event_id,
            role: claim.role || 'owner',
            granted_by: user.id,
          })
        
        // 5. Update the venue/event to mark as claimed
        if (claim.claim_type === 'venue' && claim.venue_id) {
          await supabase
            .from('venues')
            .update({ 
              is_claimed: true,
              claimed_by_user_id: userId,
            })
            .eq('id', claim.venue_id)
        } else if (claim.claim_type === 'event' && claim.event_id) {
          await supabase
            .from('events')
            .update({ 
              is_claimed: true,
              claimed_by_user_id: userId,
            })
            .eq('id', claim.event_id)
        }
      }
      
      // Refresh claims
      loadClaims()
      setSelectedClaim(null)
      
    } catch (error) {
      console.error('Error approving claim:', error)
      alert('Error approving claim')
    }
    
    setActionLoading(false)
  }
  
  const handleReject = async (claim: ClaimRequest) => {
    const reason = prompt('Rejection reason (optional):')
    
    setActionLoading(true)
    
    await supabase
      .from('claim_requests')
      .update({ 
        status: 'rejected',
        rejection_reason: reason,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', claim.id)
    
    loadClaims()
    setSelectedClaim(null)
    setActionLoading(false)
  }
  
  const handleToggleVerified = async (claim: ClaimRequest, verified: boolean) => {
    setActionLoading(true)
    
    if (claim.claim_type === 'venue' && claim.venue_id) {
      await supabase
        .from('venues')
        .update({ 
          is_verified: verified,
          verified_at: verified ? new Date().toISOString() : null,
        })
        .eq('id', claim.venue_id)
    } else if (claim.claim_type === 'event' && claim.event_id) {
      await supabase
        .from('events')
        .update({ 
          is_verified: verified,
          verified_at: verified ? new Date().toISOString() : null,
        })
        .eq('id', claim.event_id)
    }
    
    alert(`${claim.claim_type} ${verified ? 'verified' : 'unverified'}!`)
    setActionLoading(false)
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#888',
      }}>
        Loading...
      </div>
    )
  }
  
  // Not logged in or not admin
  if (!user || !profile || profile.role !== 'admin') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '16px',
        color: 'white',
      }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Access Denied</h1>
        <p style={{ color: '#888' }}>You need admin privileges to access this page.</p>
        <Link href="/" style={{ color: '#ab67f7' }}>← Back to map</Link>
      </div>
    )
  }
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
    }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/">
            <img src="/logo.svg" alt="Sounded Out" style={{ height: '24px', cursor: 'pointer' }} />
          </Link>
          <span style={{ 
            padding: '4px 10px', 
            background: 'rgba(248,113,113,0.15)', 
            borderRadius: '6px',
            color: '#f87171',
            fontSize: '11px',
            fontWeight: 700,
          }}>
            ADMIN
          </span>
        </div>
        <span style={{ color: '#888', fontSize: '13px' }}>{profile.email}</span>
      </header>
      
      {/* Content */}
      <main style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Claims Dashboard</h1>
        <p style={{ color: '#888', marginBottom: '24px' }}>Review and manage venue/event claim requests</p>
        
        {/* Status filters */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '8px 16px',
                background: statusFilter === status ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '8px',
                color: statusFilter === status ? 'white' : '#888',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {status}
            </button>
          ))}
        </div>
        
        {/* Claims list */}
        {claims.length === 0 ? (
          <div style={{
            padding: '60px',
            background: '#141416',
            borderRadius: '16px',
            textAlign: 'center',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <p style={{ color: '#888' }}>No {statusFilter !== 'all' ? statusFilter : ''} claims</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {claims.map(claim => (
              <div
                key={claim.id}
                onClick={() => setSelectedClaim(claim)}
                style={{
                  padding: '18px',
                  background: '#141416',
                  borderRadius: '14px',
                  border: selectedClaim?.id === claim.id 
                    ? '2px solid #ab67f7' 
                    : '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span style={{
                        padding: '3px 8px',
                        background: claim.claim_type === 'venue' ? 'rgba(59,130,246,0.15)' : 'rgba(171,103,247,0.15)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: claim.claim_type === 'venue' ? '#3b82f6' : '#ab67f7',
                        textTransform: 'uppercase',
                      }}>
                        {claim.claim_type}
                      </span>
                      <span style={{ fontSize: '16px', fontWeight: 600 }}>
                        {claim.claim_type === 'venue' ? claim.venue?.name : claim.event?.title}
                      </span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#888' }}>
                      {claim.requested_by_name} · {claim.requested_by_email}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {new Date(claim.created_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    background: claim.status === 'pending' 
                      ? 'rgba(251,191,36,0.15)' 
                      : claim.status === 'approved'
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(248,113,113,0.15)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: claim.status === 'pending' 
                      ? '#fbbf24' 
                      : claim.status === 'approved'
                        ? '#22c55e'
                        : '#f87171',
                    textTransform: 'uppercase',
                  }}>
                    {claim.status}
                  </span>
                </div>
                
                {/* Expanded details */}
                {selectedClaim?.id === claim.id && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>ROLE</p>
                        <p style={{ fontSize: '14px' }}>{claim.role || 'Not specified'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>PHONE</p>
                        <p style={{ fontSize: '14px' }}>{claim.requested_by_phone || 'Not provided'}</p>
                      </div>
                      <div style={{ gridColumn: 'span 2' }}>
                        <p style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>PROOF URL</p>
                        {claim.proof_url ? (
                          <a 
                            href={claim.proof_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ fontSize: '14px', color: '#ab67f7' }}
                          >
                            {claim.proof_url}
                          </a>
                        ) : (
                          <p style={{ fontSize: '14px', color: '#888' }}>Not provided</p>
                        )}
                      </div>
                      {claim.message && (
                        <div style={{ gridColumn: 'span 2' }}>
                          <p style={{ fontSize: '11px', color: '#666', marginBottom: '2px' }}>MESSAGE</p>
                          <p style={{ fontSize: '14px', color: '#888' }}>{claim.message}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Actions */}
                    {claim.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleApprove(claim) }}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: '#22c55e',
                            border: 'none',
                            borderRadius: '10px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ✓ Approve
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleReject(claim) }}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: 'rgba(248,113,113,0.15)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#f87171',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ✕ Reject
                        </button>
                      </div>
                    )}
                    
                    {claim.status === 'approved' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleVerified(claim, true) }}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: '#3b82f6',
                            border: 'none',
                            borderRadius: '10px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          ✓ Mark Verified
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleVerified(claim, false) }}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: 'rgba(255,255,255,0.1)',
                            border: 'none',
                            borderRadius: '10px',
                            color: '#888',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          Remove Verified
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
