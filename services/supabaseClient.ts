import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

// Validate configuration
const isConfigured = supabaseUrl && supabaseAnonKey && 
                     !supabaseUrl.includes("INSERT_YOUR") && 
                     !supabaseUrl.includes("placeholder");

if (!isConfigured) {
  console.error(
    '❌ Supabase Configuration Missing.\n' + 
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your Vercel Environment Variables.'
  );
}

// Export client (will log errors if called without config, but won't crash app start)
export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co', 
  isConfigured ? supabaseAnonKey : 'placeholder-key'
);
