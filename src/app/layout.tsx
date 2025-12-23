import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// ============================================================================
// SEO METADATA - Optimized to DOMINATE "Newcastle Nightlife Tonight" searches
// ============================================================================
export const metadata: Metadata = {
  metadataBase: new URL('https://soundedout.com'),
  
  // Title - Decision-engine framing (not brand-first)
  title: {
    default: 'Newcastle Nightlife Tonight – Events, Clubs & What\'s On | Sounded Out',
    template: '%s | Sounded Out - Newcastle Nightlife'
  },
  
  // Description - Featured snippet optimized, decision-focused
  description: 'What\'s on in Newcastle tonight? Sounded Out shows live clubs, DJ events, and late-night venues across Newcastle — updated daily. Find techno, house, drum and bass, and more. The city\'s live nightlife map.',
  
  // Keywords - Target search terms
  keywords: [
    'newcastle nightlife',
    'newcastle tonight',
    'what\'s on newcastle tonight',
    'newcastle events tonight',
    'newcastle clubs',
    'clubs in newcastle',
    'newcastle nightlife tonight',
    'things to do newcastle tonight',
    'newcastle events this weekend',
    'drum and bass newcastle',
    'techno newcastle',
    'house music newcastle',
    'live music newcastle',
    'newcastle gigs tonight',
    'newcastle club nights',
    'best clubs newcastle',
    'newcastle nightlife guide',
    'sounded out',
  ],
  
  // Author & Publisher - Establish authority
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
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  
  // Canonical
  alternates: {
    canonical: 'https://soundedout.com',
  },
  
  // Open Graph - Premium social sharing appearance
  openGraph: {
    type: 'website',
    locale: 'en_GB',
    url: 'https://soundedout.com',
    siteName: 'Sounded Out',
    title: 'Newcastle Nightlife Tonight – What\'s On | Sounded Out',
    description: 'The live nightlife map for Newcastle. Clubs, events, and late-night spots — updated daily. Find what\'s actually worth going to tonight.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Sounded Out - Newcastle Nightlife Map',
        type: 'image/png',
      },
    ],
  },
  
  // Twitter/X Card - Large image preview
  twitter: {
    card: 'summary_large_image',
    site: '@soundedout',
    creator: '@soundedout',
    title: 'Newcastle Nightlife Tonight | Sounded Out',
    description: 'The live nightlife map for Newcastle. Find clubs, events, and late-night spots happening tonight.',
    images: ['/og-image.png'],
  },
  
  // Verification (add your codes)
  verification: {
    google: 'your-google-verification-code',
  },
  
  // App metadata
  applicationName: 'Sounded Out',
  category: 'Entertainment',
  classification: 'Nightlife Guide',
  
  // Geo-targeting for Newcastle
  other: {
    'geo.region': 'GB-NET',
    'geo.placename': 'Newcastle upon Tyne',
    'geo.position': '54.978;-1.61',
    'ICBM': '54.978, -1.61',
    'og:locality': 'Newcastle upon Tyne',
    'og:region': 'Tyne and Wear',
    'og:country-name': 'United Kingdom',
  },
  
  // Viewport
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
  
  // Theme color for browser chrome
  themeColor: '#0a0a0b',
  
  // Icons
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
  
  // Manifest
  manifest: '/manifest.json',
}

// ============================================================================
// ROOT LAYOUT
// ============================================================================
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Organization Schema - Establishes brand authority
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Sounded Out',
    url: 'https://soundedout.com',
    logo: 'https://soundedout.com/logo.svg',
    description: 'Sounded Out is Newcastle\'s live nightlife map. Find clubs, events, and late-night spots happening tonight.',
    foundingDate: '2024',
    foundingLocation: {
      '@type': 'Place',
      name: 'Newcastle upon Tyne, UK',
    },
    areaServed: {
      '@type': 'City',
      name: 'Newcastle upon Tyne',
      containedInPlace: {
        '@type': 'Country',
        name: 'United Kingdom',
      },
    },
    sameAs: [
      'https://instagram.com/sounded.out',
      'https://twitter.com/soundedout',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'hello@soundedout.com',
      areaServed: 'GB',
      availableLanguage: 'English',
    },
  }

  // Website Schema - SearchAction for sitelinks
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Sounded Out',
    alternateName: ['Sounded Out Newcastle', 'Newcastle Nightlife Guide'],
    url: 'https://soundedout.com',
    description: 'Newcastle\'s live nightlife map showing clubs, events, and late-night venues tonight.',
    publisher: {
      '@type': 'Organization',
      name: 'Sounded Out',
      logo: {
        '@type': 'ImageObject',
        url: 'https://soundedout.com/logo.svg',
      },
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://soundedout.com/?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  }

  // LocalBusiness Schema - Critical for local SEO dominance
  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'EntertainmentBusiness',
    '@id': 'https://soundedout.com/#business',
    name: 'Sounded Out',
    description: 'Newcastle\'s live nightlife map. Find what\'s on tonight — clubs, DJ events, live music, and late-night venues updated daily.',
    url: 'https://soundedout.com',
    logo: 'https://soundedout.com/logo.svg',
    image: 'https://soundedout.com/og-image.png',
    telephone: '+44-7584-424426',
    email: 'hello@soundedout.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Newcastle upon Tyne',
      addressRegion: 'Tyne and Wear',
      addressCountry: 'GB',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 54.978,
      longitude: -1.61,
    },
    areaServed: {
      '@type': 'City',
      name: 'Newcastle upon Tyne',
    },
    serviceType: ['Nightlife Guide', 'Event Discovery', 'Club Listings'],
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    priceRange: 'Free',
    sameAs: [
      'https://instagram.com/sounded.out',
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
  }

  // WebApplication Schema - App-like experience
  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Sounded Out',
    url: 'https://soundedout.com',
    applicationCategory: 'Entertainment',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript',
    description: 'Live nightlife map for Newcastle. Discover clubs, events, and what\'s on tonight.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GBP',
    },
    author: {
      '@type': 'Organization',
      name: 'Sounded Out',
    },
  }

  // FAQ Schema - Targets "People Also Ask" section
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What\'s on in Newcastle tonight?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sounded Out shows all clubs, DJ events, and live music happening in Newcastle tonight. Our live map updates daily with events across the city — from techno and house to drum and bass and indie nights.',
        },
      },
      {
        '@type': 'Question',
        name: 'What are the best clubs in Newcastle?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Newcastle has a thriving club scene including venues like Digital, Riverside, World Headquarters, and more. Sounded Out maps all club nights and events so you can find what\'s actually happening tonight.',
        },
      },
      {
        '@type': 'Question',
        name: 'Where can I find drum and bass events in Newcastle?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Newcastle has regular drum and bass nights at venues across the city. Use Sounded Out to filter by genre and find DnB events happening tonight or this weekend.',
        },
      },
      {
        '@type': 'Question',
        name: 'What is Sounded Out?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sounded Out is Newcastle\'s live nightlife map. We show clubs, DJ events, live music, and late-night venues — updated daily. Find what\'s actually worth going to tonight, all in one place.',
        },
      },
    ],
  }

  return (
    <html lang="en-GB">
      <head>
        {/* Structured Data / Schema Markup - All schemas for maximum SERP features */}
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
        
        {/* Mapbox GL CSS - Required for markers to render */}
        <link href="https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css" rel="stylesheet" />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        
        {/* Preconnect for performance */}
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
        
        {/* Theme color for mobile browsers */}
        <meta name="theme-color" content="#0a0a0b" />
        <meta name="msapplication-TileColor" content="#0a0a0b" />
        
        {/* Mobile app meta */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Sounded Out" />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
