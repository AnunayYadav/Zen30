// --- CONFIGURATION ---

// process.env is polyfilled in vite.config.ts with the correct values found during build time.
// We use 'as any' to avoid TypeScript strictness.
const env = (typeof process !== 'undefined' ? process.env : {}) as any;

export const SUPABASE_CONFIG = {
  // These keys are guaranteed to be populated by vite.config.ts if they existed in the environment
  url: env.VITE_SUPABASE_URL || "",
  anonKey: env.VITE_SUPABASE_ANON_KEY || ""
};

export const PRODUCTION_URL = "https://zen30.vercel.app"; 

// Gemini API Key
export const GEMINI_API_KEY = env.API_KEY || "";