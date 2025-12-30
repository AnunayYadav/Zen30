// --- CONFIGURATION ---

// Supabase Configuration (Hardcoded as requested)
export const SUPABASE_CONFIG = {
  url: "https://bbmhrappdhaungpyjkgd.supabase.co",
  anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJibWhyYXBwZGhhdW5ncHlqa2dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwODM2NjMsImV4cCI6MjA4MjY1OTY2M30.cuClGjUp9QNivkNpC35cT4eRbnS1nIE4wIq3LH_lR_Y"
};

// Gemini API Key - Safely check environment without crashing
// We try to access process.env (Vercel) or import.meta.env (Vite)
const getApiKey = () => {
  try {
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env?.API_KEY) return process.env.API_KEY;
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) return import.meta.env.VITE_API_KEY;
    return "";
  } catch (e) {
    return "";
  }
};

export const GEMINI_API_KEY = getApiKey();
