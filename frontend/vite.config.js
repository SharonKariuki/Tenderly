import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // AGPO rules live once, in the Django app, and are shared with the frontend.
      '@agpo-rules': path.resolve(__dirname, '../access/agpo_rules.json'),
    },
  },
  server: {
    fs: { allow: ['..'] },
  },
})
