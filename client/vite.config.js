import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync, mkdirSync } from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-redirects',
      closeBundle() {
        const redirectsPath = './_redirects'
        const distPath = './dist/_redirects'
        if (existsSync(redirectsPath)) {
          copyFileSync(redirectsPath, distPath)
          console.log('Copied _redirects to dist')
        }
      }
    }
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://backendtrucker.onrender.com',
        changeOrigin: true
      }
    }
  }
})
