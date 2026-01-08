'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

// ============================================================================
// TYPES - Matches your venues table + new fields
// ============================================================================
interface Venue {
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
  no_phones: boolean
  is_claimed: boolean
  is_verified: boolean
  verified_at: string | null
  claimed_by_user_id: string | null
  description: string | null  // Bio
  deals: string | null        // Current deals/offers
}

const VENUE_TYPES = [
  'club',
  'bar',
  'pub',
  'live_music',
  'arena',
  'warehouse',
  'rooftop',
  'restaurant',
  'other'
]

const ADMIN_PASSCODE = '1234'

export default function AdminVenuesPage() {
  const [passcodeEntered, setPasscodeEntered] = useState(false)
  const [passcodeInput, setPasscodeInput] = useState('')
  const [passcodeError, setPasscodeError] = useState(false)

  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: 'Newcastle upon Tyne',
    lat: 54.9783,
    lng: -1.6178,
    venue_type: 'club',
    website_url: '',
    instagram_url: '',
    image_url: '',
    status: 'active',
    no_phones: false,
    description: '',
    deals: ''
  })

  useEffect(() => {
    const savedAccess = sessionStorage.getItem('so_admin_access')
    if (savedAccess === 'granted') {
      setPasscodeEntered(true)
    }
  }, [])

  useEffect(() => {
    if (passcodeEntered) {
      loadVenues()
    } else {
      setLoading(false)
    }
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

  const loadVenues = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error loading venues:', error)
    } else {
      setVenues(data || [])
    }
    setLoading(false)
  }

  const filteredVenues = venues.filter((venue: Venue) => {
    const query = searchQuery.toLowerCase()
    return venue.name.toLowerCase().includes(query) ||
      venue.address.toLowerCase().includes(query) ||
      venue.venue_type.toLowerCase().includes(query)
  })

  const openEditModal = (venue: Venue) => {
    setEditingVenue(venue)
    setIsCreating(false)
    setFormData({
      name: venue.name || '',
      address: venue.address || '',
      city: venue.city || 'Newcastle upon Tyne',
      lat: venue.lat || 54.9783,
      lng: venue.lng || -1.6178,
      venue_type: venue.venue_type || 'club',
      website_url: venue.website_url || '',
      instagram_url: venue.instagram_url || '',
      image_url: venue.image_url || '',
      status: venue.status || 'active',
      no_phones: venue.no_phones || false,
      description: venue.description || '',
      deals: venue.deals || ''
    })
  }

  const openCreateModal = () => {
    setEditingVenue(null)
    setIsCreating(true)
    setFormData({
      name: '',
      address: '',
      city: 'Newcastle upon Tyne',
      lat: 54.9783,
      lng: -1.6178,
      venue_type: 'club',
      website_url: '',
      instagram_url: '',
      image_url: '',
      status: 'active',
      no_phones: false,
      description: '',
      deals: ''
    })
  }

  const closeModal = () => {
    setEditingVenue(null)
    setIsCreating(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `venue-${Date.now()}.${fileExt}`
      const filePath = `venues/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image_url: publicUrl }))
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image. Make sure the "images" bucket exists in Supabase Storage.')
    }

    setUploadingImage(false)
  }

  const handleSave = async () => {
    setSaving(true)

    const venueData = {
      name: formData.name,
      address: formData.address,
      city: formData.city,
      lat: Number(formData.lat),
      lng: Number(formData.lng),
      venue_type: formData.venue_type,
      website_url: formData.website_url || null,
      instagram_url: formData.instagram_url || null,
      image_url: formData.image_url || null,
      status: formData.status,
      no_phones: formData.no_phones,
      description: formData.description || null,
      deals: formData.deals || null
    }

    try {
      if (isCreating) {
        const { error } = await supabase
          .from('venues')
          .insert([venueData])

        if (error) throw error
      } else if (editingVenue) {
        const { error } = await supabase
          .from('venues')
          .update(venueData)
          .eq('id', editingVenue.id)

        if (error) throw error
      }

      await loadVenues()
      closeModal()
    } catch (error) {
      console.error('Save error:', error)
      alert('Failed to save venue')
    }

    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editingVenue) return
    if (!confirm(`Delete "${editingVenue.name}"? This cannot be undone.`)) return

    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', editingVenue.id)

      if (error) throw error

      await loadVenues()
      closeModal()
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete venue')
    }
  }

  // ============================================================================
  // PASSCODE SCREEN
  // ============================================================================
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

  // ============================================================================
  // MAIN UI
  // ============================================================================
  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff' }}>
      {/* Header */}
      <header style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/admin" style={{ color: '#888', textDecoration: 'none' }}>
            ← Back
          </Link>
          <h1 style={{ fontSize: '20px', fontWeight: 700 }}>
            Venues Manager
          </h1>
          <span style={{
            background: 'rgba(171,103,247,0.15)',
            color: '#ab67f7',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {venues.length} total
          </span>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            padding: '10px 20px',
            background: '#ab67f7',
            border: 'none',
            borderRadius: '8px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          + Add Venue
        </button>
      </header>

      {/* Search */}
      <div style={{ padding: '20px 24px' }}>
        <input
          type="text"
          placeholder="Search venues..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#fff',
            fontSize: '14px',
            outline: 'none'
          }}
        />
      </div>

      {/* Venues Grid */}
      <main style={{ padding: '0 24px 40px' }}>
        {loading ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>Loading...</p>
        ) : filteredVenues.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
            No venues found
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '16px'
          }}>
            {filteredVenues.map((venue: Venue) => (
              <div
                key={venue.id}
                onClick={() => openEditModal(venue)}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  height: '140px',
                  background: venue.image_url
                    ? `url(${venue.image_url}) center/cover`
                    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {!venue.image_url && (
                    <span style={{ fontSize: '32px', opacity: 0.3 }}>🏢</span>
                  )}
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                      {venue.name}
                    </h3>
                    {venue.is_verified && (
                      <span style={{
                        width: '16px',
                        height: '16px',
                        background: '#ab67f7',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                      }}>✓</span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#888', margin: '0 0 8px' }}>
                    {venue.address}
                  </p>
                  
                  {/* Show deals badge if venue has deals */}
                  {venue.deals && (
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#22c55e', 
                      margin: '0 0 8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      🏷️ {venue.deals.length > 40 ? venue.deals.slice(0, 40) + '...' : venue.deals}
                    </p>
                  )}
                  
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{
                      padding: '3px 8px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: '#888',
                      textTransform: 'capitalize'
                    }}>
                      {venue.venue_type.replace('_', ' ')}
                    </span>
                    <span style={{
                      padding: '3px 8px',
                      background: venue.status === 'active'
                        ? 'rgba(34,197,94,0.15)'
                        : 'rgba(248,113,113,0.15)',
                      borderRadius: '4px',
                      fontSize: '11px',
                      color: venue.status === 'active' ? '#22c55e' : '#f87171'
                    }}>
                      {venue.status}
                    </span>
                    {venue.no_phones && (
                      <span style={{
                        padding: '3px 8px',
                        background: 'rgba(251,191,36,0.15)',
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: '#fbbf24'
                      }}>
                        📵
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Edit/Create Modal */}
      {(editingVenue || isCreating) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 1000,
          overflow: 'auto'
        }}>
          <div style={{
            background: '#111',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              position: 'sticky',
              top: 0,
              background: '#111',
              zIndex: 10
            }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
                {isCreating ? 'Add New Venue' : `Edit: ${editingVenue?.name}`}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#888',
                  fontSize: '24px',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: '24px' }}>
              {/* Image Upload */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Venue Image
                </label>
                <div style={{
                  height: '160px',
                  background: formData.image_url
                    ? `url(${formData.image_url}) center/cover`
                    : 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden'
                }}>
                  {!formData.image_url && !uploadingImage && (
                    <span style={{ color: '#666' }}>Click to upload</span>
                  )}
                  {uploadingImage && (
                    <span style={{ color: '#ab67f7' }}>Uploading...</span>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                </div>
                {formData.image_url && (
                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={formData.image_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                      placeholder="Or paste image URL"
                      style={{
                        flex: 1,
                        padding: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: '#fff',
                        fontSize: '12px'
                      }}
                    />
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                      style={{
                        padding: '8px 12px',
                        background: 'rgba(248,113,113,0.15)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#f87171',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>

              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* Address */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Address *
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px'
                  }}
                />
              </div>

              {/* City + Venue Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Venue Type
                  </label>
                  <select
                    value={formData.venue_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, venue_type: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  >
                    {VENUE_TYPES.map((type: string) => (
                      <option key={type} value={type} style={{ background: '#111' }}>
                        {type.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Lat/Lng */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lat}
                    onChange={(e) => setFormData(prev => ({ ...prev, lat: parseFloat(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    value={formData.lng}
                    onChange={(e) => setFormData(prev => ({ ...prev, lng: parseFloat(e.target.value) }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Bio / Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Bio / Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  placeholder="Tell people about this venue..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Deals */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  🏷️ Current Deals / Offers
                </label>
                <textarea
                  value={formData.deals}
                  onChange={(e) => setFormData(prev => ({ ...prev, deals: e.target.value }))}
                  rows={2}
                  placeholder="e.g. £3 drinks before 11pm, Free entry on Tuesdays..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(34,197,94,0.05)',
                    border: '1px solid rgba(34,197,94,0.2)',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
                <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                  This will show as a highlight on the venue card
                </p>
              </div>

              {/* Website + Instagram */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Website URL
                  </label>
                  <input
                    type="url"
                    value={formData.website_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
                    placeholder="https://"
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Instagram URL
                  </label>
                  <input
                    type="url"
                    value={formData.instagram_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, instagram_url: e.target.value }))}
                    placeholder="https://instagram.com/..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              {/* Status + No Phones */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '14px'
                    }}
                  >
                    <option value="active" style={{ background: '#111' }}>Active</option>
                    <option value="inactive" style={{ background: '#111' }}>Inactive</option>
                    <option value="pending" style={{ background: '#111' }}>Pending</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'end', paddingBottom: '8px' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.no_phones}
                      onChange={(e) => setFormData(prev => ({ ...prev, no_phones: e.target.checked }))}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <span style={{ fontSize: '14px' }}>📵 No Phones Policy</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  onClick={handleSave}
                  disabled={saving || !formData.name || !formData.address}
                  style={{
                    flex: 1,
                    padding: '14px',
                    background: saving ? '#444' : '#ab67f7',
                    border: 'none',
                    borderRadius: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: saving ? 'not-allowed' : 'pointer'
                  }}
                >
                  {saving ? 'Saving...' : (isCreating ? 'Create Venue' : 'Save Changes')}
                </button>
                {!isCreating && (
                  <button
                    onClick={handleDelete}
                    style={{
                      padding: '14px 20px',
                      background: 'rgba(248,113,113,0.15)',
                      border: 'none',
                      borderRadius: '10px',
                      color: '#f87171',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
