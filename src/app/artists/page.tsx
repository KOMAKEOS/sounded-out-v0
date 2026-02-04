'use client'

import { useState, useRef, useCallback } from 'react'

// ═══════════════════════════════════════════════════════════════════════════════
// SOUNDED OUT — ARTIST HUB
// src/app/artists/page.tsx
// Hidden route. Code-locked. Self-contained. Zero external deps.
// Access: /artists then enter SOUNDEDOUT2026
// ═══════════════════════════════════════════════════════════════════════════════

// ── COLORS ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#0B0B0E',
  bg2: '#121218',
  card: '#1A1A22',
  cardH: '#1F1F2A',
  a: '#AB67F7',
  aDim: 'rgba(171,103,247,0.12)',
  aBdr: 'rgba(171,103,247,0.22)',
  aGlow: 'rgba(171,103,247,0.06)',
  t: '#E5E7EB',
  t2: '#9CA3AF',
  t3: '#6B7280',
  t4: '#4B5563',
  dv: '#2A2A35',
  gl: 'rgba(18,18,24,0.92)',
  glB: 'rgba(255,255,255,0.06)',
  g: '#34D399',
  gD: 'rgba(52,211,153,0.1)',
  gB: 'rgba(52,211,153,0.18)',
  am: '#FBBF24',
  amD: 'rgba(251,191,36,0.1)',
  amB: 'rgba(251,191,36,0.18)',
  r: '#F87171',
  blue: '#60A5FA',
} as const

// ── TYPES ────────────────────────────────────────────────────────────────────
interface Artist {
  id: string; initials: string; name: string; type: string; genres: string[]
  city: string; verified: boolean; bio: string; events: number; venues: number
  collabs: number; avail: 'open' | 'selective' | 'closed'; resp: string
  trav: string; perf: string[]; sounds: { t: string; tp: string; y: string }[]
  ig: string; memberOf: string[]
}
interface Community {
  id: string; name: string; members: number; desc: string; tags: string[]
  activity: string; admins: string[]; posts: CPost[]
}
interface CPost {
  id: string; author: string; authorName: string; time: string; text: string
  likes: number; replies: number; type: 'opportunity' | 'share' | 'announcement' | 'question'
}
interface CollabReq {
  id: string; from: string; fromId: string; type: string; detail: string
  genre: string; urgency: string; responses: number
}
interface TourDay {
  time: string; icon: string; title: string; sub: string; det: string
  note: string | null; hl: boolean
}
interface Screen { v: string; p: Record<string, string> }

// ── DATA ─────────────────────────────────────────────────────────────────────
const ARTISTS: Artist[] = [
  { id:'natty-d', initials:'ND', name:'Natty D', type:'MC', genres:['DnB','Grime','140'], city:'Newcastle', verified:true, bio:'Northeast MC spanning DnB, grime, and 140. Part of the Newcastle underground scene for 8+ years. Started on 140 grime, fell in love with drum and bass. Open to bookings, collabs, and studio sessions.', events:47, venues:12, collabs:23, avail:'open', resp:'Within 24hrs', trav:'UK-wide', perf:['Digital','Greys Club','World HQ','Riverside','Warehouse34'], sounds:[{t:'Skills & Tricks',tp:'Single',y:'2025'},{t:'Vocal Sample Pack Vol.1',tp:'Pack',y:'2024'},{t:'140 Reload (ft. Emzee)',tp:'Single',y:'2024'}], ig:'@nattyd_mc', memberOf:['ncl-dnb'] },
  { id:'underground-sound', initials:'US', name:'Underground Sound', type:'Collective', genres:['DnB','House'], city:'Newcastle', verified:true, bio:"Newcastle's longest running underground collective. Weekly events across Digital, Riverside, and pop-ups. 50+ residents. Building the northeast scene since 2018.", events:142, venues:8, collabs:67, avail:'selective', resp:'2–3 days', trav:'Northeast', perf:['Digital','Riverside','Boiler Shop','World HQ'], sounds:[{t:'US Residents Mix 024',tp:'Mix',y:'2025'}], ig:'@undergroundsound_ncl', memberOf:['ncl-dnb','label-heads'] },
  { id:'long-island-sound', initials:'LI', name:'Long Island Sound', type:'Collective', genres:['House','Electronic'], city:'Dublin', verified:false, bio:'Two mates from Ireland making housey electronic music. Regular UK tours. Studio heads turned live act.', events:34, venues:18, collabs:12, avail:'open', resp:'Within 48hrs', trav:'UK & Ireland', perf:['Button Factory','Index','Digital','Phonox'], sounds:[{t:'Coastline EP',tp:'EP',y:'2025'},{t:'Late Light',tp:'Single',y:'2024'}], ig:'@longislandsound_', memberOf:[] },
  { id:'dj-vortex', initials:'DV', name:'DJ Vortex', type:'DJ', genres:['Techno','Trance'], city:'Newcastle', verified:true, bio:'Peak-time techno and driving trance. Resident at Warehouse34. Monthly residency at Digital dark room. Hardware live sets.', events:89, venues:6, collabs:31, avail:'open', resp:'Same day', trav:'UK-wide', perf:['Warehouse34','Digital','The Cut','Ministry of Sound'], sounds:[{t:'Dark Room Sessions 011',tp:'Mix',y:'2025'}], ig:'@djvortex_', memberOf:['ncl-techno'] },
  { id:'phase-audio', initials:'PA', name:'Phase Audio', type:'Label', genres:['House','Garage'], city:'Sunderland', verified:false, bio:'Northeast focused house and garage label. Building a roster of local talent. Vinyl and digital. Always looking for new producers.', events:15, venues:4, collabs:19, avail:'selective', resp:'3–5 days', trav:'Northeast', perf:['Pop Recs','Independent','Riverside'], sounds:[{t:'Phase Vol.3 Compilation',tp:'Compilation',y:'2025'}], ig:'@phaseaudio_', memberOf:['label-heads','garage-uk'] },
  { id:'skibber-crew', initials:'SC', name:'Skibber Crew', type:'Sound System', genres:['DnB','Jungle'], city:'Newcastle', verified:false, bio:'Custom-built sound system. Jungle, DnB, dub. Available for hire. Named after the late great Skibber D. Byker-based workshop.', events:22, venues:5, collabs:8, avail:'open', resp:'Within 48hrs', trav:'Northeast', perf:['World HQ','Riverside','Various warehouses'], sounds:[], ig:'@skibbercrew', memberOf:['ne-systems','ncl-dnb'] },
  { id:'emzee', initials:'EM', name:'Emzee', type:'MC', genres:['DnB','UKG'], city:'Durham', verified:false, bio:'Young MC from Durham. DnB and UK garage. Coming up fast on the northeast circuit. Studio access in Durham.', events:18, venues:7, collabs:9, avail:'open', resp:'Same day', trav:'Northeast', perf:['Digital','Greys Club','Riverside'], sounds:[{t:'Mic Check (Freestyle)',tp:'Single',y:'2025'}], ig:'@emzee_mc', memberOf:['ncl-dnb','garage-uk'] },
  { id:'koda', initials:'KD', name:'Koda', type:'DJ', genres:['Lo-fi House','Disco'], city:'Newcastle', verified:false, bio:'Lo-fi house, edits, and disco. Sunday sessions at The Cumberland. Warm up specialist. Record collector.', events:56, venues:9, collabs:14, avail:'open', resp:'Within 24hrs', trav:'UK-wide', perf:['The Cumberland','Pleased','World HQ','YES Manchester'], sounds:[{t:'Sunday Service Mix 007',tp:'Mix',y:'2025'}], ig:'@koda.dj', memberOf:['ncl-dnb'] },
]

