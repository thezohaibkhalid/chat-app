import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  server: {
    host: true,
    allowedHosts: ['chat.bitbuilders.tech'],  
  },
  preview: {
    host: true,
    port: 5000,
    allowedHosts: ['chat.bitbuilders.tech'],
    strictPort: true,
  },
  plugins: [react()],
})
