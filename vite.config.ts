import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Prevent duplicate React instances across dependencies (fixes useContext null errors)
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },
  server: {
    port: 5173,
  },
})
