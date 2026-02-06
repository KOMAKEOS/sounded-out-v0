'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import AdminLoginGate from '@/components/AdminLoginGate'

interface Venue {
  id: string
  name: string
  address: string
  lat: number | null
  lng: number | null
  status: string
  image_url: string | null
  cover_image_url: string | null
  description: string | null
  deals: string | null
  instagram_url: string | null
  website_url: string | null
  no_phones: boolean
  created_at: string
}

export default function AdminVenuesPage() {
  return (
    <AdminLoginGate>
      <AdminVenuesContent />
    </AdminLoginGate>
  )
}

function AdminVenuesContent() {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    lat: '',
    lng: '',
    description: '',
    deals: '',
    image_url: '',
    instagram_url: '',
    website_url: '',
    no_phones: false,
    status: 'active'
  })

  useEffect(() => {
    loadVenues()
  }, [])

  const loadVenues = async () => {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('venues')
      .select('*')
      .order('name')

    if (!error && data) {
      setVenues(data as Venue[])
    }
    setLoading(false)
  }

  const filteredVenues = venues.filter((venue: Venue) => {
    const query = searchQuery.toLowerCase()
    return venue.name.toLowerCase().includes(query) ||
      venue.address?.toLowerCase().includes(query)
  })

  const openEditModal = (venue: Venue) => {
    setEditingVenue(venue)
    setIsCreating(false)
    setSaveError(null)
    setSaveSuccess(false)
    
    setFormData({
      name: venue.name || '',
      address: venue.address || '',
      lat: venue.lat?.toString() || '',
      lng: venue.lng?.toString() || '',
      description: venue.description || '',
      deals: venue.deals || '',
      image_url: venue.image_url || '',
      instagram_url: venue.instagram_url || '',
      website_url: venue.website_url || '',
      no_phones: venue.no_phones || false,
      status: venue.status || 'active'
    })
  }

  const openCreateModal = () => {
    setEditingVenue(null)
    setIsCreating(true)
    setSaveError(null)
    setSaveSuccess(false)
    
    setFormData({
      name: '',
      address: '',
      lat: '',
      lng: '',
      description: '',
      deals: '',
      image_url: '',
      instagram_url: '',
      website_url: '',
      no_phones: false,
      status: 'active'
    })
  }

  const closeModal = () => {
    setEditingVenue(null)
    setIsCreating(false)
    setSaveError(null)
    setSaveSuccess(false)
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
        .from('images')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setFormData(prev => ({ ...prev, image_url: urlData.publicUrl }))
    } catch (error: any) {
      alert(`Failed to upload image: ${error.message}`)
    }

    setUploadingImage(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    if (!formData.name.trim()) {
      setSaveError('Name is required')
      setSaving(false)
      return
    }

    try {
      const venueData = {
        name: formData.name.trim(),
        address: formData.address?.trim() || null,
        lat: formData.lat ? parseFloat(formData.lat) : null,
        lng: formData.lng ? parseFloat(formData.lng) : null,
        description: formData.description?.trim() || null,
        deals: formData.deals?.trim() || null,
        image_url: formData.image_url?.trim() || null,
        instagram_url: formData.instagram_url?.trim() || null,
        website_url: formData.website_url?.trim() || null,
        no_phones: formData.no_phones,
        status: formData.status
      }

      if (isCreating) {
        const { error } = await supabase
          .from('venues')
          .insert([venueData])

        if (error) throw error
        setSaveSuccess(true)
      } else if (editingVenue) {
        const { error } = await supabase
          .from('venues')
          .update(venueData)
          .eq('id', editingVenue.id)

        if (error) throw error
        setSaveSuccess(true)
      }

      setTimeout(async () => {
        await loadVenues()
        closeModal()
      }, 500)

    } catch (error: any) {
      setSaveError(error.message || 'Failed to save venue')
    }

    setSaving(false)
  }

  const handleDelete = async () => {
    if (!editingVenue) return
    if (!confirm(`Delete "${editingVenue.name}"? This will also delete all events at this venue.`)) return

    try {
      const { error } = await supabase
        .from('venues')
        .delete()
        .eq('id', editingVenue.id)

      if (error) throw error

      await loadVenues()
      closeModal()
    } catch (error: any) {
      alert(`Failed to delete venue: ${error.message}`)
    }
  }

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
            Venues Manager
          </h1>
          <span style={{
            background: 'rgba(34,197,94,0.15)',
            color: '#22c55e',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 600
          }}>
            {venues.length} venues
          </span>
        </div>
        <button
          onClick={openCreateModal}
          style={{
            padding: '10px 20px',
            background: '#22c55e',
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

      <main style={{ padding: '0 24px 40px' }}>
        {loading ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>Loading...</p>
        ) : filteredVenues.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '40px' }}>
            No venues found.
          </p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
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
                  height: '120px',
                  background: venue.image_url
                    ? `url(${venue.image_url}) center/cover`
                    : 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {!venue.image_url && <span style={{ fontSize: '32px', opacity: 0.3 }}>🏢</span>}
                </div>
                <div style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                      {venue.name}
                    </h3>
                    {venue.no_phones && (
                      <span style={{ fontSize: '14px' }}>📵</span>
                    )}
                  </div>
                  <p style={{ fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                    {venue.address || 'No address'}
                  </p>
                  {venue.deals && (
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#22c55e', 
                      background: 'rgba(34,197,94,0.1)',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      marginBottom: '8px'
                    }}>
                      🏷️ {venue.deals.slice(0, 40)}...
                    </p>
                  )}
                  <span style={{
                    padding: '3px 8px',
                    background: venue.status === 'active'
                      ? 'rgba(34,197,94,0.15)'
                      : 'rgba(248,113,113,0.15)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: venue.status === 'active' ? '#22c55e' : '#f87171',
                    textTransform: 'uppercase'
                  }}>
                    {venue.status}
                  </span>
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
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
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

            <div style={{ padding: '24px' }}>
              {saveError && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(248,113,113,0.15)',
                  border: '1px solid rgba(248,113,113,0.3)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  color: '#f87171',
                  fontSize: '14px'
                }}>
                  ❌ {saveError}
                </div>
              )}
              {saveSuccess && (
                <div style={{
                  padding: '12px 16px',
                  background: 'rgba(34,197,94,0.15)',
                  border: '1px solid rgba(34,197,94,0.3)',
                  borderRadius: '8px',
                  marginBottom: '16px',
                  color: '#22c55e',
                  fontSize: '14px'
                }}>
                  ✅ Venue saved!
                </div>
              )}

              {/* Image Upload */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '8px' }}>
                  Venue Image
                </label>
                <div style={{
                  height: '140px',
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
                    <span style={{ color: '#22c55e' }}>Uploading...</span>
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
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, image_url: '' }))}
                    style={{
                      marginTop: '8px',
                      padding: '6px 12px',
                      background: 'rgba(248,113,113,0.15)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#f87171',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Remove image
                  </button>
                )}
              </div>

              {/* Name */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>
                  Venue Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Digital"
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
                  Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="e.g. Times Square, Newcastle"
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

              {/* Coordinates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Latitude</label>
                  <input type="text" value={formData.lat} onChange={(e) => setFormData(prev => ({ ...prev, lat: e.target.value }))} placeholder="e.g. 54.9783" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Longitude</label>
                  <input type="text" value={formData.lng} onChange={(e) => setFormData(prev => ({ ...prev, lng: e.target.value }))} placeholder="e.g. -1.6178" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
                </div>
              </div>

              {/* Description */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Description</label>
                <textarea value={formData.description} onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} placeholder="About this venue..." style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px', resize: 'vertical' }} />
              </div>

              {/* Deals */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Current Deals</label>
                <input type="text" value={formData.deals} onChange={(e) => setFormData(prev => ({ ...prev, deals: e.target.value }))} placeholder="e.g. £3 drinks before 11pm" style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
              </div>

              {/* Social Links */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Instagram URL</label>
                  <input type="url" value={formData.instagram_url} onChange={(e) => setFormData(prev => ({ ...prev, instagram_url: e.target.value }))} placeholder="https://instagram.com/..." style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Website URL</label>
                  <input type="url" value={formData.website_url} onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))} placeholder="https://..." style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }} />
                </div>
              </div>

              {/* No Phones Toggle */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.no_phones} onChange={(e) => setFormData(prev => ({ ...prev, no_phones: e.target.checked }))} style={{ width: '18px', height: '18px' }} />
                  <span style={{ fontSize: '14px' }}>📵 No Phones Policy</span>
                </label>
              </div>

              {/* Status */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#888', marginBottom: '6px' }}>Status</label>
                <select value={formData.status} onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))} style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff', fontSize: '14px' }}>
                  <option value="active" style={{ background: '#111' }}>Active</option>
                  <option value="inactive" style={{ background: '#111' }}>Inactive</option>
                  <option value="pending" style={{ background: '#111' }}>Pending</option>
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={handleSave} disabled={saving} style={{ flex: 1, padding: '14px', background: saving ? '#444' : '#22c55e', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Saving...' : (isCreating ? 'Create Venue' : 'Save Changes')}
                </button>
                {!isCreating && (
                  <button type="button" onClick={handleDelete} style={{ padding: '14px 16px', background: 'rgba(248,113,113,0.15)', border: 'none', borderRadius: '10px', color: '#f87171', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
                    🗑️
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
