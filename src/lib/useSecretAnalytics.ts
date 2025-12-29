'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// ============================================================================
// SECRET ANALYTICS ACCESS
// Click the logo 5 times quickly to access analytics dashboard
// Add this to your logo in the main page
// ============================================================================

export function useSecretAnalytics() {
  const router = useRouter()
  const [clickCount, setClickCount] = useState(0)
  const [lastClickTime, setLastClickTime] = useState(0)

  const handleLogoClick = useCallback(function() {
    const now = Date.now()
    
    // Reset if more than 2 seconds since last click
    if (now - lastClickTime > 2000) {
      setClickCount(1)
    } else {
      setClickCount(function(prev) { return prev + 1 })
    }
    
    setLastClickTime(now)
    
    // Check if we hit 5 clicks
    if (clickCount >= 4) {
      router.push('/admin/analytics')
      setClickCount(0)
    }
  }, [clickCount, lastClickTime, router])

  return handleLogoClick
}

// Example usage in your component:
// 
// import { useSecretAnalytics } from '@/lib/useSecretAnalytics'
// 
// export default function MyPage() {
//   const handleLogoClick = useSecretAnalytics()
//   
//   return (
//     <div onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
//       <img src="/logo.svg" alt="Logo" />
//     </div>
//   )
// }
