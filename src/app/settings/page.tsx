'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { MinimalNavBar } from '../../components/NavBar'

// ============================================================================
// SETTINGS PAGE - With honest "Coming Soon" labels
// Only shows toggles that actually work
// ============================================================================

interface UserProfile {
  id: string
  email_notifications: boolean
  weekly_digest: boolean
  profile_public: boolean
  show_activity: boolean
  show_saved_events: boolean
}

interface ToggleProps {
  label: string
  description: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  comingSoon?: boolean
}

function Toggle({ label, description, checked, onChange, disabled, comingSoon }: ToggleProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '16px',
        padding: '16px 0',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        opacity: comingSoon ? 0.5 : 1,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: 'white' }}>{label}</span>
          {comingSoon && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#ab67f7',
                background: 'rgba(171,103,247,0.15)',
                padding: '2px 8px',
                borderRadius: '10px',
                textTransform: 'uppercase',
              }}
            >
              Coming Soon
            </span>
          )}
        </div>
        <p style={{ fontSize: '13px', color: '#777', lineHeight: 1.4 }}>{description}</p>
      </div>
      
      <button
        onClick={() => !disabled && !comingSoon && onChange(!checked)}
        disabled={disabled || comingSoon}
        style={{
          width: '52px',
          height: '32px',
          borderRadius: '16px',
          border: 'none',
          background: checked ? '#ab67f7' : 'rgba(255,255,255,0.15)',
          cursor: disabled || comingSoon ? 'not-allowed' : 'pointer',
          position: 'relative',
          transition: 'background 200ms ease',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: '26px',
            height: '26px',
            borderRadius: '50%',
            background: 'white',
            position: 'absolute',
            top: '3px',
            left: checked ? '23px' : '3px',
            transition: 'left 200ms ease',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        />
      </button>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) {
        router.push('/login?redirect=/settings')
        return
      }

      setUser({ id: authUser.id, email: authUser.email })

      // Load or create profile
      const { data: profileData, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create one
        const { data: newProfile } = await supabase
          .from('user_profiles')
          .upsert({
            id: authUser.id,
            email_notifications: true,
            weekly_digest: true,
            profile_public: true,
            show_activity: true,
            show_saved_events: false,
          })
          .select()
          .single()
        
        if (newProfile) {
          setProfile(newProfile as UserProfile)
        }
      } else if (profileData) {
        setProfile(profileData as UserProfile)
      }

      setLoading(false)
    }

    loadUser()
  }, [router])

  const updateSetting = async (key: keyof UserProfile, value: boolean) => {
    if (!user || !profile) return

    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('user_profiles')
      .update({ [key]: value })
      .eq('id', user.id)

    if (error) {
      setMessage('Failed to save. Please try again.')
    } else {
      setProfile({ ...profile, [key]: value })
      setMessage('Saved!')
      setTimeout(() => setMessage(''), 2000)
    }

    setSaving(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
        <MinimalNavBar />
        <div style={{ padding: '40px 20px', textAlign: 'center' }}>
          <p style={{ color: '#999' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white' }}>
      <MinimalNavBar />
      
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '24px 20px 100px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>Settings</h1>
        <p style={{ fontSize: '14px', color: '#777', marginBottom: '32px' }}>
          Manage your account preferences
        </p>

        {/* Save indicator */}
        {message && (
          <div
            style={{
              position: 'fixed',
              top: '80px',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '10px 20px',
              background: message === 'Saved!' ? 'rgba(34,197,94,0.9)' : 'rgba(248,113,113,0.9)',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 600,
              zIndex: 100,
            }}
          >
            {message}
          </div>
        )}

        {/* Account Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            Account
          </h2>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '16px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: '#777' }}>Email</span>
              <span style={{ fontSize: '14px', color: 'white' }}>{user?.email}</span>
            </div>
            
            <Link
              href="/profile/edit"
              style={{
                display: 'block',
                padding: '12px 0',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                color: '#ab67f7',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              Edit Profile →
            </Link>
          </div>
        </section>

        {/* Notifications Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            Notifications
          </h2>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '4px 20px' }}>
            <Toggle
              label="Email notifications"
              description="Get updates about saved events and recommendations"
              checked={profile?.email_notifications ?? true}
              onChange={(val) => updateSetting('email_notifications', val)}
              disabled={saving}
            />
            
            <Toggle
              label="Weekly digest"
              description="Curated events for your week ahead"
              checked={profile?.weekly_digest ?? true}
              onChange={(val) => updateSetting('weekly_digest', val)}
              disabled={saving}
            />
            
            <Toggle
              label="Push notifications"
              description="Real-time updates on your phone"
              checked={false}
              onChange={() => {}}
              comingSoon
            />
          </div>
        </section>

        {/* Privacy Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            Privacy
          </h2>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', padding: '4px 20px' }}>
            <Toggle
              label="Public profile"
              description="Others can find and view your profile"
              checked={profile?.profile_public ?? true}
              onChange={(val) => updateSetting('profile_public', val)}
              disabled={saving}
              comingSoon
            />
            
            <Toggle
              label="Show activity"
              description="Friends can see events you're going to"
              checked={profile?.show_activity ?? true}
              onChange={(val) => updateSetting('show_activity', val)}
              disabled={saving}
              comingSoon
            />
            
            <Toggle
              label="Show saved events"
              description="Others can see your saved events"
              checked={profile?.show_saved_events ?? false}
              onChange={(val) => updateSetting('show_saved_events', val)}
              disabled={saving}
              comingSoon
            />
          </div>
          
          <p style={{ fontSize: '12px', color: '#555', marginTop: '12px', lineHeight: 1.5 }}>
            💡 Social features are coming soon. These settings will apply once launched.
          </p>
        </section>

        {/* Links Section */}
        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            About
          </h2>
          
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '16px', overflow: 'hidden' }}>
            <Link href="/about" style={{ display: 'block', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'white', textDecoration: 'none', fontSize: '15px' }}>
              About Sounded Out
            </Link>
            <Link href="/privacy" style={{ display: 'block', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'white', textDecoration: 'none', fontSize: '15px' }}>
              Privacy Policy
            </Link>
            <Link href="/terms" style={{ display: 'block', padding: '16px 20px', color: 'white', textDecoration: 'none', fontSize: '15px' }}>
              Terms of Service
            </Link>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 style={{ fontSize: '12px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '16px' }}>
            Account Actions
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              onClick={handleSignOut}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px',
                color: '#999',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign Out
            </button>
            
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete your account? This cannot be undone.')) {
                  alert('Please email support@soundedout.com to delete your account.')
                }
              }}
              style={{
                width: '100%',
                padding: '14px',
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.2)',
                borderRadius: '12px',
                color: '#f87171',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Delete Account
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
