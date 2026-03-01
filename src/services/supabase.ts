import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase] Missing env vars VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken:    true,
    persistSession:      true,
    detectSessionInUrl:  true,
    storageKey:          'psywebnote_auth',
  },
});

// ── DB helpers ───────────────────────────────────────────────

/** Run a supabase query and throw a readable error on failure */
export async function q<T>(
  promise: PromiseLike<{ data: T | null; error: unknown }>,
): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    const msg = (error as { message?: string })?.message ?? String(error);
    throw new Error(msg);
  }
  return data as T;
}
