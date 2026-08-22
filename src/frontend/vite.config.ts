/// <reference types="vitest/config" />
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
  // Vitest reads its config from this same file (`test` is only typed once
  // the `vitest/config` triple-slash reference above is in scope) rather
  // than a separate vitest.config.ts, so there's one source of truth for
  // the React/Tailwind plugins instead of two config files drifting apart.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
})
