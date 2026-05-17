import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Routes that are pure API — browser page refreshes should get index.html instead.
const apiBypass = (req: { headers: { accept?: string } }) => {
  if (req.headers.accept?.includes('text/html')) return '/index.html'
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // /auth is NOT bypassed — the OAuth login/callback flow requires real browser redirects.
      '/auth': 'http://localhost:8000',
      '/groups':      { target: 'http://localhost:8000', bypass: apiBypass },
      '/invites':     { target: 'http://localhost:8000', bypass: apiBypass },
      '/memberships': { target: 'http://localhost:8000', bypass: apiBypass },
      '/media':       'http://localhost:8000',
    },
  },
  base: '/',
})
