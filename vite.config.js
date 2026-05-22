import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://148.72.215.143:155',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/inpack-api': {
        target: 'http://148.72.215.143:1355',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/inpack-api/, ''),
      },
    },
  },
})
