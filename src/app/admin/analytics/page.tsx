'use client'

import React, { useEffect, useState, useRef, CSSProperties } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

const C = {
  bg: '#07070B', card: 'rgba(255,255,255,0.03)', cardB: 'rgba(255,255,255,0.07)',
  purple: '#AB67F7', blue: '#4F8CFF', green: '#34D399', amber: '#FBBF24',
  red: '#F87171', orange: '#FB923C',
  t1: '#ffffff', t2: 'rgba(255,255,255,0.4)', t3: 'rgba(255,255,255,0.2)', t4: 'rgba(255,255,255,0.1)',
}

const card: CSSProperties = { background: C.card, border: `1px solid ${C.cardB}`, borderRadius: 20, padding: 24 }
const lbl: CSSProperties = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.12em', color: C.t2, margin: 0 }

function Donut({ segs, size = 130, sw = 16 }: { segs: { v: number; c: string }[]; size?: number; sw?: number }) {
  const r = (size - sw) / 2, circ = 2 * Math.PI * r, tot = segs.reduce((a, s) => a + s.v, 0)
  let acc = 0
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={sw} />
      {tot > 0 && segs.map((s, i) => {
        const p = s.v / tot, d = p * circ, o = -(acc / tot) * circ; acc += s.v
        return <circle key={i} cx={size/2} cy={size/2} r={r} fill="none" stroke={s.c} strokeWidth={sw}
          strokeDasharray={`${d} ${circ-d}`} strokeDashoffset={o} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} style={{ transition: 'all 1s' }} />
      })}
    </svg>
  )
}

function Spark({ data, color = C.purple, w = 64, h = 28 }: { data: number[]; color?: string; w?: number; h?: number }) {
  if (!data.length || data.every(d => d === 0)) return <div style={{ width: w, height: h }} />
  const mx = Math.max(...data, 1), mn = Math.min(...data, 0), rng = mx - mn || 1
  const pts = data.map((v, i) => `${(i / Math.max(data.length-1, 1)) * w},${h - ((v-mn)/rng)*(h-4)-2}`).join(' ')
  const id = `sp${color.replace('#','')}`
  return (
    <svg width={w} height={h} style={{ overflow: 'visible' }}>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill={`url(#${id})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Bar({ value, max, color, h = 6 }: { value: number; max: number; color: string; h?: number }) {
  const p = max > 0 ? Math.min((value/max)*100, 100) : 0
  return (
    <div style={{ width: '100%', height: h, borderRadius: 99, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <div style={{ width: `${p}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 1s ease' }} />
    </div>
  )
}

function Hours({ hrs }: { hrs: number[] }) {
  const mx = Math.max(...hrs, 1)
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 52 }}>
      {hrs.map((v, i) => <div key={i} style={{ flex: 1, minWidth: 2, borderRadius: 2, height: `${Math.max((v/mx)*100, 6)}%`, background: `rgba(171,103,247,${Math.max(v/mx, 0.06)})` }} title={`${i}:00 — ${v}`} />)}
    </div>
  )
}