const COMMUNITIES: Community[] = [
  { id:'ncl-dnb', name:'Newcastle DnB Collective', members:234, desc:'DJs, MCs, producers, promoters — all DnB, all Northeast. Weekly shares, collab requests, event coordination.', tags:['Drum & Bass','Open'], activity:'Active now', admins:['natty-d','underground-sound'],
    posts:[
      { id:'p1', author:'natty-d', authorName:'Natty D', time:'2h ago', text:'Anyone free to MC at Digital next Friday? Underground Sound night, DnB all night. Headline set 1am–2:30am. DM me.', likes:18, replies:7, type:'opportunity' },
      { id:'p2', author:'emzee', authorName:'Emzee', time:'5h ago', text:'Just dropped Mic Check freestyle — would love feedback from the heads in here. Link in my profile. Produced it in the Durham studio.', likes:24, replies:12, type:'share' },
      { id:'p3', author:'skibber-crew', authorName:'Skibber Crew', time:'1d ago', text:'Sound system available for hire March–April. New mid-tops finished. Byker workshop viewings welcome. DM for rates.', likes:31, replies:4, type:'opportunity' },
      { id:'p4', author:'underground-sound', authorName:'Underground Sound', time:'1d ago', text:'Lineup announced for Northeast Weekender. 15 March at Digital. Long Island Sound headlining. Tickets on Skiddle.', likes:67, replies:19, type:'announcement' },
      { id:'p5', author:'koda', authorName:'Koda', time:'2d ago', text:'Looking for a DnB MC who can do double-time over liquid. Got a set at Greys next month. Paying gig. Newcastle or Durham based preferred.', likes:14, replies:9, type:'opportunity' },
    ]
  },
  { id:'ne-systems', name:'Northeast Sound Systems', members:89, desc:'Building rigs, sharing knowledge, booking lineups together. From bedroom builds to warehouse setups.', tags:['Sound Systems','Hardware'], activity:'8 new today', admins:['skibber-crew'],
    posts:[
      { id:'sp1', author:'skibber-crew', authorName:'Skibber Crew', time:'3h ago', text:'Finally finished the new 18" subs. Absolute cannons. Testing them at the warehouse Saturday if anyone wants to come hear them.', likes:42, replies:8, type:'share' },
      { id:'sp2', author:'dj-vortex', authorName:'DJ Vortex', time:'1d ago', text:'Anyone know a good source for Eminence drivers in the UK? Keep getting quoted mad shipping from the US.', likes:7, replies:11, type:'question' },
    ]
  },
  { id:'garage-uk', name:'Garage & 2-Step UK', members:412, desc:'National garage community. Share productions, find vocalists, book MCs. UKG, 2-step, bassline.', tags:['Garage','2-Step','National'], activity:'Active now', admins:['phase-audio'],
    posts:[
      { id:'gp1', author:'phase-audio', authorName:'Phase Audio', time:'6h ago', text:'Open call for the Phase Vol.4 compilation. House and garage producers — send demos to the label. Vinyl pressing confirmed. Deadline end of March.', likes:89, replies:34, type:'announcement' },
      { id:'gp2', author:'emzee', authorName:'Emzee', time:'1d ago', text:'Any garage producers need an MC? I can do UKG vocals, 2-step flows. Send me beats. Will lay bars for free if the tune is right.', likes:28, replies:16, type:'opportunity' },
    ]
  },
  { id:'ncl-techno', name:'Newcastle Techno Network', members:156, desc:'Dark rooms, industrial spaces, hard techno. Connecting the northeast techno underground.', tags:['Techno','Industrial'], activity:'3 new today', admins:['dj-vortex'],
    posts:[
      { id:'tp1', author:'dj-vortex', authorName:'DJ Vortex', time:'4h ago', text:'Warehouse34 dark room is getting a new Funktion-One rig. April onwards. Going to be absolutely lethal for techno.', likes:56, replies:13, type:'announcement' },
    ]
  },
  { id:'label-heads', name:'Northeast Label Heads', members:67, desc:'Running a label or starting one? Distribution, A&R, artwork, pressing. Share the knowledge.', tags:['Labels','Business'], activity:'Active today', admins:['phase-audio','underground-sound'],
    posts:[
      { id:'lp1', author:'phase-audio', authorName:'Phase Audio', time:'1d ago', text:'Just switched to a new vinyl distributor — way cheaper for small runs. Happy to share the contact if anyone is interested. DM me.', likes:19, replies:8, type:'share' },
      { id:'lp2', author:'underground-sound', authorName:'Underground Sound', time:'3d ago', text:'Thinking about starting a sub-label for the more experimental stuff we put on. Anyone done this? What is the best way to structure it?', likes:12, replies:6, type:'question' },
    ]
  },
]

const COLLABS: CollabReq[] = [
  { id:'cr1', from:'DJ Vortex', fromId:'dj-vortex', type:'Looking for MC', detail:'DnB set at World HQ, 22 March. Need an MC who knows the crowd. 90 min set, headline slot. £150 + drinks.', genre:'DnB', urgency:'2 weeks', responses:4 },
  { id:'cr2', from:'Phase Audio', fromId:'phase-audio', type:'Label seeking producers', detail:'House and garage producers for a Northeast-focused compilation. Vinyl pressing confirmed. Send demos via profile.', genre:'House / Garage', urgency:'Open', responses:11 },
  { id:'cr3', from:'Skibber Crew', fromId:'skibber-crew', type:'Sound system build', detail:'Building a new mid-top rig for summer. Need someone with speaker cab experience. Workshop in Byker. Materials covered.', genre:'All', urgency:'Ongoing', responses:2 },
  { id:'cr4', from:'Emzee', fromId:'emzee', type:'Studio session', detail:'Looking for DnB producers to lay vocals on. Have bars ready. Studio access in Durham. Flexible on timing.', genre:'DnB', urgency:'Flexible', responses:7 },
  { id:'cr5', from:'Koda', fromId:'koda', type:'Warm-up DJ needed', detail:'Got a disco/house night at Pleased, 28 March. Need someone for the 10pm–midnight slot. Good crowd, chill vibes. £100.', genre:'Disco / House', urgency:'3 weeks', responses:3 },
  { id:'cr6', from:'Natty D', fromId:'natty-d', type:'Forming a new label', detail:'Thinking of starting a label focused on 140/grime from the northeast. Looking for co-founders, A&R, and producers who want to build something. Lets talk.', genre:'Grime / 140', urgency:'Exploratory', responses:14 },
]

