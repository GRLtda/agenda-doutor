import { defineConfig, type Plugin } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'
import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import vueDevTools from 'vite-plugin-vue-devtools'
import { createHash } from 'node:crypto'
import { VitePWA } from 'vite-plugin-pwa'

// Match the production /health rewrite in dev and local build previews.
const healthEndpoint = (): Plugin => {
  const rewriteHealth = (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const pathname = req.url?.split('?')[0]
    if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/health' || pathname === '/health.json')) {
      if (pathname === '/health') req.url = '/health.json'
      res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate')
    }
    next()
  }
  return {
    name: 'health-endpoint',
    configureServer(server) { server.middlewares.use(rewriteHealth) },
    configurePreviewServer(server) { server.middlewares.use(rewriteHealth) },
  }
}

export default defineConfig({
  plugins: [
    healthEndpoint(),
    vue({
      template: {
        compilerOptions: {},
      },
      customElement: false,
      script: {
        getHash: (content) => createHash('sha256').update(content).digest('hex'),
      },
    }),
    tailwindcss(),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['logo_brand.png', 'logo_brand.svg'],
      manifest: {
        name: 'Agenda Doutor',
        short_name: 'Agenda Doutor',
        description: 'Agenda Doutor - Agendamentos e consultas.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ede9e9ff',
        theme_color: '#ede9e9ff',
        icons: [
          { src: './logo_brand.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: './logo_brand.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          {
            src: './screenshot-desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            form_factor: 'wide',
            label: 'Agenda Doutor - Dashboard',
          },
          {
            src: './screenshot-mobile.png',
            sizes: '540x720',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Agenda Doutor - Mobile',
          },
        ],
      },

      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: [],
        navigateFallback: null,
        clientsClaim: true,
        skipWaiting: true,
      },
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'vue-toastification': path.resolve(__dirname, './src/lib/sonnerToastification.js'),
    },
  },
  build: {
    chunkSizeWarningLimit: 1000,
  },
})
