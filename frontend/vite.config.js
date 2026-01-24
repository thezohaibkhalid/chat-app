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
  build: {
    sourcemap: false,
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Manual chunk splitting for better caching
        manualChunks: {
          // Core React chunks - cached separately
          'react-vendor': ['react', 'react-dom', 'react-router'],
          // UI libraries
          'ui-vendor': ['lucide-react', 'react-hot-toast', 'daisyui'],
          // Data fetching
          'query-vendor': ['@tanstack/react-query', 'axios'],
          // Stream Chat (large library - only loaded when needed)
          'stream-chat': ['stream-chat', 'stream-chat-react'],
          // Stream Video (large library - only loaded when needed)
          'stream-video': ['@stream-io/video-react-sdk'],
        },
      },
    },
  },
})
