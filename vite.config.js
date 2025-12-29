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
        start_url: '/app',
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
})
