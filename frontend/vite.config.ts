import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget =
    env.VITE_BACKEND_URL ||
    env.VITE_API_BASE_URL?.replace(/\/+$/, '').replace(/\/api\/v1$/, '') ||
    'http://localhost:8000'

  return {
    base: env.VITE_BASE_URL ?? (process.env.GITHUB_ACTIONS ? '/STUDY_AI-/' : '/'),
    plugins: [react()],
    resolve: {
      alias: {
        '@': `${import.meta.dirname}/src`,
      },
    },
    server: {
      port: 5174,
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
        '/uploads': {
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
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
