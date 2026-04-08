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
        // Copy _redirects from public folder to dist
        const src = './public/_redirects'
        const dest = './dist/_redirects'
        
        if (existsSync(src)) {
          copyFileSync(src, dest)
          console.log('Copied _redirects from', src, 'to', dest)
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
