import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // We explicitly define process.env.API_KEY to satisfy the @google/genai SDK requirement
      // and prevent it from crashing in a browser environment.
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ""),
      
      // If you have other specific non-VITE_ prefixed vars to expose, add them here.
      // VITE_ prefixed variables (like VITE_SUPABASE_URL) are automatically exposed on import.meta.env
    },
  };
});