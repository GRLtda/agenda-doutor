import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
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
    tailwindcss(),
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
  optimizeDeps: {
    include: ['radix-vue'],
  },
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
            // Vue e dependências core PRIMEIRO - evita dependências circulares
            // Inclui @tiptap/vue-3 que depende diretamente do Vue
            if (
              id.includes('vue') ||
              id.includes('pinia') ||
              id.includes('vue-router') ||
              id.includes('@tiptap/vue')
            ) {
              return 'vendor-vue'
            }
            if (id.includes('jspdf')) {
              return 'vendor-pdf'
            }
            // Editor SEM o @tiptap/vue-3 (já agrupado com Vue)
            if (id.includes('@tiptap') || id.includes('tiptap') || id.includes('prosemirror')) {
              return 'vendor-editor'
            }
            if (id.includes('chart.js')) {
              return 'vendor-charts'
            }
            if (id.includes('@sentry')) {
              return 'vendor-sentry'
            }
            if (id.includes('@vue-flow') || id.includes('dagre')) {
              return 'vendor-flow'
            }
            if (id.includes('html2canvas')) {
              return 'vendor-html2canvas'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
