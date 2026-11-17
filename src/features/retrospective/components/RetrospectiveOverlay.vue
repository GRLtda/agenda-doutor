<script setup>
// Retrospectiva em camada sobre a página atual (aberta por ?retrospectiva=1, ver useRetrospectiveOpener).
// - Teleport para o body com z-index máximo do app: fica acima de tudo (inclusive o botão da Lia).
// - Abre e fecha com fade; o fundo é azul-escuro com opacidade baixa, então a página da clínica aparece atrás.
// - Sempre passa pela A2 ("Montando o seu ano…"): mesmo com os dados prontos no back-end, a tela marca as
//   quatro etapas rapidamente e então troca para o player com fade cruzado. A3 (erro) com "Tentar de novo".
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useRetrospectiveStore } from '../stores/retrospective.store'
import { getDesign, getLatestDesign } from '../designs'

const props = defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])
const auth = useAuthStore()
const store = useRetrospectiveStore()
const state = ref('loading') // loading | error | ready
const dataReady = ref(false)
const design = computed(() => getDesign(store.current?.designKey))
const statusDesign = getLatestDesign()
let viewTracked = false

const close = () => emit('close')

async function load() {
  state.value = 'loading'
  dataReady.value = false
  try {
    await store.fetchCurrent({ force: true })
    if (!props.open) return
    if (!store.ready) return close() // nada publicado ou design desconhecido
    dataReady.value = true // a A2 termina as etapas e emite "finished"
  } catch {
    if (props.open) state.value = 'error'
  }
}

function onLoadingFinished() {
  if (!dataReady.value || !props.open) return
  state.value = 'ready'
  if (!viewTracked) {
    viewTracked = true
    store.trackView() // uma vez por abertura; falha é silenciosa
  }
}

watch(() => props.open, (open) => {
  if (!open) return
  viewTracked = false
  if (auth.user && auth.user.role !== 'owner') return close()
  if (!store.available) return close() // o /auth/me não indicou retrospectiva publicada: nem pede os dados
  load()
}, { immediate: true })

// Ao terminar o fade-out, volta ao estado inicial para a próxima abertura.
function onAfterLeave() {
  state.value = 'loading'
  dataReady.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="retro-layer" @after-leave="onAfterLeave">
      <div v-if="open" class="retro-layer">
        <Transition name="retro-swap">
          <component :is="design.Player" v-if="state === 'ready' && design" key="player" :retrospective="store.current" @close="close" @shared="store.trackShare" />
          <component
            :is="statusDesign.StatusScreen"
            v-else
            key="status"
            :state="state === 'error' ? 'error' : 'loading'"
            :ready="dataReady"
            @finished="onLoadingFinished"
            @retry="load"
            @close="close"
          />
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Acima de tudo do app (Lia, modais, dropdowns); só o aviso de instabilidade da API fica por cima. */
.retro-layer {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  background: rgba(7, 12, 34, 0.35);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
}
.retro-layer-enter-active,
.retro-layer-leave-active { transition: opacity 0.32s ease; }
.retro-layer-enter-from,
.retro-layer-leave-to { opacity: 0; }

/* Troca "Montando o seu ano" -> stories: fade cruzado (as duas telas são fixed e se sobrepõem). */
.retro-swap-enter-active,
.retro-swap-leave-active { transition: opacity 0.42s ease; }
.retro-swap-enter-from,
.retro-swap-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .retro-layer-enter-active, .retro-layer-leave-active,
  .retro-swap-enter-active, .retro-swap-leave-active { transition-duration: 0.01s; }
}
</style>
