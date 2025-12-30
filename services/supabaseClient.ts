import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

const supabaseUrl = SUPABASE_CONFIG.url;
const supabaseAnonKey = SUPABASE_CONFIG.anonKey;

// Check if user has configured the keys
const isConfigured = 
  supabaseUrl && 
  supabaseUrl !== "INSERT_YOUR_SUPABASE_URL_HERE" && 
  supabaseAnonKey && 
  supabaseAnonKey !== "INSERT_YOUR_ANON_KEY_HERE";

if (!isConfigured) {
  console.warn('⚠️ Supabase not configured. Please update services/config.ts with your API keys.');
}

export const supabase = createClient(
  isConfigured ? supabaseUrl : 'https://placeholder.supabase.co', 
  isConfigured ? supabaseAnonKey : 'placeholder-key'
);
