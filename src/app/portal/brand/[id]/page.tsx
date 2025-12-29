'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// ============================================================================
// TYPES
// ============================================================================
type Brand = {
  id: string
  slug: string
  name: string
  tagline: string | null
  bio: string | null
  cover_image_url: string | null
  profile_image_url: string | null
  genres: string[]
  instagram_url: string | null
  soundcloud_url: string | null
  spotify_url: string | null
  website_url: string | null
  location: string
  founded_year: number | null
}

const AVAILABLE_GENRES = [
  'techno', 'house', 'minimal', 'dnb', 'garage', 'jungle',
  'disco', 'funk', 'soul', 'hip-hop', 'r&b', 'afrobeats',
  'latin', 'reggaeton', 'bassline', 'uk bass', 'dubstep',
  'trance', 'ambient', 'experimental', 'live', 'indie', 'rock', 'pop'
]

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function BrandEditPage() {
  const params = useParams()
  const router = useRouter()
  const brandId = params.id as string
  
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
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
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [location, setLocation] = useState('Newcastle')
  const [foundedYear, setFoundedYear] = useState<number | ''>('')
  
  useEffect(() => {
    const loadBrand = async () => {
      const { data } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single()
      
      if (data) {
        setBrand(data)
        setName(data.name)
        setSlug(data.slug)
        setTagline(data.tagline || '')
        setBio(data.bio || '')
        setProfileImageUrl(data.profile_image_url || '')
        setCoverImageUrl(data.cover_image_url || '')
        setGenres(data.genres || [])
        setInstagramUrl(data.instagram_url || '')
        setSoundcloudUrl(data.soundcloud_url || '')
        setSpotifyUrl(data.spotify_url || '')
        setWebsiteUrl(data.website_url || '')
        setLocation(data.location || 'Newcastle')
        setFoundedYear(data.founded_year || '')
      }
      
      setLoading(false)
    }
    
    loadBrand()
  }, [brandId])
  
  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required')
      return
    }
    if (!slug.trim()) {
      setError('URL slug is required')
      return
    }
    
    setSaving(true)
    setError(null)
    
    const { error: updateError } = await supabase
      .from('brands')
      .update({
        name: name.trim(),
        slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
        tagline: tagline.trim() || null,
        bio: bio.trim() || null,
        profile_image_url: profileImageUrl.trim() || null,
        cover_image_url: coverImageUrl.trim() || null,
        genres,
        instagram_url: instagramUrl.trim() || null,
        soundcloud_url: soundcloudUrl.trim() || null,
        spotify_url: spotifyUrl.trim() || null,
        website_url: websiteUrl.trim() || null,
        location: location.trim(),
        founded_year: foundedYear || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', brandId)
    
    setSaving(false)
    
    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
  }
  
  const toggleGenre = (genre: string) => {
    if (genres.includes(genre)) {
      setGenres(genres.filter(g => g !== genre))
    } else {
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
  
  if (!brand) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p>Brand not found</p>
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
        justifyContent: 'space-between',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/portal" style={{ color: '#888', textDecoration: 'none', fontSize: '24px' }}>←</Link>
          <h1 style={{ fontSize: '18px', fontWeight: 700 }}>Edit Brand</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Link
            href={`/brand/${brand.slug}`}
            target="_blank"
            style={{
              padding: '8px 16px',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '8px',
              color: '#888',
              textDecoration: 'none',
              fontSize: '13px',
            }}
          >
            Preview
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: '8px 20px',
              background: '#ab67f7',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </header>
      
      {/* Success Message */}
      {success && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: '#22c55e',
          borderRadius: '8px',
          color: 'white',
          fontWeight: 600,
          zIndex: 200,
          boxShadow: '0 4px 20px rgba(34,197,94,0.3)',
        }}>
          ✓ Changes saved!
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div style={{
          position: 'fixed',
          top: '80px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          background: '#ef4444',
          borderRadius: '8px',
          color: 'white',
          fontWeight: 600,
          zIndex: 200,
        }}>
          {error}
        </div>
      )}
      
      {/* Form */}
      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>
        
        {/* Cover Image Preview */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Cover Image</label>
          <div style={{
            height: '160px',
            borderRadius: '12px',
            overflow: 'hidden',
            marginBottom: '8px',
            background: coverImageUrl ? 'transparent' : 'linear-gradient(135deg, #1a1a2e, #16213e)',
          }}>
            {coverImageUrl && (
              <img src={coverImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )}
          </div>
          <input
            type="url"
            value={coverImageUrl}
            onChange={e => setCoverImageUrl(e.target.value)}
            placeholder="https://example.com/cover.jpg"
            style={inputStyle}
          />
          <p style={hintStyle}>Recommended: 2000 x 600px</p>
        </div>
        
        {/* Profile Image */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Profile Image</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '12px',
              overflow: 'hidden',
              background: '#1a1a1f',
            }}>
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(135deg, #ab67f7, #d7b3ff)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '32px',
                  fontWeight: 800,
                  color: 'white',
                }}>
                  {name.charAt(0) || '?'}
                </div>
              )}
            </div>
            <input
              type="url"
              value={profileImageUrl}
              onChange={e => setProfileImageUrl(e.target.value)}
              placeholder="https://example.com/logo.jpg"
              style={{ ...inputStyle, flex: 1 }}
            />
          </div>
          <p style={hintStyle}>Recommended: 500 x 500px</p>
        </div>
        
        {/* Name */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Brand Name *</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Underground Sound"
            style={inputStyle}
          />
        </div>
        
        {/* Slug */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>URL Slug *</label>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ color: '#666', fontSize: '14px', marginRight: '4px' }}>soundedout.com/brand/</span>
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
            placeholder="Newcastle's Premier Techno Collective"
            maxLength={100}
            style={inputStyle}
          />
          <p style={hintStyle}>{tagline.length}/100</p>
        </div>
        
        {/* Bio */}
        <div style={{ marginBottom: '20px' }}>
          <label style={labelStyle}>Bio</label>
          <textarea
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell your story..."
            rows={4}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }}
          />
        </div>
        
        {/* Genres */}
        <div style={{ marginBottom: '24px' }}>
          <label style={labelStyle}>Genres</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {AVAILABLE_GENRES.map(genre => (
              <button
                key={genre}
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
                  transition: 'all 150ms ease',
                }}
              >
                {genre}
              </button>
            ))}
          </div>
        </div>
        
        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '32px 0' }} />
        
        {/* Social Links */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#888' }}>
          SOCIAL LINKS
        </h3>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Instagram</label>
          <input
            type="url"
            value={instagramUrl}
            onChange={e => setInstagramUrl(e.target.value)}
            placeholder="https://instagram.com/undergroundsound"
            style={inputStyle}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>SoundCloud</label>
          <input
            type="url"
            value={soundcloudUrl}
            onChange={e => setSoundcloudUrl(e.target.value)}
            placeholder="https://soundcloud.com/undergroundsound"
            style={inputStyle}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Spotify</label>
          <input
            type="url"
            value={spotifyUrl}
            onChange={e => setSpotifyUrl(e.target.value)}
            placeholder="https://open.spotify.com/artist/..."
            style={inputStyle}
          />
        </div>
        
        <div style={{ marginBottom: '16px' }}>
          <label style={labelStyle}>Website</label>
          <input
            type="url"
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            placeholder="https://undergroundsound.com"
            style={inputStyle}
          />
        </div>
        
        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', margin: '32px 0' }} />
        
        {/* Other Info */}
        <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '16px', color: '#888' }}>
          OTHER INFO
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
          <div>
            <label style={labelStyle}>Location</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Newcastle"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Founded Year</label>
            <input
              type="number"
              value={foundedYear}
              onChange={e => setFoundedYear(e.target.value ? parseInt(e.target.value) : '')}
              placeholder="2020"
              min={1990}
              max={new Date().getFullYear()}
              style={inputStyle}
            />
          </div>
        </div>
        
        {/* Save Button (bottom) */}
        <button
          onClick={handleSave}
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
            cursor: 'pointer',
            opacity: saving ? 0.7 : 1,
            marginTop: '16px',
          }}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
        
        {/* Bottom padding */}
        <div style={{ height: '40px' }} />
      </div>
      
      <style jsx global>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  )
}

// Shared styles
const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: '#888',
  marginBottom: '8px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
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
  fontSize: '11px',
  color: '#555',
  marginTop: '6px',
}
