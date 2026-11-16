<script setup>
// Rota /retrospectiva: player em tela cheia. Mostra A2 (carregando) e A3 (erro) enquanto busca.
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRetrospectiveStore } from '../stores/retrospective.store'
import { getDesign, getLatestDesign } from '../designs'

const router = useRouter()
const auth = useAuthStore()
const store = useRetrospectiveStore()
const state = ref('loading') // loading | error | ready
const design = computed(() => getDesign(store.current?.designKey))
const statusDesign = getLatestDesign()
let viewTracked = false

function close() {
  router.push({ name: 'resumo-dashboard' })
}

async function load() {
  state.value = 'loading'
  try {
    await store.fetchCurrent({ force: true })
    if (!store.available) return close() // nada publicado ou design desconhecido: volta ao painel
    state.value = 'ready'
    if (!viewTracked) {
      viewTracked = true
      store.trackView() // uma vez por abertura; falha é silenciosa
    }
  } catch {
    state.value = 'error'
  }
}

onMounted(() => {
  if (auth.user && auth.user.role !== 'owner') return close()
  load()
})
</script>

<template>
  <component :is="design.Player" v-if="state === 'ready' && design" :retrospective="store.current" @close="close" @shared="store.trackShare" />
  <component :is="statusDesign.StatusScreen" v-else :state="state === 'error' ? 'error' : 'loading'" @retry="load" @close="close" />
</template>
