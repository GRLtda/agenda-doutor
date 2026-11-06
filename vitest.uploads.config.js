import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'vue-toastification': fileURLToPath(new URL('./src/lib/sonnerToastification.js', import.meta.url)),
    },
  },
  test: { environment: 'jsdom', include: ['tests/uploads-*.spec.js'], clearMocks: true },
})
