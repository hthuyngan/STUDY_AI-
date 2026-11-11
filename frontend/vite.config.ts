import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const backendTarget =
  process.env.VITE_BACKEND_URL ||
  process.env.VITE_API_BASE_URL?.replace(/\/+$/, '').replace(/\/api\/v1$/, '') ||
  'http://localhost:5000'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL ?? (process.env.GITHUB_ACTIONS ? '/STUDY_AI-/' : '/'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
      '/health': {
        target: backendTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
