import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL ?? (process.env.GITHUB_ACTIONS ? '/STUDY_AI-/' : '/'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
})
