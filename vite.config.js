import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import vueDevTools from 'vite-plugin-vue-devtools'
import { createHash } from 'node:crypto'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue({
      template: {
        compilerOptions: {},
      },
      customElement: false,
      script: {
        getHash: (content) => createHash('sha256').update(content).digest('hex'),
      },
    }),
    vueDevTools(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo_brand.png', 'logo_brand.svg'],
      manifest: {
        name: 'Agenda Doutor',
        short_name: 'Agenda Doutor',
        description: 'Agenda Doutor - Agendamentos e consultas.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          {
            src: './logo_brand.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: './logo_brand.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
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
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('jspdf')) {
              return 'vendor-pdf'
            }
            if (id.includes('@tiptap') || id.includes('tiptap') || id.includes('prosemirror')) {
              return 'vendor-editor'
            }
            if (id.includes('chart.js') || id.includes('vue-chartjs')) {
              return 'vendor-charts'
            }
            if (id.includes('@sentry')) {
              return 'vendor-sentry'
            }
            if (id.includes('vue-cal')) {
              return 'vendor-calendar'
            }
            if (id.includes('@vue-flow') || id.includes('dagre')) {
              return 'vendor-flow'
            }
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas'
            }
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vendor-vue'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
