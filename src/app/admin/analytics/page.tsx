'use client'

import React, { useEffect, useState, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import html2canvas from 'html2canvas'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// SVG Icons
const Icons = {
  users: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  eye: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  ticket: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  ),
  chart: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  download: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  refresh: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
}

// Circular Progress Component
const CircularProgress = ({ 
  value, 
  max, 
  size = 140, 
  strokeWidth = 12, 
  color = '#AB67F7',
  label,
  sublabel 
}: any) => {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const percent = max > 0 ? (value / max) * 100 : 0
  const offset = circumference - (percent / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(148, 163, 184, 0.1)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{value}</span>
        {label && <span className="text-sm text-slate-400 mt-1">{label}</span>}
        {sublabel && <span className="text-xs text-slate-500">{sublabel}</span>}
      </div>
    </div>
  )
}

// Metric Card Component
const MetricCard = ({ 
  title, 
  value, 
  change,
  subtitle,
  icon: Icon,
  color,
  size = 'default'
}: any) => {
  const sizes = {
    small: 'col-span-1',
    default: 'col-span-1 md:col-span-1',
    large: 'col-span-1 md:col-span-2'
  }

  return (
    <div className={`${sizes[size]} bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-6 hover:border-slate-700/50 transition-all duration-300`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color}`}>
          <Icon />
        </div>
        {change && (
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${
            change > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        )}
      </div>
      <div>
        <p className="text-slate-400 text-sm font-medium mb-2">{title}</p>
        <p className="text-white text-4xl font-bold tracking-tight">{value.toLocaleString()}</p>
        {subtitle && <p className="text-slate-500 text-sm mt-2">{subtitle}</p>}
      </div>
    </div>
  )
}

export default function AnalyticsDashboard() {
  const dashboardRef = useRef<HTMLDivElement>(null)
  const [timeRange, setTimeRange] = useState('7days')
  const [isLoading, setIsLoading] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>({
    totalSessions: 0,
    todaySessions: 0,
    uniqueUsers: 0,
    todayUsers: 0,
    eventViews: 0,
    eventViewsPerSession: 0,
    ticketClicks: 0,
    conversionRate: 0,
    topEvents: [],
    topVenues: [],
    directions: 0,
    shares: 0,
    devices: { mobile: 0, tablet: 0, desktop: 0 },
  })

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    setIsLoading(true)
    try {
      const now = new Date()
      const daysBack = timeRange === 'today' ? 0 : 
                      timeRange === '7days' ? 7 : 
                      timeRange === '30days' ? 30 : 365
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - daysBack)

      const { data: sessionsData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_name', 'session_start')
        .gte('created_at', startDate.toISOString())

      const { data: interactionsData } = await supabase
        .from('event_interactions')
        .select('*')
        .gte('created_at', startDate.toISOString())

      const totalSessions = sessionsData?.length || 0
      const todaySessions = sessionsData?.filter(s => 
        new Date(s.created_at).toDateString() === new Date().toDateString()
      ).length || 0

      const uniqueUserIds = new Set(sessionsData?.map(s => s.user_id || s.session_id) || [])
      const uniqueUsers = uniqueUserIds.size

      const todayUsers = new Set(sessionsData?.filter(s => 
        new Date(s.created_at).toDateString() === new Date().toDateString()
      ).map(s => s.user_id || s.session_id) || []).size

      const eventViews = interactionsData?.filter(i => i.interaction_type === 'view').length || 0
      const ticketClicks = interactionsData?.filter(i => i.interaction_type === 'ticket_click').length || 0
      const directions = interactionsData?.filter(i => i.interaction_type === 'directions').length || 0

      const conversionRate = eventViews > 0 ? (ticketClicks / eventViews * 100) : 0
      const eventViewsPerSession = totalSessions > 0 ? (eventViews / totalSessions) : 0

      const eventViewCounts: Record<string, any> = {}
      interactionsData?.filter(i => i.interaction_type === 'view').forEach(interaction => {
        const key = `${interaction.event_id}-${interaction.event_title}`
        if (!eventViewCounts[key]) {
          eventViewCounts[key] = {
            event_id: interaction.event_id,
            event_title: interaction.event_title,
            venue_name: interaction.venue_name,
            views: 0,
            clicks: 0
          }
        }
        eventViewCounts[key].views++
      })

      interactionsData?.filter(i => i.interaction_type === 'ticket_click').forEach(interaction => {
        const key = `${interaction.event_id}-${interaction.event_title}`
        if (eventViewCounts[key]) {
          eventViewCounts[key].clicks++
        }
      })

      const topEvents = Object.values(eventViewCounts)
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 5)

      const venueViewCounts: Record<string, any> = {}
      interactionsData?.forEach(interaction => {
        const venue = interaction.venue_name
        if (venue && !venueViewCounts[venue]) {
          venueViewCounts[venue] = { name: venue, views: 0 }
        }
        if (venue) venueViewCounts[venue].views++
      })

      const topVenues = Object.values(venueViewCounts)
        .sort((a: any, b: any) => b.views - a.views)
        .slice(0, 5)

      const { data: sharesData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_name', 'share_click')
        .gte('created_at', startDate.toISOString())

      const shares = sharesData?.length || 0

      const deviceCounts: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 }
      sessionsData?.forEach(session => {
        const deviceType = session.device_type || 'desktop'
        if (deviceCounts[deviceType] !== undefined) {
          deviceCounts[deviceType]++
        }
      })

      setAnalyticsData({
        totalSessions,
        todaySessions,
        uniqueUsers,
        todayUsers,
        eventViews,
        eventViewsPerSession: Math.round(eventViewsPerSession * 10) / 10,
        ticketClicks,
        conversionRate: Math.round(conversionRate * 10) / 10,
        topEvents,
        topVenues,
        directions,
        shares,
        devices: deviceCounts,
      })

    } catch (error) {
      console.error('Analytics loading error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const exportDashboard = async () => {
    if (!dashboardRef.current) return
    setIsExporting(true)
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        backgroundColor: '#020617',
        scale: 2,
      })
      const link = document.createElement('a')
      link.download = `sounded-out-analytics-${new Date().toISOString().split('T')[0]}.png`
      link.href = canvas.toDataURL()
      link.click()
    } catch (error) {
      console.error('Export error:', error)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 lg:p-8">
      <div ref={dashboardRef} className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Analytics
            </h1>
            <p className="text-slate-400">
              Real-time performance • Last updated {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-4 py-2.5 bg-slate-900/60 border border-slate-800/50 rounded-xl text-sm font-medium text-slate-300 hover:border-slate-700/50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            >
              <option value="today">Today</option>
              <option value="7days">7 Days</option>
              <option value="30days">30 Days</option>
              <option value="alltime">All Time</option>
            </select>
            
            <button
              onClick={loadAnalyticsData}
              className="p-2.5 bg-slate-900/60 border border-slate-800/50 rounded-xl text-slate-300 hover:border-slate-700/50 transition-colors"
            >
              <Icons.refresh />
            </button>
            
            <button
              onClick={exportDashboard}
              disabled={isExporting}
              className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Icons.download />
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Hero Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 flex flex-col items-center justify-center">
            <CircularProgress 
              value={analyticsData.uniqueUsers}
              max={analyticsData.totalSessions}
              color="#AB67F7"
              label="users"
              sublabel={`Today: ${analyticsData.todayUsers}`}
            />
            <p className="text-slate-400 text-sm mt-4">Unique Users</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 flex flex-col items-center justify-center">
            <CircularProgress 
              value={analyticsData.eventViews}
              max={analyticsData.totalSessions * 5}
              color="#3B82F6"
              label="views"
              sublabel={`${analyticsData.eventViewsPerSession}/session`}
            />
            <p className="text-slate-400 text-sm mt-4">Event Views</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 flex flex-col items-center justify-center">
            <CircularProgress 
              value={analyticsData.ticketClicks}
              max={analyticsData.eventViews}
              color="#10B981"
              label="clicks"
              sublabel={`${analyticsData.conversionRate}% rate`}
            />
            <p className="text-slate-400 text-sm mt-4">Ticket Clicks</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8 flex flex-col items-center justify-center">
            <CircularProgress 
              value={analyticsData.totalSessions}
              max={analyticsData.totalSessions + 100}
              color="#F59E0B"
              label="sessions"
              sublabel={`Today: ${analyticsData.todaySessions}`}
            />
            <p className="text-slate-400 text-sm mt-4">Total Sessions</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Directions Requested"
            value={analyticsData.directions}
            subtitle="Navigation intent"
            icon={Icons.chart}
            color="from-blue-500/20 to-cyan-500/20"
          />
          
          <MetricCard
            title="Event Shares"
            value={analyticsData.shares}
            subtitle="Viral spread"
            icon={Icons.chart}
            color="from-purple-500/20 to-pink-500/20"
          />

          <MetricCard
            title="Mobile Users"
            value={analyticsData.devices.mobile}
            subtitle={`${Math.round((analyticsData.devices.mobile / analyticsData.totalSessions) * 100)}% of traffic`}
            icon={Icons.users}
            color="from-emerald-500/20 to-green-500/20"
          />

          <MetricCard
            title="Desktop Users"
            value={analyticsData.devices.desktop}
            subtitle={`${Math.round((analyticsData.devices.desktop / analyticsData.totalSessions) * 100)}% of traffic`}
            icon={Icons.users}
            color="from-orange-500/20 to-amber-500/20"
          />
        </div>

        {/* Top Events & Venues */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Icons.ticket />
              Top Events
            </h3>
            <div className="space-y-4">
              {analyticsData.topEvents.length > 0 ? (
                analyticsData.topEvents.map((event: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl">
                    <div className="flex-1">
                      <p className="font-medium text-white truncate">{event.event_title}</p>
                      <p className="text-sm text-slate-400">{event.venue_name}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-lg font-bold text-white">{event.views}</p>
                      <p className="text-xs text-emerald-400">{event.clicks} clicks</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">No event data yet</p>
              )}
            </div>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Icons.chart />
              Top Venues
            </h3>
            <div className="space-y-4">
              {analyticsData.topVenues.length > 0 ? (
                analyticsData.topVenues.map((venue: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <p className="font-medium text-white">{venue.name}</p>
                    </div>
                    <p className="text-lg font-bold text-purple-400">{venue.views}</p>
                  </div>
                ))
              ) : (
                <p className="text-center text-slate-500 py-8">No venue data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800/50 rounded-3xl p-8">
          <h3 className="text-lg font-semibold mb-8">Conversion Funnel</h3>
          <div className="flex items-center justify-between max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-blue-500/30 flex items-center justify-center mb-3">
                <span className="text-3xl font-bold text-white">{analyticsData.totalSessions}</span>
              </div>
              <p className="text-sm font-medium text-slate-400">Sessions</p>
            </div>
            
            <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-500/50 to-purple-500/50 mx-6" />
            
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center mb-3">
                <span className="text-3xl font-bold text-white">{analyticsData.eventViews}</span>
              </div>
              <p className="text-sm font-medium text-slate-400">Views</p>
              <p className="text-xs text-slate-500 mt-1">{analyticsData.eventViewsPerSession}/session</p>
            </div>
            
            <div className="flex-1 h-0.5 bg-gradient-to-r from-purple-500/50 to-emerald-500/50 mx-6" />
            
            <div className="text-center">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/30 flex items-center justify-center mb-3">
                <span className="text-3xl font-bold text-white">{analyticsData.ticketClicks}</span>
              </div>
              <p className="text-sm font-medium text-slate-400">Tickets</p>
              <p className="text-xs text-emerald-400 mt-1">{analyticsData.conversionRate}% CVR</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
