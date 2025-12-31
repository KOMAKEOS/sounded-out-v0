'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  display_name: string | null
  avatar_url: string | null
  username: string | null
}

export default function UserButton() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [showMenu, setShowMenu] = useState(false)
  const [loading, setLoading] = useState(true)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user)
        
        // Load profile
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id, display_name, avatar_url, username')
          .eq('id', data.user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData as UserProfile)
        }
      }
      setLoading(false)
    }

    loadUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    // Close menu when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setShowMenu(false)
    setUser(null)
    setProfile(null)
  }

  if (loading) {
    return (
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'rgba(255,255,255,0.05)',
      }} />
    )
  }

  // Not logged in - show sign in button
  if (!user) {
    return (
      <Link
        href="/login"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: '#ab67f7',
          borderRadius: '20px',
          color: 'white',
          textDecoration: 'none',
          fontSize: '13px',
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}
      >
        Sign in
      </Link>
    )
  }

  // Logged in - show avatar and menu
  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          background: profile?.avatar_url ? 'none' : 'linear-gradient(135deg, #ab67f7, #8b5cf6)',
          border: '2px solid rgba(171,103,247,0.5)',
          cursor: 'pointer',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        {profile?.avatar_url ? (
          <img 
            src={profile.avatar_url} 
            alt="" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <span style={{ color: 'white', fontSize: '14px', fontWeight: 600 }}>
            {profile?.display_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <div style={{
          position: 'absolute',
          top: '44px',
          right: 0,
          width: '200px',
          background: '#1a1a1e',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          zIndex: 1000,
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* User info */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '2px' }}>
              {profile?.display_name || 'Anonymous'}
            </p>
            <p style={{ fontSize: '12px', color: '#888' }}>
              {profile?.username ? '@' + profile.username : user.email}
            </p>
          </div>

          {/* Menu items */}
          <div style={{ padding: '8px' }}>
            <Link
              href="/profile"
              onClick={() => setShowMenu(false)}
              style={{
                display: 'block',
                padding: '10px 12px',
                borderRadius: '8px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              👤 Profile
            </Link>
            <Link
              href="/saved"
              onClick={() => setShowMenu(false)}
              style={{
                display: 'block',
                padding: '10px 12px',
                borderRadius: '8px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              ♡ Saved
            </Link>
            <Link
              href="/friends"
              onClick={() => setShowMenu(false)}
              style={{
                display: 'block',
                padding: '10px 12px',
                borderRadius: '8px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              👥 Friends
            </Link>
            <Link
              href="/settings"
              onClick={() => setShowMenu(false)}
              style={{
                display: 'block',
                padding: '10px 12px',
                borderRadius: '8px',
                color: 'white',
                textDecoration: 'none',
                fontSize: '14px',
              }}
            >
              ⚙️ Settings
            </Link>
          </div>

          {/* Sign out */}
          <div style={{
            padding: '8px',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'none',
                border: 'none',
                borderRadius: '8px',
                color: '#f87171',
                fontSize: '14px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
