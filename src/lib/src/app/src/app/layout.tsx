import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Sounded Out | Newcastle Tonight',
  description: 'Discover what\'s happening in Newcastle nightlife tonight',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link href='https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css' rel='stylesheet' />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
