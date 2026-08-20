import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Requests arrive proxied through nginx with Host: collectors-lib.test
    // (see docker/nginx.conf) -- Vite's dev-server host check would
    // otherwise reject anything that isn't literally "localhost".
    allowedHosts: ['collectors-lib.test', 'localhost'],
  },
})
