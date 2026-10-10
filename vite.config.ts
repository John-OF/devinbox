import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const API_PORT = Number(process.env.API_PORT ?? 3001)

const apiProxy = {
  // 127.0.0.1 y no "localhost": la API solo escucha en IPv4 loopback y localhost puede resolver a ::1
  '/api': { target: `http://127.0.0.1:${API_PORT}`, changeOrigin: true },
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'DevInbox',
        short_name: 'DevInbox',
        description: 'Bandeja de entrada para tus recursos de programación.',
        lang: 'es',
        theme_color: '#4f46e5',
        background_color: '#fafafa',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Recibir links compartidos desde el móvil (Android). WhatsApp suele mandar el link en `text`.
        share_target: {
          action: '/share',
          method: 'GET',
          params: { title: 'title', text: 'text', url: 'url' },
        },
      },
      workbox: {
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
