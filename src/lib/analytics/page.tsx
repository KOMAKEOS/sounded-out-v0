'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// Types
interface AnalyticsEvent {
  id: string
  event_name: string
  properties: any
  session_id: string | null
  page_url: string | null
  referrer: string | null
  user_agent: string | null
  created_at: string
}

interface Stats {
  totalSessions: number
  totalEvents: number
  uniqueUsers: number
  todaySessions: number
  ticketClicks: number
  eventViews: number
  topEvents: { title: string; views: number }[]
  topVenues: { name: string; views: number }[]
  deviceBreakdown: { device: string; count: number }[]
  hourlyActivity: { hour: number; count: number }[]
  recentEvents: AnalyticsEvent[]
  conversionRate: number
  sourceBreakdown: { source: string; count: number }[]
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days')
  const [authenticated, setAuthenticated] = useState(false)
  const [code, setCode] = useState('')

  useEffect(function checkAuth() {
    if (sessionStorage.getItem('so_admin_analytics') === 'true') {
      setAuthenticated(true)
    }
  }, [])

  function handleLogin() {
    if (code === '1234') {
      sessionStorage.setItem('so_admin_analytics', 'true')
      setAuthenticated(true)
    } else {
      alert('Invalid code')
    }
  }

  useEffect(function loadOnAuth() {
    if (authenticated) loadStats()
  }, [authenticated, timeRange])

