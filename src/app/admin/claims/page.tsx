'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface ClaimRequest {
  id: string
  event_id: string | null
  venue_id: string | null
  brand_id: string | null
  claimer_name: string
  claimer_email: string
  claimer_role: string
  proof_url: string | null
  message: string | null
  status: string
  created_at: string
  event?: { title: string } | null
  venue?: { name: string } | null
  brand?: { name: string } | null
}

const ADMIN_PASSCODE = '1234'

export default function AdminClaimsPage() {
  const [passcodeEntered, setPasscodeEntered] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState(false)

  const [claims, setClaims] = useState<ClaimRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending')

  useEffect(() => {
    const savedAccess = sessionStorage.getItem('so_admin_access')
    if (savedAccess === 'granted') {
      setPasscodeEntered(true)
    }
  }, [])

  useEffect(() => {
    if (passcodeEntered) {
      loadClaims()
    } else {
      setLoading(false)
    }
  }, [passcodeEntered, filterStatus])

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
    setLoading(true)
    
    let query = supabase
      .from('claim_requests')
      .select(`
        *,
        event:events(title),
        venue:venues(name),
        brand:brands(name)
      `)
      .order('created_at', { ascending: false })

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus)
    }

    const { data, error } = await query.limit(100)

    if (error) {
      console.error('Error loading claims:', error)
    } else {
      setClaims((data || []) as ClaimRequest[])
    }
    setLoading(false)
  }

  const handleUpdateStatus = async (claimId: string, newStatus: 'approved' | 'rejected') => {
    const { error } = await supabase
      .from('claim_requests')
      .update({ 
        status: newStatus,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', claimId)

    if (error) {
      alert(`Error updating claim: ${error.message}`)
    } else {
      await loadClaims()
    }
  }

  const handleDelete = async (claimId: string) => {
    if (!confirm('Delete this claim request?')) return

    const { error } = await supabase
      .from('claim_requests')
      .delete()
      .eq('id', claimId)

    if (error) {
      alert(`Error deleting claim: ${error.message}`)
    } else {
      await loadClaims()
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getClaimTarget = (claim: ClaimRequest): string => {
    if (claim.event?.title) return `Event: ${claim.event.title}`
    if (claim.venue?.name) return `Venue: ${claim.venue.name}`
    if (claim.brand?.name) return `Brand: ${claim.brand.name}`
    return 'Unknown'
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#22c55e'
      case 'rejected': return '#f87171'
      default: return '#fbbf24'
    }
  }

  // PASSCODE SCREEN
  if (!passcodeEntered) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <form onSubmit={handlePasscodeSubmit} style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '320px',
          width: '100%',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#fff', fontSize: '24px', marginBottom: '8px' }}>
            🔐 Admin Access
          </h1>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
            Enter passcode to continue
          </p>
          <input
            type="password"
            value={passcodeInput}
            onChange={(e) => setPasscodeInput(e.target.value)}
            placeholder="Enter passcode"
            maxLength={4}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '24px',
              textAlign: 'center',
              letterSpacing: '8px',
              background: 'rgba(255,255,255,0.05)',
              border: passcodeError ? '2px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              color: '#fff',
              marginBottom: '16px',
              outline: 'none'
            }}
          />
          {passcodeError && (
            <p style={{ color: '#f87171', fontSize: '14px', marginBottom: '16px' }}>
              Incorrect passcode
            </p>
          )}
          <button type="submit" style={{
            width: '100%',
            padding: '14px',
            background: '#ab67f7',
            border: 'none',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer'
          }}>
            Enter
          </button>
        </form>
      </div>
    )
  }

  // MAIN UI
  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>
      <header style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ color: '#888', textDecoration: 'none' }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>
            Claim Requests
          </h1>
          <span style={{
            background: 'rgba(251,191,36,0.15)',
            color: '#fbbf24',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {claims.filter(c => c.status === 'pending').length} pending
          </span>
        </div>
      </header>

      {/* Filters */}
      <div style={{ padding: '20px 24px', display: 'flex', gap: '8px' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            style={{
              padding: '10px 16px',
              background: filterStatus === status ? '#ab67f7' : 'rgba(255,255,255,0.05)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      <main style={{ padding: '0 24px 40px' }}>
        {loading ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>Loading...</p>
        ) : claims.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '48px', marginBottom: '16px' }}>📋</p>
            <p style={{ fontSize: '16px', color: '#888', marginBottom: '8px' }}>
              No {filterStatus === 'all' ? '' : filterStatus} claims found
            </p>
            <p style={{ fontSize: '14px', color: '#555' }}>
              Claims will appear here when users submit them
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {claims.map((claim: ClaimRequest) => (
              <div
                key={claim.id}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  padding: '20px'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px' }}>
                      {claim.claimer_name}
                    </h3>
                    <p style={{ fontSize: '13px', color: '#888' }}>
                      {claim.claimer_email}
                    </p>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    background: `${getStatusColor(claim.status)}20`,
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: getStatusColor(claim.status),
                    textTransform: 'uppercase'
                  }}>
                    {claim.status}
                  </span>
                </div>

                {/* Details */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  borderRadius: '8px', 
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '13px' }}>
                    <div>
                      <span style={{ color: '#666' }}>Claiming:</span>
                      <p style={{ color: '#fff', marginTop: '2px' }}>{getClaimTarget(claim)}</p>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Role:</span>
                      <p style={{ color: '#fff', marginTop: '2px', textTransform: 'capitalize' }}>{claim.claimer_role}</p>
                    </div>
                    <div>
                      <span style={{ color: '#666' }}>Submitted:</span>
                      <p style={{ color: '#fff', marginTop: '2px' }}>{formatDate(claim.created_at)}</p>
                    </div>
                    {claim.proof_url && (
                      <div>
                        <span style={{ color: '#666' }}>Proof:</span>
                        <p style={{ marginTop: '2px' }}>
                          <a 
                            href={claim.proof_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#ab67f7', textDecoration: 'underline' }}
                          >
                            View proof →
                          </a>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {claim.message && (
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ color: '#666', fontSize: '13px' }}>Message:</span>
                      <p style={{ color: '#aaa', fontSize: '13px', marginTop: '4px', lineHeight: 1.5 }}>
                        "{claim.message}"
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                {claim.status === 'pending' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleUpdateStatus(claim.id, 'approved')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(34,197,94,0.15)',
                        border: '1px solid rgba(34,197,94,0.3)',
                        borderRadius: '8px',
                        color: '#22c55e',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(claim.id, 'rejected')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        background: 'rgba(248,113,113,0.15)',
                        border: '1px solid rgba(248,113,113,0.3)',
                        borderRadius: '8px',
                        color: '#f87171',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ✗ Reject
                    </button>
                    <button
                      onClick={() => handleDelete(claim.id)}
                      style={{
                        padding: '12px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        color: '#888',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                )}

                {claim.status !== 'pending' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={() => handleUpdateStatus(claim.id, 'approved')}
                      disabled={claim.status === 'approved'}
                      style={{
                        padding: '10px 16px',
                        background: claim.status === 'approved' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '8px',
                        color: claim.status === 'approved' ? '#22c55e' : '#888',
                        fontSize: '12px',
                        cursor: claim.status === 'approved' ? 'default' : 'pointer'
                      }}
                    >
                      Approved
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(claim.id, 'rejected')}
                      disabled={claim.status === 'rejected'}
                      style={{
                        padding: '10px 16px',
                        background: claim.status === 'rejected' ? 'rgba(248,113,113,0.3)' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '8px',
                        color: claim.status === 'rejected' ? '#f87171' : '#888',
                        fontSize: '12px',
                        cursor: claim.status === 'rejected' ? 'default' : 'pointer'
                      }}
                    >
                      Rejected
                    </button>
                    <button
                      onClick={() => handleDelete(claim.id)}
                      style={{
                        padding: '10px 16px',
                        background: 'rgba(255,255,255,0.05)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#888',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Delete
                    </button>
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
