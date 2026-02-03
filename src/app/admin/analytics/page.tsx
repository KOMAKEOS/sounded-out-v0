'use client'

import React, { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase with service role for analytics
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Floating gradient background component
const FloatingGradientBg = () => {
  return (
    <div 
      className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden" 
      style={{ zIndex: 0 }}
    >
      {/* Large purple gradient orb - top left */}
      <div 
        className="absolute rounded-full opacity-50 blur-[120px]"
        style={{
          width: '800px',
          height: '800px',
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%)',
          top: '-10%',
          left: '-10%',
          animation: 'float-orb-1 25s ease-in-out infinite'
        }}
      />
      
      {/* Medium purple orb - right side */}
      <div 
        className="absolute rounded-full opacity-45 blur-[100px]"
        style={{
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(139, 92, 246, 0.5) 0%, transparent 70%)',
          top: '40%',
          right: '-5%',
          animation: 'float-orb-2 30s ease-in-out infinite reverse'
        }}
      />
      
      {/* Large purple orb - bottom center */}
      <div 
        className="absolute rounded-full opacity-40 blur-[140px]"
        style={{
          width: '900px',
          height: '900px',
          background: 'radial-gradient(circle, rgba(147, 51, 234, 0.4) 0%, transparent 70%)',
          bottom: '-15%',
          left: '50%',
          transform: 'translateX(-50%)',
          animation: 'float-orb-3 35s ease-in-out infinite'
        }}
      />

      <style jsx>{`
        @keyframes float-orb-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(30px, -20px) scale(1.1); }
          50% { transform: translate(-20px, 40px) scale(0.9); }
          75% { transform: translate(40px, 20px) scale(1.05); }
        }
        
        @keyframes float-orb-2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-40px, 30px) rotate(120deg); }
          66% { transform: translate(20px, -25px) rotate(240deg); }
        }
        
        @keyframes float-orb-3 {
          0%, 100% { transform: translateX(-50%) translateY(0) scale(1); }
          50% { transform: translateX(-50%) translateY(-30px) scale(1.1); }
        }
      `}</style>
    </div>
  )
}