const TOUR_DAYS: Record<string, TourDay[]> = {
  'Fri 14 Mar': [
    { time:'14:30', icon:'✈️', title:'Flight Arrives', sub:'Ryanair FR204 · Dublin → Newcastle', det:'Terminal 1 · Gate info updates 2hrs before', note:'Boarding pass in your email', hl:false },
    { time:'15:15', icon:'🚗', title:'Airport Pickup', sub:'Driver: Marcus · Silver VW Passat', det:'Meeting at Arrivals hall, Terminal 1', note:'Marcus will hold a sign with your name', hl:false },
    { time:'16:00', icon:'🏨', title:'Hotel Check-in', sub:'Malmaison Newcastle', det:'Quayside · Room 312 · 2 nights booked', note:'Breakfast included 07:00–10:30', hl:false },
    { time:'18:00', icon:'🚶', title:'Free Evening', sub:'Explore the Quayside', det:'Hotel is a 12 min walk to venue along the river', note:null, hl:false },
    { time:'21:00', icon:'🍽️', title:'Dinner', sub:'Dobson & Parnell', det:'21 Queen St · Reservation for 4 at 21:00', note:"Booked under 'Underground Sound'", hl:false },
  ],
  'Sat 15 Mar': [
    { time:'10:30', icon:'☕', title:'Breakfast', sub:'Malmaison — Ground Floor', det:'Full English, continental, pastries', note:null, hl:false },
    { time:'12:00', icon:'🍽️', title:'Lunch', sub:'Quay Ingredient', det:'Queen St · Casual, walk-in', note:'Great sandwiches. 5 min walk.', hl:false },
    { time:'15:00', icon:'🚶', title:'Free Afternoon', sub:'Ouseburn Valley / BALTIC gallery', det:'Both walkable from Quayside', note:null, hl:false },
    { time:'17:00', icon:'🔊', title:'Soundcheck', sub:'Digital, Newcastle', det:'Times Bridge · Backstage access from 16:30', note:'Ask for Oli at the stage door', hl:false },
    { time:'19:00', icon:'🍽️', title:'Pre-show Meal', sub:'Backstage at Digital', det:'Rider confirmed: beer, water, fruit, sandwiches', note:null, hl:false },
    { time:'21:00', icon:'🚪', title:'Doors Open', sub:'Northeast Weekender', det:'800 capacity. Pre-sale sold 620 tickets.', note:null, hl:false },
    { time:'23:00', icon:'🎵', title:'YOUR SET — Main Room', sub:'23:00 – 01:00 · Full PA · Lighting rig', det:'Funktion-One. Allen & Heath Xone:96. 2x CDJ-3000.', note:'Capacity 800. Expecting 700+. Headline slot.', hl:true },
    { time:'01:00', icon:'🎶', title:'After-set', sub:'Backstage / Green Room', det:'DJ Vortex closing until 3am', note:null, hl:false },
  ],
  'Sun 16 Mar': [
    { time:'09:00', icon:'☕', title:'Breakfast', sub:'Last morning at Malmaison', det:'07:00–10:30', note:null, hl:false },
    { time:'10:00', icon:'🏨', title:'Hotel Checkout', sub:'Malmaison Newcastle', det:'Checkout by 10:00 · Bags at reception', note:null, hl:false },
    { time:'10:30', icon:'🚗', title:'Airport Transfer', sub:'Driver: Marcus · Same vehicle', det:'Hotel pickup 10:30 · 25 min to airport', note:null, hl:false },
    { time:'12:45', icon:'✈️', title:'Flight Departs', sub:'Ryanair FR207 · Newcastle → Dublin', det:'Arrive airport by 11:15. Gate closes 12:25.', note:null, hl:false },
  ],
}

const TOUR_CONTACTS = [
  { role:'Promoter', name:'Oli (Underground Sound)', ph:'+44 7XXX XXX XXX' },
  { role:'Venue', name:'Digital — Front of House', ph:'+44 191 XXX XXXX' },
  { role:'Driver', name:'Marcus', ph:'+44 7XXX XXX XXX' },
  { role:'Hotel', name:'Malmaison Reception', ph:'+44 191 XXX XXXX' },
]

// ── ICONS ────────────────────────────────────────────────────────────────────
function Ico({ d, size = 18, color = C.t2, fill = 'none', sw = '1.8' }: { d: string; size?: number; color?: string; fill?: string; sw?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
}

const ico = {
  back: (c: string = C.t2) => <Ico d="M15 18l-6-6 6-6" color={c} size={20} sw="2" />,
  search: (c: string = C.t2) => <><Ico d="M21 21l-4.35-4.35" color={c} /><circle cx="11" cy="11" r="8" fill="none" stroke={c} strokeWidth="1.8" /></>,
  share: (c: string = C.t2) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16,6 12,2 8,6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>,
  msg: (c: string = C.t2, s: number = 18) => <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  plus: (c: string = C.t2) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  check: (c: string = C.g, s: number = 14) => <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  play: () => <svg width="14" height="14" viewBox="0 0 24 24" fill={C.a} stroke="none"><polygon points="5,3 19,12 5,21"/></svg>,
  send: (c: string = 'white') => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22,2 15,22 11,13 2,9" fill="none"/></svg>,
  arrow: () => <Ico d="M5 12h14M12 5l7 7-7 7" color={C.a} sw="2" />,
  down: () => <Ico d="M6 9l6 6 6-6" color={C.t3} size={14} sw="2" />,
  heart: (c: string = C.t3) => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>,
  reply: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.t3} strokeWidth="1.8"><polyline points="9,17 4,12 9,7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>,
  phone: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.t2} strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>,
  users: (c: string = C.t2) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  edit: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.t2} strokeWidth="1.8"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  // Tab bar
  tabMap: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  tabCal: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  tabArt: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>,
  tabProf: (c: string) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
}

// ── SHARED UI ────────────────────────────────────────────────────────────────
function Pill({ children, active, small, onClick }: { children: React.ReactNode; active?: boolean; small?: boolean; onClick?: () => void }) {
  return <span onClick={onClick} style={{ padding: small ? '4px 10px' : '7px 14px', background: active ? C.aDim : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? C.aBdr : C.glB}`, borderRadius: 20, color: active ? C.a : C.t2, fontSize: small ? 11 : 12, fontWeight: 500, whiteSpace: 'nowrap', cursor: onClick ? 'pointer' : 'default', transition: 'all .15s ease', display: 'inline-block' }}>{children}</span>
}

function Av({ initials, size = 48, accent, glow, onClick }: { initials: string; size?: number; accent?: boolean; glow?: boolean; onClick?: () => void }) {
  return <div onClick={onClick} style={{ width: size, height: size, borderRadius: size / 2, background: `linear-gradient(135deg, ${accent ? '#2a1a40' : C.card}, ${accent ? C.aGlow : C.bg2})`, border: accent ? `2px solid ${C.a}` : `1px solid ${C.dv}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: Math.max(size * 0.3, 11), fontWeight: 600, color: accent ? C.a : C.t2, flexShrink: 0, boxShadow: glow ? `0 0 ${size * 0.4}px ${C.aGlow}` : 'none', cursor: onClick ? 'pointer' : 'default' }}>{initials}</div>
}

