'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

interface UserProfile {
  id: string
  email_notifications: boolean
  push_notifications: boolean
  weekly_digest: boolean
  profile_public: boolean
  show_activity: boolean
  show_saved_events: boolean
}

interface User {
  id: string
  email?: string
  created_at?: string
  app_metadata?: {
    provider?: string
  }
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user as User)
        
        // Load profile settings
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single()
        
        if (profileData) {
          setProfile(profileData as UserProfile)
        }
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    loadUser()
  }, [router])

  const updateSetting = async (key: string, value: boolean) => {
    if (!user || !profile) return
    
    setSaving(true)
    
    const updates: Record<string, boolean> = {}
    updates[key] = value
    
    await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
    
    setProfile({ ...profile, [key]: value })
    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    if (user) {
      // Delete user data
      await supabase.from('saved_events').delete().eq('user_id', user.id)
      await supabase.from('event_interests').delete().eq('user_id', user.id)
      await supabase.from('user_interactions').delete().eq('user_id', user.id)
      await supabase.from('user_genre_preferences').delete().eq('user_id', user.id)
      await supabase.from('user_venue_preferences').delete().eq('user_id', user.id)
      await supabase.from('user_follows').delete().eq('follower_id', user.id)
      await supabase.from('user_follows').delete().eq('following_id', user.id)
      await supabase.from('user_hidden_items').delete().eq('user_id', user.id)
      await supabase.from('user_profiles').delete().eq('id', user.id)
    }
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  if (!user) {
    return null
  }

  const memberSince = user.created_at 
    ? new Date(user.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'Unknown'

  const provider = user.app_metadata?.provider === 'google' ? 'Google' : 'Email'

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '60px' }}>
      <header style={{
        padding: '16px 20px',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
      }}>
        <Link href="/profile" style={{ color: '#888', textDecoration: 'none', fontSize: '14px' }}>
          ← Back
        </Link>
        <h1 style={{ fontSize: '16px', fontWeight: 600 }}>Settings</h1>
      </header>

      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px' }}>
        {/* Account Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#888', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: '16px',
          }}>
            Account
          </h2>
          
          <div style={{ background: '#141416', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Email</p>
              <p style={{ fontSize: '14px', color: 'white' }}>{user.email || 'No email'}</p>
            </div>
            
            <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Signed in via</p>
              <p style={{ fontSize: '14px', color: 'white' }}>{provider}</p>
            </div>
            
            <div style={{ padding: '16px' }}>
              <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Member since</p>
              <p style={{ fontSize: '14px', color: 'white' }}>{memberSince}</p>
            </div>
          </div>
        </section>

        {/* Notifications Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#888', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: '16px',
          }}>
            Notifications
          </h2>
          
          <div style={{ background: '#141416', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>Email notifications</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Updates about saved events</p>
              </div>
              <button
                onClick={() => updateSetting('email_notifications', !profile?.email_notifications)}
                disabled={saving}
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: profile?.email_notifications ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: profile?.email_notifications ? '24px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>Weekly digest</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Personalized event recommendations</p>
              </div>
              <button
                onClick={() => updateSetting('weekly_digest', !profile?.weekly_digest)}
                disabled={saving}
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: profile?.weekly_digest ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: profile?.weekly_digest ? '24px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>Push notifications</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Event reminders and updates</p>
              </div>
              <button
                onClick={() => updateSetting('push_notifications', !profile?.push_notifications)}
                disabled={saving}
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: profile?.push_notifications ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: profile?.push_notifications ? '24px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#888', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: '16px',
          }}>
            Privacy
          </h2>
          
          <div style={{ background: '#141416', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>Public profile</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Others can see your profile</p>
              </div>
              <button
                onClick={() => updateSetting('profile_public', !profile?.profile_public)}
                disabled={saving}
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: profile?.profile_public ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: profile?.profile_public ? '24px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>Show activity</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Friends can see events you&apos;re going to</p>
              </div>
              <button
                onClick={() => updateSetting('show_activity', !profile?.show_activity)}
                disabled={saving}
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: profile?.show_activity ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: profile?.show_activity ? '24px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
            
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>Show saved events</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Others can see your saved events</p>
              </div>
              <button
                onClick={() => updateSetting('show_saved_events', !profile?.show_saved_events)}
                disabled={saving}
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: profile?.show_saved_events ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '12px',
                  background: 'white',
                  position: 'absolute',
                  top: '2px',
                  left: profile?.show_saved_events ? '24px' : '2px',
                  transition: 'left 0.2s',
                }} />
              </button>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ 
            fontSize: '12px', 
            fontWeight: 600, 
            color: '#888', 
            textTransform: 'uppercase', 
            letterSpacing: '0.5px',
            marginBottom: '16px',
          }}>
            About
          </h2>
          
          <div style={{ background: '#141416', borderRadius: '12px', overflow: 'hidden' }}>
            <Link 
              href="/about"
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px', 
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <span style={{ fontSize: '14px' }}>About Sounded Out</span>
              <span style={{ color: '#666' }}>→</span>
            </Link>
            
            <Link 
              href="/terms"
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px', 
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <span style={{ fontSize: '14px' }}>Terms of Service</span>
              <span style={{ color: '#666' }}>→</span>
            </Link>
            
            <Link 
              href="/privacy"
              style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '16px', 
                textDecoration: 'none',
                color: 'white',
              }}
            >
              <span style={{ fontSize: '14px' }}>Privacy Policy</span>
              <span style={{ color: '#666' }}>→</span>
            </Link>
          </div>
        </section>

        {/* Actions */}
        <section>
          <button
            onClick={handleSignOut}
            style={{
              width: '100%',
              padding: '14px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              marginBottom: '12px',
            }}
          >
            Sign out
          </button>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                border: 'none',
                color: '#f87171',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              Delete account
            </button>
          ) : (
            <div style={{ 
              padding: '16px', 
              background: 'rgba(248,113,113,0.1)', 
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: '10px',
            }}>
              <p style={{ fontSize: '14px', color: '#f87171', marginBottom: '12px' }}>
                Are you sure? This will permanently delete your account and all your data.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: 'rgba(255,255,255,0.1)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: '#f87171',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete forever
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Version */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: '#444', marginTop: '32px' }}>
          Sounded Out v1.0
        </p>
      </main>
    </div>
  )
}
