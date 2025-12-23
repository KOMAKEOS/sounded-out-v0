import { MetadataRoute } from 'next'

// ============================================================================
// SITEMAP GENERATOR
// Helps search engines discover and index all pages
// ============================================================================

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://soundedout.com'
  const currentDate = new Date()
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'hourly', // Events change frequently
      priority: 1.0,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: currentDate,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/portal`,
      lastModified: currentDate,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
  
  // Genre landing pages (create these for SEO)
  const genrePages: MetadataRoute.Sitemap = [
    // TODO: Create these pages for better keyword targeting
    // {
    //   url: `${baseUrl}/newcastle-nightlife`,
    //   lastModified: currentDate,
    //   changeFrequency: 'daily',
    //   priority: 0.9,
    // },
    // {
    //   url: `${baseUrl}/events-tonight`,
    //   lastModified: currentDate,
    //   changeFrequency: 'hourly',
    //   priority: 0.95,
    // },
    // {
    //   url: `${baseUrl}/drum-and-bass-newcastle`,
    //   lastModified: currentDate,
    //   changeFrequency: 'daily',
    //   priority: 0.85,
    // },
    // {
    //   url: `${baseUrl}/techno-newcastle`,
    //   lastModified: currentDate,
    //   changeFrequency: 'daily',
    //   priority: 0.85,
    // },
    // {
    //   url: `${baseUrl}/house-music-newcastle`,
    //   lastModified: currentDate,
    //   changeFrequency: 'daily',
    //   priority: 0.85,
    // },
  ]
  
  // TODO: Dynamic event pages
  // Fetch from database and generate URLs
  // const events = await getEvents()
  // const eventPages = events.map(event => ({
  //   url: `${baseUrl}/event/${event.slug}`,
  //   lastModified: new Date(event.updated_at),
  //   changeFrequency: 'daily' as const,
  //   priority: 0.9,
  // }))
  
  // TODO: Venue pages
  // const venues = await getVenues()
  // const venuePages = venues.map(venue => ({
  //   url: `${baseUrl}/venue/${venue.slug}`,
  //   lastModified: new Date(venue.updated_at),
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.7,
  // }))
  
  return [
    ...staticPages,
    ...genrePages,
    // ...eventPages,
    // ...venuePages,
  ]
}
