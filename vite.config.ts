import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // We cast process to any to avoid TS errors in the config context
  const env = loadEnv(mode, (process as any).cwd(), '');
  const processEnv = process.env as any;

  // HELPER: Search for a value across multiple possible key names
  // This solves the issue where Vercel/Netlify variables might be named differently
  const safeEnv = (...keys: string[]) => {
    for (const key of keys) {
      // Check .env file loaded by Vite
      if (env[key]) return env[key];
      // Check system environment (Vercel/Netlify build context)
      if (processEnv[key]) return processEnv[key];
    }
    return "";
  };

  // ROBUST KEY DETECTION
  // We look for VITE_ prefix, REACT_APP_ prefix, or no prefix.
  const FOUND_API_KEY = safeEnv('API_KEY', 'VITE_API_KEY', 'REACT_APP_API_KEY', 'GOOGLE_API_KEY');
  
  const FOUND_SUPABASE_URL = safeEnv(
    'VITE_SUPABASE_URL', 
    'REACT_APP_SUPABASE_URL', 
    'SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_URL'
  );

  const FOUND_SUPABASE_ANON_KEY = safeEnv(
    'VITE_SUPABASE_ANON_KEY', 
    'REACT_APP_SUPABASE_ANON_KEY', 
    'SUPABASE_KEY', 
    'SUPABASE_ANON_KEY',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );

  return {
    plugins: [react()],
    define: {
      // Inject these specific normalized keys into the client bundle
      // usage in code: process.env.VITE_SUPABASE_URL
      'process.env': {
        API_KEY: JSON.stringify(FOUND_API_KEY),
        VITE_SUPABASE_URL: JSON.stringify(FOUND_SUPABASE_URL),
        VITE_SUPABASE_ANON_KEY: JSON.stringify(FOUND_SUPABASE_ANON_KEY)
      }
    },
  };
});