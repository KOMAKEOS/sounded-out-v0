'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

interface GenreOption {
  id: string
  label: string
}

const GENRES: GenreOption[] = [
  { id: 'techno', label: 'Techno' },
  { id: 'house', label: 'House' },
  { id: 'dnb', label: 'Drum & Bass' },
  { id: 'disco', label: 'Disco' },
  { id: 'hip-hop', label: 'Hip-Hop' },
  { id: 'rnb', label: 'R&B' },
  { id: 'indie', label: 'Indie' },
  { id: 'rock', label: 'Rock' },
  { id: 'jazz', label: 'Jazz' },
  { id: 'live', label: 'Live Music' },
  { id: 'latin', label: 'Latin' },
  { id: 'student', label: 'Student' },
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form fields
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  
  // Errors/Messages
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
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
      // Get profile - use upsert pattern
      let { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      // If no profile exists, create one
      if (profileError && profileError.code === 'PGRST116') {
        const { data: newProfile, error: insertError } = await supabase
          .from('user_profiles')
          .insert({ id: user.id })
          .select()
          .single()
        
        if (!insertError && newProfile) {
          profileData = newProfile
        }
      }

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

  const validateUsername = async (value: string): Promise<boolean> => {
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

  const toggleGenre = (genreId: string): void => {
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

  const handleAvatarClick = (): void => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('Image must be less than 2MB')
      return
    }

    setAvatarFile(file)
    setError(null)

    // Create preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setAvatarPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !user) return avatarUrl

    setUploadingAvatar(true)

    try {
      // Generate unique filename
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      setUploadingAvatar(false)
      return publicUrl
    } catch (err) {
      console.error('Avatar upload failed:', err)
      setUploadingAvatar(false)
      return avatarUrl // Return existing URL if upload fails
    }
  }

  const handleSave = async (): Promise<void> => {
    if (!user) return

    setError(null)
    setSuccess(null)
    setSaving(true)

    // Validate username
    if (username && !(await validateUsername(username))) {
      setSaving(false)
      return
    }

    try {
      // Upload avatar if new file selected
      let finalAvatarUrl = avatarUrl
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar()
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl
        }
      }

      // Update profile using upsert
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          display_name: displayName || null,
          username: username || null,
          bio: bio || null,
          avatar_url: finalAvatarUrl || null,
        }, {
          onConflict: 'id'
        })

      if (profileError) {
        console.error('Profile update error:', profileError)
        throw profileError
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
        }, {
          onConflict: 'user_id,genre'
        })
      }

      setSuccess('Profile updated successfully!')
      setAvatarUrl(finalAvatarUrl)
      setAvatarFile(null)
      setAvatarPreview(null)

      // Navigate after short delay to show success message
      setTimeout(() => {
        router.push('/profile')
      }, 1000)

    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  const currentAvatar = avatarPreview || avatarUrl

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
          disabled={saving || uploadingAvatar}
          style={{
            padding: '8px 20px',
            background: '#ab67f7',
            border: 'none',
            borderRadius: '8px',
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
        {/* Success Message */}
        {success && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '10px',
            marginBottom: '24px',
          }}>
            <p style={{ fontSize: '13px', color: '#22c55e' }}>{success}</p>
          </div>
        )}

        {/* Error Message */}
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

        {/* Avatar Upload */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
          
          <div 
            onClick={handleAvatarClick}
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              background: currentAvatar ? 'none' : '#ab67f7',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '3px solid #ab67f7',
              cursor: 'pointer',
              position: 'relative',
            }}
          >
            {currentAvatar ? (
              <img 
                src={currentAvatar} 
                alt="" 
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
              />
            ) : (
              <span style={{ fontSize: '40px', color: 'white' }}>
                {displayName?.[0]?.toUpperCase() || '?'}
              </span>
            )}
            
            {/* Upload overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0,
              transition: 'opacity 200ms',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0' }}
            >
              <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
                {uploadingAvatar ? 'Uploading...' : 'Change'}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleAvatarClick}
            style={{
              padding: '8px 16px',
              background: 'rgba(171,103,247,0.15)',
              border: '1px solid rgba(171,103,247,0.3)',
              borderRadius: '8px',
              color: '#ab67f7',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {avatarFile ? 'Change Photo' : 'Upload Photo'}
          </button>
          
          {avatarFile && (
            <p style={{ fontSize: '12px', color: '#22c55e', marginTop: '8px' }}>
              New photo selected - save to apply
            </p>
          )}
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
            gap: '10px',
          }}>
            {GENRES.map((genre: GenreOption) => {
              const isSelected = selectedGenres.indexOf(genre.id) !== -1
              return (
                <button
                  key={genre.id}
                  onClick={() => toggleGenre(genre.id)}
                  style={{
                    padding: '14px 12px',
                    background: isSelected ? 'rgba(171,103,247,0.2)' : '#141416',
                    border: isSelected ? '2px solid #ab67f7' : '2px solid transparent',
                    borderRadius: '10px',
                    color: isSelected ? '#ab67f7' : '#888',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s',
                    fontSize: '13px',
                    fontWeight: isSelected ? 600 : 500,
                  }}
                >
                  {genre.label}
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
