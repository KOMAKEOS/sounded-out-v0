'use client'

import { ReactNode } from 'react'
import SiteHeader from './SiteHeader'

export default function PageLayout({ 
  children,
  showHeader = true,
}: { 
  children: ReactNode
  showHeader?: boolean
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {showHeader && <SiteHeader />}
      <main style={{
        flex: 1,
        overflowY: 'auto',
        paddingTop: showHeader ? '64px' : '0',
      }}>
        {children}
      </main>
    </div>
  )
}
