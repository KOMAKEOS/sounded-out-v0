'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

interface GenreOption {
  id: string
  label: string
  emoji: string
}

const GENRES: GenreOption[] = [
  { id: 'techno', label: 'Techno', emoji: '🔊' },
  { id: 'house', label: 'House', emoji: '🏠' },
  { id: 'dnb', label: 'Drum & Bass', emoji: '🥁' },
  { id: 'disco', label: 'Disco', emoji: '🪩' },
  { id: 'hip-hop', label: 'Hip-Hop', emoji: '🎤' },
  { id: 'rnb', label: 'R&B', emoji: '💜' },
  { id: 'indie', label: 'Indie', emoji: '🎸' },
  { id: 'rock', label: 'Rock', emoji: '🤘' },
  { id: 'jazz', label: 'Jazz', emoji: '🎷' },
  { id: 'live', label: 'Live Music', emoji: '🎵' },
  { id: 'latin', label: 'Latin', emoji: '💃' },
  { id: 'student', label: 'Student', emoji: '🎓' },
]

interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  bio: string | null
  avatar_url: string | null
}

interface GenrePref {
  genre: string
  preference_score: number
}

export default function EditProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<{ id: string } | null>(null)
  
  // Form fields
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  
  // Errors
  const [error, setError] = useState<string | null>(null)
  const [usernameError, setUsernameError] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
      } else {
        router.push('/login')
      }
    }
    loadUser()
  }, [router])

  useEffect(() => {
    if (!user) return

    const loadProfile = async () => {
      // Get profile
      const { data: profileData } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileData) {
        const profile = profileData as UserProfile
        setDisplayName(profile.display_name || '')
        setUsername(profile.username || '')
        setBio(profile.bio || '')
        setAvatarUrl(profile.avatar_url || '')
      }

      // Get genre preferences
      const { data: genresData } = await supabase
        .from('user_genre_preferences')
        .select('genre, preference_score')
        .eq('user_id', user.id)
        .gte('preference_score', 60)

      if (genresData) {
        const genres: string[] = []
        const typed = genresData as GenrePref[]
        for (let i = 0; i < typed.length; i++) {
          genres.push(typed[i].genre)
        }
        setSelectedGenres(genres)
      }

      setLoading(false)
    }

    loadProfile()
  }, [user])

  const validateUsername = async (value: string) => {
    if (!value) {
      setUsernameError(null)
      return true
    }

    // Check format
    if (!/^[a-z0-9_]{3,20}$/.test(value)) {
      setUsernameError('Username must be 3-20 characters, lowercase letters, numbers, and underscores only')
      return false
    }

    // Check availability
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('username', value)
      .neq('id', user?.id || '')
      .single()

    if (data) {
      setUsernameError('Username already taken')
      return false
    }

    setUsernameError(null)
    return true
  }

  const toggleGenre = (genreId: string) => {
    if (selectedGenres.indexOf(genreId) !== -1) {
      const newGenres: string[] = []
      for (let i = 0; i < selectedGenres.length; i++) {
        if (selectedGenres[i] !== genreId) {
          newGenres.push(selectedGenres[i])
        }
      }
      setSelectedGenres(newGenres)
    } else {
      setSelectedGenres([...selectedGenres, genreId])
    }
  }

  const handleSave = async () => {
    if (!user) return

    setError(null)
    setSaving(true)

    // Validate username
    if (username && !(await validateUsername(username))) {
      setSaving(false)
      return
    }

    // Update profile
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        display_name: displayName || null,
        username: username || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
      })
      .eq('id', user.id)

    if (profileError) {
      setError(profileError.message)
      setSaving(false)
      return
    }

    // Update genre preferences
    // First, set all to low score
    await supabase
      .from('user_genre_preferences')
      .update({ preference_score: 30, is_manual: false })
      .eq('user_id', user.id)

    // Then upsert selected genres with high score
    for (let i = 0; i < selectedGenres.length; i++) {
      await supabase.from('user_genre_preferences').upsert({
        user_id: user.id,
        genre: selectedGenres[i],
        preference_score: 80,
        is_manual: true,
      })
    }

    setSaving(false)
    router.push('/profile')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '100px' }}>
      {/* Header */}
      <header style={{
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        background: '#0a0a0b',
        zIndex: 10,
      }}>
        <Link
          href="/profile"
          style={{
            color: '#888',
            textDecoration: 'none',
            fontSize: '14px',
          }}
        >
          Cancel
        </Link>
        <h1 style={{ fontSize: '16px', fontWeight: 600 }}>Edit Profile</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '6px 16px',
            background: '#ab67f7',
            border: 'none',
            borderRadius: '6px',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: '10px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '13px', color: '#f87171' }}>{error}</p>
          </div>
        )}

        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '50%',
            background: avatarUrl ? 'none' : 'linear-gradient(135deg, #ab67f7, #8b5cf6)',
            margin: '0 auto 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            border: '3px solid #ab67f7',
          }}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: '36px', color: 'white' }}>
                {displayName?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
            Paste an image URL to set your avatar
          </p>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            style={{
              width: '100%',
              maxWidth: '300px',
              padding: '10px 14px',
              background: '#141416',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: 'white',
              fontSize: '13px',
              outline: 'none',
            }}
          />
        </div>

        {/* Form Fields */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#888',
              marginBottom: '8px',
            }}>
              Display Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: '#141416',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#888',
              marginBottom: '8px',
            }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '16px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#666',
                fontSize: '15px',
              }}>@</span>
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase())
                  setUsernameError(null)
                }}
                onBlur={() => validateUsername(username)}
                placeholder="username"
                maxLength={20}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  paddingLeft: '36px',
                  background: '#141416',
                  border: usernameError ? '1px solid #f87171' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
            </div>
            {usernameError && (
              <p style={{ fontSize: '12px', color: '#f87171', marginTop: '6px' }}>{usernameError}</p>
            )}
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#888',
              marginBottom: '8px',
            }}>
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              maxLength={160}
              rows={3}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: '#141416',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '15px',
                outline: 'none',
                resize: 'none',
                fontFamily: 'inherit',
              }}
            />
            <p style={{ fontSize: '12px', color: '#666', marginTop: '6px' }}>
              {bio.length}/160
            </p>
          </div>
        </div>

        {/* Genre Preferences */}
        <div>
          <h2 style={{
            fontSize: '16px',
            fontWeight: 600,
            marginBottom: '8px',
          }}>
            Your Music Taste
          </h2>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
            Select genres you enjoy. This helps us personalize your recommendations.
          </p>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
            gap: '10px',
          }}>
            {GENRES.map((genre: GenreOption) => {
              const isSelected = selectedGenres.indexOf(genre.id) !== -1
              return (
                <button
                  key={genre.id}
                  onClick={() => toggleGenre(genre.id)}
                  style={{
                    padding: '12px',
                    background: isSelected ? 'rgba(171,103,247,0.2)' : '#141416',
                    border: isSelected ? '2px solid #ab67f7' : '2px solid transparent',
                    borderRadius: '10px',
                    color: 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '20px', display: 'block', marginBottom: '4px' }}>
                    {genre.emoji}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 500 }}>
                    {genre.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
