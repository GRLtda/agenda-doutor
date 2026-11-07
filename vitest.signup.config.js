import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Cadastro, campanha, checkout e retorno do checkout. Ver docs/onboarding-assinatura-e-trial.md
export default defineConfig({
  plugins: [vue()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'jsdom', include: ['tests/signup-*.spec.js'], clearMocks: true },
})