export default function AnalyticsDashboard() {
  const ref = useRef<HTMLDivElement>(null)
  const [tr, setTr] = useState('7days')
  const [loading, setLoading] = useState(true)
  const [d, setD] = useState({
    totalSessions: 0, todaySessions: 0, uniqueUsers: 0, todayUsers: 0,
    registeredUsers: 0, returningUsers: 0,
    eventViews: 0, evPerSession: 0, ticketClicks: 0, cvr: 0,
    directions: 0, shares: 0, saves: 0,
    avgDuration: 0, avgPages: 0, avgEvents: 0,
    devices: { mobile: 0, tablet: 0, desktop: 0 },
    sources: { map: 0, list: 0, search: 0, direct: 0, swipe: 0 },
    genres: [] as { l: string; v: number }[],
    topEvents: [] as any[], topVenues: [] as any[],
    claimStarts: 0, claimSubmits: 0, signups: 0,
    mapLoads: 0, markerClicks: 0,
    peakHours: Array(24).fill(0) as number[],
    dailyS: [] as number[], dailyV: [] as number[],
    prevS: 0, prevU: 0,
  })

  useEffect(() => { load() }, [tr])

  const load = async () => {
    setLoading(true)
    try {
      const now = new Date()
      const db = tr === 'today' ? 0 : tr === '7days' ? 7 : tr === '30days' ? 30 : 365
      const sd = new Date(now); sd.setDate(sd.getDate() - db); const si = sd.toISOString()
      const ps = new Date(sd); ps.setDate(ps.getDate() - Math.max(db, 1))

      const [sR, iR, uR, bR, mR, shR, pR, pvR] = await Promise.all([
        supabase.from('analytics_events').select('*').eq('event_name', 'session_start').gte('created_at', si),
        supabase.from('event_interactions').select('*').gte('created_at', si),
        supabase.from('user_sessions').select('*').gte('created_at', si),
        supabase.from('business_metrics').select('*').gte('created_at', si),
        supabase.from('map_interactions').select('*').gte('created_at', si),
        supabase.from('analytics_events').select('*').eq('event_name', 'share_click').gte('created_at', si),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('analytics_events').select('session_id,user_id').eq('event_name', 'session_start').gte('created_at', ps.toISOString()).lt('created_at', si),
      ])

      const sess = sR.data||[], ints = iR.data||[], uSess = uR.data||[], biz = bR.data||[]
      const maps = mR.data||[], shs = shR.data||[], prev = pvR.data||[]

      const ts = sess.length, td = new Date().toDateString()
      const tds = sess.filter(s => new Date(s.created_at).toDateString() === td).length
      const uids = new Set(sess.map(s => s.user_id || s.session_id))
      const uu = uids.size
      const tu = new Set(sess.filter(s => new Date(s.created_at).toDateString() === td).map(s => s.user_id || s.session_id)).size
      const reg = pR.count || 0

      const uc: Record<string, number> = {}
      sess.forEach(s => { const u = s.user_id || s.session_id; uc[u] = (uc[u]||0)+1 })
      const ret = Object.values(uc).filter(c => c > 1).length

      const ev = ints.filter(i => i.interaction_type === 'view').length
      const tc = ints.filter(i => i.interaction_type === 'ticket_click').length
      const dir = ints.filter(i => i.interaction_type === 'directions').length
      const sv = ints.filter(i => i.interaction_type === 'save').length
      const tsh = shs.length + ints.filter(i => i.interaction_type === 'share').length
      const cvr = ev > 0 ? (tc/ev)*100 : 0
      const eps = ts > 0 ? ev/ts : 0

      const vd = uSess.filter(s => s.duration_seconds > 0)
      const ad = vd.length > 0 ? vd.reduce((a,s) => a + s.duration_seconds, 0) / vd.length : 0
      const vp = uSess.filter(s => s.page_views > 0)
      const ap = vp.length > 0 ? vp.reduce((a,s) => a + s.page_views, 0) / vp.length : 0
      const ve = uSess.filter(s => s.events_viewed > 0)
      const ae = ve.length > 0 ? ve.reduce((a,s) => a + s.events_viewed, 0) / ve.length : 0

      const devs = { mobile: 0, tablet: 0, desktop: 0 }
      sess.forEach(s => { const t = (s.device_type||'desktop') as keyof typeof devs; if (devs[t]!==undefined) devs[t]++ })

      const srcs = { map: 0, list: 0, search: 0, direct: 0, swipe: 0 }
      ints.filter(i => i.interaction_type === 'view').forEach(i => { const s = (i.source||'direct') as keyof typeof srcs; if (srcs[s]!==undefined) srcs[s]++ })

      const gc: Record<string,number> = {}
      ints.filter(i => i.genre_primary).forEach(i => { gc[i.genre_primary] = (gc[i.genre_primary]||0)+1 })
      const genres = Object.entries(gc).sort((a,b) => b[1]-a[1]).slice(0,6).map(([l,v]) => ({l,v}))

      const em: Record<string,any> = {}
      ints.filter(i => i.interaction_type === 'view').forEach(i => {
        const k = `${i.event_id}-${i.event_title}`
        if (!em[k]) em[k] = { t: i.event_title, v: i.venue_name, views: 0, clicks: 0 }
        em[k].views++
      })
      ints.filter(i => i.interaction_type === 'ticket_click').forEach(i => { const k = `${i.event_id}-${i.event_title}`; if (em[k]) em[k].clicks++ })
      const topEv = Object.values(em).sort((a:any,b:any) => b.views-a.views).slice(0,5)

      const vm: Record<string,any> = {}
      ints.forEach(i => { if (i.venue_name) { if (!vm[i.venue_name]) vm[i.venue_name] = { n: i.venue_name, v: 0 }; vm[i.venue_name].v++ } })
      const topVn = Object.values(vm).sort((a:any,b:any) => b.v-a.v).slice(0,5)

      const cs = biz.filter(b => b.metric_type === 'claim_start').length
      const csb = biz.filter(b => b.metric_type === 'claim_submit').length
      const su = biz.filter(b => b.metric_type === 'signup').length
      const ml = maps.filter(m => m.interaction_type === 'load').length
      const mc = maps.filter(m => m.interaction_type === 'marker_click').length

      const ph = Array(24).fill(0); sess.forEach(s => { ph[new Date(s.created_at).getHours()]++ })

      const nd = Math.max(db,1), dB: Record<string,number>={}, vB: Record<string,number>={}
      for (let i=0;i<nd;i++) { const dt = new Date(now); dt.setDate(dt.getDate()-(nd-1-i)); const k=dt.toISOString().split('T')[0]; dB[k]=0; vB[k]=0 }
      sess.forEach(s => { const k=new Date(s.created_at).toISOString().split('T')[0]; if(dB[k]!==undefined) dB[k]++ })
      ints.filter(i => i.interaction_type==='view').forEach(i => { const k=new Date(i.created_at).toISOString().split('T')[0]; if(vB[k]!==undefined) vB[k]++ })

      setD({
        totalSessions:ts, todaySessions:tds, uniqueUsers:uu, todayUsers:tu, registeredUsers:reg, returningUsers:ret,
        eventViews:ev, evPerSession:Math.round(eps*10)/10, ticketClicks:tc, cvr:Math.round(cvr*10)/10,
        directions:dir, shares:tsh, saves:sv,
        avgDuration:Math.round(ad), avgPages:Math.round(ap*10)/10, avgEvents:Math.round(ae*10)/10,
        devices:devs, sources:srcs, genres, topEvents:topEv, topVenues:topVn,
        claimStarts:cs, claimSubmits:csb, signups:su, mapLoads:ml, markerClicks:mc,
        peakHours:ph, dailyS:Object.values(dB), dailyV:Object.values(vB),
        prevS:prev.length, prevU:new Set(prev.map(s=>s.user_id||s.session_id)).size,
      })
    } catch(e) { console.error('Analytics error:',e) }
    finally { setLoading(false) }
  }

  const tot = d.devices.mobile+d.devices.tablet+d.devices.desktop
  const pct = (v:number,t:number) => t>0?Math.round((v/t)*100):0
  const gr = (c:number,p:number) => p===0?(c>0?100:0):Math.round(((c-p)/p)*100)
  const ug = gr(d.uniqueUsers, d.prevU)
  const mxE = d.topEvents.length>0?(d.topEvents[0] as any).views:1
  const totSrc = Object.values(d.sources).reduce((a,b)=>a+b,0)
  const fd = (s:number) => { if(s<60) return `${s}s`; const m=Math.floor(s/60); return `${m}m ${s%60}s` }
  const tl: Record<string,string> = {today:'Today','7days':'Last 7 Days','30days':'Last 30 Days',alltime:'All Time'}
  const gc = [C.purple,C.blue,C.green,C.amber,C.red,C.orange]
  const ph = d.peakHours.indexOf(Math.max(...d.peakHours))
  const pv = Math.max(...d.peakHours)

  const page: CSSProperties = { minHeight:'100vh', background:C.bg, color:'#fff', fontFamily:"'Sora',-apple-system,BlinkMacSystemFont,sans-serif" }
  const g = (cols:string): CSSProperties => ({ display:'grid', gridTemplateColumns:cols, gap:16 })

  if (loading) return (
    <div style={{...page,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <div style={{textAlign:'center'}}>
        <div style={{width:48,height:48,border:'3px solid rgba(171,103,247,0.15)',borderTopColor:C.purple,borderRadius:'50%',animation:'spin 1s linear infinite',margin:'0 auto 16px'}}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <div style={{fontSize:13,color:C.t3,fontWeight:500}}>Loading analytics…</div>
      </div>
    </div>
  )

  return (
    <div style={page}>
      <link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&display=swap" rel="stylesheet"/>
      <style>{`@keyframes pG{0%,100%{opacity:1}50%{opacity:.4}}@media(max-width:1024px){.bento4{grid-template-columns:1fr 1fr!important}.bento3{grid-template-columns:1fr!important}.bentoB{grid-template-columns:1fr!important}}@media(max-width:640px){.bento4{grid-template-columns:1fr!important}}`}</style>
      <div ref={ref} style={{maxWidth:1440,margin:'0 auto',padding:'32px 40px'}}>

        {/* HEADER */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:16}}>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:C.green,animation:'pG 2s ease-in-out infinite'}}/>
              <span style={{fontSize:11,fontWeight:600,letterSpacing:'0.15em',textTransform:'uppercase',color:C.t3}}>Live</span>
            </div>
            <div style={{width:1,height:20,background:'rgba(255,255,255,0.08)'}}/>
            <h1 style={{fontSize:24,fontWeight:700,letterSpacing:'-0.02em',margin:0}}>Analytics</h1>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{display:'flex',gap:4,padding:4,borderRadius:14,background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
              {(['today','7days','30days','alltime'] as const).map(t=>(
                <button key={t} onClick={()=>setTr(t)} style={{
                  padding:'7px 14px',borderRadius:10,fontSize:13,fontWeight:500,border:'none',cursor:'pointer',fontFamily:'inherit',
                  color:tr===t?C.purple:C.t2,background:tr===t?'rgba(171,103,247,0.1)':'transparent',
                  ...(tr===t?{boxShadow:'inset 0 0 0 1px rgba(171,103,247,0.25)'}:{}),
                }}>{t==='today'?'Today':t==='7days'?'7D':t==='30days'?'30D':'All'}</button>
              ))}
            </div>
            <button onClick={load} style={{padding:10,borderRadius:12,border:'1px solid rgba(255,255,255,0.06)',background:'rgba(255,255,255,0.03)',cursor:'pointer',display:'flex',alignItems:'center'}}>
              <svg width="15" height="15" fill="none" stroke="rgba(255,255,255,0.4)" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          </div>
        </div>

        {/* HERO */}
        <div className="bento4" style={g('repeat(4,1fr)')}>
          {[
            {label:'Users',val:d.uniqueUsers,sub:`${d.todayUsers} today · ${d.registeredUsers} registered`,color:C.purple,growth:ug},
            {label:'Sessions',val:d.totalSessions,sub:`${d.todaySessions} today · ${d.returningUsers} returning`,color:C.blue,spark:d.dailyS},
            {label:'Event Views',val:d.eventViews,sub:`${d.evPerSession}/session avg`,color:C.green,spark:d.dailyV},
            {label:'Conversion',val:d.cvr,sub:`${d.ticketClicks} ticket clicks`,color:C.amber,suffix:'%'},
          ].map((h,i)=>(
            <div key={i} style={{...card,background:`linear-gradient(135deg,${h.color}18,${h.color}08)`,border:`1px solid ${h.color}30`,display:'flex',flexDirection:'column',justifyContent:'space-between',minHeight:168}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{...lbl,color:h.color}}>{h.label}</span>
                {h.spark && <Spark data={h.spark} color={h.color}/>}
                {h.growth!==undefined && <span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:8,background:h.growth>0?'rgba(52,211,153,0.12)':h.growth<0?'rgba(248,113,113,0.12)':'rgba(255,255,255,0.05)',color:h.growth>0?C.green:h.growth<0?C.red:C.t3}}>{h.growth>0?'↑':h.growth<0?'↓':'–'} {Math.abs(h.growth)}%</span>}
              </div>
              <div>
                <div style={{fontSize:48,fontWeight:800,letterSpacing:'-0.04em',lineHeight:1}}>{h.val}{h.suffix && <span style={{fontSize:22,fontWeight:700,color:'rgba(255,255,255,0.3)',marginLeft:4}}>{h.suffix}</span>}</div>
                <div style={{fontSize:11,color:C.t3,marginTop:8,fontWeight:500}}>{h.sub}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{height:16}}/>

        {/* ROW 2 */}
        <div className="bento4" style={g('repeat(4,1fr)')}>
          {/* Session Depth */}
          <div style={card}>
            <div style={{...lbl,marginBottom:20}}>Session Depth</div>
            {[{l:'Avg Duration',v:fd(d.avgDuration)},{l:'Pages / Session',v:String(d.avgPages)},{l:'Events Explored',v:String(d.avgEvents)}].map(m=>(
              <div key={m.l} style={{marginBottom:20}}>
                <div style={{fontSize:11,color:C.t3,fontWeight:500,marginBottom:4}}>{m.l}</div>
                <div style={{fontSize:28,fontWeight:700,letterSpacing:'-0.03em'}}>{m.v}</div>
              </div>
            ))}
          </div>

          {/* Devices */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <span style={lbl}>Devices</span><span style={{fontSize:10,color:C.t4,fontWeight:500}}>{tot} total</span>
            </div>
            <div style={{display:'flex',justifyContent:'center',marginBottom:20,position:'relative'}}>
              <Donut segs={[{v:d.devices.mobile,c:C.purple},{v:d.devices.desktop,c:C.blue},{v:d.devices.tablet,c:C.green}]}/>
              <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center'}}>
                <div style={{fontSize:24,fontWeight:700}}>{pct(d.devices.mobile,tot)}%</div>
                <div style={{fontSize:9,color:C.t3,fontWeight:500}}>Mobile</div>
              </div>
            </div>
            {[{l:'Mobile',v:d.devices.mobile,c:C.purple},{l:'Desktop',v:d.devices.desktop,c:C.blue},{l:'Tablet',v:d.devices.tablet,c:C.green}].map(x=>(
              <div key={x.l} style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                <div style={{width:6,height:6,borderRadius:'50%',background:x.c,flexShrink:0}}/>
                <span style={{fontSize:11,color:C.t2,fontWeight:500,width:56}}>{x.l}</span>
                <div style={{flex:1}}><Bar value={x.v} max={tot} color={x.c}/></div>
                <span style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,0.5)',width:32,textAlign:'right'}}>{pct(x.v,tot)}%</span>
              </div>
            ))}
          </div>

          {/* Peak Hours */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:20}}>
              <span style={lbl}>Peak Hours</span><span style={{fontSize:10,color:C.t4,fontWeight:500}}>24h</span>
            </div>
            <div style={{marginBottom:8}}><Hours hrs={d.peakHours}/></div>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:9,color:C.t4,fontWeight:500,marginBottom:16}}>
              <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
            </div>
            {pv>0&&<div style={{padding:14,borderRadius:14,background:'rgba(171,103,247,0.06)',border:'1px solid rgba(171,103,247,0.12)'}}>
              <div style={{fontSize:11,color:C.t2,fontWeight:500}}>Peak time</div>
              <div style={{fontSize:20,fontWeight:700,color:C.purple,marginTop:2}}>{ph.toString().padStart(2,'0')}:00 – {((ph+1)%24).toString().padStart(2,'0')}:00</div>
              <div style={{fontSize:10,color:C.t3,marginTop:2}}>{pv} sessions</div>
            </div>}
          </div>

          {/* Engagement */}
          <div style={card}>
            <div style={{...lbl,marginBottom:16}}>Engagement</div>
            {[{i:'◈',l:'Directions',v:d.directions,c:C.blue},{i:'◉',l:'Shares',v:d.shares,c:C.purple},{i:'♡',l:'Saves',v:d.saves,c:C.red},{i:'◎',l:'Ticket Clicks',v:d.ticketClicks,c:C.amber},{i:'◇',l:'Map Loads',v:d.mapLoads,c:C.green},{i:'◆',l:'Marker Taps',v:d.markerClicks,c:C.green}].map(m=>(
              <div key={m.l} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <span style={{fontSize:14,color:m.c,width:20,textAlign:'center'}}>{m.i}</span>
                <span style={{fontSize:12,color:C.t2,fontWeight:500,flex:1}}>{m.l}</span>
                <span style={{fontSize:15,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{m.v.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{height:16}}/>

        {/* ROW 3 */}
        <div className="bento3" style={g('1fr 1fr 1fr')}>
          {/* Source */}
          <div style={card}>
            <div style={{...lbl,marginBottom:20}}>Discovery Source</div>
            {[{l:'Map',v:d.sources.map,c:C.purple},{l:'List / Feed',v:d.sources.list,c:C.blue},{l:'Search',v:d.sources.search,c:C.green},{l:'Direct Link',v:d.sources.direct,c:C.amber},{l:'Swipe',v:d.sources.swipe,c:C.orange}].map((x,i)=>{
              const mx=Math.max(...Object.values(d.sources),1)
              return <div key={i} style={{marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:12,fontWeight:500,color:C.t2}}>{x.l}</span><span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.6)',fontVariantNumeric:'tabular-nums'}}>{x.v}</span></div><Bar value={x.v} max={mx} color={x.c}/></div>
            })}
            <div style={{fontSize:10,color:C.t4,marginTop:8,fontWeight:500}}>{totSrc} total views</div>
          </div>

          {/* Genres */}
          <div style={card}>
            <div style={{...lbl,marginBottom:20}}>Genre Popularity</div>
            {d.genres.length>0?d.genres.map((x,i)=>{
              const mx=d.genres[0]?.v||1
              return <div key={i} style={{marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}><span style={{fontSize:12,fontWeight:500,color:C.t2}}>{x.l}</span><span style={{fontSize:12,fontWeight:600,color:'rgba(255,255,255,0.6)',fontVariantNumeric:'tabular-nums'}}>{x.v}</span></div><Bar value={x.v} max={mx} color={gc[i%gc.length]}/></div>
            }):<div style={{padding:'48px 0',textAlign:'center',fontSize:13,color:C.t4}}>No genre data yet</div>}
          </div>

          {/* Funnel */}
          <div style={card}>
            <div style={{...lbl,marginBottom:20}}>Conversion Funnel</div>
            {[{l:'Sessions',v:d.totalSessions,c:C.blue,s:''},{l:'Event Views',v:d.eventViews,c:C.purple,s:`${d.evPerSession}/session`},{l:'Ticket Clicks',v:d.ticketClicks,c:C.green,s:`${d.cvr}% CVR`}].map((st,i,arr)=>(
              <React.Fragment key={st.l}>
                <div style={{borderRadius:16,padding:'18px 16px',textAlign:'center',background:`${st.c}12`,border:`1px solid ${st.c}28`}}>
                  <div style={{fontSize:32,fontWeight:700,letterSpacing:'-0.03em'}}>{st.v.toLocaleString()}</div>
                  <div style={{fontSize:11,fontWeight:600,color:st.c,marginTop:4}}>{st.l}</div>
                  {st.s&&<div style={{fontSize:10,color:C.t3,marginTop:2}}>{st.s}</div>}
                </div>
                {i<arr.length-1&&<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'6px 0',color:C.t4}}>
                  <div style={{width:24,height:1,background:'rgba(255,255,255,0.06)'}}/>
                  <span style={{fontSize:10,fontWeight:500,color:C.t3}}>{pct(arr[i+1].v,d.totalSessions)}%</span>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M3 6l2 2 2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <div style={{width:24,height:1,background:'rgba(255,255,255,0.06)'}}/>
                </div>}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div style={{height:16}}/>

        {/* ROW 4 */}
        <div className="bentoB" style={g('5fr 4fr 3fr')}>
          {/* Top Events */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <span style={lbl}>Top Events</span><span style={{fontSize:10,color:C.t4,fontWeight:500}}>{tl[tr]}</span>
            </div>
            {d.topEvents.length>0?d.topEvents.map((ev:any,i:number)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:14,marginBottom:4,background:i===0?'rgba(171,103,247,0.06)':'transparent'}}>
                <div style={{width:30,height:30,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,background:i===0?'rgba(171,103,247,0.2)':'rgba(255,255,255,0.04)',color:i===0?C.purple:'rgba(255,255,255,0.25)'}}>{i+1}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{ev.t}</div>
                  <div style={{fontSize:10,color:C.t3}}>{ev.v}</div>
                </div>
                <div style={{width:64,flexShrink:0}}><Bar value={ev.views} max={mxE} color={i===0?C.purple:'rgba(255,255,255,0.15)'} h={3}/></div>
                <div style={{textAlign:'right',flexShrink:0,minWidth:40}}>
                  <div style={{fontSize:13,fontWeight:700,fontVariantNumeric:'tabular-nums'}}>{ev.views}</div>
                  <div style={{fontSize:10,fontWeight:500,color:C.green}}>{ev.clicks} click{ev.clicks!==1?'s':''}</div>
                </div>
              </div>
            )):<div style={{padding:'48px 0',textAlign:'center',fontSize:13,color:C.t4}}>No event data yet</div>}
          </div>

          {/* Top Venues */}
          <div style={card}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <span style={lbl}>Top Venues</span><span style={{fontSize:10,color:C.t4,fontWeight:500}}>{d.topVenues.length} venues</span>
            </div>
            {d.topVenues.length>0?d.topVenues.map((v:any,i:number)=>{
              const mx=(d.topVenues[0] as any)?.v||1, p=Math.round((v.v/mx)*100)
              return <div key={i} style={{position:'relative',display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:14,marginBottom:4,overflow:'hidden'}}>
                <div style={{position:'absolute',left:0,top:0,bottom:0,borderRadius:14,width:`${p}%`,background:i===0?'rgba(171,103,247,0.06)':'rgba(255,255,255,0.02)',transition:'width .7s'}}/>
                <div style={{position:'relative',width:30,height:30,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,flexShrink:0,background:i===0?'rgba(171,103,247,0.2)':'rgba(255,255,255,0.04)',color:i===0?C.purple:'rgba(255,255,255,0.25)'}}>{i+1}</div>
                <div style={{position:'relative',flex:1,fontSize:13,fontWeight:500,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{v.n}</div>
                <span style={{position:'relative',fontSize:13,fontWeight:700,color:C.purple,fontVariantNumeric:'tabular-nums'}}>{v.v}</span>
              </div>
            }):<div style={{padding:'48px 0',textAlign:'center',fontSize:13,color:C.t4}}>No venue data yet</div>}
          </div>

          {/* Business */}
          <div style={card}>
            <div style={{...lbl,marginBottom:20}}>Business</div>
            {[{l:'Venue Claims Started',v:d.claimStarts,c:'#fff'},{l:'Claims Submitted',v:d.claimSubmits,c:C.green},{l:'User Sign-ups',v:d.signups,c:C.purple},{l:'Registered Accounts',v:d.registeredUsers,c:'#fff'}].map(m=>(
              <div key={m.l} style={{marginBottom:20}}>
                <div style={{fontSize:11,color:C.t3,fontWeight:500,marginBottom:4}}>{m.l}</div>
                <div style={{fontSize:28,fontWeight:700,letterSpacing:'-0.03em',color:m.c}}>{m.v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:24,marginTop:8}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:C.purple}}/>
            <span style={{fontSize:11,fontWeight:600,letterSpacing:'0.12em',textTransform:'uppercase',color:C.t4}}>Sounded Out</span>
          </div>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.08)',fontWeight:500}}>Newcastle&apos;s nightlife infrastructure</span>
        </div>
      </div>
    </div>
  )
}
