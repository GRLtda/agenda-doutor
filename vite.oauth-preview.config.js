import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
const at = path => fileURLToPath(new URL(path, import.meta.url))

// Prévia isolada do login com provedores externos (todos os estados lado a lado).
// Não carrega autenticação, API real nem dados de produção.
// Uso: npm run dev:oauth-preview  ->  http://127.0.0.1:5184/  (?dark=1 abre no modo escuro)
export default defineConfig({
  root: at('./tests/oauth-preview/'),
  plugins: [vue(), tailwindcss()],
  resolve: { alias: [
    { find: /^@\/api\/oauth$/, replacement: at('./tests/oauth-preview/api.js') },
    { find: /^@\/composables\/useOAuth$/, replacement: at('./tests/oauth-preview/useOAuth.js') },
    { find: /^@\/stores\/auth$/, replacement: at('./tests/oauth-preview/auth.js') },
    { find: /^vue-router$/, replacement: at('./tests/oauth-preview/router.js') },
    { find: /^.*[\/](SubscriptionView|ActiveSessionsView|StorageUsage).vue$/, replacement: at('./tests/oauth-preview/Empty.vue') },
    { find: /^vue-toastification$/, replacement: at('./tests/oauth-preview/toast.js') },
    { find: '@', replacement: at('./src') },
  ] },
  server: { host: '127.0.0.1', port: 5184, strictPort: true, fs: { allow: [at('./')] } },
})
