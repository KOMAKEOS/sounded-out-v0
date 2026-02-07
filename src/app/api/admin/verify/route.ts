// ==========================================================================
// /app/api/admin/verify/route.ts
// Verifies whether the current admin session is valid.
// Called by admin pages on load to check auth status.
// ==========================================================================

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createHash } from 'crypto'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get('admin_session')
    const expiry = cookieStore.get('admin_session_expiry')
    const sig = cookieStore.get('admin_session_sig')

    // All three cookies must exist
    if (!session?.value || !expiry?.value || !sig?.value) {
      return NextResponse.json({ authenticated: false })
    }

    // Check expiry
    const expiryTime = parseInt(expiry.value)
    if (isNaN(expiryTime) || Date.now() > expiryTime) {
      // Expired — clear cookies
      cookieStore.delete('admin_session')
      cookieStore.delete('admin_session_expiry')
      cookieStore.delete('admin_session_sig')
      return NextResponse.json({ authenticated: false })
    }

    // Verify signature
    const sessionSecret = process.env.ADMIN_SESSION_SECRET
    if (!sessionSecret) {
      return NextResponse.json({ authenticated: false })
    }

    const expectedSig = createHash('sha256')
      .update(session.value + expiry.value + sessionSecret)
      .digest('hex')

    if (sig.value !== expectedSig) {
      // Tampered — clear cookies
      cookieStore.delete('admin_session')
      cookieStore.delete('admin_session_expiry')
      cookieStore.delete('admin_session_sig')
      return NextResponse.json({ authenticated: false })
    }

    return NextResponse.json({ authenticated: true })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
