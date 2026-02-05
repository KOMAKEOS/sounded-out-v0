'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import html2canvas from 'html2canvas'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

/* ══════════════════════════════════════════════════════════════
   CHART COMPONENTS
   ══════════════════════════════════════════════════════════════ */

function DonutChart({
  segments,
  size = 150,
  strokeWidth = 18,
}: {
  segments: { value: number; color: string; label: string }[]
  size?: number
  strokeWidth?: number
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  let accumulated = 0

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      {total > 0 && segments.map((seg, i) => {
        const pct = seg.value / total
        const dashLen = pct * circumference
        const dashOffset = -(accumulated / total) * circumference
        accumulated += seg.value
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={seg.color}
            strokeWidth={strokeWidth} strokeDasharray={`${dashLen} ${circumference - dashLen}`}
            strokeDashoffset={dashOffset} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dasharray 1s ease, stroke-dashoffset 1s ease' }} />
        )
      })}
    </svg>
  )
}

function HBar({ value, max, color, height = 6 }: { value: number; max: number; color: string; height?: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="w-full rounded-full overflow-hidden" style={{ height, background: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

function Sparkline({ data, color = '#AB67F7', width = 120, height = 40 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data.length || data.every(d => d === 0)) return <div style={{ width, height }} />
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const gradId = `sg-${color.replace('#', '')}-${width}`

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${points} ${width},${height}`} fill={`url(#${gradId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function RankedBar({ items, maxVal }: { items: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-white/50">{item.label}</span>
            <span className="text-xs font-semibold text-white/70 tabular-nums">{item.value}</span>
          </div>
          <HBar value={item.value} max={maxVal} color={item.color} />
        </div>
      ))}
    </div>
  )
}

function HourHeatmap({ hours }: { hours: number[] }) {
  const max = Math.max(...hours, 1)
  return (
    <div className="flex gap-[3px] items-end" style={{ height: 48 }}>
      {hours.map((val, i) => {
        const pct = val / max
        const opacity = Math.max(pct, 0.08)
        return (
          <div key={i} className="flex-1 rounded-sm transition-all duration-500"
            style={{ height: `${Math.max(pct * 100, 8)}%`, background: `rgba(171,103,247,${opacity})`, minWidth: 2 }}
            title={`${i.toString().padStart(2, '0')}:00 — ${val} sessions`} />
        )
      })}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════
   MAIN DASHBOARD
   ══════════════════════════════════════════════════════════════ */

export default function AnalyticsDashboard() {
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [timeRange, setTimeRange] = useState('7days')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [data, setData] = useState({
    totalSessions: 0, todaySessions: 0, uniqueUsers: 0, todayUsers: 0,
    registeredUsers: 0, returningUsers: 0,
    eventViews: 0, eventViewsPerSession: 0, ticketClicks: 0, conversionRate: 0,
    directions: 0, shares: 0, saves: 0,
    avgSessionDuration: 0, avgPagesPerSession: 0, avgEventsViewed: 0,
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    sources: { map: 0, list: 0, search: 0, direct: 0, swipe: 0 },
    genres: [] as { label: string; value: number }[],
    topEvents: [] as any[], topVenues: [] as any[],
    claimStarts: 0, claimSubmits: 0, signups: 0,
    mapLoads: 0, markerClicks: 0,
    peakHours: Array(24).fill(0) as number[],
    dailySessions: [] as number[], dailyViews: [] as number[],
    prevPeriodSessions: 0, prevPeriodUsers: 0,
  })

  useEffect(() => { loadAnalytics() }, [timeRange])

  const getDaysBack = () => {
    switch (timeRange) {
      case 'today': return 0
      case '7days': return 7
      case '30days': return 30
      default: return 365
    }
  }

  const loadAnalytics = async () => {
    setIsLoading(true)
    try {
      const now = new Date()
      const daysBack = getDaysBack()
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - daysBack)
      const startISO = startDate.toISOString()

      const prevStart = new Date(startDate)
      prevStart.setDate(prevStart.getDate() - Math.max(daysBack, 1))
      const prevStartISO = prevStart.toISOString()

      const [
        sessionsRes, interactionsRes, userSessionsRes, businessRes,
        mapRes, sharesRes, profilesRes, prevSessionsRes,
      ] = await Promise.all([
        supabase.from('analytics_events').select('*').eq('event_name', 'session_start').gte('created_at', startISO),
        supabase.from('event_interactions').select('*').gte('created_at', startISO),
        supabase.from('user_sessions').select('*').gte('created_at', startISO),
        supabase.from('business_metrics').select('*').gte('created_at', startISO),
        supabase.from('map_interactions').select('*').gte('created_at', startISO),
        supabase.from('analytics_events').select('*').eq('event_name', 'share_click').gte('created_at', startISO),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('analytics_events').select('session_id, user_id').eq('event_name', 'session_start').gte('created_at', prevStartISO).lt('created_at', startISO),
      ])

      const sessions = sessionsRes.data || []
      const interactions = interactionsRes.data || []
      const userSessions = userSessionsRes.data || []
      const business = businessRes.data || []
      const mapData = mapRes.data || []
      const shares = sharesRes.data || []
      const prevSessions = prevSessionsRes.data || []

      const totalSessions = sessions.length
      const todayStr = new Date().toDateString()
      const todaySessions = sessions.filter(s => new Date(s.created_at).toDateString() === todayStr).length
      const uniqueUserIds = new Set(sessions.map(s => s.user_id || s.session_id))
      const uniqueUsers = uniqueUserIds.size
      const todayUsers = new Set(sessions.filter(s => new Date(s.created_at).toDateString() === todayStr).map(s => s.user_id || s.session_id)).size
      const registeredUsers = profilesRes.count || 0

      const userSessionCounts: Record<string, number> = {}
      sessions.forEach(s => {
        const uid = s.user_id || s.session_id
        userSessionCounts[uid] = (userSessionCounts[uid] || 0) + 1
      })
      const returningUsers = Object.values(userSessionCounts).filter(c => c > 1).length

      const eventViews = interactions.filter(i => i.interaction_type === 'view').length
      const ticketClicks = interactions.filter(i => i.interaction_type === 'ticket_click').length
      const directions = interactions.filter(i => i.interaction_type === 'directions').length
      const saves = interactions.filter(i => i.interaction_type === 'save').length
      const interactionShares = interactions.filter(i => i.interaction_type === 'share').length
      const totalShares = shares.length + interactionShares
      const conversionRate = eventViews > 0 ? (ticketClicks / eventViews) * 100 : 0
      const eventViewsPerSession = totalSessions > 0 ? eventViews / totalSessions : 0

      const validDurations = userSessions.filter(s => s.duration_seconds && s.duration_seconds > 0)
      const avgSessionDuration = validDurations.length > 0
        ? validDurations.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / validDurations.length : 0
      const validPages = userSessions.filter(s => s.page_views && s.page_views > 0)
      const avgPagesPerSession = validPages.length > 0
        ? validPages.reduce((sum, s) => sum + (s.page_views || 0), 0) / validPages.length : 0
      const validEvents = userSessions.filter(s => s.events_viewed && s.events_viewed > 0)
      const avgEventsViewed = validEvents.length > 0
        ? validEvents.reduce((sum, s) => sum + (s.events_viewed || 0), 0) / validEvents.length : 0

      const devices = { mobile: 0, tablet: 0, desktop: 0 }
      sessions.forEach(s => {
        const dt = (s.device_type || 'desktop') as keyof typeof devices
        if (devices[dt] !== undefined) devices[dt]++
      })

      const sources = { map: 0, list: 0, search: 0, direct: 0, swipe: 0 }
      interactions.filter(i => i.interaction_type === 'view').forEach(i => {
        const src = (i.source || 'direct') as keyof typeof sources
        if (sources[src] !== undefined) sources[src]++
      })

      const genreCounts: Record<string, number> = {}
      interactions.filter(i => i.genre_primary).forEach(i => {
        genreCounts[i.genre_primary] = (genreCounts[i.genre_primary] || 0) + 1
      })
      const genres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([label, value]) => ({ label, value }))

      const eventMap: Record<string, any> = {}
      interactions.filter(i => i.interaction_type === 'view').forEach(i => {
        const key = `${i.event_id}-${i.event_title}`
        if (!eventMap[key]) eventMap[key] = { event_id: i.event_id, event_title: i.event_title, venue_name: i.venue_name, views: 0, clicks: 0 }
        eventMap[key].views++
      })
      interactions.filter(i => i.interaction_type === 'ticket_click').forEach(i => {
        const key = `${i.event_id}-${i.event_title}`
        if (eventMap[key]) eventMap[key].clicks++
      })
      const topEvents = Object.values(eventMap).sort((a: any, b: any) => b.views - a.views).slice(0, 5)

      const venueMap: Record<string, any> = {}
      interactions.forEach(i => {
        if (i.venue_name) {
          if (!venueMap[i.venue_name]) venueMap[i.venue_name] = { name: i.venue_name, views: 0 }
          venueMap[i.venue_name].views++
        }
      })
      const topVenues = Object.values(venueMap).sort((a: any, b: any) => b.views - a.views).slice(0, 5)

      const claimStarts = business.filter(b => b.metric_type === 'claim_start').length
      const claimSubmits = business.filter(b => b.metric_type === 'claim_submit').length
      const signups = business.filter(b => b.metric_type === 'signup').length

      const mapLoads = mapData.filter(m => m.interaction_type === 'load').length
      const markerClicks = mapData.filter(m => m.interaction_type === 'marker_click').length

      const peakHours = Array(24).fill(0)
      sessions.forEach(s => { peakHours[new Date(s.created_at).getHours()]++ })

      const numDays = Math.max(daysBack, 1)
      const dayBuckets: Record<string, number> = {}
      const viewBuckets: Record<string, number> = {}
      for (let d = 0; d < numDays; d++) {
        const date = new Date(now)
        date.setDate(date.getDate() - (numDays - 1 - d))
        const key = date.toISOString().split('T')[0]
        dayBuckets[key] = 0
        viewBuckets[key] = 0
      }
      sessions.forEach(s => { const k = new Date(s.created_at).toISOString().split('T')[0]; if (dayBuckets[k] !== undefined) dayBuckets[k]++ })
      interactions.filter(i => i.interaction_type === 'view').forEach(i => { const k = new Date(i.created_at).toISOString().split('T')[0]; if (viewBuckets[k] !== undefined) viewBuckets[k]++ })

      const prevPeriodSessions = prevSessions.length
      const prevPeriodUsers = new Set(prevSessions.map(s => s.user_id || s.session_id)).size

      setData({
        totalSessions, todaySessions, uniqueUsers, todayUsers, registeredUsers, returningUsers,
        eventViews, eventViewsPerSession: Math.round(eventViewsPerSession * 10) / 10,
        ticketClicks, conversionRate: Math.round(conversionRate * 10) / 10,
        directions, shares: totalShares, saves,
        avgSessionDuration: Math.round(avgSessionDuration),
        avgPagesPerSession: Math.round(avgPagesPerSession * 10) / 10,
        avgEventsViewed: Math.round(avgEventsViewed * 10) / 10,
        devices, sources, genres, topEvents, topVenues,
        claimStarts, claimSubmits, signups,
        mapLoads, markerClicks, peakHours,
        dailySessions: Object.values(dayBuckets), dailyViews: Object.values(viewBuckets),
        prevPeriodSessions, prevPeriodUsers,
      })
    } catch (err) {
      console.error('Analytics error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const exportDashboard = async () => {
    if (!dashboardRef.current) return
    setIsExporting(true)
    try {
      const canvas = await html2canvas(dashboardRef.current, { backgroundColor: '#07070B', scale: 2 })
      const link = document.createElement('a')
      link.download = `sounded-out-analytics-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (err) { console.error('Export error:', err) }
    finally { setIsExporting(false) }
  }

  const totalDevices = data.devices.mobile + data.devices.tablet + data.devices.desktop
  const pct = (v: number, total: number) => total > 0 ? Math.round((v / total) * 100) : 0
  const growth = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0
    return Math.round(((curr - prev) / prev) * 100)
  }
  const sessionGrowth = growth(data.totalSessions, data.prevPeriodSessions)
  const userGrowth = growth(data.uniqueUsers, data.prevPeriodUsers)
  const maxEventViews = data.topEvents.length > 0 ? (data.topEvents[0] as any).views : 1
  const totalSources = Object.values(data.sources).reduce((a, b) => a + b, 0)
  const formatDuration = (secs: number) => {
    if (secs < 60) return `${secs}s`
    const m = Math.floor(secs / 60); const s = secs % 60
    return s > 0 ? `${m}m ${s}s` : `${m}m`
  }
  const timeLabels: Record<string, string> = { today: 'Today', '7days': 'Last 7 Days', '30days': 'Last 30 Days', alltime: 'All Time' }
  const genreColors = ['#AB67F7', '#4F8CFF', '#34D399', '#FBBF24', '#F87171', '#FB923C']

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#07070B', fontFamily: "'Sora', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');`}</style>
        <div className="flex flex-col items-center gap-5">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full animate-spin" style={{ border: '3px solid rgba(171,103,247,0.1)', borderTopColor: '#AB67F7' }} />
          </div>
          <p className="text-white/30 text-sm font-medium">Loading analytics…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap');
        .so-dash{font-family:'Sora',-apple-system,BlinkMacSystemFont,sans-serif}
        .so-dash *{box-sizing:border-box}
        .card{background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.06);border-radius:20px;transition:all .3s cubic-bezier(.4,0,.2,1)}
        .card:hover{border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.035)}
        .accent-card{background:linear-gradient(135deg,rgba(171,103,247,0.12),rgba(171,103,247,0.04));border:1px solid rgba(171,103,247,0.2);border-radius:20px}
        .accent-card:hover{border-color:rgba(171,103,247,0.35)}
        .green-card{background:linear-gradient(135deg,rgba(52,211,153,0.1),rgba(52,211,153,0.03));border:1px solid rgba(52,211,153,0.18);border-radius:20px}
        .blue-card{background:linear-gradient(135deg,rgba(79,140,255,0.1),rgba(79,140,255,0.03));border:1px solid rgba(79,140,255,0.18);border-radius:20px}
        .amber-card{background:linear-gradient(135deg,rgba(251,191,36,0.1),rgba(251,191,36,0.03));border:1px solid rgba(251,191,36,0.18);border-radius:20px}
        .ev-row{transition:background .2s ease}
        .ev-row:hover{background:rgba(255,255,255,0.04)!important}
        .fade-in{animation:fadeUp .6s ease both}
        .d1{animation-delay:.05s}.d2{animation-delay:.1s}.d3{animation-delay:.15s}
        .d4{animation-delay:.2s}.d5{animation-delay:.25s}.d6{animation-delay:.3s}.d7{animation-delay:.35s}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulseGlow{0%,100%{opacity:1}50%{opacity:.5}}
        .live-dot{animation:pulseGlow 2s ease-in-out infinite}
        .time-btn{padding:6px 14px;border-radius:10px;font-size:13px;font-weight:500;color:rgba(255,255,255,0.35);background:transparent;border:1px solid transparent;cursor:pointer;transition:all .2s;font-family:inherit}
        .time-btn:hover{color:rgba(255,255,255,0.6);background:rgba(255,255,255,0.04)}
        .time-btn.active{color:#AB67F7;background:rgba(171,103,247,0.1);border-color:rgba(171,103,247,0.25)}
        .growth-pill{font-size:11px;font-weight:600;padding:2px 8px;border-radius:8px;display:inline-flex;align-items:center;gap:3px}
        .growth-up{background:rgba(52,211,153,0.1);color:#34D399}
        .growth-down{background:rgba(248,113,113,0.1);color:#F87171}
        .growth-flat{background:rgba(255,255,255,0.05);color:rgba(255,255,255,0.3)}
      `}</style>

      <div className="so-dash min-h-screen text-white" style={{ background: '#07070B' }}>
        <div ref={dashboardRef} className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8 space-y-5">

          {/* HEADER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 fade-in">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 live-dot" />
                <span className="text-white/25 text-[11px] font-semibold uppercase tracking-[0.15em]">Live</span>
              </div>
              <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.08)' }} />
              <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
              <span className="text-[11px] text-white/15 font-medium hidden sm:inline">
                Updated {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                {(['today', '7days', '30days', 'alltime'] as const).map(t => (
                  <button key={t} onClick={() => setTimeRange(t)} className={`time-btn ${timeRange === t ? 'active' : ''}`}>
                    {t === 'today' ? 'Today' : t === '7days' ? '7D' : t === '30days' ? '30D' : 'All'}
                  </button>
                ))}
              </div>
              <button onClick={loadAnalytics} className="p-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} title="Refresh">
                <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.4)" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              </button>
              <button onClick={exportDashboard} disabled={isExporting} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-40" style={{ background: '#AB67F7' }}>
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                {isExporting ? 'Exporting…' : 'Export'}
              </button>
            </div>
          </div>

          {/* HERO METRICS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 fade-in d1">
            <div className="accent-card p-6 flex flex-col justify-between min-h-[168px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#AB67F7' }}>Users</span>
                <span className={`growth-pill ${userGrowth > 0 ? 'growth-up' : userGrowth < 0 ? 'growth-down' : 'growth-flat'}`}>
                  {userGrowth > 0 ? '↑' : userGrowth < 0 ? '↓' : '–'} {Math.abs(userGrowth)}%
                </span>
              </div>
              <div>
                <p className="text-[48px] font-extrabold tracking-tighter leading-none">{data.uniqueUsers.toLocaleString()}</p>
                <p className="text-[11px] text-white/25 mt-2 font-medium">{data.todayUsers} today · {data.registeredUsers} registered</p>
              </div>
            </div>
            <div className="blue-card p-6 flex flex-col justify-between min-h-[168px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#4F8CFF' }}>Sessions</span>
                <Sparkline data={data.dailySessions} color="#4F8CFF" width={60} height={26} />
              </div>
              <div>
                <p className="text-[48px] font-extrabold tracking-tighter leading-none">{data.totalSessions.toLocaleString()}</p>
                <p className="text-[11px] text-white/25 mt-2 font-medium">{data.todaySessions} today · {data.returningUsers} returning</p>
              </div>
            </div>
            <div className="green-card p-6 flex flex-col justify-between min-h-[168px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#34D399' }}>Event Views</span>
                <Sparkline data={data.dailyViews} color="#34D399" width={60} height={26} />
              </div>
              <div>
                <p className="text-[48px] font-extrabold tracking-tighter leading-none">{data.eventViews.toLocaleString()}</p>
                <p className="text-[11px] text-white/25 mt-2 font-medium">{data.eventViewsPerSession}/session avg</p>
              </div>
            </div>
            <div className="amber-card p-6 flex flex-col justify-between min-h-[168px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#FBBF24' }}>Conversion</span>
                <svg width="16" height="16" fill="none" stroke="#FBBF24" viewBox="0 0 24 24" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
              </div>
              <div>
                <p className="text-[48px] font-extrabold tracking-tighter leading-none">{data.conversionRate}<span className="text-xl font-bold text-white/30 ml-1">%</span></p>
                <p className="text-[11px] text-white/25 mt-2 font-medium">{data.ticketClicks} ticket clicks</p>
              </div>
            </div>
          </div>

          {/* ROW 2: Session Depth + Devices + Peak Hours + Engagement */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-3 card p-6 fade-in d2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-5">Session Depth</p>
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] text-white/30 font-medium mb-1">Avg Duration</p>
                  <p className="text-3xl font-bold tracking-tight">{formatDuration(data.avgSessionDuration)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/30 font-medium mb-1">Pages / Session</p>
                  <p className="text-3xl font-bold tracking-tight">{data.avgPagesPerSession}</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/30 font-medium mb-1">Events Explored</p>
                  <p className="text-3xl font-bold tracking-tight">{data.avgEventsViewed}</p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 card p-6 fade-in d3">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">Devices</p>
                <span className="text-[10px] font-medium text-white/15">{totalDevices} total</span>
              </div>
              <div className="flex items-center justify-center mb-5">
                <div className="relative">
                  <DonutChart size={130} strokeWidth={16} segments={[
                    { value: data.devices.mobile, color: '#AB67F7', label: 'Mobile' },
                    { value: data.devices.desktop, color: '#4F8CFF', label: 'Desktop' },
                    { value: data.devices.tablet, color: '#34D399', label: 'Tablet' },
                  ]} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold">{pct(data.devices.mobile, totalDevices)}%</span>
                    <span className="text-[9px] text-white/25 font-medium">Mobile</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: 'Mobile', value: data.devices.mobile, color: '#AB67F7' },
                  { label: 'Desktop', value: data.devices.desktop, color: '#4F8CFF' },
                  { label: 'Tablet', value: data.devices.tablet, color: '#34D399' },
                ].map(d => (
                  <div key={d.label} className="flex items-center gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-[11px] text-white/40 font-medium w-14">{d.label}</span>
                    <div className="flex-1"><HBar value={d.value} max={totalDevices} color={d.color} /></div>
                    <span className="text-[11px] font-semibold text-white/60 w-8 text-right tabular-nums">{pct(d.value, totalDevices)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-3 card p-6 fade-in d4">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">Peak Hours</p>
                <span className="text-[10px] font-medium text-white/15">24h</span>
              </div>
              <div className="mb-4"><HourHeatmap hours={data.peakHours} /></div>
              <div className="flex justify-between text-[9px] text-white/15 font-medium mb-4">
                <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
              </div>
              {(() => {
                const peakHour = data.peakHours.indexOf(Math.max(...data.peakHours))
                const peakVal = Math.max(...data.peakHours)
                if (peakVal === 0) return null
                return (
                  <div className="p-3 rounded-xl" style={{ background: 'rgba(171,103,247,0.06)', border: '1px solid rgba(171,103,247,0.12)' }}>
                    <p className="text-[11px] text-white/40 font-medium">Peak time</p>
                    <p className="text-lg font-bold" style={{ color: '#AB67F7' }}>
                      {peakHour.toString().padStart(2, '0')}:00 – {((peakHour + 1) % 24).toString().padStart(2, '0')}:00
                    </p>
                    <p className="text-[10px] text-white/20">{peakVal} sessions</p>
                  </div>
                )
              })()}
            </div>

            <div className="lg:col-span-3 card p-6 fade-in d5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-5">Engagement</p>
              <div className="space-y-2.5">
                {[
                  { label: 'Directions', value: data.directions, icon: '◈', color: '#4F8CFF' },
                  { label: 'Shares', value: data.shares, icon: '◉', color: '#AB67F7' },
                  { label: 'Saves', value: data.saves, icon: '♡', color: '#F87171' },
                  { label: 'Ticket Clicks', value: data.ticketClicks, icon: '◎', color: '#FBBF24' },
                  { label: 'Map Loads', value: data.mapLoads, icon: '◇', color: '#34D399' },
                  { label: 'Marker Taps', value: data.markerClicks, icon: '◆', color: '#34D399' },
                ].map(m => (
                  <div key={m.label} className="flex items-center gap-3 py-2">
                    <span className="text-sm" style={{ color: m.color }}>{m.icon}</span>
                    <span className="text-[11px] text-white/35 font-medium flex-1">{m.label}</span>
                    <span className="text-sm font-bold tabular-nums">{m.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 3: Discovery Source + Genres + Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-4 card p-6 fade-in d3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-5">Discovery Source</p>
              <RankedBar maxVal={Math.max(...Object.values(data.sources), 1)} items={[
                { label: 'Map', value: data.sources.map, color: '#AB67F7' },
                { label: 'List / Feed', value: data.sources.list, color: '#4F8CFF' },
                { label: 'Search', value: data.sources.search, color: '#34D399' },
                { label: 'Direct Link', value: data.sources.direct, color: '#FBBF24' },
                { label: 'Swipe', value: data.sources.swipe, color: '#FB923C' },
              ]} />
              <p className="text-[10px] text-white/15 mt-4 font-medium">{totalSources} total views by source</p>
            </div>

            <div className="lg:col-span-4 card p-6 fade-in d4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-5">Genre Popularity</p>
              {data.genres.length > 0 ? (
                <RankedBar maxVal={data.genres[0]?.value || 1}
                  items={data.genres.map((g, i) => ({ label: g.label, value: g.value, color: genreColors[i % genreColors.length] }))} />
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-white/15 text-sm font-medium">No genre data yet</p>
                  <p className="text-[11px] text-white/8 mt-1">Genres populate from event interactions</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 card p-6 fade-in d5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-5">Conversion Funnel</p>
              <div className="space-y-2">
                {[
                  { label: 'Sessions', value: data.totalSessions, color: '#4F8CFF', sub: '' },
                  { label: 'Event Views', value: data.eventViews, color: '#AB67F7', sub: `${data.eventViewsPerSession}/session` },
                  { label: 'Ticket Clicks', value: data.ticketClicks, color: '#34D399', sub: `${data.conversionRate}% CVR` },
                ].map((step, i, arr) => (
                  <React.Fragment key={step.label}>
                    <div className="rounded-2xl p-4 text-center" style={{ background: `${step.color}10`, border: `1px solid ${step.color}25` }}>
                      <p className="text-3xl font-bold tracking-tight">{step.value.toLocaleString()}</p>
                      <p className="text-[11px] font-semibold mt-1" style={{ color: step.color }}>{step.label}</p>
                      {step.sub && <p className="text-[10px] text-white/25 mt-0.5">{step.sub}</p>}
                    </div>
                    {i < arr.length - 1 && (
                      <div className="flex items-center justify-center gap-2 py-1 text-white/15">
                        <div className="w-6 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                        <span className="text-[10px] font-medium">{data.totalSessions > 0 ? pct(arr[i + 1].value, data.totalSessions) : 0}%</span>
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M3 6l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        <div className="w-6 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 4: Top Events + Top Venues + Business */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-5 card p-6 fade-in d5">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">Top Events</p>
                <span className="text-[10px] text-white/15 font-medium">{timeLabels[timeRange]}</span>
              </div>
              {data.topEvents.length > 0 ? (
                <div className="space-y-1.5">
                  {data.topEvents.map((ev: any, i: number) => (
                    <div key={i} className="ev-row flex items-center gap-3 p-3 rounded-xl" style={i === 0 ? { background: 'rgba(171,103,247,0.06)' } : {}}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                        style={{ background: i === 0 ? 'rgba(171,103,247,0.2)' : 'rgba(255,255,255,0.04)', color: i === 0 ? '#AB67F7' : 'rgba(255,255,255,0.25)' }}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{ev.event_title}</p>
                        <p className="text-[10px] text-white/25">{ev.venue_name}</p>
                      </div>
                      <div className="w-16 hidden sm:block">
                        <HBar value={ev.views} max={maxEventViews} color={i === 0 ? '#AB67F7' : 'rgba(255,255,255,0.15)'} height={3} />
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[13px] font-bold tabular-nums">{ev.views}</p>
                        <p className="text-[10px] font-medium" style={{ color: '#34D399' }}>{ev.clicks} click{ev.clicks !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14">
                  <p className="text-white/15 text-[13px] font-medium">No event data yet</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-4 card p-6 fade-in d6">
              <div className="flex items-center justify-between mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35">Top Venues</p>
                <span className="text-[10px] text-white/15 font-medium">{data.topVenues.length} venues</span>
              </div>
              {data.topVenues.length > 0 ? (
                <div className="space-y-1.5">
                  {data.topVenues.map((v: any, i: number) => {
                    const maxV = (data.topVenues[0] as any)?.views || 1
                    return (
                      <div key={i} className="ev-row relative flex items-center gap-3 p-3 rounded-xl overflow-hidden">
                        <div className="absolute left-0 top-0 bottom-0 rounded-xl transition-all duration-700"
                          style={{ width: `${Math.round((v.views / maxV) * 100)}%`, background: i === 0 ? 'rgba(171,103,247,0.06)' : 'rgba(255,255,255,0.015)' }} />
                        <div className="relative flex items-center gap-3 w-full">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{ background: i === 0 ? 'rgba(171,103,247,0.2)' : 'rgba(255,255,255,0.04)', color: i === 0 ? '#AB67F7' : 'rgba(255,255,255,0.25)' }}>
                            {i + 1}
                          </div>
                          <p className="text-[13px] font-medium flex-1 truncate">{v.name}</p>
                          <span className="text-[13px] font-bold tabular-nums" style={{ color: '#AB67F7' }}>{v.views}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-14">
                  <p className="text-white/15 text-[13px] font-medium">No venue data yet</p>
                </div>
              )}
            </div>

            <div className="lg:col-span-3 card p-6 fade-in d7">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/35 mb-5">Business</p>
              <div className="space-y-5">
                <div>
                  <p className="text-[11px] text-white/25 font-medium mb-1">Venue Claims Started</p>
                  <p className="text-3xl font-bold tracking-tight">{data.claimStarts}</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/25 font-medium mb-1">Claims Submitted</p>
                  <p className="text-3xl font-bold tracking-tight" style={{ color: '#34D399' }}>{data.claimSubmits}</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/25 font-medium mb-1">User Sign-ups</p>
                  <p className="text-3xl font-bold tracking-tight" style={{ color: '#AB67F7' }}>{data.signups}</p>
                </div>
                <div>
                  <p className="text-[11px] text-white/25 font-medium mb-1">Registered Accounts</p>
                  <p className="text-3xl font-bold tracking-tight">{data.registeredUsers}</p>
                </div>
              </div>
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between pt-3 fade-in d7">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#AB67F7' }} />
              <span className="text-[11px] font-semibold tracking-[0.12em] text-white/15 uppercase">Sounded Out</span>
            </div>
            <p className="text-[10px] text-white/10 font-medium">
              Newcastle&apos;s nightlife infrastructure · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
