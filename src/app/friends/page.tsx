'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

interface UserProfile {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  is_verified: boolean
}

interface FollowData {
  id: string
  follower_id: string
  following_id: string
  status: string
  created_at: string
  following?: UserProfile
  follower?: UserProfile
}

export default function FriendsPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>('following')
  const [following, setFollowing] = useState<FollowData[]>([])
  const [followers, setFollowers] = useState<FollowData[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserProfile[]>([])
  const [searching, setSearching] = useState(false)

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

    const loadFriends = async () => {
      // Get following
      const { data: followingData } = await supabase
        .from('user_follows')
        .select(`
          id,
          follower_id,
          following_id,
          status,
          created_at,
          following:user_profiles!user_follows_following_id_fkey(
            id, username, display_name, avatar_url, is_verified
          )
        `)
        .eq('follower_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (followingData) {
        setFollowing(followingData as unknown as FollowData[])
      }

      // Get followers
      const { data: followersData } = await supabase
        .from('user_follows')
        .select(`
          id,
          follower_id,
          following_id,
          status,
          created_at,
          follower:user_profiles!user_follows_follower_id_fkey(
            id, username, display_name, avatar_url, is_verified
          )
        `)
        .eq('following_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (followersData) {
        setFollowers(followersData as unknown as FollowData[])
      }

      setLoading(false)
    }

    loadFriends()
  }, [user])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)

    const { data } = await supabase
      .from('user_profiles')
      .select('id, username, display_name, avatar_url, is_verified')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .neq('id', user?.id || '')
      .limit(10)

    if (data) {
      setSearchResults(data as UserProfile[])
    }

    setSearching(false)
  }

  const handleFollow = async (targetId: string) => {
    if (!user) return

    await supabase.from('user_follows').insert({
      follower_id: user.id,
      following_id: targetId,
      status: 'active'
    })

    // Refresh following list
    const { data } = await supabase
      .from('user_follows')
      .select(`
        id,
        follower_id,
        following_id,
        status,
        created_at,
        following:user_profiles!user_follows_following_id_fkey(
          id, username, display_name, avatar_url, is_verified
        )
      `)
      .eq('follower_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (data) {
      setFollowing(data as unknown as FollowData[])
    }

    // Clear search
    setSearchQuery('')
    setSearchResults([])
  }

  const handleUnfollow = async (targetId: string) => {
    if (!user) return

    await supabase
      .from('user_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId)

    // Update local state
    const updated: FollowData[] = []
    for (let i = 0; i < following.length; i++) {
      if (following[i].following_id !== targetId) {
        updated.push(following[i])
      }
    }
    setFollowing(updated)
  }

  const isFollowing = (targetId: string): boolean => {
    for (let i = 0; i < following.length; i++) {
      if (following[i].following_id === targetId) {
        return true
      }
    }
    return false
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        Loading...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: 'white', paddingBottom: '80px' }}>
      {/* Header */}
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
        <h1 style={{ fontSize: '16px', fontWeight: 600 }}>Friends</h1>
      </header>

      {/* Search */}
      <div style={{ padding: '16px 20px' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search by username..."
            style={{
              width: '100%',
              padding: '12px 16px',
              paddingLeft: '40px',
              background: '#141416',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              outline: 'none',
            }}
          />
          <span style={{
            position: 'absolute',
            left: '14px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#666',
            fontSize: '16px',
          }}>
            🔍
          </span>
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div style={{
            marginTop: '12px',
            background: '#141416',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {searchResults.map((result: UserProfile) => (
              <div
                key={result.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '50%',
                  background: result.avatar_url ? 'none' : 'linear-gradient(135deg, #ab67f7, #8b5cf6)',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {result.avatar_url ? (
                    <img src={result.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ color: 'white', fontSize: '18px' }}>
                      {result.display_name?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '14px', fontWeight: 500 }}>
                    {result.display_name || 'Anonymous'}
                    {result.is_verified && ' ✓'}
                  </p>
                  {result.username && (
                    <p style={{ fontSize: '12px', color: '#888' }}>@{result.username}</p>
                  )}
                </div>

                <button
                  onClick={() => isFollowing(result.id) ? handleUnfollow(result.id) : handleFollow(result.id)}
                  style={{
                    padding: '8px 16px',
                    background: isFollowing(result.id) ? 'rgba(255,255,255,0.1)' : '#ab67f7',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  {isFollowing(result.id) ? 'Unfollow' : 'Follow'}
                </button>
              </div>
            ))}
          </div>
        )}

        {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
          <p style={{ fontSize: '14px', color: '#666', marginTop: '16px', textAlign: 'center' }}>
            No users found
          </p>
        )}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <button
          onClick={() => setActiveTab('following')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'following' ? '2px solid #ab67f7' : '2px solid transparent',
            color: activeTab === 'following' ? 'white' : '#666',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Following ({following.length})
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          style={{
            flex: 1,
            padding: '14px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'followers' ? '2px solid #ab67f7' : '2px solid transparent',
            color: activeTab === 'followers' ? 'white' : '#666',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Followers ({followers.length})
        </button>
      </div>

      {/* List */}
      <main style={{ maxWidth: '600px', margin: '0 auto', padding: '16px 20px' }}>
        {activeTab === 'following' && (
          <div>
            {following.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>👥</p>
                <p style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                  You&apos;re not following anyone yet
                </p>
                <p style={{ fontSize: '13px', color: '#555' }}>
                  Search for friends to follow them
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {following.map((item: FollowData) => {
                  const profile = item.following
                  if (!profile) return null
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: '#141416',
                        borderRadius: '12px',
                      }}
                    >
                      <Link
                        href={'/user/' + profile.id}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: profile.avatar_url ? 'none' : 'linear-gradient(135deg, #ab67f7, #8b5cf6)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                        }}
                      >
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: 'white', fontSize: '20px' }}>
                            {profile.display_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </Link>

                      <div style={{ flex: 1 }}>
                        <Link
                          href={'/user/' + profile.id}
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'white',
                            textDecoration: 'none',
                          }}
                        >
                          {profile.display_name || 'Anonymous'}
                          {profile.is_verified && (
                            <span style={{
                              display: 'inline-flex',
                              width: '14px',
                              height: '14px',
                              background: '#ab67f7',
                              borderRadius: '50%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px',
                              marginLeft: '6px',
                              verticalAlign: 'middle',
                            }}>✓</span>
                          )}
                        </Link>
                        {profile.username && (
                          <p style={{ fontSize: '12px', color: '#888' }}>@{profile.username}</p>
                        )}
                      </div>

                      <button
                        onClick={() => handleUnfollow(profile.id)}
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(255,255,255,0.08)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#888',
                          fontSize: '13px',
                          cursor: 'pointer',
                        }}
                      >
                        Unfollow
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'followers' && (
          <div>
            {followers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <p style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>👤</p>
                <p style={{ fontSize: '14px', color: '#666' }}>
                  No followers yet
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {followers.map((item: FollowData) => {
                  const profile = item.follower
                  if (!profile) return null
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: '#141416',
                        borderRadius: '12px',
                      }}
                    >
                      <Link
                        href={'/user/' + profile.id}
                        style={{
                          width: '48px',
                          height: '48px',
                          borderRadius: '50%',
                          background: profile.avatar_url ? 'none' : 'linear-gradient(135deg, #ab67f7, #8b5cf6)',
                          overflow: 'hidden',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textDecoration: 'none',
                        }}
                      >
                        {profile.avatar_url ? (
                          <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ color: 'white', fontSize: '20px' }}>
                            {profile.display_name?.[0]?.toUpperCase() || '?'}
                          </span>
                        )}
                      </Link>

                      <div style={{ flex: 1 }}>
                        <Link
                          href={'/user/' + profile.id}
                          style={{
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'white',
                            textDecoration: 'none',
                          }}
                        >
                          {profile.display_name || 'Anonymous'}
                          {profile.is_verified && (
                            <span style={{
                              display: 'inline-flex',
                              width: '14px',
                              height: '14px',
                              background: '#ab67f7',
                              borderRadius: '50%',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '8px',
                              marginLeft: '6px',
                              verticalAlign: 'middle',
                            }}>✓</span>
                          )}
                        </Link>
                        {profile.username && (
                          <p style={{ fontSize: '12px', color: '#888' }}>@{profile.username}</p>
                        )}
                      </div>

                      {!isFollowing(profile.id) && (
                        <button
                          onClick={() => handleFollow(profile.id)}
                          style={{
                            padding: '8px 16px',
                            background: '#ab67f7',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: 'pointer',
                          }}
                        >
                          Follow back
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
