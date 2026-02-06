// ==========================================================================
// /lib/admin-auth.ts
// Client-side hook for admin authentication.
// NO passwords stored here. Auth is verified via server API.
// ==========================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'

interface AdminAuthState {
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (code: string) => Promise<boolean>
  logout: () => Promise<void>
}

export function useAdminAuth(): AdminAuthState {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check existing session on mount
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const res = await fetch('/api/admin/verify', {
        credentials: 'include', // Important: send cookies
      })
      const data = await res.json()
      setIsAuthenticated(data.authenticated === true)
    } catch {
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
    }
  }

  const login = useCallback(async (code: string): Promise<boolean> => {
    setError(null)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ code }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        setIsAuthenticated(true)
        // Clean up any old sessionStorage remnants
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('so_admin_access')
        }
        return true
      } else {
        setError(data.error || 'Authentication failed')
        return false
      }
    } catch {
      setError('Network error. Please try again.')
      return false
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch('/api/admin/auth', {
        method: 'DELETE',
        credentials: 'include',
      })
    } catch {
      // Still clear local state even if request fails
    }
    setIsAuthenticated(false)
    // Clean up old sessionStorage
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('so_admin_access')
    }
  }, [])

  return { isAuthenticated, isLoading, error, login, logout }
}
