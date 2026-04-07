import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-redirects',
      closeBundle() {
        // Try multiple possible source locations
        const sources = ['./_redirects', './client/_redirects', './client/public/_redirects']
        const distPath = './dist/_redirects'
        for (const src of sources) {
          if (existsSync(src)) {
            copyFileSync(src, distPath)
            console.log('Copied _redirects from', src)
            break
          }
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
