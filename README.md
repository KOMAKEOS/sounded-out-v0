# Sounded Out v0

Newcastle nightlife map - see what's on tonight.

## Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your keys:
   - `NEXT_PUBLIC_SUPABASE_URL` - from Supabase dashboard
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - from Supabase dashboard (publishable key)
   - `NEXT_PUBLIC_MAPBOX_TOKEN` - from Mapbox account

3. Install dependencies:
```bash
npm install
```

4. Run locally:
```bash
npm run dev
```

## Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

## Database (Supabase)

Two tables:
- `venues` - physical locations with lat/lng
- `events` - what's happening, linked to venues

Add events directly in Supabase Table Editor. Set `status` to `published` for them to appear.
