import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Regular client with anon key (respects RLS)
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string
)

/**
 * Check if we're in local dev mode with auth bypass enabled.
 * ONLY then do we use the service role client.
 */
const isLocalDevBypass =
  import.meta.env.DEV &&
  import.meta.env.VITE_LOGGED_IN === 'true' &&
  !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Service role client for dev mode - bypasses RLS
// ONLY created when ALL conditions are met:
// 1. Running in development (import.meta.env.DEV)
// 2. VITE_LOGGED_IN=true (explicit dev auth bypass)
// 3. Service role key is provided
const supabaseAdmin: SupabaseClient | null = isLocalDevBypass
  ? createClient(
      import.meta.env.VITE_SUPABASE_URL as string,
      import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string
    )
  : null

/**
 * Get the appropriate Supabase client for write operations.
 * In local dev with VITE_LOGGED_IN=true, returns admin client (bypasses RLS).
 * Otherwise returns the regular client (requires real auth).
 */
export function getWriteClient(): SupabaseClient {
  return supabaseAdmin ?? supabase
}


