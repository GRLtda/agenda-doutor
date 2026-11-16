<script setup>
// A1: banner da retrospectiva no dashboard. Só para o dono e só se houver payload com design registrado.
// Não conhece o visual: delega ao Banner do design do ano (designs/<designKey>/).
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRetrospectiveStore } from '../stores/retrospective.store'
import { getDesign } from '../designs'

const DISMISS_KEY = 'agenda-doutor:retrospectiva:banner-oculto'

const auth = useAuthStore()
const store = useRetrospectiveStore()
const router = useRouter()
const dismissed = ref(false)

const isOwner = computed(() => auth.user?.role === 'owner')
const design = computed(() => getDesign(store.current?.designKey))
const visible = computed(() => isOwner.value && store.available && design.value && !dismissed.value)

onMounted(async () => {
  if (!isOwner.value) return
  try {
    await store.fetchCurrent()
    dismissed.value = sessionStorage.getItem(DISMISS_KEY) === store.current?.id
  } catch {
    /* sem banner se a API falhar: nunca quebra o dashboard */
  }
})

function open() { router.push({ name: 'retrospectiva' }) }
function dismiss() {
  dismissed.value = true
  try { sessionStorage.setItem(DISMISS_KEY, store.current?.id || '') } catch { /* sem storage */ }
}
</script>

<template>
  <div v-if="visible" class="retrospective-banner-slot">
    <component :is="design.Banner" :retrospective="store.current" @open="open" @dismiss="dismiss" />
  </div>
</template>

<style scoped>
.retrospective-banner-slot { margin-bottom: 1.5rem; }
</style>
