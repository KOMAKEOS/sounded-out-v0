import { MetadataRoute } from 'next'

// ============================================================================
// ROBOTS.TXT GENERATOR
// Tells search engines what to crawl and what to ignore
// ============================================================================

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',      // Hide admin area
          '/portal',     // Hide partner portal from search
          '/api/',       // Hide API routes
          '/_next/',     // Hide Next.js internals
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/admin', '/portal'],
      },
    ],
    sitemap: 'https://soundedout.com/sitemap.xml',
    host: 'https://soundedout.com',
  }
}