function Sec({ children }: { children: React.ReactNode }) {
  return <p style={{ color: C.t3, fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase', margin: '0 0 12px' }}>{children}</p>
}

function Card({ children, onClick, hl, style: s }: { children: React.ReactNode; onClick?: () => void; hl?: boolean; style?: React.CSSProperties }) {
  return <div onClick={onClick} style={{ padding: 16, borderRadius: 14, background: hl ? `linear-gradient(135deg, ${C.aGlow}, ${C.card})` : C.card, border: `1px solid ${hl ? C.aBdr : C.glB}`, cursor: onClick ? 'pointer' : 'default', transition: 'all .15s ease', marginBottom: 10, ...s }}>{children}</div>
}

function Btn({ children, primary, full, onClick, icon, style: s }: { children: React.ReactNode; primary?: boolean; full?: boolean; onClick?: () => void; icon?: React.ReactNode; style?: React.CSSProperties }) {
  return <div onClick={onClick} style={{ padding: '13px 18px', borderRadius: 12, background: primary ? C.a : 'rgba(255,255,255,0.04)', border: primary ? 'none' : `1px solid ${C.glB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', flex: full ? 1 : 'none', transition: 'all .15s ease', ...s }}>{icon}<span style={{ color: primary ? 'white' : C.t2, fontSize: 14, fontWeight: 600 }}>{children}</span></div>
}

function StatusDot({ s }: { s: string }) {
  const c: Record<string, string> = { open: C.g, selective: C.am, closed: C.r }
  const l: Record<string, string> = { open: 'Open to bookings', selective: 'Selective', closed: 'Not available' }
  return <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div style={{ width: 6, height: 6, borderRadius: 3, background: c[s] }} /><span style={{ color: c[s], fontSize: 12, fontWeight: 500 }}>{l[s]}</span></div>
}

function IconBtn({ icon, onClick }: { icon: React.ReactNode; onClick?: () => void }) {
  return <div onClick={onClick} style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.glB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{icon}</div>
}

function SmBtn({ icon, onClick }: { icon: React.ReactNode; onClick?: () => void }) {
  return <div onClick={onClick} style={{ width: 32, height: 32, borderRadius: 16, background: C.card, border: `1px solid ${C.glB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>{icon}</div>
}

// ── TAB BAR ──────────────────────────────────────────────────────────────────
function TabBar({ active, onTab }: { active: string; onTab: (id: string) => void }) {
  const tabs = [
    { id: 'map', label: 'Map', icon: ico.tabMap },
    { id: 'tonight', label: 'Tonight', icon: ico.tabCal },
    { id: 'artists', label: 'Artists', icon: ico.tabArt },
    { id: 'profile', label: 'Profile', icon: ico.tabProf },
  ]
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 82, background: 'rgba(11,11,14,0.94)', backdropFilter: 'blur(30px) saturate(1.6)', WebkitBackdropFilter: 'blur(30px) saturate(1.6)', borderTop: `0.5px solid ${C.glB}`, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-start', paddingTop: 10, zIndex: 200, boxShadow: '0 -8px 32px rgba(0,0,0,0.4)' }}>
      {tabs.map(t => (
        <div key={t.id} onClick={() => onTab(t.id)} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', opacity: t.id === active ? 1 : 0.45, transition: 'opacity .15s ease' }}>
          {t.icon(t.id === active ? C.a : C.t2)}
          <span style={{ fontSize: 10, fontWeight: 500, color: t.id === active ? C.a : C.t2 }}>{t.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── PAGE SHELL ───────────────────────────────────────────────────────────────
function Shell({ children, title, subtitle, onBack, right, tab = 'artists', onTab }: { children: React.ReactNode; title: string; subtitle?: string; onBack?: () => void; right?: React.ReactNode; tab?: string; onTab: (id: string) => void }) {
  return (
    <div style={{ width: '100%', minHeight: '100vh', background: C.bg, fontFamily: '-apple-system, "SF Pro Display", "SF Pro Text", system-ui, sans-serif', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: C.gl, backdropFilter: 'blur(24px) saturate(1.4)', WebkitBackdropFilter: 'blur(24px) saturate(1.4)', borderBottom: `1px solid ${C.glB}`, padding: '16px 20px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
            {onBack && <div onClick={onBack} style={{ width: 36, height: 36, borderRadius: 18, background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>{ico.back()}</div>}
            <div style={{ minWidth: 0 }}>
              <h1 style={{ color: C.t, fontSize: onBack ? 18 : 24, fontWeight: 700, margin: 0, letterSpacing: -0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</h1>
              {subtitle && <p style={{ color: C.t3, fontSize: 12, margin: '2px 0 0' }}>{subtitle}</p>}
            </div>
          </div>
          {right && <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 8 }}>{right}</div>}
        </div>
      </div>
      <div style={{ paddingBottom: 96 }}>{children}</div>
      <TabBar active={tab} onTab={onTab} />
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE LOCK
// ═══════════════════════════════════════════════════════════════════════════════
function CodeLock({ onUnlock }: { onUnlock: () => void }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState(false)
  const [shake, setShake] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const submit = useCallback(() => {
    if (code.toUpperCase() === 'SOUNDEDOUT2026') { onUnlock() }
    else { setErr(true); setShake(true); setTimeout(() => { setShake(false); setCode('') }, 500) }
  }, [code, onUnlock])

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, "SF Pro Display", system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', padding: '40px 32px', maxWidth: 380 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.t4} strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
        <div style={{ marginTop: 24 }}>
          <p style={{ color: C.a, fontSize: 11, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase', margin: '0 0 8px' }}>Sounded Out</p>
          <h1 style={{ color: C.t, fontSize: 24, fontWeight: 700, margin: '0 0 8px', letterSpacing: -0.3 }}>Artist Hub</h1>
          <p style={{ color: C.t3, fontSize: 14, margin: '0 0 32px', lineHeight: 1.5 }}>Private preview. Enter code to continue.</p>
        </div>
        <div style={{ animation: shake ? 'ahShake .4s ease' : 'none' }}>
          <input ref={ref} type="text" value={code} onChange={e => { setCode(e.target.value.toUpperCase()); setErr(false) }} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="ACCESS CODE" style={{ width: '100%', padding: '16px 20px', borderRadius: 14, background: C.card, border: `1px solid ${err ? C.r : C.dv}`, color: C.t, fontSize: 16, fontWeight: 600, letterSpacing: 3, textAlign: 'center', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>
        {err && <p style={{ color: C.r, fontSize: 13, margin: '12px 0 0' }}>Invalid code</p>}
        <div onClick={submit} style={{ marginTop: 16, padding: 14, borderRadius: 14, background: code.length > 0 ? C.a : C.card, cursor: code.length > 0 ? 'pointer' : 'default', transition: 'all .2s ease' }}><span style={{ color: code.length > 0 ? 'white' : C.t3, fontSize: 15, fontWeight: 600 }}>Enter</span></div>
        <style>{`@keyframes ahShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCREENS
// ═══════════════════════════════════════════════════════════════════════════════

// ── HUB (Browse) ─────────────────────────────────────────────────────────────
function HubScreen({ nav, onTab }: { nav: (v: string, p?: Record<string, string>) => void; onTab: (id: string) => void }) {
  const [filter, setFilter] = useState('All')
  const types = ['All', 'DJs', 'MCs', 'Collectives', 'Labels', 'Sound Systems']
  const mp: Record<string, string> = { DJs: 'DJ', MCs: 'MC', Collectives: 'Collective', Labels: 'Label', 'Sound Systems': 'Sound System' }
  const list = filter === 'All' ? ARTISTS : ARTISTS.filter(a => a.type === mp[filter])
  const feat = ARTISTS[0]

  return (
    <Shell title="Artists" subtitle="Newcastle & Northeast" onTab={onTab} right={<><IconBtn icon={ico.search()} /><IconBtn icon={ico.users()} onClick={() => nav('network')} /></>}>
      <div style={{ padding: '16px 20px 8px', display: 'flex', gap: 8, overflowX: 'auto' }}>
        {types.map(t => <Pill key={t} active={filter === t} onClick={() => setFilter(t)}>{t}</Pill>)}
      </div>
      {filter === 'All' && (
        <div style={{ padding: '12px 20px 0' }}>
          <Sec>Featured</Sec>
          <div onClick={() => nav('profile', { id: feat.id })} style={{ borderRadius: 16, overflow: 'hidden', background: `linear-gradient(135deg, ${C.card}, ${C.aGlow})`, border: `1px solid ${C.glB}`, cursor: 'pointer' }}>
            <div style={{ height: 130, background: `linear-gradient(180deg, rgba(171,103,247,0.1) 0%, ${C.bg}ee 100%)`, display: 'flex', alignItems: 'flex-end', padding: 20 }}>
              <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', width: '100%' }}>
                <Av initials={feat.initials} size={60} accent glow />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.t, fontSize: 20, fontWeight: 700 }}>{feat.name}</span>{feat.verified && ico.check()}</div>
                  <p style={{ color: C.t2, fontSize: 13, margin: '2px 0 0' }}>{feat.type} · {feat.genres.join(', ')}</p>
                </div>
              </div>
            </div>
            <div style={{ padding: '12px 20px 14px', display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6, flex: 1 }}>{feat.genres.map(g => <Pill key={g} small>{g}</Pill>)}</div>
              <StatusDot s={feat.avail} />
            </div>
          </div>
        </div>
      )}
      <div style={{ padding: '16px 20px 0' }}>
        <Sec>{filter === 'All' ? 'All Artists' : filter}</Sec>
        {list.map((a, i) => (
          <div key={a.id} onClick={() => nav('profile', { id: a.id })} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '14px 0', borderBottom: i < list.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', cursor: 'pointer' }}>
            <Av initials={a.initials} size={48} accent={a.verified} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.t, fontSize: 15, fontWeight: 600 }}>{a.name}</span>{a.verified && ico.check()}</div>
              <p style={{ color: C.t2, fontSize: 13, margin: '2px 0 0' }}>{a.type} · {a.genres.slice(0, 2).join(', ')}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ color: C.t3, fontSize: 12, margin: 0 }}>{a.events} events</p>
              <p style={{ color: C.t3, fontSize: 11, margin: '2px 0 0' }}>{a.city}</p>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '24px 20px' }}><Card hl onClick={() => nav('network')}><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><div><p style={{ color: C.a, fontSize: 14, fontWeight: 600, margin: 0 }}>Are you an artist?</p><p style={{ color: C.t2, fontSize: 12, margin: '4px 0 0' }}>Claim your profile · Get booked · Network</p></div>{ico.arrow()}</div></Card></div>
    </Shell>
  )
}

// ── PROFILE ──────────────────────────────────────────────────────────────────
function ProfileScreen({ id, nav, onTab }: { id: string; nav: (v: string, p?: Record<string, string>) => void; onTab: (id: string) => void }) {
  const a = ARTISTS.find(x => x.id === id)
  if (!a) return null
  return (
    <Shell title={a.name} subtitle={`${a.type} · ${a.city}`} onBack={() => nav('back')} onTab={onTab} right={<IconBtn icon={ico.share()} />}>
      <div style={{ padding: '20px 20px 0', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Av initials={a.initials} size={80} accent={a.verified} glow={a.verified} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}><span style={{ color: C.t, fontSize: 22, fontWeight: 700 }}>{a.name}</span>{a.verified && ico.check(C.g, 16)}</div>
          <p style={{ color: C.t2, fontSize: 14, margin: '0 0 8px' }}>{a.type} · {a.city}</p>
          <StatusDot s={a.avail} />
        </div>
      </div>
      <div style={{ padding: '16px 20px 0', display: 'flex', gap: 10 }}>
        <Btn primary full onClick={() => nav('book', { id: a.id })} icon={ico.send('white')}>Book</Btn>
        <Btn full onClick={() => nav('message', { id: a.id })} icon={ico.msg()}>Message</Btn>
      </div>
      <div style={{ padding: 20 }}>
        <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>{a.bio}</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{a.genres.map(g => <Pill key={g} small>{g}</Pill>)}<Pill small>{a.type}</Pill></div>
      </div>
      <div style={{ padding: '0 20px 20px', display: 'flex', gap: 1 }}>
        {[{ l: 'Events', v: a.events }, { l: 'Venues', v: a.venues }, { l: 'Collabs', v: a.collabs }].map((s, i) => (
          <div key={i} style={{ flex: 1, padding: 14, textAlign: 'center', background: C.card, borderRadius: i === 0 ? '12px 0 0 12px' : i === 2 ? '0 12px 12px 0' : 0 }}>
            <p style={{ color: C.t, fontSize: 20, fontWeight: 700, margin: 0 }}>{s.v}</p>
            <p style={{ color: C.t3, fontSize: 11, fontWeight: 500, margin: '4px 0 0', textTransform: 'uppercase', letterSpacing: 0.5 }}>{s.l}</p>
          </div>
        ))}
      </div>
      <div style={{ padding: '0 20px 20px' }}>
        <Sec>Performed At</Sec>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {a.perf.map((v, i) => <div key={i} style={{ minWidth: 110, padding: 14, borderRadius: 12, background: C.card, border: `1px solid ${C.glB}`, flexShrink: 0 }}><p style={{ color: C.t, fontSize: 13, fontWeight: 600, margin: 0 }}>{v}</p></div>)}
        </div>
      </div>
      {a.sounds.length > 0 && <div style={{ padding: '0 20px 20px' }}>
        <Sec>Latest Sounds</Sec>
        {a.sounds.map((t, i) => <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < a.sounds.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}><div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, ${C.aDim}, ${C.card})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ico.play()}</div><div style={{ flex: 1 }}><p style={{ color: C.t, fontSize: 14, fontWeight: 600, margin: 0 }}>{t.t}</p><p style={{ color: C.t3, fontSize: 12, margin: '2px 0 0' }}>{t.tp} · {t.y}</p></div></div>)}
      </div>}
      <div style={{ padding: '0 20px 20px' }}><Card><Sec>Booking Info</Sec>
        {[{ l: 'Availability', v: a.avail === 'open' ? 'Open to bookings' : 'Selective', c: a.avail === 'open' ? C.g : C.am }, { l: 'Response time', v: a.resp, c: C.t }, { l: 'Travels to', v: a.trav, c: C.t }].map((r, i) => <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}><span style={{ color: C.t2, fontSize: 13 }}>{r.l}</span><span style={{ color: r.c, fontSize: 13, fontWeight: 500 }}>{r.v}</span></div>)}
      </Card></div>
      {a.memberOf.length > 0 && <div style={{ padding: '0 20px 20px' }}>
        <Sec>Communities</Sec>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {a.memberOf.map(cid => { const cm = COMMUNITIES.find(x => x.id === cid); return cm ? <Pill key={cid} small onClick={() => nav('community', { id: cid })}>{cm.name}</Pill> : null })}
        </div>
      </div>}
    </Shell>
  )
}

// ── BOOKING ──────────────────────────────────────────────────────────────────
function BookScreen({ id, nav, onTab }: { id: string; nav: (v: string, p?: Record<string, string>) => void; onTab: (id: string) => void }) {
  const a = ARTISTS.find(x => x.id === id)
  const [sent, setSent] = useState(false)
  if (!a) return null

  if (sent) return (
    <Shell title="Booking Sent" onBack={() => nav('hub')} onTab={onTab}>
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div style={{ width: 80, height: 80, borderRadius: 40, background: C.gD, border: `1px solid ${C.gB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={C.g} strokeWidth="2"><polyline points="20,6 9,17 4,12"/></svg></div>
        <h2 style={{ color: C.t, fontSize: 22, fontWeight: 700, margin: '0 0 8px' }}>Request Sent</h2>
        <p style={{ color: C.t2, fontSize: 14, margin: '0 0 4px' }}>Booking request sent to {a.name}</p>
        <p style={{ color: C.t3, fontSize: 13, margin: '0 0 32px' }}>Typically responds {a.resp.toLowerCase()}</p>
        <Btn primary full onClick={() => nav('profile', { id: a.id })}>Back to Profile</Btn>
      </div>
    </Shell>
  )

  const Fld = ({ label, children }: { label: string; children: React.ReactNode }) => <div style={{ marginBottom: 16 }}><label style={{ color: C.t3, fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>{label}</label>{children}</div>
  const Inp = ({ value }: { value: string }) => <div style={{ padding: '14px 16px', borderRadius: 12, background: C.card, border: `1px solid ${C.dv}` }}><span style={{ color: C.t, fontSize: 14 }}>{value}</span></div>

  return (
    <Shell title={`Book ${a.name}`} onBack={() => nav('back')} onTab={onTab}>
      <div style={{ padding: 20 }}>
        <Card style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 24 }}><Av initials={a.initials} size={52} accent /><div><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.t, fontSize: 16, fontWeight: 600 }}>{a.name}</span>{a.verified && ico.check()}</div><p style={{ color: C.t2, fontSize: 13, margin: '2px 0 4px' }}>{a.type} · {a.genres.join(', ')}</p><StatusDot s={a.avail} /></div></Card>
        <Fld label="Your Venue"><Inp value="Digital, Newcastle" /></Fld>
        <Fld label="Event Date"><Inp value="Saturday 15 March 2026" /></Fld>
        <Fld label="Event Name"><Inp value="Underground Sound Presents: Bass Culture" /></Fld>
        <div style={{ display: 'flex', gap: 10 }}><div style={{ flex: 1 }}><Fld label="Set Start"><Inp value="01:00" /></Fld></div><div style={{ flex: 1 }}><Fld label="Set End"><Inp value="02:30" /></Fld></div></div>
        <Fld label="Offered Fee"><Inp value="£250" /></Fld>
        <Fld label="Message"><div style={{ padding: '14px 16px', borderRadius: 12, background: C.card, border: `1px solid ${C.dv}`, minHeight: 80 }}><span style={{ color: C.t2, fontSize: 14, lineHeight: 1.5 }}>Hey {a.name.split(' ')[0]}, we are putting on a DnB night and would love to have you on the lineup…</span></div></Fld>
        <div style={{ marginTop: 8 }}><Btn primary full onClick={() => setSent(true)} icon={ico.send()}>Send Booking Request</Btn></div>
        <p style={{ color: C.t3, fontSize: 12, textAlign: 'center', margin: '12px 0 0' }}>{a.name} typically responds {a.resp.toLowerCase()}</p>
      </div>
    </Shell>
  )
}

// ── MESSAGES ─────────────────────────────────────────────────────────────────
function MessageScreen({ id, nav, onTab }: { id: string; nav: (v: string, p?: Record<string, string>) => void; onTab: (id: string) => void }) {
  const a = ARTISTS.find(x => x.id === id)
  if (!a) return null
  const msgs = [
    { from: 'you', text: `Hey ${a.name.split(' ')[0]}, saw your profile on Sounded Out. We are putting together a lineup for March — would you be up for it?`, time: '14:32' },
    { from: 'them', text: 'Yeah man, sounds good! What venue and what is the date? I am free most of March.', time: '14:45' },
    { from: 'you', text: 'Digital, Saturday 15th. Main room, DnB night. We would want you on from 1am to 2:30am.', time: '14:47' },
    { from: 'them', text: 'Perfect. That works for me. What is the offer?', time: '15:02' },
    { from: 'you', text: '£250 + drinks. We can sort out more details if you are in.', time: '15:05' },
    { from: 'them', text: 'I am in. Send me the booking through the app and I will confirm it', time: '15:08' },
  ]
  return (
    <Shell title={a.name} subtitle="Direct Message" onBack={() => nav('back')} onTab={onTab}>
      <div style={{ padding: '16px 20px 80px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {msgs.map((m, i) => <div key={i} style={{ display: 'flex', justifyContent: m.from === 'you' ? 'flex-end' : 'flex-start' }}><div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: m.from === 'you' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.from === 'you' ? C.aDim : C.card, border: `1px solid ${m.from === 'you' ? C.aBdr : C.glB}` }}><p style={{ color: C.t, fontSize: 14, lineHeight: 1.5, margin: 0 }}>{m.text}</p><p style={{ color: C.t3, fontSize: 11, margin: '6px 0 0', textAlign: 'right' }}>{m.time}</p></div></div>)}
      </div>
    </Shell>
  )
}

// ── NETWORK ──────────────────────────────────────────────────────────────────
function NetworkScreen({ nav, onTab }: { nav: (v: string, p?: Record<string, string>) => void; onTab: (id: string) => void }) {
  const [tab, setTab] = useState('communities')
  return (
    <Shell title="Network" subtitle="Connect · Collaborate · Create" onBack={() => nav('hub')} onTab={onTab} right={<div onClick={() => {}} style={{ padding: '8px 14px', borderRadius: 20, background: C.aDim, border: `1px solid ${C.aBdr}`, cursor: 'pointer' }}><span style={{ color: C.a, fontSize: 13, fontWeight: 600 }}>+ Post</span></div>}>
      <div style={{ padding: '12px 20px 0', display: 'flex', borderBottom: `1px solid ${C.glB}` }}>
        {['communities', 'collabs', 'tour hq'].map(t => <div key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0 14px', textAlign: 'center', cursor: 'pointer', borderBottom: `2px solid ${tab === t ? C.a : 'transparent'}`, transition: 'all .2s ease' }}><span style={{ color: tab === t ? C.t : C.t3, fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{t}</span></div>)}
      </div>
      {tab === 'communities' && <div style={{ padding: '16px 20px 0' }}>
        {COMMUNITIES.map(c => (
          <Card key={c.id} onClick={() => nav('community', { id: c.id })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <p style={{ color: C.t, fontSize: 15, fontWeight: 600, margin: 0, flex: 1 }}>{c.name}</p>
              <span style={{ color: C.g, fontSize: 11, fontWeight: 500, flexShrink: 0, marginLeft: 8 }}>{c.activity}</span>
            </div>
            <p style={{ color: C.t2, fontSize: 13, margin: '0 0 10px', lineHeight: 1.5 }}>{c.desc}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 6 }}>{c.tags.map(t => <Pill key={t} small>{t}</Pill>)}</div>
              <span style={{ color: C.t3, fontSize: 12 }}>{c.members} members</span>
            </div>
          </Card>
        ))}
      </div>}
      {tab === 'collabs' && <div style={{ padding: '16px 20px 0' }}>
        {COLLABS.map(cr => (
          <Card key={cr.id} onClick={() => nav('collab', { id: cr.id })}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div><p style={{ color: C.a, fontSize: 13, fontWeight: 600, margin: 0 }}>{cr.type}</p><p style={{ color: C.t3, fontSize: 12, margin: '2px 0 0' }}>from {cr.from}</p></div>
              <div style={{ padding: '4px 10px', borderRadius: 8, background: C.amD, border: `1px solid ${C.amB}` }}><span style={{ color: C.am, fontSize: 11, fontWeight: 500 }}>{cr.urgency}</span></div>
            </div>
            <p style={{ color: C.t2, fontSize: 13, margin: '8px 0 0', lineHeight: 1.5 }}>{cr.detail}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <Pill small>{cr.genre}</Pill>
              <span style={{ color: C.t3, fontSize: 12 }}>{cr.responses} responses</span>
            </div>
          </Card>
        ))}
        <div style={{ marginTop: 8 }}><Btn primary full icon={ico.plus('white')}>Post a Collab Request</Btn></div>
      </div>}
      {tab === 'tour hq' && <TourContent nav={nav} />}
    </Shell>
  )
}

// ── TOUR HQ (inline in network) ──────────────────────────────────────────────
function TourContent({ nav }: { nav: (v: string, p?: Record<string, string>) => void }) {
  const days = Object.keys(TOUR_DAYS)
  const [day, setDay] = useState(days[1])
  return (
    <div>
      <div style={{ padding: '16px 20px 0' }}>
        <Card hl style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <Av initials="LI" size={52} accent />
          <div style={{ flex: 1 }}><p style={{ color: C.t, fontSize: 16, fontWeight: 600, margin: 0 }}>Long Island Sound</p><p style={{ color: C.t2, fontSize: 13, margin: '2px 0 0' }}>Travelling from Dublin, IE</p></div>
          <div style={{ padding: '6px 12px', borderRadius: 8, background: C.gD, border: `1px solid ${C.gB}` }}><span style={{ color: C.g, fontSize: 11, fontWeight: 600 }}>Confirmed</span></div>
        </Card>
        <p style={{ color: C.t3, fontSize: 12, margin: '0 0 12px' }}>Northeast Weekender · Newcastle · 14–16 Mar 2026</p>
      </div>
      <div style={{ padding: '0 20px 0', display: 'flex', gap: 8 }}>
        {days.map(d => <Pill key={d} active={day === d} onClick={() => setDay(d)}>{d}</Pill>)}
      </div>
      <div style={{ padding: '16px 20px 0' }}>
        <Sec>Itinerary — {day}</Sec>
        {TOUR_DAYS[day].map((item, i, arr) => (
          <div key={i} style={{ display: 'flex', gap: 14, position: 'relative' }}>
            {i < arr.length - 1 && <div style={{ position: 'absolute', left: 19, top: 42, bottom: -4, width: 1, background: C.dv }} />}
            <div style={{ width: 40, height: 40, borderRadius: 20, flexShrink: 0, background: item.hl ? C.aDim : C.card, border: `1px solid ${item.hl ? C.aBdr : C.glB}`, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, fontSize: 18 }}>{item.icon}</div>
            <div style={{ flex: 1, marginBottom: 12 }}>
              <Card hl={item.hl}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                  <p style={{ color: C.t, fontSize: 14, fontWeight: 600, margin: 0 }}>{item.title}</p>
                  <span style={{ color: item.hl ? C.a : C.t3, fontSize: 13, fontWeight: 600, flexShrink: 0, marginLeft: 8 }}>{item.time}</span>
                </div>
                <p style={{ color: C.t2, fontSize: 13, margin: '2px 0 0' }}>{item.sub}</p>
                <p style={{ color: C.t3, fontSize: 12, margin: '4px 0 0' }}>{item.det}</p>
                {item.note && <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}><p style={{ color: C.t3, fontSize: 12, margin: 0, fontStyle: 'italic' }}>{item.note}</p></div>}
              </Card>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '8px 20px 0' }}><Sec>Key Contacts</Sec>
        {TOUR_CONTACTS.map((ct, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < TOUR_CONTACTS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div><p style={{ color: C.t, fontSize: 14, fontWeight: 500, margin: 0 }}>{ct.name}</p><p style={{ color: C.t3, fontSize: 12, margin: '2px 0 0' }}>{ct.role}</p></div>
            <div style={{ display: 'flex', gap: 8 }}><SmBtn icon={ico.phone()} /><SmBtn icon={ico.msg(C.t3, 14)} /></div>
          </div>
        ))}
      </div>
      <div style={{ padding: 20, display: 'flex', gap: 10 }}>
        <Btn full icon={ico.msg()}>Message Artist</Btn>
        <Btn full icon={ico.share()}>Share Link</Btn>
      </div>
      <p style={{ color: C.t3, fontSize: 12, textAlign: 'center', padding: '0 20px 8px', lineHeight: 1.5 }}>Artist can view this itinerary without an account</p>
    </div>
  )
}

// ── COMMUNITY DETAIL ─────────────────────────────────────────────────────────
function CommunityScreen({ id, nav, onTab }: { id: string; nav: (v: string, p?: Record<string, string>) => void; onTab: (id: string) => void }) {
  const c = COMMUNITIES.find(x => x.id === id)
  if (!c) return null
  const [tab, setTab] = useState('posts')
  const members = ARTISTS.filter(a => a.memberOf.includes(id))
  const ptC: Record<string, string> = { opportunity: C.a, share: C.blue, announcement: C.g, question: C.am }
  const ptL: Record<string, string> = { opportunity: 'Opportunity', share: 'Share', announcement: 'Announcement', question: 'Question' }

  return (
    <Shell title={c.name} subtitle={`${c.members} members`} onBack={() => nav('back')} onTab={onTab} right={<Btn primary style={{ padding: '8px 16px' }}>Join</Btn>}>
      <div style={{ padding: '16px 20px 0' }}>
        <Card>
          <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>{c.desc}</p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>{c.tags.map(t => <Pill key={t} small>{t}</Pill>)}</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div><span style={{ color: C.t, fontSize: 16, fontWeight: 700 }}>{c.members}</span><span style={{ color: C.t3, fontSize: 12, marginLeft: 4 }}>members</span></div>
            <div><span style={{ color: C.t, fontSize: 16, fontWeight: 700 }}>{c.posts.length}</span><span style={{ color: C.t3, fontSize: 12, marginLeft: 4 }}>posts this week</span></div>
          </div>
        </Card>
      </div>
      <div style={{ padding: '4px 20px 0', display: 'flex', borderBottom: `1px solid ${C.glB}` }}>
        {['posts', 'members', 'about'].map(t => <div key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: '10px 0 14px', textAlign: 'center', cursor: 'pointer', borderBottom: `2px solid ${tab === t ? C.a : 'transparent'}`, transition: 'all .2s ease' }}><span style={{ color: tab === t ? C.t : C.t3, fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{t}</span></div>)}
      </div>
      {tab === 'posts' && <div style={{ padding: '16px 20px 0' }}>
        <Card style={{ display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}><Av initials="YO" size={36} /><span style={{ color: C.t3, fontSize: 14, flex: 1 }}>Share something with the community…</span></Card>
        {c.posts.map(p => { const au = ARTISTS.find(a => a.id === p.author); return (
          <Card key={p.id}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
              <Av initials={au?.initials || '?'} size={40} accent={au?.verified} onClick={() => au && nav('profile', { id: au.id })} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span onClick={() => au && nav('profile', { id: au.id })} style={{ color: C.t, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>{p.authorName}</span>
                  {au?.verified && ico.check(C.g, 12)}
                  <span style={{ color: C.t4, fontSize: 11 }}>·</span>
                  <span style={{ color: C.t3, fontSize: 12 }}>{p.time}</span>
                </div>
                <div style={{ marginTop: 2 }}><span style={{ color: ptC[p.type], fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{ptL[p.type]}</span></div>
              </div>
            </div>
            <p style={{ color: C.t2, fontSize: 14, lineHeight: 1.6, margin: '0 0 12px' }}>{p.text}</p>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>{ico.heart()}<span style={{ color: C.t3, fontSize: 12 }}>{p.likes}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>{ico.reply()}<span style={{ color: C.t3, fontSize: 12 }}>{p.replies}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginLeft: 'auto' }}>{ico.share(C.t3)}</div>
            </div>
          </Card>
        )})}
      </div>}
      {tab === 'members' && <div style={{ padding: '16px 20px 0' }}>
        <Sec>Admins</Sec>
        {c.admins.map(aid => { const a = ARTISTS.find(x => x.id === aid); if (!a) return null; return (
          <div key={aid} onClick={() => nav('profile', { id: aid })} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
            <Av initials={a.initials} size={44} accent={a.verified} />
            <div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.t, fontSize: 14, fontWeight: 600 }}>{a.name}</span>{a.verified && ico.check(C.g, 12)}</div><p style={{ color: C.t2, fontSize: 12, margin: '2px 0 0' }}>{a.type} · {a.city}</p></div>
            <span style={{ color: C.a, fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 8, background: C.aDim }}>Admin</span>
          </div>
        )})}
        <div style={{ marginTop: 16 }}><Sec>Members</Sec></div>
        {members.filter(m => !c.admins.includes(m.id)).map(a => (
          <div key={a.id} onClick={() => nav('profile', { id: a.id })} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' }}>
            <Av initials={a.initials} size={44} accent={a.verified} />
            <div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.t, fontSize: 14, fontWeight: 600 }}>{a.name}</span>{a.verified && ico.check(C.g, 12)}</div><p style={{ color: C.t2, fontSize: 12, margin: '2px 0 0' }}>{a.type} · {a.genres.slice(0, 2).join(', ')}</p></div>
            <Btn style={{ padding: '6px 14px' }} icon={ico.msg(C.t2, 14)}>DM</Btn>
          </div>
        ))}
        <p style={{ color: C.t3, fontSize: 12, textAlign: 'center', margin: '16px 0', lineHeight: 1.5 }}>+ {c.members - members.length} more members not shown in preview</p>
      </div>}
      {tab === 'about' && <div style={{ padding: '16px 20px 0' }}>
        <Sec>About this community</Sec>
        <Card><p style={{ color: C.t2, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{c.desc}</p></Card>
        <Sec>Rules</Sec>
        <Card>
          {['Be respectful — no personal attacks or drama', 'Keep it relevant to the community topic', 'No spam or self-promotion without context', 'Support local. Share opportunities generously.', 'What happens in the community stays in the community.'].map((r, i) => <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}><span style={{ color: C.a, fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{i + 1}.</span><span style={{ color: C.t2, fontSize: 13, lineHeight: 1.5 }}>{r}</span></div>)}
        </Card>
      </div>}
    </Shell>
  )
}

// ── COLLAB DETAIL ────────────────────────────────────────────────────────────
function CollabScreen({ id, nav, onTab }: { id: string; nav: (v: string, p?: Record<string, string>) => void; onTab: (id: string) => void }) {
  const cr = COLLABS.find(x => x.id === id)
  if (!cr) return null
  const author = ARTISTS.find(a => a.id === cr.fromId)
  return (
    <Shell title={cr.type} subtitle={`from ${cr.from}`} onBack={() => nav('back')} onTab={onTab}>
      <div style={{ padding: '16px 20px 0' }}>
        {author && <Card style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16, cursor: 'pointer' }} onClick={() => nav('profile', { id: author.id })}>
          <Av initials={author.initials} size={52} accent={author.verified} />
          <div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ color: C.t, fontSize: 16, fontWeight: 600 }}>{author.name}</span>{author.verified && ico.check()}</div><p style={{ color: C.t2, fontSize: 13, margin: '2px 0 0' }}>{author.type} · {author.city}</p></div>
        </Card>}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <p style={{ color: C.a, fontSize: 16, fontWeight: 600, margin: 0 }}>{cr.type}</p>
            <div style={{ padding: '4px 10px', borderRadius: 8, background: C.amD, border: `1px solid ${C.amB}` }}><span style={{ color: C.am, fontSize: 11, fontWeight: 500 }}>{cr.urgency}</span></div>
          </div>
          <p style={{ color: C.t, fontSize: 15, lineHeight: 1.7, margin: '0 0 16px' }}>{cr.detail}</p>
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}><Pill>{cr.genre}</Pill></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
            <span style={{ color: C.t3, fontSize: 13 }}>{cr.responses} people have responded</span>
            <span style={{ color: C.g, fontSize: 12, fontWeight: 500 }}>Open</span>
          </div>
        </Card>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <Btn primary full icon={ico.send('white')}>Respond</Btn>
          <Btn full onClick={() => author && nav('message', { id: author.id })} icon={ico.msg()}>Message</Btn>
        </div>
      </div>
    </Shell>
  )
}

// ── PLACEHOLDER TABS ─────────────────────────────────────────────────────────
function PlaceholderScreen({ title, sub, tabId, onTab }: { title: string; sub: string; tabId: string; onTab: (id: string) => void }) {
  return (
    <Shell title={title} subtitle={sub} tab={tabId} onTab={onTab}>
      <div style={{ padding: '80px 20px', textAlign: 'center' }}>
        <p style={{ color: C.t3, fontSize: 48, margin: '0 0 16px' }}>{tabId === 'map' ? '🗺️' : tabId === 'tonight' ? '📅' : '👤'}</p>
        <h2 style={{ color: C.t, fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>{title}</h2>
        <p style={{ color: C.t3, fontSize: 14, lineHeight: 1.5 }}>This tab is part of the main Sounded Out app.</p>
      </div>
    </Shell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function ArtistsPage() {
  const [unlocked, setUnlocked] = useState(false)
  const [screen, setScreen] = useState<Screen>({ v: 'hub', p: {} })
  const [hist, setHist] = useState<Screen[]>([])

  const nav = useCallback((v: string, p: Record<string, string> = {}) => {
    if (v === 'back') {
      if (hist.length > 0) {
        const prev = hist[hist.length - 1]
        setHist(h => h.slice(0, -1))
        setScreen(prev)
      } else {
        setScreen({ v: 'hub', p: {} })
      }
    } else {
      setHist(h => [...h, screen])
      setScreen({ v, p })
    }
    window.scrollTo(0, 0)
  }, [hist, screen])

  const onTab = useCallback((id: string) => {
    setHist([])
    if (id === 'artists') setScreen({ v: 'hub', p: {} })
    else setScreen({ v: 'placeholder', p: { id } })
    window.scrollTo(0, 0)
  }, [])

  if (!unlocked) return <CodeLock onUnlock={() => setUnlocked(true)} />

  const { v, p } = screen

  switch (v) {
    case 'hub': return <HubScreen nav={nav} onTab={onTab} />
    case 'profile': return <ProfileScreen id={p.id} nav={nav} onTab={onTab} />
    case 'book': return <BookScreen id={p.id} nav={nav} onTab={onTab} />
    case 'message': return <MessageScreen id={p.id} nav={nav} onTab={onTab} />
    case 'network': return <NetworkScreen nav={nav} onTab={onTab} />
    case 'community': return <CommunityScreen id={p.id} nav={nav} onTab={onTab} />
    case 'collab': return <CollabScreen id={p.id} nav={nav} onTab={onTab} />
    case 'placeholder': return <PlaceholderScreen title={p.id === 'map' ? 'Map' : p.id === 'tonight' ? 'Tonight' : 'Profile'} sub={p.id === 'map' ? 'Newcastle & Northeast' : p.id === 'tonight' ? "What's on" : 'Your account'} tabId={p.id} onTab={onTab} />
    default: return <HubScreen nav={nav} onTab={onTab} />
  }
}
