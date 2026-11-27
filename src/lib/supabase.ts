import { createClient, SupabaseClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env ?? {};
const supabaseUrl = (metaEnv.VITE_SUPABASE_URL ?? '').trim();
const supabaseKey =
  (metaEnv.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim() ||
  (metaEnv.VITE_SUPABASE_ANON_KEY ?? '').trim() ||
  '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
