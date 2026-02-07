// ==========================================================================
// /app/api/admin/auth/route.ts
// SERVER-SIDE ADMIN AUTHENTICATION
// 
// The admin password is NEVER exposed to the frontend.
// It's hashed and compared server-side only.
//
// Setup:
// 1. Pick a strong password
// 2. Hash it: node -e "console.log(require('crypto').createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
// 3. Add to env: ADMIN_CODE_HASH=<the hash>
// 4. Generate session secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// 5. Add to env: ADMIN_SESSION_SECRET=<the secret>
// ==========================================================================

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash, randomBytes, timingSafeEqual } from 'crypto'

// ── Rate Limiting (in-memory, fine for single-instance Vercel) ──────────
const attempts = new Map<string, { count: number; lastAttempt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15
const LOCKOUT_MS = LOCKOUT_MINUTES * 60 * 1000

function getClientIP(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

function isRateLimited(ip: string): boolean {
  const record = attempts.get(ip)
  if (!record) return false
  if (Date.now() - record.lastAttempt > LOCKOUT_MS) {
    attempts.delete(ip)
    return false
  }
  return record.count >= MAX_ATTEMPTS
}

function recordAttempt(ip: string, success: boolean): void {
  if (success) {
    attempts.delete(ip)
    return
  }
  const record = attempts.get(ip) || { count: 0, lastAttempt: 0 }
  record.count += 1
  record.lastAttempt = Date.now()
  attempts.set(ip, record)
}

// ── Helpers ─────────────────────────────────────────────────────────────
function hashString(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'))
  } catch {
    return false
  }
}

// ── POST: Login ─────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    const ip = getClientIP(request)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${LOCKOUT_MINUTES} minutes.` },
        { status: 429 }
      )
    }

    const body = await request.json().catch(() => null)
    if (!body?.code || typeof body.code !== 'string') {
      recordAttempt(ip, false)
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const correctHash = process.env.ADMIN_CODE_HASH
    if (!correctHash) {
      console.error('[ADMIN AUTH] ADMIN_CODE_HASH not set in environment variables')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    // Hash the user's input and compare with timing-safe comparison
    const inputHash = hashString(body.code)
    const isValid = safeCompare(inputHash, correctHash)

    if (!isValid) {
      recordAttempt(ip, false)
      return NextResponse.json({ error: 'Invalid passcode' }, { status: 401 })
    }

    // ✅ Correct — create a secure session
    recordAttempt(ip, true)

    const sessionToken = randomBytes(32).toString('hex')
    const sessionExpiry = Date.now() + 4 * 60 * 60 * 1000 // 4 hours

    // Sign the token so it can't be forged
    const sessionSecret = process.env.ADMIN_SESSION_SECRET || randomBytes(32).toString('hex')
    const signature = createHash('sha256')
      .update(sessionToken + sessionExpiry.toString() + sessionSecret)
      .digest('hex')

    const cookieStore = cookies()

    cookieStore.set('admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 4 * 60 * 60,
      path: '/',
    })

    cookieStore.set('admin_session_expiry', sessionExpiry.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 4 * 60 * 60,
      path: '/',
    })

    cookieStore.set('admin_session_sig', signature, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 4 * 60 * 60,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[ADMIN AUTH] Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// ── DELETE: Logout ──────────────────────────────────────────────────────
export async function DELETE() {
  const cookieStore = cookies()
  cookieStore.delete('admin_session')
  cookieStore.delete('admin_session_expiry')
  cookieStore.delete('admin_session_sig')
  return NextResponse.json({ success: true })
}
