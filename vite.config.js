import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite dev server proxy: /mcp → ai-superpower:8000/mcp
// This avoids CORS when the React SPA connects to ai-superpower's MCP
// HTTP endpoint during development. In production, deploy both behind
// the same origin (e.g. reverse proxy) or use a same-origin path.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    proxy: {
      '/mcp': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
