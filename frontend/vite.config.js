import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for GamerHub frontend
// Proxies /api requests to the Express backend during development
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // All /api/* requests are forwarded to the Express backend at port 5000
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
