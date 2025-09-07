import { projectId, publicAnonKey } from './info';

let cachedSupabase: any | null = null;

export async function getSupabase() {
  if (cachedSupabase) return cachedSupabase;
  const { createClient } = await import('@supabase/supabase-js');
  const client = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey,
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