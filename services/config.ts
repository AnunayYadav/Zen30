// --- CONFIGURATION ---

// We access variables via process.env which are replaced by string literals
// at build time via vite.config.ts. This avoids issues with import.meta.env being undefined.

export const SUPABASE_CONFIG = {
  url: process.env.VITE_SUPABASE_URL || "",
  anonKey: process.env.VITE_SUPABASE_ANON_KEY || ""
};

export const PRODUCTION_URL = "https://zen30.vercel.app"; 

export const GEMINI_API_KEY = process.env.API_KEY || "";