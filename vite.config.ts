import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Irc_hispano/',
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false
  }
})
