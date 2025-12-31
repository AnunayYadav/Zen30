import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env variables from .env file or system environment
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // We manually inject 'process.env.API_KEY' for the Gemini service
      // because it might not start with VITE_.
      // Supabase keys (VITE_*) are handled automatically by Vite.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY || ''),
    },
  };
});