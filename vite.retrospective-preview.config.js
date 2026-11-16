import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
const at = path => fileURLToPath(new URL(path, import.meta.url))

// Prévia isolada da Retrospectiva. Não carrega autenticação, API real nem dados de produção.
// Uso: npm run dev:retrospectiva  ->  http://127.0.0.1:5183/?view=banner|player|loading|error|cards&seq=full|reduced&copy=1..3
export default defineConfig({
  root: at('./tests/retrospective-preview/'),
  plugins: [vue()],
  resolve: { alias: [
    { find: /^@\/api\/index$/, replacement: at('./tests/retrospective-preview/state.js') },
    { find: '@/stores/auth', replacement: at('./tests/retrospective-preview/state.js') },
    { find: '@', replacement: at('./src') },
  ] },
  server: { host: '127.0.0.1', port: 5183, strictPort: true, fs: { allow: [at('./')] } },
})
