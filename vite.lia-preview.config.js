import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
const at = path => fileURLToPath(new URL(path, import.meta.url))

// Isolated development preview. It never loads auth, real API clients or production data.
export default defineConfig({
  root: at('./tests/lia-preview/'),
  plugins: [vue()],
  resolve: { alias: [
    { find: '@/api/lia', replacement: at('./tests/lia-preview/state.js') },
    { find: '@/stores/lia', replacement: at('./tests/lia-preview/state.js') },
    { find: '@/stores/auth', replacement: at('./tests/lia-preview/state.js') },
    { find: '@/composables/useLiaPageContext', replacement: at('./tests/lia-preview/state.js') },
    { find: '@', replacement: at('./src') },
  ] },
  server: { host: '127.0.0.1', port: 5182, strictPort: true, fs: { allow: [at('./')] } },
})
