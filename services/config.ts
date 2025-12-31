// --- CONFIGURATION ---

// Standard Vite Usage:
// Variables starting with VITE_ are automatically available on import.meta.env
// We fallback to empty strings to prevent crashes if something is missing.

export const SUPABASE_CONFIG = {
  url: (import.meta as any).env.VITE_SUPABASE_URL || "",
  anonKey: (import.meta as any).env.VITE_SUPABASE_ANON_KEY || ""
};

export const PRODUCTION_URL = "https://zen30.vercel.app"; 

// Gemini API Key
// We use process.env.API_KEY here because we manually defined it in vite.config.ts
// to support keys that might not have the VITE_ prefix.
export const GEMINI_API_KEY = process.env.API_KEY || (import.meta as any).env.VITE_API_KEY || "";