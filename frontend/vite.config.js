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
  test: {
    // Use jsdom so React components can render with a DOM
    environment: 'jsdom',
    // Auto-import vitest globals (describe, it, expect, vi, beforeEach, …)
    globals: true,
    // Run this file before each test file to set up jest-dom matchers
    setupFiles: ['./src/tests/setup.js'],
    // Don't print noisy logs from components during tests
    silent: false,
  },
});

