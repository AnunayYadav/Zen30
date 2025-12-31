import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

const url = SUPABASE_CONFIG.url;
const key = SUPABASE_CONFIG.anonKey;

// Initialize Supabase Client
// We do not block the app if keys are missing; we let the client attempt connection.
// If variables are missing, url/key will be empty strings, which might cause runtime errors
// on network requests, but won't crash the app startup.
export const supabase = createClient(
  url || "https://placeholder.supabase.co", 
  key || "placeholder-key", 
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const isConfigured = !!(url && key);