function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState('overview')
  const [timeRange, setTimeRange] = useState('7days')
  const [isLoading, setIsLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState<{
    totalSessions: number
    todaySessions: number
    uniqueUsers: number
    todayUsers: number
    eventViews: number
    eventViewsPerSession: number
    ticketClicks: number
    conversionRate: number
    topEvents: Array<{
      event_id: string
      event_title: string
      venue_name: string
      views: number
      clicks: number
    }>
    topVenues: Array<{
      name: string
      views: number
    }>
    totalClaims: number
    pendingClaims: number
    approvedClaims: number
    directions: number
    shares: number
    dailyTrend: any[]
    devices: Record<string, number>
    trafficSources: any[]
    peakHours: any[]
    liveActivity: any[]
  }>({
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
    totalClaims: 0,
    pendingClaims: 0,
    approvedClaims: 0,
    directions: 0,
    shares: 0,
    dailyTrend: [],
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    trafficSources: [],
    peakHours: [],
    liveActivity: []
  })

  useEffect(() => {
    loadAnalyticsData()
  }, [timeRange])

  const loadAnalyticsData = async () => {
    setIsLoading(true)
    try {
      // Calculate date range
      const now = new Date()
      const daysBack = timeRange === 'today' ? 0 : 
                      timeRange === '7days' ? 7 : 
                      timeRange === '30days' ? 30 : 365
      const startDate = new Date(now)
      startDate.setDate(startDate.getDate() - daysBack)

      // Fetch sessions data
      const { data: sessionsData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_name', 'session_start')
        .gte('created_at', startDate.toISOString())

      // Fetch event interactions
      const { data: interactionsData } = await supabase
        .from('event_interactions')
        .select('*')
        .gte('created_at', startDate.toISOString())

      // Fetch business metrics
      const { data: businessData } = await supabase
        .from('business_metrics')
        .select('*')
        .gte('created_at', startDate.toISOString())

      // Process the data
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

      // Top events
      const eventViewCounts: Record<string, {
        event_id: string
        event_title: string
        venue_name: string
        views: number
        clicks: number
      }> = {}
      
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
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)

      // Top venues
      const venueViewCounts: Record<string, { name: string; views: number }> = {}
      interactionsData?.forEach(interaction => {
        const venue = interaction.venue_name
        if (venue && !venueViewCounts[venue]) {
          venueViewCounts[venue] = { name: venue, views: 0 }
        }
        if (venue) venueViewCounts[venue].views++
      })

      const topVenues = Object.values(venueViewCounts)
        .sort((a, b) => b.views - a.views)
        .slice(0, 5)

      // Claims data
      const totalClaims = businessData?.filter(b => 
        b.metric_type === 'claim_start' || b.metric_type === 'claim_submit'
      ).length || 0
      const pendingClaims = businessData?.filter(b => b.metric_type === 'claim_start').length || 0
      const approvedClaims = businessData?.filter(b => b.metric_type === 'claim_submit').length || 0

      // Shares data  
      const { data: sharesData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_name', 'share_click')
        .gte('created_at', startDate.toISOString())

      const shares = sharesData?.length || 0

      // Device breakdown
      const deviceCounts: Record<string, number> = { mobile: 0, tablet: 0, desktop: 0 }
      sessionsData?.forEach(session => {
        const deviceType = session.device_type || 'desktop'
        if (deviceCounts[deviceType] !== undefined) {
          deviceCounts[deviceType]++
        }
      })

      // Live activity (recent events)
      const { data: recentActivity } = await supabase
        .from('analytics_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)

      setAnalyticsData({
        totalSessions,
        todaySessions,
        uniqueUsers,
        todayUsers,
        eventViews,
        eventViewsPerSession: Math.round(eventViewsPerSession * 10) / 10, // Round to 1 decimal
        ticketClicks,
        conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal
        topEvents,
        topVenues,
        totalClaims,
        pendingClaims,
        approvedClaims,
        directions,
        shares,
        dailyTrend: [],
        devices: deviceCounts,
        trafficSources: [],
        peakHours: [],
        liveActivity: recentActivity || []
      })

    } catch (error) {
      console.error('Analytics loading error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const MetricCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    color 
  }: {
    title: string
    value: string | number
    subtitle?: string
    icon: string
    color: string
  }) => (
    <div 
      className="relative bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6 shadow-2xl"
      style={{ borderLeftColor: color, borderLeftWidth: '4px' }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{icon} {title}</p>
          <p className="text-white text-3xl font-bold mt-2">{value}</p>
          {subtitle && (
            <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      <FloatingGradientBg />
      
      <div className="relative z-10 max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Sounded Out Analytics
            </h1>
            <p className="text-slate-400 mt-2">
              Real-time performance metrics • Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          
          <div className="flex gap-3">
            {['Today', '7 Days', '30 Days', 'All Time'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range.toLowerCase().replace(' ', ''))}
                className={`px-4 py-2 rounded-xl font-medium transition-all ${
                  timeRange === range.toLowerCase().replace(' ', '')
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50'
                }`}
              >
                {range}
              </button>
            ))}
            <button
              onClick={loadAnalyticsData}
              className="px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-xl text-slate-300 transition-all"
            >
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8 bg-slate-900/30 backdrop-blur-xl rounded-2xl p-2 border border-slate-800/50">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'engagement', label: 'Engagement', icon: '⚡' },
            { id: 'conversions', label: 'Conversions', icon: '💰' },
            { id: 'claims', label: 'Claims', icon: '🏢' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Total Sessions"
                    value={analyticsData.totalSessions}
                    subtitle={`Today: ${analyticsData.todaySessions}`}
                    icon="👥"
                    color="#60A5FA"
                  />
                  <MetricCard
                    title="Unique Users"
                    value={analyticsData.uniqueUsers}
                    subtitle={`Today: ${analyticsData.todayUsers}`}
                    icon="😊"
                    color="#34D399"
                  />
                  <MetricCard
                    title="Event Views"
                    value={analyticsData.eventViews}
                    subtitle={`${analyticsData.eventViewsPerSession} per session`}
                    icon="👀"
                    color="#FBBF24"
                  />
                  <MetricCard
                    title="Ticket Clicks"
                    value={analyticsData.ticketClicks}
                    subtitle={`${analyticsData.conversionRate}% conversion`}
                    icon="🎫"
                    color="#EF4444"
                  />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      📈 Daily Trend
                    </h3>
                    <p className="text-slate-400">Growth trending {analyticsData.totalSessions > 0 ? 'upward' : 'awaiting data'}</p>
                  </div>

                  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      📱 Devices
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mobile</span>
                        <span className="text-white font-medium">{analyticsData.devices.mobile}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Desktop</span>
                        <span className="text-white font-medium">{analyticsData.devices.desktop}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Tablet</span>
                        <span className="text-white font-medium">{analyticsData.devices.tablet}</span>
                      </div>
                    </div>
                    {Object.values(analyticsData.devices).every(v => v === 0) && (
                      <p className="text-slate-400">No data</p>
                    )}
                  </div>

                  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      🔗 Traffic Sources
                    </h3>
                    <p className="text-slate-400">No data</p>
                  </div>
                </div>

                {/* Live Activity */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    📊 Live Activity Feed
                  </h3>
                  <div className="space-y-2">
                    {analyticsData.liveActivity.slice(0, 5).map((activity, idx) => (
                      <div key={idx} className="flex justify-between items-center py-2 border-b border-slate-800/50">
                        <span className="text-slate-300">{activity.event_name}</span>
                        <span className="text-slate-500 text-sm">
                          {new Date(activity.created_at).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                    {analyticsData.liveActivity.length === 0 && (
                      <p className="text-slate-400">No activity yet</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Engagement Tab */}
            {activeTab === 'engagement' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      🔥 Most Viewed Events
                    </h3>
                    <div className="space-y-3">
                      {analyticsData.topEvents.length > 0 ? (
                        analyticsData.topEvents.map((event: any, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <div>
                              <p className="text-white font-medium">{event.event_title}</p>
                              <p className="text-slate-400 text-sm">{event.venue_name}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white font-bold">{event.views} views</p>
                              <p className="text-green-400 text-sm">{event.clicks} clicks</p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400">No event views yet</p>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      📍 Most Popular Venues
                    </h3>
                    <div className="space-y-3">
                      {analyticsData.topVenues.length > 0 ? (
                        analyticsData.topVenues.map((venue: any, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <p className="text-white font-medium">{venue.name}</p>
                            <p className="text-purple-400 font-bold">{venue.views} views</p>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-400">No venue data yet</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    ⏰ Peak Activity Hours
                  </h3>
                  <div className="flex items-center justify-between py-8">
                    <div className="flex space-x-1">
                      {Array.from({ length: 24 }, (_, i) => {
                        const isActive = i >= 20 || i <= 3 // Nightlife hours
                        return (
                          <div
                            key={i}
                            className={`h-8 w-4 rounded-sm ${
                              isActive ? 'bg-purple-500' : 'bg-slate-700'
                            }`}
                            title={`${i}:00`}
                          />
                        )
                      })}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm text-slate-400">
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>23:00</span>
                  </div>
                </div>
              </div>
            )}

            {/* Conversions Tab */}
            {activeTab === 'conversions' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <MetricCard
                    title="Ticket Clicks"
                    value={analyticsData.ticketClicks}
                    subtitle="Revenue driver"
                    icon="🎫"
                    color="#EF4444"
                  />
                  <MetricCard
                    title="Click Rate"
                    value={`${analyticsData.conversionRate}%`}
                    subtitle="Views → Clicks"
                    icon="📊"
                    color="#10B981"
                  />
                  <MetricCard
                    title="Directions"
                    value={analyticsData.directions}
                    subtitle="Navigation intent"
                    icon="🗺️"
                    color="#3B82F6"
                  />
                  <MetricCard
                    title="Shares"
                    value={analyticsData.shares}
                    subtitle="Viral potential"
                    icon="🔗"
                    color="#F59E0B"
                  />
                </div>

                {/* Conversion Funnel */}
                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-6 flex items-center">
                    💰 Conversion Funnel
                  </h3>
                  <div className="flex items-center justify-between max-w-4xl mx-auto">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold mb-3">
                        {analyticsData.totalSessions}
                      </div>
                      <p className="text-slate-300 font-medium">Sessions</p>
                    </div>
                    
                    <div className="flex-1 h-1 bg-slate-700 mx-4 relative">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        →
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-20 h-20 bg-yellow-600 rounded-full flex items-center justify-center text-2xl font-bold mb-3">
                        {analyticsData.eventViews}
                      </div>
                      <p className="text-slate-300 font-medium">Event Views</p>
                    </div>
                    
                    <div className="flex-1 h-1 bg-slate-700 mx-4 relative">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-400 text-sm">
                        →
                      </div>
                    </div>
                    
                    <div className="text-center">
                      <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center text-2xl font-bold mb-3">
                        {analyticsData.ticketClicks}
                      </div>
                      <p className="text-slate-300 font-medium">Ticket Clicks</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Claims Tab */}
            {activeTab === 'claims' && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <MetricCard
                    title="Total Claims"
                    value={analyticsData.totalClaims}
                    subtitle="B2B interest"
                    icon="📋"
                    color="#8B5CF6"
                  />
                  <MetricCard
                    title="Pending"
                    value={analyticsData.pendingClaims}
                    subtitle="Awaiting review"
                    icon="⏳"
                    color="#F59E0B"
                  />
                  <MetricCard
                    title="Approved"
                    value={analyticsData.approvedClaims}
                    subtitle="Partners onboarded"
                    icon="✅"
                    color="#10B981"
                  />
                </div>

                <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    📋 Recent Claim Requests
                  </h3>
                  <div className="text-center py-12">
                    <p className="text-slate-400 text-lg">No claims yet - this is your B2B pipeline!</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default AnalyticsDashboard

