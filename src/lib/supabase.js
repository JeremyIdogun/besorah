import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
const missingSupabaseEnvMessage =
  'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.';

if (!hasSupabaseEnv) {
  console.warn(missingSupabaseEnvMessage);
}

const missingSupabaseClient = {
  from() {
    throw new Error(missingSupabaseEnvMessage);
  },
};

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseAnonKey)
  : missingSupabaseClient;
