import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// ============================================================================
// SEO METADATA - Optimized for "Newcastle Nightlife" keywords
// ============================================================================
export const metadata: Metadata = {
  metadataBase: new URL('https://soundedout.com'),
  
  // Title - Primary keyword first
  title: {
    default: 'Sounded Out | Newcastle Nightlife - Events Tonight & This Weekend',
    template: '%s | Sounded Out - Newcastle Nightlife Guide'
  },
  
  // Description - Include primary and secondary keywords naturally
  description: 'Discover Newcastle nightlife with Sounded Out. Find the best clubs, events, and live music happening tonight and this weekend. House, techno, drum and bass, and more. Your live nightlife map for Newcastle.',
  
  // Keywords - Target search terms
  keywords: [
    'newcastle nightlife',
    'newcastle events tonight',
    'newcastle clubs',
    'what\'s on newcastle tonight',
    'events in newcastle',
    'drum and bass newcastle',
    'techno newcastle',
    'house music newcastle',
    'newcastle events this weekend',
    'live music newcastle',
    'newcastle nightlife guide',
    'things to do newcastle tonight',
    'newcastle gigs',
    'clubs newcastle',
    'sounded out',
  ],
  
  // Author & Publisher
  authors: [{ name: 'Sounded Out', url: 'https://soundedout.com' }],
  creator: 'Sounded Out',
  publisher: 'Sounded Out',
  
  // Robots - Allow full indexing
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Canonical URL
  alternates: {
    canonical: 'https://soundedout.com',
  },
  
  // Open Graph - For social sharing
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://soundedout.com',
    siteName: 'Sounded Out',
    title: 'Sounded Out | Newcastle Nightlife Guide',
    description: 'Discover the best nightlife events in Newcastle. Find clubs, live music, and events happening tonight and this weekend. House, techno, drum and bass & more.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sounded Out - Newcastle Nightlife Guide',
        type: 'image/png',
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    title: 'Sounded Out | Newcastle Nightlife Guide',
    description: 'Discover the best nightlife events in Newcastle. Find what\'s on tonight and this weekend.',
    images: ['/og-image.png'],
    creator: '@soundedout',
    site: '@soundedout',
  },
  
  // Verification - Add your codes here
  verification: {
    google: 'ADD_YOUR_GOOGLE_VERIFICATION_CODE',
    // yandex: 'ADD_IF_NEEDED',
    // yahoo: 'ADD_IF_NEEDED',
  },
  
  // App info
  applicationName: 'Sounded Out',
  
  // Category
  category: 'entertainment',
  
  // Classification
  classification: 'Nightlife Discovery Platform',
  
  // Other
  other: {
    'geo.region': 'GB-TWR',
    'geo.placename': 'Newcastle upon Tyne',
    'geo.position': '54.978;-1.61',
    'ICBM': '54.978, -1.61',
  },
}

// Viewport configuration
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#0a0a0b',
}

// ============================================================================
// ROOT LAYOUT
// ============================================================================
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Organization Schema
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sounded Out',
    url: 'https://soundedout.com',
    logo: 'https://soundedout.com/logo.svg',
    description: 'Newcastle\'s live nightlife map showing what\'s happening tonight, tomorrow, and this weekend',
    foundingDate: '2024',
    sameAs: [
      'https://instagram.com/soundedout',
      'https://twitter.com/soundedout',
    ],
    areaServed: {
      '@type': 'City',
      name: 'Newcastle upon Tyne',
      addressCountry: 'GB',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      email: 'hello@soundedout.com',
      contactType: 'customer service',
    },
  }
  
  // Website Schema with SearchAction
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sounded Out',
    alternateName: 'Sounded Out Newcastle',
    url: 'https://soundedout.com',
    description: 'Newcastle nightlife discovery platform - find events tonight and this weekend',
    inLanguage: 'en-GB',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://soundedout.com/?genre={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }
  
  // LocalBusiness Schema
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'EntertainmentBusiness',
    '@id': 'https://soundedout.com/#business',
    name: 'Sounded Out',
    description: 'Live nightlife map for Newcastle showing events tonight and this weekend. Discover clubs, house, techno, drum and bass, and more.',
    url: 'https://soundedout.com',
    logo: 'https://soundedout.com/logo.svg',
    image: 'https://soundedout.com/og-image.png',
    priceRange: 'Free',
    areaServed: {
      '@type': 'City',
      name: 'Newcastle upon Tyne',
      addressRegion: 'Tyne and Wear',
      addressCountry: 'GB',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 54.978,
      longitude: -1.61,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    sameAs: [
      'https://instagram.com/soundedout',
    ],
  }

  return (
    <html lang="en-GB">
      <head>
        {/* Structured Data / Schema Markup */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
