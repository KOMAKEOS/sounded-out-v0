import { createClient as supabaseCreateClient } from '@supabase/supabase-js';

// Server-side Supabase client for API routes
export function createServerClient() {
  return supabaseCreateClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}

// This is what the API routes import
export function createClient() {
  return createServerClient();
}

// For admin operations (bypasses RLS)
export function createServiceClient() {
  return supabaseCreateClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
      },
    }
  );
}
