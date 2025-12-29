'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

// ============================================================================
// ADMIN ANALYTICS DASHBOARD
// See all your stats in one beautiful page
// ============================================================================

type Stats = {
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
  recentEvents: { event_name: string; properties: any; created_at: string }[]
  conversionRate: number
  sourceBreakdown: { source: string; count: number }[]
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days'>('7days')
  const [authenticated, setAuthenticated] = useState(false)
  const [code, setCode] = useState('')

  // Simple auth check
  useEffect(() => {
    const isAuth = sessionStorage.getItem('so_admin_analytics')
    if (isAuth === 'true') {
      setAuthenticated(true)
    }
  }, [])

  const handleLogin = () => {
    // Simple code check - you can make this more secure
    if (code === '1234' || code === process.env.NEXT_PUBLIC_ADMIN_CODE) {
      sessionStorage.setItem('so_admin_analytics', 'true')
      setAuthenticated(true)
    } else {
      alert('Invalid code')
    }
  }

  useEffect(() => {
    if (!authenticated) return
    loadStats()
  }, [authenticated, timeRange])

  const getTimeFilter = () => {
    switch (timeRange) {
      case 'today': return "NOW() - INTERVAL '1 day'"
      case '7days': return "NOW() - INTERVAL '7 days'"
      case '30days': return "NOW() - INTERVAL '30 days'"
    }
  }

  const loadStats = async () => {
    setLoading(true)
    
    try {
      const timeFilter = timeRange === 'today' ? 1 : timeRange === '7days' ? 7 : 30
      const since = new Date()
      since.setDate(since.getDate() - timeFilter)
      const sinceStr = since.toISOString()

      // Get all events in time range
      const { data: events } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('created_at', sinceStr)
        .order('created_at', { ascending: false })

      if (!events) {
        setStats(null)
        setLoading(false)
        return
      }

      // Calculate stats
      const sessions = new Set(events.map(e => e.session_id)).size
      const users = new Set(events.map(e => e.properties?.anon_id)).size
      
      const today = new Date().toISOString().split('T')[0]
      const todayEvents = events.filter(e => e.created_at?.startsWith(today))
      const todaySessions = new Set(todayEvents.map(e => e.session_id)).size

      const ticketClicks = events.filter(e => e.event_name === 'ticket_click').length
      const eventViews = events.filter(e => e.event_name === 'event_view').length

      // Top events
      const eventViewCounts: Record<string, number> = {}
      events.filter(e => e.event_name === 'event_view').forEach(e => {
        const title = e.properties?.event_title || 'Unknown'
        eventViewCounts[title] = (eventViewCounts[title] || 0) + 1
      })
      const topEvents = Object.entries(eventViewCounts)
        .map(([title, views]) => ({ title, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)

      // Top venues
      const venueViewCounts: Record<string, number> = {}
      events.filter(e => e.event_name === 'event_view').forEach(e => {
        const name = e.properties?.venue_name || 'Unknown'
        venueViewCounts[name] = (venueViewCounts[name] || 0) + 1
      })
      const topVenues = Object.entries(venueViewCounts)
        .map(([name, views]) => ({ name, views }))
        .sort((a, b) => b.views - a.views)
        .slice(0, 10)

      // Device breakdown
      const deviceCounts: Record<string, number> = {}
      events.filter(e => e.event_name === 'session_start').forEach(e => {
        const device = e.properties?.type || 'unknown'
        deviceCounts[device] = (deviceCounts[device] || 0) + 1
      })
      const deviceBreakdown = Object.entries(deviceCounts)
        .map(([device, count]) => ({ device, count }))
        .sort((a, b) => b.count - a.count)

      // Hourly activity
      const hourlyCounts: Record<number, number> = {}
      events.forEach(e => {
        const hour = new Date(e.created_at).getHours()
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1
      })
      const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        count: hourlyCounts[i] || 0,
      }))

      // Source breakdown
      const sourceCounts: Record<string, number> = {}
      events.forEach(e => {
        let source = 'direct'
        const ref = e.referrer || ''
        if (ref.includes('google')) source = 'google'
        else if (ref.includes('instagram')) source = 'instagram'
        else if (ref.includes('facebook')) source = 'facebook'
        else if (ref.includes('twitter') || ref.includes('x.com')) source = 'twitter'
        else if (ref) source = 'other'
        sourceCounts[source] = (sourceCounts[source] || 0) + 1
      })
      const sourceBreakdown = Object.entries(sourceCounts)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count)

      // Conversion rate
      const conversionRate = eventViews > 0 ? (ticketClicks / eventViews) * 100 : 0

      // Recent events
      const recentEvents = events.slice(0, 50)

      setStats({
        totalSessions: sessions,
        totalEvents: events.length,
        uniqueUsers: users,
        todaySessions,
        ticketClicks,
        eventViews,
        topEvents,
        topVenues,
        deviceBreakdown,
        hourlyActivity,
        recentEvents,
        conversionRate,
        sourceBreakdown,
      })
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
    
    setLoading(false)
  }

  // Login screen
  if (!authenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          background: '#141416',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '400px',
          width: '100%',
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '8px', color: '#fff' }}>Analytics Dashboard</h1>
          <p style={{ color: '#888', marginBottom: '24px' }}>Enter admin code to continue</p>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Enter code"
            style={{
              width: '100%',
              padding: '14px',
              background: '#1e1e24',
              border: '1px solid #333',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              marginBottom: '16px',
            }}
          />
          <button
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '14px',
              background: '#ab67f7',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Access Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: '#fff',
      padding: '20px',
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}>
          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>📊 Analytics Dashboard</h1>
            <p style={{ color: '#888' }}>Sounded Out Performance Metrics</p>
          </div>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['today', '7days', '30days'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                style={{
                  padding: '10px 16px',
                  background: timeRange === range ? '#ab67f7' : '#1e1e24',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: timeRange === range ? 600 : 400,
                }}
              >
                {range === 'today' ? 'Today' : range === '7days' ? '7 Days' : '30 Days'}
              </button>
            ))}
            <button
              onClick={loadStats}
              style={{
                padding: '10px 16px',
                background: '#1e1e24',
                border: '1px solid #333',
                borderRadius: '8px',
                color: '#888',
                cursor: 'pointer',
              }}
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
            Loading analytics...
          </div>
        ) : !stats ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#888' }}>
            No data yet. Start using the app to see analytics!
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              <MetricCard label="Total Sessions" value={stats.totalSessions} color="#ab67f7" />
              <MetricCard label="Unique Users" value={stats.uniqueUsers} color="#22d3ee" />
              <MetricCard label="Today's Sessions" value={stats.todaySessions} color="#22c55e" />
              <MetricCard label="Event Views" value={stats.eventViews} color="#f59e0b" />
              <MetricCard label="Ticket Clicks" value={stats.ticketClicks} color="#ef4444" />
              <MetricCard label="Conversion Rate" value={`${stats.conversionRate.toFixed(1)}%`} color="#8b5cf6" />
            </div>

            {/* Charts Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              {/* Device Breakdown */}
              <div style={{ background: '#141416', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#888' }}>📱 Devices</h3>
                {stats.deviceBreakdown.map(d => (
                  <div key={d.device} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'capitalize' }}>{d.device}</span>
                      <span style={{ color: '#888' }}>{d.count}</span>
                    </div>
                    <div style={{ height: '8px', background: '#1e1e24', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(d.count / stats.totalSessions) * 100}%`,
                        background: d.device === 'mobile' ? '#ab67f7' : d.device === 'desktop' ? '#22d3ee' : '#22c55e',
                        borderRadius: '4px',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Traffic Sources */}
              <div style={{ background: '#141416', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#888' }}>🔗 Traffic Sources</h3>
                {stats.sourceBreakdown.map(s => (
                  <div key={s.source} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ textTransform: 'capitalize' }}>{s.source}</span>
                      <span style={{ color: '#888' }}>{s.count}</span>
                    </div>
                    <div style={{ height: '8px', background: '#1e1e24', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${(s.count / stats.totalEvents) * 100}%`,
                        background: '#ab67f7',
                        borderRadius: '4px',
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Hourly Activity */}
              <div style={{ background: '#141416', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#888' }}>⏰ Peak Hours</h3>
                <div style={{ display: 'flex', alignItems: 'flex-end', height: '120px', gap: '4px' }}>
                  {stats.hourlyActivity.map(h => {
                    const maxCount = Math.max(...stats.hourlyActivity.map(x => x.count))
                    const height = maxCount > 0 ? (h.count / maxCount) * 100 : 0
                    return (
                      <div
                        key={h.hour}
                        title={`${h.hour}:00 - ${h.count} events`}
                        style={{
                          flex: 1,
                          height: `${Math.max(height, 4)}%`,
                          background: h.hour >= 20 || h.hour <= 3 ? '#ab67f7' : '#333',
                          borderRadius: '2px',
                          minHeight: '4px',
                        }}
                      />
                    )
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#666' }}>
                  <span>00:00</span>
                  <span>12:00</span>
                  <span>23:00</span>
                </div>
              </div>
            </div>

            {/* Lists Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px',
              marginBottom: '32px',
            }}>
              {/* Top Events */}
              <div style={{ background: '#141416', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#888' }}>🔥 Top Events</h3>
                {stats.topEvents.length === 0 ? (
                  <p style={{ color: '#666' }}>No event views yet</p>
                ) : (
                  stats.topEvents.map((e, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: i < stats.topEvents.length - 1 ? '1px solid #1e1e24' : 'none',
                    }}>
                      <span style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap',
                        maxWidth: '70%',
                      }}>
                        {i + 1}. {e.title}
                      </span>
                      <span style={{ color: '#ab67f7', fontWeight: 600 }}>{e.views}</span>
                    </div>
                  ))
                )}
              </div>

              {/* Top Venues */}
              <div style={{ background: '#141416', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#888' }}>📍 Top Venues</h3>
                {stats.topVenues.length === 0 ? (
                  <p style={{ color: '#666' }}>No venue views yet</p>
                ) : (
                  stats.topVenues.map((v, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      padding: '10px 0',
                      borderBottom: i < stats.topVenues.length - 1 ? '1px solid #1e1e24' : 'none',
                    }}>
                      <span>{i + 1}. {v.name}</span>
                      <span style={{ color: '#22d3ee', fontWeight: 600 }}>{v.views}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div style={{ background: '#141416', borderRadius: '12px', padding: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: '#888' }}>📋 Recent Activity (Live)</h3>
              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {stats.recentEvents.map((e, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '10px 0',
                    borderBottom: '1px solid #1e1e24',
                    fontSize: '14px',
                  }}>
                    <span style={{ color: '#666', minWidth: '60px' }}>
                      {new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span style={{
                      padding: '2px 8px',
                      background: getEventColor(e.event_name),
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      minWidth: '100px',
                      textAlign: 'center',
                    }}>
                      {e.event_name}
                    </span>
                    <span style={{ color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getEventDescription(e)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// Helper components
function MetricCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: '#141416',
      borderRadius: '12px',
      padding: '20px',
      borderLeft: `4px solid ${color}`,
    }}>
      <p style={{ color: '#888', fontSize: '14px', marginBottom: '8px' }}>{label}</p>
      <p style={{ fontSize: '32px', fontWeight: 700, color }}>{value}</p>
    </div>
  )
}

function getEventColor(eventName: string): string {
  const colors: Record<string, string> = {
    'session_start': 'rgba(34, 197, 94, 0.2)',
    'page_view': 'rgba(59, 130, 246, 0.2)',
    'event_view': 'rgba(171, 103, 247, 0.2)',
    'ticket_click': 'rgba(239, 68, 68, 0.2)',
    'marker_click': 'rgba(34, 211, 238, 0.2)',
    'list_open': 'rgba(245, 158, 11, 0.2)',
  }
  return colors[eventName] || 'rgba(255, 255, 255, 0.1)'
}

function getEventDescription(e: any): string {
  const props = e.properties || {}
  if (props.event_title) return props.event_title
  if (props.venue_name) return props.venue_name
  if (props.page) return props.page
  if (props.type) return props.type
  return ''
}
