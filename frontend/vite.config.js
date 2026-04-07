import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Set base to repo name when deployed to GitHub Pages
  // Change 'pagedin' to your actual repo name if different
  base: process.env.VITE_BASE_PATH || '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
