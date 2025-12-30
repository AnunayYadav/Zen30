// --- CONFIGURATION ---

// Direct access to environment variables
// We use 'as any' to bypass strict TypeScript checks on import.meta in some environments
const env = (import.meta as any).env || {};

export const SUPABASE_CONFIG = {
  url: env.VITE_SUPABASE_URL,
  anonKey: env.VITE_SUPABASE_ANON_KEY
};

export const PRODUCTION_URL = "https://zen30.vercel.app"; 

// Gemini API Key handling
// The vite.config.ts defines process.env.API_KEY, so we access it safely here.
export const GEMINI_API_KEY = (typeof process !== 'undefined' && process.env && process.env.API_KEY) 
  ? process.env.API_KEY 
  : "";