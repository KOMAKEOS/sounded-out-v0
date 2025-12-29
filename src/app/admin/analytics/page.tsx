'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================================
// SOUNDED OUT ANALYTICS DASHBOARD
// Beautiful, VC-friendly metrics dashboard
// Access: Click logo 5 times on main page
// ============================================================================

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

interface ClaimRequest {
  id: string
  claim_type: string
  entity_name: string
  status: string
  created_at: string
}

interface Stats {
  // Core metrics
  totalSessions: number
  uniqueUsers: number
  todaySessions: number
  todayUsers: number
  
  // Engagement
  totalEventViews: number
  avgEventsPerSession: number
  
  // Conversions 💰
  ticketClicks: number
  ticketClickRate: number
  directionsClicks: number
  shareClicks: number
  
  // B2B Interest
  totalClaims: number
  pendingClaims: number
  approvedClaims: number
  
  // Breakdown data
  topEvents: { title: string; views: number; clicks: number }[]
  topVenues: { name: string; views: number }[]
  deviceBreakdown: { device: string; count: number; percent: number }[]
  sourceBreakdown: { source: string; count: number; percent: number }[]
  hourlyActivity: { hour: number; count: number }[]
  dailyTrend: { date: string; sessions: number; users: number }[]
  
  // Recent activity
  recentEvents: AnalyticsEvent[]
  recentClaims: ClaimRequest[]
}