  async function loadStats() {
    setLoading(true)
    
    const days = timeRange === 'today' ? 1 : timeRange === '7days' ? 7 : 30
    const since = new Date()
    since.setDate(since.getDate() - days)

    const { data } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })

    const events: AnalyticsEvent[] = (data as AnalyticsEvent[]) || []

    if (events.length === 0) {
      setStats({
        totalSessions: 0, totalEvents: 0, uniqueUsers: 0, todaySessions: 0,
        ticketClicks: 0, eventViews: 0, topEvents: [], topVenues: [],
        deviceBreakdown: [], hourlyActivity: [], recentEvents: [],
        conversionRate: 0, sourceBreakdown: [],
      })
      setLoading(false)
      return
    }

    // Sessions
    const sessionIds: string[] = []
    for (let i = 0; i < events.length; i++) {
      if (events[i].session_id) sessionIds.push(events[i].session_id as string)
    }
    const sessions = new Set(sessionIds).size

    // Users
    const userIds: string[] = []
    for (let i = 0; i < events.length; i++) {
      if (events[i].properties?.anon_id) userIds.push(events[i].properties.anon_id)
    }
    const users = new Set(userIds).size
    
    // Today sessions
    const today = new Date().toISOString().split('T')[0]
    const todaySessionIds: string[] = []
    for (let i = 0; i < events.length; i++) {
      if (events[i].created_at?.startsWith(today) && events[i].session_id) {
        todaySessionIds.push(events[i].session_id as string)
      }
    }
    const todaySessions = new Set(todaySessionIds).size

    // Counts
    let ticketClicks = 0
    let eventViews = 0
    for (let i = 0; i < events.length; i++) {
      if (events[i].event_name === 'ticket_click') ticketClicks++
      if (events[i].event_name === 'event_view') eventViews++
    }

    // Top events
    const eventCounts: Record<string, number> = {}
    for (let i = 0; i < events.length; i++) {
      if (events[i].event_name === 'event_view') {
        const t = events[i].properties?.event_title || 'Unknown'
        eventCounts[t] = (eventCounts[t] || 0) + 1
      }
    }
    const topEvents = Object.entries(eventCounts)
      .map(function(entry) { return { title: entry[0], views: entry[1] } })
      .sort(function(a, b) { return b.views - a.views })
      .slice(0, 10)

    // Top venues
    const venueCounts: Record<string, number> = {}
    for (let i = 0; i < events.length; i++) {
      if (events[i].event_name === 'event_view') {
        const n = events[i].properties?.venue_name || 'Unknown'
        venueCounts[n] = (venueCounts[n] || 0) + 1
      }
    }
    const topVenues = Object.entries(venueCounts)
      .map(function(entry) { return { name: entry[0], views: entry[1] } })
      .sort(function(a, b) { return b.views - a.views })
      .slice(0, 10)

    // Devices
    const deviceCounts: Record<string, number> = {}
    for (let i = 0; i < events.length; i++) {
      if (events[i].event_name === 'session_start') {
        const d = events[i].properties?.type || 'unknown'
        deviceCounts[d] = (deviceCounts[d] || 0) + 1
      }
    }
    const deviceBreakdown = Object.entries(deviceCounts)
      .map(function(entry) { return { device: entry[0], count: entry[1] } })
      .sort(function(a, b) { return b.count - a.count })

    // Hourly
    const hourCounts: Record<number, number> = {}
    for (let i = 0; i < events.length; i++) {
      const h = new Date(events[i].created_at).getHours()
      hourCounts[h] = (hourCounts[h] || 0) + 1
    }
    const hourlyActivity: { hour: number; count: number }[] = []
    for (let h = 0; h < 24; h++) {
      hourlyActivity.push({ hour: h, count: hourCounts[h] || 0 })
    }

    // Sources
    const srcCounts: Record<string, number> = {}
    for (let i = 0; i < events.length; i++) {
      const ref = events[i].referrer || ''
      let src = 'direct'
      if (ref.includes('google')) src = 'google'
      else if (ref.includes('instagram')) src = 'instagram'
      else if (ref.includes('facebook')) src = 'facebook'
      else if (ref) src = 'other'
      srcCounts[src] = (srcCounts[src] || 0) + 1
    }
    const sourceBreakdown = Object.entries(srcCounts)
      .map(function(entry) { return { source: entry[0], count: entry[1] } })
      .sort(function(a, b) { return b.count - a.count })

    setStats({
      totalSessions: sessions,
      totalEvents: events.length,
      uniqueUsers: users,
      todaySessions: todaySessions,
      ticketClicks: ticketClicks,
      eventViews: eventViews,
      topEvents: topEvents,
      topVenues: topVenues,
      deviceBreakdown: deviceBreakdown,
      hourlyActivity: hourlyActivity,
      recentEvents: events.slice(0, 50),
      conversionRate: eventViews > 0 ? (ticketClicks / eventViews) * 100 : 0,
      sourceBreakdown: sourceBreakdown,
    })
    setLoading(false)
  }

  // Login screen
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0b', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ background: '#141416', borderRadius: 16, padding: 40, maxWidth: 400, width: '100%' }}>
          <h1 style={{ fontSize: 24, marginBottom: 8, color: '#fff' }}>📊 Analytics</h1>
          <p style={{ color: '#888', marginBottom: 24 }}>Enter admin code</p>
          <input
            type="password"
            value={code}
            onChange={function(e) { setCode(e.target.value) }}
            onKeyDown={function(e) { if (e.key === 'Enter') handleLogin() }}
            placeholder="Code"
            style={{ width: '100%', padding: 14, background: '#1e1e24', border: '1px solid #333', borderRadius: 8, color: '#fff', fontSize: 16, marginBottom: 16 }}
          />
          <button onClick={handleLogin} style={{ width: '100%', padding: 14, background: '#ab67f7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
            Access
          </button>
        </div>
      </div>
    )
  }

  // Main dashboard
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#fff', padding: 20 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4 }}>📊 Analytics</h1>
            <p style={{ color: '#888' }}>Sounded Out Metrics</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={function() { setTimeRange('today') }} style={{ padding: '10px 16px', background: timeRange === 'today' ? '#ab67f7' : '#1e1e24', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: timeRange === 'today' ? 600 : 400 }}>Today</button>
            <button onClick={function() { setTimeRange('7days') }} style={{ padding: '10px 16px', background: timeRange === '7days' ? '#ab67f7' : '#1e1e24', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: timeRange === '7days' ? 600 : 400 }}>7 Days</button>
            <button onClick={function() { setTimeRange('30days') }} style={{ padding: '10px 16px', background: timeRange === '30days' ? '#ab67f7' : '#1e1e24', border: 'none', borderRadius: 8, color: '#fff', cursor: 'pointer', fontWeight: timeRange === '30days' ? 600 : 400 }}>30 Days</button>
            <button onClick={loadStats} style={{ padding: '10px 16px', background: '#1e1e24', border: '1px solid #333', borderRadius: 8, color: '#888', cursor: 'pointer' }}>↻</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>Loading...</div>
        ) : !stats ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#888' }}>No data yet</div>
        ) : (
          <>
            {/* Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 32 }}>
              <div style={{ background: '#141416', borderRadius: 12, padding: 20, borderLeft: '4px solid #ab67f7' }}>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Sessions</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#ab67f7' }}>{stats.totalSessions}</p>
              </div>
              <div style={{ background: '#141416', borderRadius: 12, padding: 20, borderLeft: '4px solid #22d3ee' }}>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Users</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#22d3ee' }}>{stats.uniqueUsers}</p>
              </div>
              <div style={{ background: '#141416', borderRadius: 12, padding: 20, borderLeft: '4px solid #22c55e' }}>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Today</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#22c55e' }}>{stats.todaySessions}</p>
              </div>
              <div style={{ background: '#141416', borderRadius: 12, padding: 20, borderLeft: '4px solid #f59e0b' }}>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Event Views</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>{stats.eventViews}</p>
              </div>
              <div style={{ background: '#141416', borderRadius: 12, padding: 20, borderLeft: '4px solid #ef4444' }}>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Ticket Clicks</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{stats.ticketClicks}</p>
              </div>
              <div style={{ background: '#141416', borderRadius: 12, padding: 20, borderLeft: '4px solid #8b5cf6' }}>
                <p style={{ color: '#888', fontSize: 13, marginBottom: 8 }}>Conversion</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6' }}>{stats.conversionRate.toFixed(1)}%</p>
              </div>
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
              {/* Devices */}
              <div style={{ background: '#141416', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#888' }}>📱 Devices</h3>
                {stats.deviceBreakdown.length === 0 ? (
                  <p style={{ color: '#555' }}>No data</p>
                ) : (
                  stats.deviceBreakdown.map(function(d) {
                    return (
                      <div key={d.device} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ textTransform: 'capitalize' }}>{d.device}</span>
                          <span style={{ color: '#888' }}>{d.count}</span>
                        </div>
                        <div style={{ height: 8, background: '#1e1e24', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: ((d.count / Math.max(stats.totalSessions, 1)) * 100) + '%', background: d.device === 'mobile' ? '#ab67f7' : '#22d3ee', borderRadius: 4 }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Sources */}
              <div style={{ background: '#141416', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#888' }}>🔗 Sources</h3>
                {stats.sourceBreakdown.length === 0 ? (
                  <p style={{ color: '#555' }}>No data</p>
                ) : (
                  stats.sourceBreakdown.map(function(s) {
                    return (
                      <div key={s.source} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ textTransform: 'capitalize' }}>{s.source}</span>
                          <span style={{ color: '#888' }}>{s.count}</span>
                        </div>
                        <div style={{ height: 8, background: '#1e1e24', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: ((s.count / Math.max(stats.totalEvents, 1)) * 100) + '%', background: '#ab67f7', borderRadius: 4 }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Peak Hours */}
              <div style={{ background: '#141416', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#888' }}>⏰ Peak Hours</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: 100, gap: 2 }}>
                  {stats.hourlyActivity.map(function(h) {
                    const maxVal = Math.max.apply(null, stats.hourlyActivity.map(function(x) { return x.count })) || 1
                    const heightPct = Math.max((h.count / maxVal) * 100, 4)
                    return (
                      <div key={h.hour} title={h.hour + ':00 - ' + h.count + ' events'} style={{ flex: 1, height: heightPct + '%', background: (h.hour >= 20 || h.hour <= 3) ? '#ab67f7' : '#333', borderRadius: 2 }} />
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Lists Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
              {/* Top Events */}
              <div style={{ background: '#141416', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#888' }}>🔥 Top Events</h3>
                {stats.topEvents.length === 0 ? (
                  <p style={{ color: '#555' }}>No data</p>
                ) : (
                  stats.topEvents.map(function(e, i) {
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1e1e24' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%', fontSize: 14 }}>{(i + 1) + '. ' + e.title}</span>
                        <span style={{ color: '#ab67f7', fontWeight: 600 }}>{e.views}</span>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Top Venues */}
              <div style={{ background: '#141416', borderRadius: 12, padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#888' }}>📍 Top Venues</h3>
                {stats.topVenues.length === 0 ? (
                  <p style={{ color: '#555' }}>No data</p>
                ) : (
                  stats.topVenues.map(function(v, i) {
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #1e1e24' }}>
                        <span style={{ fontSize: 14 }}>{(i + 1) + '. ' + v.name}</span>
                        <span style={{ color: '#22d3ee', fontWeight: 600 }}>{v.views}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ background: '#141416', borderRadius: 12, padding: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#888' }}>📋 Recent Activity</h3>
              {stats.recentEvents.length === 0 ? (
                <p style={{ color: '#555' }}>No activity</p>
              ) : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  {stats.recentEvents.map(function(e, i) {
                    const time = new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                    const desc = e.properties?.event_title || e.properties?.venue_name || e.properties?.page || ''
                    return (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e1e24', fontSize: 14 }}>
                        <span style={{ color: '#666', minWidth: 50, fontSize: 12 }}>{time}</span>
                        <span style={{ padding: '2px 8px', background: 'rgba(171,103,247,0.2)', borderRadius: 4, fontSize: 11, fontWeight: 600, minWidth: 80, textAlign: 'center' }}>{e.event_name.replace(/_/g, ' ')}</span>
                        <span style={{ color: '#888' }}>{desc}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
