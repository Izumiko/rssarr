import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': 'http://localhost:12306',
      '/api': 'http://localhost:12306',
      '/sonarr': 'http://localhost:12306',
      '/proxy': 'http://localhost:12306',
      '/RSS': 'http://localhost:12306',
      '/torrent': 'http://localhost:12306',
      '/auth': 'http://localhost:12306',
      '/Torznab': 'http://localhost:12306',
    },
  }
})
