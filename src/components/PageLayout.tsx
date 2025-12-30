'use client'

import { ReactNode } from 'react'
import SiteHeader from './SiteHeader'

export default function PageLayout({ 
  children,
  showHeader = true,
  maxWidth = '1200px',
  padding = true,
}: { 
  children: ReactNode
  showHeader?: boolean
  maxWidth?: string
  padding?: boolean
}) {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
    }}>
      {showHeader && <SiteHeader />}
      <main style={{
        minHeight: showHeader ? 'calc(100vh - 64px)' : '100vh',
        paddingTop: showHeader ? '64px' : '0',
        overflowY: 'auto',
      }}>
        <div style={{
          maxWidth,
          margin: '0 auto',
          padding: padding ? '32px 24px 80px' : '0',
        }}>
          {children}
        </div>
      </main>
      
      <style jsx global>{`
        * { box-sizing: border-box; }
        html, body { 
          margin: 0; 
          padding: 0; 
          background: #0a0a0b;
          color: white;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        a { color: inherit; }
      `}</style>
    </div>
  )
}
