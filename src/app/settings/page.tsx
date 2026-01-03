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
  created_at: string
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
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        setUser(data.user as User)
        await loadProfile(data.user.id)
      } else {
        router.push('/login')
      }
      setLoading(false)
    }
    loadUser()
  }, [router])

  const loadProfile = async (userId: string) => {
    // Try to get existing profile
    let { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single()

    // If no profile exists, create one with defaults
    if (profileError && profileError.code === 'PGRST116') {
      const { data: newProfile, error: insertError } = await supabase
        .from('user_profiles')
        .insert({ 
          id: userId,
          email_notifications: true,
          push_notifications: true,
          weekly_digest: true,
          profile_public: true,
          show_activity: true,
          show_saved_events: false,
        })
        .select()
        .single()
      
      if (!insertError && newProfile) {
        profileData = newProfile
      }
    }
    
    if (profileData) {
      // Set defaults for any missing fields
      setProfile({
        id: profileData.id,
        email_notifications: profileData.email_notifications ?? true,
        push_notifications: profileData.push_notifications ?? true,
        weekly_digest: profileData.weekly_digest ?? true,
        profile_public: profileData.profile_public ?? true,
        show_activity: profileData.show_activity ?? true,
        show_saved_events: profileData.show_saved_events ?? false,
        created_at: profileData.created_at || user?.created_at || new Date().toISOString(),
      })
    }
  }

  const updateSetting = async (key: string, value: boolean) => {
    if (!user || !profile) return
    
    setSavingKey(key)
    setError(null)
    setSuccess(null)
    
    const updates: Record<string, boolean> = {}
    updates[key] = value
    
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        [key]: value
      }, {
        onConflict: 'id'
      })
    
    if (updateError) {
      console.error('Settings update error:', updateError)
      setError('Failed to save setting. Please try again.')
    } else {
      setProfile({ ...profile, [key]: value })
      setSuccess('Saved!')
      setTimeout(() => setSuccess(null), 2000)
    }
    
    setSavingKey(null)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const handleDeleteAccount = async () => {
    if (!user) return
    
    try {
      // Delete user data in order
      await supabase.from('saved_events').delete().eq('user_id', user.id)
      await supabase.from('event_interests').delete().eq('user_id', user.id)
      await supabase.from('user_interactions').delete().eq('user_id', user.id)
      await supabase.from('user_genre_preferences').delete().eq('user_id', user.id)
      await supabase.from('user_venue_preferences').delete().eq('user_id', user.id)
      await supabase.from('user_follows').delete().eq('follower_id', user.id)
      await supabase.from('user_follows').delete().eq('following_id', user.id)
      await supabase.from('user_hidden_items').delete().eq('user_id', user.id)
      await supabase.from('user_profiles').delete().eq('id', user.id)
      
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      console.error('Delete account error:', err)
      setError('Failed to delete account. Please contact support.')
    }
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

  const memberSince = profile?.created_at || user.created_at
    ? new Date(profile?.created_at || user.created_at!).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
    : 'Unknown'

  const provider = user.app_metadata?.provider === 'google' ? 'Google' : 'Email'

  // Toggle switch component
  const ToggleSwitch = ({ 
    settingKey, 
    value, 
    label, 
    description 
  }: { 
    settingKey: string
    value: boolean
    label: string
    description: string 
  }) => (
    <div style={{ 
      padding: '16px', 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div>
        <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '12px', color: '#666' }}>{description}</p>
      </div>
      <button
        onClick={() => updateSetting(settingKey, !value)}
        disabled={savingKey === settingKey}
        style={{
          width: '50px',
          height: '28px',
          borderRadius: '14px',
          background: value ? '#ab67f7' : 'rgba(255,255,255,0.1)',
          border: 'none',
          cursor: savingKey === settingKey ? 'wait' : 'pointer',
          position: 'relative',
          transition: 'background 0.2s',
          opacity: savingKey === settingKey ? 0.7 : 1,
        }}
      >
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '12px',
          background: 'white',
          position: 'absolute',
          top: '2px',
          left: value ? '24px' : '2px',
          transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )

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
        {/* Messages */}
        {error && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(248,113,113,0.1)',
            border: '1px solid rgba(248,113,113,0.2)',
            borderRadius: '10px',
            marginBottom: '16px',
          }}>
            <p style={{ fontSize: '13px', color: '#f87171' }}>{error}</p>
          </div>
        )}
        
        {success && (
          <div style={{
            padding: '12px 16px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: '10px',
            marginBottom: '16px',
          }}>
            <p style={{ fontSize: '13px', color: '#22c55e' }}>{success}</p>
          </div>
        )}

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
            <ToggleSwitch
              settingKey="email_notifications"
              value={profile?.email_notifications ?? true}
              label="Email notifications"
              description="Updates about saved events"
            />
            
            <ToggleSwitch
              settingKey="weekly_digest"
              value={profile?.weekly_digest ?? true}
              label="Weekly digest"
              description="Personalized event recommendations"
            />
            
            <div style={{ 
              padding: '16px', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
            }}>
              <div>
                <p style={{ fontSize: '14px', color: 'white', marginBottom: '2px' }}>Push notifications</p>
                <p style={{ fontSize: '12px', color: '#666' }}>Coming soon</p>
              </div>
              <button
                disabled
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  cursor: 'not-allowed',
                  opacity: 0.5,
                }}
              />
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
            <ToggleSwitch
              settingKey="profile_public"
              value={profile?.profile_public ?? true}
              label="Public profile"
              description="Others can find and view your profile"
            />
            
            <ToggleSwitch
              settingKey="show_activity"
              value={profile?.show_activity ?? true}
              label="Show activity"
              description="Friends can see events you're going to"
            />
            
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
                onClick={() => updateSetting('show_saved_events', !(profile?.show_saved_events ?? false))}
                disabled={savingKey === 'show_saved_events'}
                style={{
                  width: '50px',
                  height: '28px',
                  borderRadius: '14px',
                  background: profile?.show_saved_events ? '#ab67f7' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  cursor: savingKey === 'show_saved_events' ? 'wait' : 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                  opacity: savingKey === 'show_saved_events' ? 0.7 : 1,
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
