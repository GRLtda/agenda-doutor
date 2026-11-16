// Design da Retrospectiva 2026 (designKey "2026-v1"). Todo o visual do ano mora nesta pasta.
import { defineAsyncComponent } from 'vue'
import type { RetrospectiveDesign } from '../index'

const design: RetrospectiveDesign = {
  key: '2026-v1',
  Player: defineAsyncComponent(() => import('./Player.vue')),
  Banner: defineAsyncComponent(() => import('./Banner.vue')),
  StatusScreen: defineAsyncComponent(() => import('./StatusScreen.vue')),
}

export default design
