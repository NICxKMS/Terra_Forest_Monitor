import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a single Supabase client instance to be shared across the app
// This prevents multiple GoTrueClient instances in the same browser context
export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);