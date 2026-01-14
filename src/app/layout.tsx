import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://soundedout.com'),
  title: 'Sounded Out | Newcastle Nightlife',
  description: 'Discover the best nights out in Newcastle. Find gigs, clubs & events happening tonight and beyond — all on one map.',
  keywords: ['Newcastle nightlife', 'Newcastle events', 'Newcastle clubs', 'Newcastle gigs', 'Newcastle music', 'nights out Newcastle'],
  authors: [{ name: 'Sounded Out' }],
  creator: 'Sounded Out',
  publisher: 'Sounded Out',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  themeColor: '#0a0a0b',
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://soundedout.com',
    siteName: 'Sounded Out',
    title: 'Sounded Out | Newcastle Nightlife',
    description: 'Discover the best nights out in Newcastle. Find gigs, clubs & events happening tonight and beyond.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sounded Out - Newcastle Nightlife',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sounded Out | Newcastle Nightlife',
    description: 'Discover the best nights out in Newcastle.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#0a0a0b" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0b' }}>
        {children}
      </body>
    </html>
  )
}
