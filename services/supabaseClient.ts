import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

const url = SUPABASE_CONFIG.url;
const key = SUPABASE_CONFIG.anonKey;

// We strictly check if keys are present. 
// If not, we log a critical error, but we do NOT switch to a "Demo Mode".
if (!url || !key || url.includes("undefined")) {
  console.error("🚨 CRITICAL ERROR: Supabase keys are missing in the environment!");
  console.error("URL:", url);
  console.error("Key:", key ? "******" : "Missing");
}

// Initialize Supabase Client directly.
// If keys are missing, this might throw or fail on network requests.
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

// Always return true to force the app to try using the live backend
export const isConfigured = true;