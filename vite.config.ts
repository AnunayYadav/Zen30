import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env from local .env files (if any)
  // Fix: Property 'cwd' does not exist on type 'Process' - casting to any to access Node.js process methods
  const localEnv = loadEnv(mode, (process as any).cwd(), '');
  const env = { ...process.env, ...localEnv };

  return {
    plugins: [react()],
    define: {
      // Only exposing API_KEY for Gemini. Supabase keys are now hardcoded in config.ts.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
      'process.env.VITE_API_KEY': JSON.stringify(env.VITE_API_KEY || ""),
    },
  };
});