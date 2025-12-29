'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const AVAILABLE_GENRES = [
  'techno', 'house', 'minimal', 'dnb', 'garage', 'jungle',
  'disco', 'funk', 'soul', 'hip-hop', 'r&b', 'afrobeats',
  'latin', 'reggaeton', 'bassline', 'uk bass', 'dubstep',
  'trance', 'ambient', 'experimental', 'live', 'indie', 'rock', 'pop'
]

export default function CreateBrandPage() {
  const router = useRouter()
  
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [tagline, setTagline] = useState('')
  const [bio, setBio] = useState('')
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [coverImageUrl, setCoverImageUrl] = useState('')
  const [genres, setGenres] = useState<string[]>([])
  const [instagramUrl, setInstagramUrl] = useState('')
  const [soundcloudUrl, setSoundcloudUrl] = useState('')
  const [location, setLocation] = useState('Newcastle')
  
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/portal')
        return
      }
      setUser(session.user)
      setLoading(false)
    }
    checkAuth()
  }, [router])
  
  // Auto-generate slug from name
  useEffect(() => {
    if (name) {
      setSlug(name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''))
    }
  }, [name])
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Brand name is required')
      return
    }
    if (!slug.trim()) {
      setError('URL slug is required')
      return
    }
    
    setSaving(true)
    setError(null)
    
    // Check if slug is taken
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', slug)
      .single()
    
    if (existing) {
      setError('This URL is already taken. Try a different name.')
      setSaving(false)
      return
    }
    
    // Create brand
    const { data: brand, error: insertError } = await supabase
      .from('brands')
      .insert({
        name: name.trim(),
        slug: slug.trim(),
        tagline: tagline.trim() || null,
        bio: bio.trim() || null,
        profile_image_url: profileImageUrl.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
        genres,
        instagram_url: instagramUrl.trim() || null,
        soundcloud_url: soundcloudUrl.trim() || null,
        location: location.trim(),
        owner_user_id: user.id,
        is_verified: false,
      })
      .select()
      .single()
    
    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }
    
    // Redirect to edit page or portal
    router.push(`/portal/brand/${brand.id}`)
  }
  
  const toggleGenre = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter(g => g !== genre))
    } else if (genres.length < 5) {
      setGenres([...genres, genre])
    }
  }
  
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
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
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        background: 'rgba(10,10,11,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        zIndex: 100,
      }}>
        <Link href="/portal" style={{ color: '#888', textDecoration: 'none', fontSize: '24px' }}>←</Link>
        <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Create Your Brand</h1>
      </header>
      
      {/* Form */}
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>
        
        {/* Error */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '10px',
            color: '#f87171',
            marginBottom: '20px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}
        
        {/* Intro */}
        <div style={{
          padding: '20px',
          background: 'rgba(171,103,247,0.1)',
          border: '1px solid rgba(171,103,247,0.2)',
          borderRadius: '12px',
          marginBottom: '24px',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>
            🎵 Set up your promoter profile
          </h2>
          <p style={{ fontSize: '14px', color: '#888', lineHeight: 1.5 }}>
            Create your brand page so people can follow you and discover your events. 
            You can always edit this later.
          </p>
        </div>
        
        {/* Brand Name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Brand / Collective Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Underground Sound"
            style={inputStyle}
            required
          />
        </div>
        
        {/* Slug */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Your URL</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#666', fontSize: '14px' }}>soundedout.com/brand/</span>
            <input
              type="text"
              value={slug}
              onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder="underground-sound"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
        </div>
        
        {/* Tagline */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Tagline</label>
          <input
            type="text"
            value={tagline}
            onChange={e => setTagline(e.target.value)}
            placeholder="e.g. Newcastle's Premier Techno Collective"
            maxLength={100}
            style={inputStyle}
          />
        </div>
        
        {/* Bio */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>About</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell people what you're about..."
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
          />
        </div>
        
        {/* Profile Image */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Logo / Profile Image URL</label>
          <input
            type="url"
            value={profileImageUrl}
            onChange={e => setProfileImageUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
          <p style={hintStyle}>Paste a link to your logo (can add later)</p>
        </div>
        
        {/* Cover Image */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Cover Image URL</label>
          <input
            type="url"
            value={coverImageUrl}
            onChange={e => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            style={inputStyle}
          />
          <p style={hintStyle}>A wide banner image for your page (can add later)</p>
        </div>
        
        {/* Genres */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Genres (pick up to 5)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {AVAILABLE_GENRES.map(genre => (
              <button
                key={genre}
                type="button"
                onClick={() => toggleGenre(genre)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '20px',
                  border: 'none',
                  background: genres.includes(genre) ? '#ab67f7' : 'rgba(255,255,255,0.08)',
                  color: genres.includes(genre) ? 'white' : '#888',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
        
        {/* Instagram */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Instagram URL</label>
          <input
            type="url"
            value={instagramUrl}
            onChange={e => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/yourhandle"
            style={inputStyle}
          />
        </div>
        
        {/* SoundCloud */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>SoundCloud URL</label>
          <input
            type="url"
            value={soundcloudUrl}
            onChange={e => setSoundcloudUrl(e.target.value)}
            placeholder="https://soundcloud.com/yourhandle"
            style={inputStyle}
          />
        </div>
        
        {/* Location */}
        <div style={{ marginBottom: '32px' }}>
          <label style={labelStyle}>Location</label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Newcastle"
            style={inputStyle}
          />
        </div>
        
        {/* Submit */}
        <button
          type="submit"
          disabled={saving}
          style={{
            width: '100%',
            padding: '16px',
            background: '#ab67f7',
            border: 'none',
            borderRadius: '12px',
            color: 'white',
            fontSize: '16px',
            fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Creating...' : 'Create Brand'}
        </button>
        
        <p style={{ fontSize: '13px', color: '#555', textAlign: 'center', marginTop: '16px' }}>
          You can edit all of this later
        </p>
        
        <div style={{ height: '40px' }} />
      </form>
      
      <style jsx global>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#888',
  marginBottom: '8px',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  color: 'white',
  fontSize: '15px',
  outline: 'none',
}

const hintStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#555',
  marginTop: '6px',
}
