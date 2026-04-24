import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,        // allows access via LAN IP
    port: 5173,
    open: true,         // auto open browser
    proxy: {
      '/api/auth': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/api/chat': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
        ws: true,
      },
    },
  }
})
