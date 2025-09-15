let cachedSupabase: any | null = null;

export async function getSupabase() {
  if (cachedSupabase) return cachedSupabase;
  const { createClient } = await import('@supabase/supabase-js');

  const env: any = (import.meta as any).env || {};
  const envProjectId = env.VITE_SUPABASE_PROJECT_ID;
  const supabaseUrl = env.VITE_SUPABASE_URL || (envProjectId ? `https://${envProjectId}.supabase.co` : undefined);
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars not set (VITE_SUPABASE_URL/VITE_SUPABASE_PROJECT_ID and VITE_SUPABASE_ANON_KEY). Auth features may be disabled.');
  }

  const client = createClient(
    supabaseUrl || 'https://example-project.supabase.co',
    supabaseAnonKey || 'public-anon-key-placeholder',
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    }
  );
  cachedSupabase = client;
  return client;
}