export default function AnalyticsDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'today' | '7days' | '30days' | 'all'>('7days')
  const [authenticated, setAuthenticated] = useState(false)
  const [code, setCode] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'conversions' | 'claims'>('overview')

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
    
    // Calculate date range
    let days = 9999
    if (timeRange === 'today') days = 1
    else if (timeRange === '7days') days = 7
    else if (timeRange === '30days') days = 30
    
    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    // Fetch analytics events
    const { data: eventsData } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('created_at', sinceStr)
      .order('created_at', { ascending: false })
      .limit(5000)

    const events: AnalyticsEvent[] = (eventsData as AnalyticsEvent[]) || []

    // Fetch claims
    const { data: claimsData } = await supabase
      .from('claim_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    const claims: ClaimRequest[] = (claimsData as ClaimRequest[]) || []

    // Calculate metrics
    const sessionIds = new Set<string>()
    const userIds = new Set<string>()
    const todayStr = new Date().toISOString().split('T')[0]
    const todaySessionIds = new Set<string>()
    const todayUserIds = new Set<string>()
    
    let eventViews = 0
    let ticketClicks = 0
    let directionsClicks = 0
    let shareClicks = 0
    
    const eventViewCounts: Record<string, { views: number; clicks: number }> = {}
    const venueViewCounts: Record<string, number> = {}
    const deviceCounts: Record<string, number> = {}
    const sourceCounts: Record<string, number> = {}
    const hourCounts: Record<number, number> = {}
    const dailyCounts: Record<string, { sessions: Set<string>; users: Set<string> }> = {}

    for (let i = 0; i < events.length; i++) {
      const e = events[i]
      const props = e.properties || {}
      
      // Sessions & Users
      if (e.session_id) sessionIds.add(e.session_id)
      if (props.anon_id) userIds.add(props.anon_id)
      
      // Today's metrics
      if (e.created_at && e.created_at.startsWith(todayStr)) {
        if (e.session_id) todaySessionIds.add(e.session_id)
        if (props.anon_id) todayUserIds.add(props.anon_id)
      }
      
      // Daily trend
      const dateStr = e.created_at ? e.created_at.split('T')[0] : ''
      if (dateStr) {
        if (!dailyCounts[dateStr]) {
          dailyCounts[dateStr] = { sessions: new Set(), users: new Set() }
        }
        if (e.session_id) dailyCounts[dateStr].sessions.add(e.session_id)
        if (props.anon_id) dailyCounts[dateStr].users.add(props.anon_id)
      }
      
      // Event type counts
      if (e.event_name === 'event_view') {
        eventViews++
        const title = props.event_title || 'Unknown'
        const venue = props.venue_name || 'Unknown'
        if (!eventViewCounts[title]) eventViewCounts[title] = { views: 0, clicks: 0 }
        eventViewCounts[title].views++
        venueViewCounts[venue] = (venueViewCounts[venue] || 0) + 1
      }
      
      if (e.event_name === 'ticket_click') {
        ticketClicks++
        const title = props.event_title || 'Unknown'
        if (!eventViewCounts[title]) eventViewCounts[title] = { views: 0, clicks: 0 }
        eventViewCounts[title].clicks++
      }
      
      if (e.event_name === 'directions_click') directionsClicks++
      if (e.event_name === 'share_click') shareClicks++
      
      // Device breakdown (from session_start events)
      if (e.event_name === 'session_start') {
        const device = props.device_type || 'unknown'
        deviceCounts[device] = (deviceCounts[device] || 0) + 1
        
        const source = props.referrer_source || 'direct'
        sourceCounts[source] = (sourceCounts[source] || 0) + 1
      }
      
      // Hourly activity
      if (e.created_at) {
        const hour = new Date(e.created_at).getHours()
        hourCounts[hour] = (hourCounts[hour] || 0) + 1
      }
    }

    // Process claims
    let pendingClaims = 0
    let approvedClaims = 0
    for (let i = 0; i < claims.length; i++) {
      if (claims[i].status === 'pending') pendingClaims++
      if (claims[i].status === 'approved') approvedClaims++
    }

    // Build top events
    const topEvents = Object.entries(eventViewCounts)
      .map(function(entry) { return { title: entry[0], views: entry[1].views, clicks: entry[1].clicks } })
      .sort(function(a, b) { return b.views - a.views })
      .slice(0, 10)

    // Build top venues
    const topVenues = Object.entries(venueViewCounts)
      .map(function(entry) { return { name: entry[0], views: entry[1] } })
      .sort(function(a, b) { return b.views - a.views })
      .slice(0, 10)

    // Build device breakdown
    const totalDevices = Object.values(deviceCounts).reduce(function(a, b) { return a + b }, 0) || 1
    const deviceBreakdown = Object.entries(deviceCounts)
      .map(function(entry) { return { device: entry[0], count: entry[1], percent: Math.round((entry[1] / totalDevices) * 100) } })
      .sort(function(a, b) { return b.count - a.count })

    // Build source breakdown
    const totalSources = Object.values(sourceCounts).reduce(function(a, b) { return a + b }, 0) || 1
    const sourceBreakdown = Object.entries(sourceCounts)
      .map(function(entry) { return { source: entry[0], count: entry[1], percent: Math.round((entry[1] / totalSources) * 100) } })
      .sort(function(a, b) { return b.count - a.count })

    // Build hourly activity
    const hourlyActivity: { hour: number; count: number }[] = []
    for (let h = 0; h < 24; h++) {
      hourlyActivity.push({ hour: h, count: hourCounts[h] || 0 })
    }

    // Build daily trend (last 7 days)
    const dailyTrend: { date: string; sessions: number; users: number }[] = []
    const sortedDates = Object.keys(dailyCounts).sort()
    const recentDates = sortedDates.slice(-7)
    for (let i = 0; i < recentDates.length; i++) {
      const d = recentDates[i]
      dailyTrend.push({
        date: d,
        sessions: dailyCounts[d].sessions.size,
        users: dailyCounts[d].users.size,
      })
    }

    // Calculate derived metrics
    const totalSessions = sessionIds.size
    const avgEventsPerSession = totalSessions > 0 ? Math.round(eventViews / totalSessions * 10) / 10 : 0
    const ticketClickRate = eventViews > 0 ? Math.round((ticketClicks / eventViews) * 1000) / 10 : 0

    setStats({
      totalSessions: totalSessions,
      uniqueUsers: userIds.size,
      todaySessions: todaySessionIds.size,
      todayUsers: todayUserIds.size,
      totalEventViews: eventViews,
      avgEventsPerSession: avgEventsPerSession,
      ticketClicks: ticketClicks,
      ticketClickRate: ticketClickRate,
      directionsClicks: directionsClicks,
      shareClicks: shareClicks,
      totalClaims: claims.length,
      pendingClaims: pendingClaims,
      approvedClaims: approvedClaims,
      topEvents: topEvents,
      topVenues: topVenues,
      deviceBreakdown: deviceBreakdown,
      sourceBreakdown: sourceBreakdown,
      hourlyActivity: hourlyActivity,
      dailyTrend: dailyTrend,
      recentEvents: events.slice(0, 30),
      recentClaims: claims.slice(0, 10),
    })
    
    setLoading(false)
  }

  // ============================================================================
  // LOGIN SCREEN
  // ============================================================================
  if (!authenticated) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
        {/* Animated gradient background */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{
            position: 'absolute',
            width: 800,
            height: 800,
            borderRadius: '50%',
            opacity: 0.5,
            filter: 'blur(120px)',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%)',
            top: '-10%',
            left: '-10%',
          }} />
          <div style={{
            position: 'absolute',
            width: 600,
            height: 600,
            borderRadius: '50%',
            opacity: 0.45,
            filter: 'blur(100px)',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%)',
            top: '40%',
            right: '-5%',
          }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ background: 'rgba(20, 20, 22, 0.9)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: 48, maxWidth: 420, width: '100%', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <h1 style={{ fontSize: 28, fontWeight: 700, color: '#fff', marginBottom: 8 }}>Analytics Dashboard</h1>
              <p style={{ color: '#888', fontSize: 15 }}>Enter admin code to access metrics</p>
            </div>
            <input
              type="password"
              value={code}
              onChange={function(e) { setCode(e.target.value) }}
              onKeyDown={function(e) { if (e.key === 'Enter') handleLogin() }}
              placeholder="Enter code"
              style={{ width: '100%', padding: 16, background: 'rgba(30, 30, 36, 0.8)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 12, color: '#fff', fontSize: 16, marginBottom: 20, outline: 'none' }}
            />
            <button onClick={handleLogin} style={{ width: '100%', padding: 16, background: 'linear-gradient(135deg, #ab67f7 0%, #8b5cf6 100%)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              Access Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // MAIN DASHBOARD
  // ============================================================================
  return (
    <div style={{ minHeight: '100vh', background: '#000', position: 'relative', overflow: 'hidden' }}>
      {/* Animated gradient background */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          opacity: 0.4,
          filter: 'blur(120px)',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.5) 0%, transparent 70%)',
          top: '-20%',
          left: '-10%',
        }} />
        <div style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          opacity: 0.35,
          filter: 'blur(100px)',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)',
          bottom: '-10%',
          right: '-5%',
        }} />
        <div style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          opacity: 0.3,
          filter: 'blur(80px)',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.4) 0%, transparent 70%)',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, padding: 24, maxWidth: 1600, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ background: 'linear-gradient(135deg, #ab67f7 0%, #22d3ee 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Sounded Out</span>
              <span style={{ fontSize: 24, opacity: 0.5 }}>Analytics</span>
            </h1>
            <p style={{ color: '#888', fontSize: 14 }}>Real-time performance metrics • Last updated: {new Date().toLocaleTimeString()}</p>
          </div>
          
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(['today', '7days', '30days', 'all'] as const).map(function(r) {
              const labels: Record<string, string> = { today: 'Today', '7days': '7 Days', '30days': '30 Days', all: 'All Time' }
              return (
                <button key={r} onClick={function() { setTimeRange(r) }} style={{
                  padding: '10px 18px',
                  background: timeRange === r ? 'linear-gradient(135deg, #ab67f7 0%, #8b5cf6 100%)' : 'rgba(30, 30, 36, 0.8)',
                  border: timeRange === r ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10,
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: timeRange === r ? 600 : 400,
                  fontSize: 14,
                }}>
                  {labels[r]}
                </button>
              )
            })}
            <button onClick={loadStats} style={{ padding: '10px 18px', background: 'rgba(30, 30, 36, 0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#888', cursor: 'pointer', fontSize: 14 }}>↻ Refresh</button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: 'rgba(20, 20, 22, 0.6)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
          {(['overview', 'engagement', 'conversions', 'claims'] as const).map(function(tab) {
            const labels: Record<string, string> = { overview: '📊 Overview', engagement: '👆 Engagement', conversions: '💰 Conversions', claims: '🏢 Claims' }
            return (
              <button key={tab} onClick={function() { setActiveTab(tab) }} style={{
                padding: '10px 20px',
                background: activeTab === tab ? 'rgba(168, 85, 247, 0.3)' : 'transparent',
                border: 'none',
                borderRadius: 8,
                color: activeTab === tab ? '#fff' : '#888',
                cursor: 'pointer',
                fontWeight: activeTab === tab ? 600 : 400,
                fontSize: 14,
              }}>
                {labels[tab]}
              </button>
            )
          })}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
            Loading analytics...
          </div>
        ) : !stats ? (
          <div style={{ textAlign: 'center', padding: 80, color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📭</div>
            No data yet. Start using the app!
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <>
                {/* Key Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  <MetricCard icon="👥" label="Total Sessions" value={stats.totalSessions} subtext={'Today: ' + stats.todaySessions} color="#ab67f7" />
                  <MetricCard icon="🧑" label="Unique Users" value={stats.uniqueUsers} subtext={'Today: ' + stats.todayUsers} color="#22d3ee" />
                  <MetricCard icon="👀" label="Event Views" value={stats.totalEventViews} subtext={stats.avgEventsPerSession + ' per session'} color="#f59e0b" />
                  <MetricCard icon="🎟️" label="Ticket Clicks" value={stats.ticketClicks} subtext={stats.ticketClickRate + '% conversion'} color="#ef4444" />
                </div>

                {/* Charts Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16, marginBottom: 32 }}>
                  {/* Daily Trend */}
                  <GlassCard title="📈 Daily Trend">
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 8, paddingTop: 20 }}>
                      {stats.dailyTrend.map(function(d, i) {
                        const maxSessions = Math.max.apply(null, stats.dailyTrend.map(function(x) { return x.sessions })) || 1
                        const height = (d.sessions / maxSessions) * 100
                        const dayLabel = new Date(d.date).toLocaleDateString('en-GB', { weekday: 'short' })
                        return (
                          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: '100%', height: Math.max(height, 8) + '%', background: 'linear-gradient(180deg, #ab67f7 0%, #8b5cf6 100%)', borderRadius: 4 }} />
                            <span style={{ fontSize: 10, color: '#888' }}>{dayLabel}</span>
                          </div>
                        )
                      })}
                    </div>
                  </GlassCard>

                  {/* Device Breakdown */}
                  <GlassCard title="📱 Devices">
                    {stats.deviceBreakdown.length === 0 ? <p style={{ color: '#555' }}>No data</p> : stats.deviceBreakdown.map(function(d) {
                      return (
                        <div key={d.device} style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ textTransform: 'capitalize', color: '#fff' }}>{d.device}</span>
                            <span style={{ color: '#ab67f7', fontWeight: 600 }}>{d.percent}%</span>
                          </div>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: d.percent + '%', background: 'linear-gradient(90deg, #ab67f7 0%, #22d3ee 100%)', borderRadius: 4 }} />
                          </div>
                        </div>
                      )
                    })}
                  </GlassCard>

                  {/* Traffic Sources */}
                  <GlassCard title="🔗 Traffic Sources">
                    {stats.sourceBreakdown.length === 0 ? <p style={{ color: '#555' }}>No data</p> : stats.sourceBreakdown.map(function(s) {
                      return (
                        <div key={s.source} style={{ marginBottom: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ textTransform: 'capitalize', color: '#fff' }}>{s.source}</span>
                            <span style={{ color: '#22d3ee', fontWeight: 600 }}>{s.percent}%</span>
                          </div>
                          <div style={{ height: 8, background: 'rgba(255,255,255,0.1)', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: s.percent + '%', background: 'linear-gradient(90deg, #22d3ee 0%, #ab67f7 100%)', borderRadius: 4 }} />
                          </div>
                        </div>
                      )
                    })}
                  </GlassCard>
                </div>
              </>
            )}

            {/* ENGAGEMENT TAB */}
            {activeTab === 'engagement' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 16 }}>
                  {/* Top Events */}
                  <GlassCard title="🔥 Most Viewed Events">
                    {stats.topEvents.length === 0 ? <p style={{ color: '#555' }}>No event views yet</p> : stats.topEvents.map(function(e, i) {
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                            <span style={{ color: '#ab67f7', fontWeight: 700, fontSize: 14 }}>#{i + 1}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#fff' }}>{e.title}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <span style={{ color: '#888', fontSize: 13 }}>{e.views} views</span>
                            <span style={{ color: '#22c55e', fontSize: 13, fontWeight: 600 }}>{e.clicks} clicks</span>
                          </div>
                        </div>
                      )
                    })}
                  </GlassCard>

                  {/* Top Venues */}
                  <GlassCard title="📍 Most Popular Venues">
                    {stats.topVenues.length === 0 ? <p style={{ color: '#555' }}>No venue data yet</p> : stats.topVenues.map(function(v, i) {
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 14 }}>#{i + 1}</span>
                            <span style={{ color: '#fff' }}>{v.name}</span>
                          </div>
                          <span style={{ color: '#ab67f7', fontWeight: 600 }}>{v.views}</span>
                        </div>
                      )
                    })}
                  </GlassCard>

                  {/* Peak Hours */}
                  <GlassCard title="⏰ Peak Activity Hours">
                    <div style={{ display: 'flex', alignItems: 'flex-end', height: 120, gap: 3, marginTop: 16 }}>
                      {stats.hourlyActivity.map(function(h) {
                        const maxVal = Math.max.apply(null, stats.hourlyActivity.map(function(x) { return x.count })) || 1
                        const heightPct = Math.max((h.count / maxVal) * 100, 4)
                        const isPeak = h.hour >= 20 || h.hour <= 3
                        return (
                          <div key={h.hour} title={h.hour + ':00 - ' + h.count + ' events'} style={{
                            flex: 1,
                            height: heightPct + '%',
                            background: isPeak ? 'linear-gradient(180deg, #ab67f7 0%, #8b5cf6 100%)' : 'rgba(255,255,255,0.15)',
                            borderRadius: 2,
                            cursor: 'pointer',
                          }} />
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#666' }}>
                      <span>00:00</span>
                      <span>12:00</span>
                      <span>23:00</span>
                    </div>
                  </GlassCard>
                </div>
              </>
            )}

            {/* CONVERSIONS TAB */}
            {activeTab === 'conversions' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  <MetricCard icon="🎟️" label="Ticket Clicks" value={stats.ticketClicks} subtext="Revenue driver" color="#ef4444" />
                  <MetricCard icon="📈" label="Click Rate" value={stats.ticketClickRate + '%'} subtext="Views → Clicks" color="#22c55e" />
                  <MetricCard icon="🗺️" label="Directions" value={stats.directionsClicks} subtext="Navigation intent" color="#3b82f6" />
                  <MetricCard icon="📤" label="Shares" value={stats.shareClicks} subtext="Viral potential" color="#f59e0b" />
                </div>

                <GlassCard title="💰 Conversion Funnel">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '40px 0' }}>
                    <FunnelStep label="Sessions" value={stats.totalSessions} color="#ab67f7" />
                    <div style={{ color: '#444', fontSize: 24 }}>→</div>
                    <FunnelStep label="Event Views" value={stats.totalEventViews} color="#f59e0b" />
                    <div style={{ color: '#444', fontSize: 24 }}>→</div>
                    <FunnelStep label="Ticket Clicks" value={stats.ticketClicks} color="#ef4444" />
                  </div>
                </GlassCard>
              </>
            )}

            {/* CLAIMS TAB */}
            {activeTab === 'claims' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                  <MetricCard icon="📝" label="Total Claims" value={stats.totalClaims} subtext="B2B interest" color="#ab67f7" />
                  <MetricCard icon="⏳" label="Pending" value={stats.pendingClaims} subtext="Awaiting review" color="#f59e0b" />
                  <MetricCard icon="✅" label="Approved" value={stats.approvedClaims} subtext="Partners onboarded" color="#22c55e" />
                </div>

                <GlassCard title="📋 Recent Claim Requests">
                  {stats.recentClaims.length === 0 ? (
                    <p style={{ color: '#555', textAlign: 'center', padding: 40 }}>No claims yet - this is your B2B pipeline!</p>
                  ) : (
                    stats.recentClaims.map(function(c, i) {
                      const statusColors: Record<string, string> = { pending: '#f59e0b', approved: '#22c55e', rejected: '#ef4444' }
                      return (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <div>
                            <p style={{ color: '#fff', fontWeight: 500, marginBottom: 4 }}>{c.entity_name}</p>
                            <p style={{ color: '#888', fontSize: 12 }}>{c.claim_type} • {new Date(c.created_at).toLocaleDateString()}</p>
                          </div>
                          <span style={{ padding: '4px 12px', background: statusColors[c.status] || '#666', borderRadius: 20, fontSize: 12, fontWeight: 600, textTransform: 'capitalize' }}>{c.status}</span>
                        </div>
                      )
                    })
                  )}
                </GlassCard>
              </>
            )}

            {/* Recent Activity (always visible) */}
            <div style={{ marginTop: 32 }}>
              <GlassCard title="📋 Live Activity Feed">
                {stats.recentEvents.length === 0 ? (
                  <p style={{ color: '#555' }}>No activity yet</p>
                ) : (
                  <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                    {stats.recentEvents.slice(0, 20).map(function(e, i) {
                      const time = new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                      const props = e.properties || {}
                      const desc = props.event_title || props.venue_name || props.page_name || props.device_type || ''
                      const eventColors: Record<string, string> = {
                        'session_start': '#22c55e',
                        'event_view': '#ab67f7',
                        'ticket_click': '#ef4444',
                        'directions_click': '#3b82f6',
                        'claim_submit': '#f59e0b',
                      }
                      return (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 13, alignItems: 'center' }}>
                          <span style={{ color: '#555', minWidth: 50, fontSize: 11 }}>{time}</span>
                          <span style={{ padding: '3px 10px', background: (eventColors[e.event_name] || '#666') + '33', color: eventColors[e.event_name] || '#888', borderRadius: 6, fontSize: 11, fontWeight: 600, minWidth: 100, textAlign: 'center' }}>
                            {e.event_name.replace(/_/g, ' ')}
                          </span>
                          <span style={{ color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{desc}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// COMPONENTS
// ============================================================================

function MetricCard(props: { icon: string; label: string; value: number | string; subtext: string; color: string }) {
  return (
    <div style={{
      background: 'rgba(20, 20, 22, 0.6)',
      backdropFilter: 'blur(20px)',
      borderRadius: 16,
      padding: 24,
      border: '1px solid rgba(255,255,255,0.05)',
      borderLeft: '4px solid ' + props.color,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>{props.icon}</span>
        <span style={{ color: '#888', fontSize: 13 }}>{props.label}</span>
      </div>
      <p style={{ fontSize: 36, fontWeight: 800, color: props.color, marginBottom: 4 }}>{props.value}</p>
      <p style={{ color: '#666', fontSize: 12 }}>{props.subtext}</p>
    </div>
  )
}

function GlassCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(20, 20, 22, 0.6)',
      backdropFilter: 'blur(20px)',
      borderRadius: 16,
      padding: 24,
      border: '1px solid rgba(255,255,255,0.05)',
    }}>
      <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 20 }}>{props.title}</h3>
      {props.children}
    </div>
  )
}

function FunnelStep(props: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 42, fontWeight: 800, color: props.color, marginBottom: 8 }}>{props.value}</p>
      <p style={{ color: '#888', fontSize: 13 }}>{props.label}</p>
    </div>
  )
}
