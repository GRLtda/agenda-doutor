import { createApp, h } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory, RouterView } from 'vue-router'
import Preview from './Preview.vue'

const view = new URLSearchParams(location.search).get('view') || 'banner'
const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', name: 'resumo-dashboard', component: Preview },
    { path: '/retrospectiva', name: 'retrospectiva', redirect: { name: 'resumo-dashboard', query: { retrospectiva: '1' } } },
  ],
})
const app = createApp({ render: () => h(RouterView) }).use(createPinia())
router.push(['player', 'loading', 'error'].includes(view) ? '/?retrospectiva=1' : '/').then(() => app.use(router).mount('#app'))
