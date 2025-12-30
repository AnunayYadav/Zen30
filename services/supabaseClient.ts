import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from './config';

const url = SUPABASE_CONFIG.url;
const key = SUPABASE_CONFIG.anonKey;

// Simple check: Do we have a real URL and Key?
// We check against 'undefined' string because some build tools inject it as a string.
export const isConfigured = !!url && !!key && url !== "undefined" && !url.includes("placeholder");

if (!isConfigured) {
  console.log("Zen30: Supabase keys missing. Running in OFFLINE DEMO MODE.");
}

// If configured, use real credentials.
// If NOT configured, use a safe dummy URL that satisfies the library types but won't be used
// because storage.ts checks 'isConfigured' before making calls.
// We use 'https://example.com' instead of current origin to avoid 404 HTML responses if a call accidentally slips through.
const finalUrl = isConfigured ? url : "https://example.com";
const finalKey = isConfigured ? key : "demo-key";

export const supabase = createClient(finalUrl, finalKey, {
  auth: {
    persistSession: isConfigured, 
    autoRefreshToken: isConfigured,
    detectSessionInUrl: isConfigured
  }
});