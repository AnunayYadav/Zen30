// --- CONFIGURATION ---

// process.env is polyfilled in vite.config.ts
// We use 'as any' to avoid TypeScript strictness about 'process' if types aren't installed
const env = (typeof process !== 'undefined' ? process.env : {}) as any;

export const SUPABASE_CONFIG = {
  url: env.VITE_SUPABASE_URL || "",
  anonKey: env.VITE_SUPABASE_ANON_KEY || ""
};

export const PRODUCTION_URL = "https://zen30.vercel.app"; 

// Gemini API Key
export const GEMINI_API_KEY = env.API_KEY || "";