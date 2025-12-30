// --- CONFIGURATION ---
// We access process.env properties DIRECTLY so the Vite bundler can
// replace them with the strings defined in vite.config.ts

// Helper to safely get a value checking both process.env (Vercel/Node) and import.meta.env (Vite)
// Note: We avoid dynamic key access (e.g. process.env[key]) because bundlers cannot statically analyze that.

const getUrl = () => {
  if (typeof process !== 'undefined' && process.env.SUPABASE_URL) return process.env.SUPABASE_URL;
  if (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) return process.env.VITE_SUPABASE_URL;
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_URL) return (import.meta as any).env.VITE_SUPABASE_URL;
  return "";
};

const getKey = () => {
  if (typeof process !== 'undefined' && process.env.SUPABASE_ANON_KEY) return process.env.SUPABASE_ANON_KEY;
  if (typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY) return process.env.VITE_SUPABASE_ANON_KEY;
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_SUPABASE_ANON_KEY) return (import.meta as any).env.VITE_SUPABASE_ANON_KEY;
  return "";
};

const getApiKey = () => {
  if (typeof process !== 'undefined' && process.env.API_KEY) return process.env.API_KEY;
  if (typeof process !== 'undefined' && process.env.VITE_API_KEY) return process.env.VITE_API_KEY;
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_KEY) return (import.meta as any).env.VITE_API_KEY;
  return "";
};

export const SUPABASE_CONFIG = {
  url: getUrl(),
  anonKey: getKey()
};

export const GEMINI_API_KEY = getApiKey();
