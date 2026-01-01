import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // Vite automatically exposes env vars prefixed with VITE_ to the client
    // For Netlify, set these in the Netlify dashboard:
    // - VITE_SUPABASE_URL
    // - VITE_SUPABASE_ANON_KEY
    // Note: GEMINI_API_KEY is server-side only (no VITE_ prefix)
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
