// --- CONFIGURATION ---
// 1. If running locally, you can paste keys here or use a .env file if your bundler supports it.
// 2. On Vercel, these will be pulled automatically from Environment Variables.

const env = typeof process !== 'undefined' ? process.env : {};

export const SUPABASE_CONFIG = {
  url: env.SUPABASE_URL || "INSERT_YOUR_SUPABASE_URL_HERE", 
  anonKey: env.SUPABASE_ANON_KEY || "INSERT_YOUR_ANON_KEY_HERE"
};

export const GEMINI_API_KEY = env.API_KEY || ''; 
