import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  // Helper to resolve the value from .env file OR system environment (Vercel/Netlify)
  // This ensures we catch variables set in Vercel Dashboard even if not in a local .env file
  const getVal = (key: string) => {
    return env[key] || (process.env as any)[key] || "";
  };

  return {
    plugins: [react()],
    define: {
      // CRITICAL: JSON.stringify values so they are injected as string literals ("abc"), not raw code (abc).
      'process.env': {
        API_KEY: JSON.stringify(getVal('API_KEY')),
        VITE_SUPABASE_URL: JSON.stringify(getVal('VITE_SUPABASE_URL')),
        VITE_SUPABASE_ANON_KEY: JSON.stringify(getVal('VITE_SUPABASE_ANON_KEY'))
      }
    },
  };
});