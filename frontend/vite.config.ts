import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

function spa404Plugin() {
  return {
    name: 'spa-404-fallback',
    closeBundle() {
      const outDir = resolve(import.meta.dirname, 'dist')
      const indexPath = resolve(outDir, 'index.html')
      const notFoundPath = resolve(outDir, '404.html')
      if (existsSync(indexPath)) {
        copyFileSync(indexPath, notFoundPath)
      }
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  base: process.env.VITE_BASE_URL ?? (process.env.GITHUB_ACTIONS ? '/STUDY_AI-/' : '/'),
  plugins: [react(), spa404Plugin()],
  resolve: {
    alias: {
      '@': `${import.meta.dirname}/src`,
    },
  },
})
