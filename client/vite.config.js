import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-redirects',
      closeBundle() {
        // Copy to both possible output locations
        const sources = ['./_redirects', './client/_redirects', './client/public/_redirects']
        const distPaths = ['./dist/_redirects', './client/dist/_redirects']
        
        for (const src of sources) {
          if (existsSync(src)) {
            for (const dest of distPaths) {
              try {
                copyFileSync(src, dest)
                console.log('Copied _redirects from', src, 'to', dest)
              } catch (e) {
                console.log('Failed to copy to', dest, e.message)
              }
            }
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
