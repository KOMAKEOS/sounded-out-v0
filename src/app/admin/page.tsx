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

// Set your admin passcode here
const ADMIN_PASSCODE = '6521' // Change this to your preferred 4-digit code

export default function AdminPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [claims, setClaims] = useState<ClaimRequest[]>([])
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [selectedClaim, setSelectedClaim] = useState<ClaimRequest | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState('')
  
  // Passcode state
  const [passcodeEntered, setPasscodeEntered] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState(false)
  
  // Check if passcode was already entered this session
  useEffect(() => {
    const savedAccess = sessionStorage.getItem('so_admin_access')
    if (savedAccess === 'granted') {
      setPasscodeEntered(true)
    }
  }, [])
  
  // ============================================================================
  // AUTH & DATA LOADING
  // ============================================================================
  useEffect(() => {
    // Only load data if passcode is entered
    if (!passcodeEntered) {
      setLoading(false)
      return
    }
    
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      loadClaims()
      setLoading(false)
    })
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    
    return () => subscription.unsubscribe()
  }, [passcodeEntered])
  
  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passcodeInput === ADMIN_PASSCODE) {
      setPasscodeEntered(true)
      setPasscodeError(false)
      sessionStorage.setItem('so_admin_access', 'granted')
    } else {
      setPasscodeError(true)
      setPasscodeInput('')
    }
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
    
    if (error) {
      console.error('Error loading claims:', error)
    }
    
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
    setActionMessage('')
    
    try {
      // 1. Update claim status to approved
      const { error: updateError } = await supabase
        .from('claim_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', claim.id)
      
      if (updateError) {
        throw new Error(`Failed to update claim: ${updateError.message}`)
      }
      
      // 2. Check if user exists with this email
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', claim.requested_by_email)
        .single()
      
      if (existingUser?.id) {
        // 3. Create entity_claim to grant ownership
        const { error: claimError } = await supabase
          .from('entity_claims')
          .insert({
            user_id: existingUser.id,
            claim_type: claim.claim_type,
            venue_id: claim.venue_id,
            event_id: claim.event_id,
            role: claim.role || 'owner',
          })
        
        if (claimError) {
          console.error('Entity claim error:', claimError)
        }
        
        // 4. Mark venue/event as claimed
        if (claim.claim_type === 'venue' && claim.venue_id) {
          await supabase
            .from('venues')
            .update({ is_claimed: true, claimed_by_user_id: existingUser.id })
            .eq('id', claim.venue_id)
        } else if (claim.claim_type === 'event' && claim.event_id) {
          await supabase
            .from('events')
            .update({ is_claimed: true, claimed_by_user_id: existingUser.id })
            .eq('id', claim.event_id)
        }
        
        setActionMessage('✓ Approved and linked to user!')
      } else {
        setActionMessage('✓ Approved! User needs to sign up at /portal first.')
      }
      
      // Refresh claims list
      await loadClaims()
      setSelectedClaim(null)
      
    } catch (error: any) {
      console.error('Approve error:', error)
      setActionMessage(`Error: ${error.message}`)
    }
    
    setActionLoading(false)
  }
  
  const handleReject = async (claim: ClaimRequest) => {
    setActionLoading(true)
    setActionMessage('')
    
    try {
      const { error } = await supabase
        .from('claim_requests')
        .update({ 
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', claim.id)
      
      if (error) throw error
      
      setActionMessage('Claim rejected')
      await loadClaims()
      setSelectedClaim(null)
      
    } catch (error: any) {
      setActionMessage(`Error: ${error.message}`)
    }
    
    setActionLoading(false)
  }
  
  const handleToggleVerified = async (claim: ClaimRequest, verified: boolean) => {
    setActionLoading(true)
    setActionMessage('')
    
    try {
      if (claim.claim_type === 'venue' && claim.venue_id) {
        const { error } = await supabase
          .from('venues')
          .update({ 
            is_verified: verified,
            verified_at: verified ? new Date().toISOString() : null,
          })
          .eq('id', claim.venue_id)
        
        if (error) throw error
      } else if (claim.claim_type === 'event' && claim.event_id) {
        const { error } = await supabase
          .from('events')
          .update({ 
            is_verified: verified,
            verified_at: verified ? new Date().toISOString() : null,
          })
          .eq('id', claim.event_id)
        
        if (error) throw error
      }
      
      setActionMessage(verified ? '✓ Verified badge added!' : 'Verified badge removed')
      
    } catch (error: any) {
      setActionMessage(`Error: ${error.message}`)
    }
    
    setActionLoading(false)
  }
  
  // ============================================================================
  // RENDER
  // ============================================================================
  
  // Passcode gate
  if (!passcodeEntered) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '20px',
      }}>
        <div style={{
          background: '#141416',
          borderRadius: '20px',
          padding: '32px',
          width: '100%',
          maxWidth: '320px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(248,113,113,0.15)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              fontSize: '24px',
            }}>
              🔐
            </div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: 'white', marginBottom: '4px' }}>Admin Access</h1>
            <p style={{ fontSize: '13px', color: '#888' }}>Enter passcode to continue</p>
          </div>
          
          <form onSubmit={handlePasscodeSubmit}>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={passcodeInput}
              onChange={(e) => {
                setPasscodeInput(e.target.value.replace(/\D/g, ''))
                setPasscodeError(false)
              }}
              placeholder="••••"
              autoFocus
              style={{
                width: '100%',
                padding: '16px',
                background: '#1e1e24',
                border: passcodeError ? '2px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: 'white',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                outline: 'none',
                marginBottom: '16px',
              }}
            />
            
            {passcodeError && (
              <p style={{
                color: '#f87171',
                fontSize: '13px',
                textAlign: 'center',
                marginBottom: '16px',
              }}>
                Incorrect passcode
              </p>
            )}
            
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '15px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Enter
            </button>
          </form>
        </div>
        
        <Link href="/" style={{ color: '#666', fontSize: '13px', marginTop: '24px', textDecoration: 'none' }}>
          ← Back to map
        </Link>
      </div>
    )
  }
  
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
        <button
          onClick={() => {
            sessionStorage.removeItem('so_admin_access')
            setPasscodeEntered(false)
            setPasscodeInput('')
          }}
          style={{
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            color: '#888',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Lock
        </button>
      </header>
      
      {/* Content */}
      <main style={{ padding: '24px 20px', maxWidth: '1000px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Claims Dashboard</h1>
        <p style={{ color: '#888', marginBottom: '24px' }}>Review and manage venue/event claim requests</p>
        
        {/* Action message */}
        {actionMessage && (
          <div style={{
            padding: '12px 16px',
            background: actionMessage.includes('Error') ? 'rgba(248,113,113,0.15)' : 'rgba(34,197,94,0.15)',
            borderRadius: '10px',
            marginBottom: '20px',
            fontSize: '14px',
            color: actionMessage.includes('Error') ? '#f87171' : '#22c55e',
          }}>
            {actionMessage}
          </div>
        )}
        
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
                onClick={() => setSelectedClaim(selectedClaim?.id === claim.id ? null : claim)}
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
                            onClick={(e) => e.stopPropagation()}
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
                    
                    {/* Actions for pending claims */}
                    {claim.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation()
                            handleApprove(claim) 
                          }}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: actionLoading ? '#444' : '#22c55e',
                            border: 'none',
                            borderRadius: '10px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {actionLoading ? 'Processing...' : '✓ Approve'}
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation()
                            handleReject(claim) 
                          }}
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
                    
                    {/* Actions for approved claims - PURPLE verified badge */}
                    {claim.status === 'approved' && (
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation()
                            handleToggleVerified(claim, true) 
                          }}
                          disabled={actionLoading}
                          style={{
                            flex: 1,
                            padding: '12px',
                            background: actionLoading ? '#444' : '#ab67f7',
                            border: 'none',
                            borderRadius: '10px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 700,
                            cursor: actionLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}
                        >
                          <span style={{
                            width: '16px',
                            height: '16px',
                            background: 'white',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: '#ab67f7',
                          }}>✓</span>
                          Add Verified Badge
                        </button>
                        <button
                          onClick={(e) => { 
                            e.stopPropagation()
                            handleToggleVerified(claim, false) 
                          }}
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
                          Remove Badge
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
