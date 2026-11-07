<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { LoaderCircle, MessageSquare, Pin, X } from 'lucide-vue-next'
import LiaModal from './LiaModal.vue'
import { useLiaStore } from '@/stores/lia'
const emit = defineEmits(['close', 'select'])
const store = useLiaStore()
const query = ref(''), results = ref([]), cursor = ref(null), loading = ref(true), error = ref('')
let timer, controller, version = 0
async function search(append = false) {
  const ticket = ++version
  controller?.abort(); controller = new AbortController()
  loading.value = true; error.value = ''
  try {
    const data = await store.searchConversations(query.value.trim(), append ? cursor.value : undefined, controller.signal)
    if (ticket !== version || !data) return
    results.value = append ? [...results.value, ...data.conversations.filter(item => !results.value.some(current => current.id === item.id))] : data.conversations
    cursor.value = data.nextCursor || null
  } catch (failure) { if (ticket === version && !controller.signal.aborted) error.value = 'Não foi possível buscar suas conversas. Tente novamente.' }
  finally { if (ticket === version) loading.value = false }
}
watch(query, () => {
  clearTimeout(timer); controller?.abort(); version++
  results.value = []; cursor.value = null; loading.value = true
  timer = setTimeout(() => search(), 250)
})
void search()
onBeforeUnmount(() => { clearTimeout(timer); version++; controller?.abort() })
</script>
<template>
  <LiaModal title="Buscar conversas recentes" wide @close="emit('close')">
    <header class="search-heading"><label><span class="sr-only">Pesquisar conversas</span><input v-model="query" autofocus maxlength="120" placeholder="Pesquisar…" type="search" aria-label="Pesquisar conversas" /></label><button type="button" aria-label="Fechar busca" @click="emit('close')"><X :size="18" /></button></header>
    <div class="search-results" :aria-busy="loading">
      <h2>{{ query.trim() ? 'Resultados' : 'Chats recentes' }}</h2>
      <p v-if="loading && !results.length" class="empty" role="status"><LoaderCircle :size="18" class="spin" /> Buscando conversas…</p>
      <p v-else-if="error" class="empty" role="alert">{{ error }} <button type="button" @click="search()">Tentar novamente</button></p>
      <p v-else-if="!results.length" class="empty">{{ query.trim() ? 'Nenhuma conversa encontrada.' : 'Suas conversas vão aparecer aqui.' }}</p>
      <button v-for="item in results" :key="item.id" type="button" class="search-result" @click="emit('select', item.id)"><MessageSquare :size="18" /><span>{{ item.title || 'Nova conversa' }}</span><Pin v-if="item.pinnedAt" :size="13" aria-label="Fixada" /></button>
      <button v-if="cursor" type="button" class="load-more" :disabled="loading" @click="search(true)">{{ loading ? 'Carregando…' : 'Carregar mais' }}</button>
    </div>
  </LiaModal>
</template>
<style scoped>
.search-heading { display: flex; align-items: center; gap: 14px; padding: 20px 24px 12px; }.search-heading label { flex: 1; min-width: 0; }input { width: 100%; padding: 8px 0; border: 0; outline: none; background: transparent; color: var(--lia-text); font: inherit; font-size: 14px; }button { cursor: pointer; font: inherit; }.search-heading>button { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--lia-muted); }.search-results { min-height: 280px; max-height: min(440px, 60dvh); overflow-y: auto; padding: 10px 16px 24px; }h2 { margin: 0 8px 12px; color: var(--lia-muted); font-size: 12px; font-weight: 500; }.search-result { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 46px; padding: 12px 14px; border: 0; border-radius: 10px; background: transparent; color: var(--lia-text); text-align: left; font-size: 13px; }.search-result:hover { background: var(--lia-soft); }.search-result>span { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.search-result>svg { flex-shrink: 0; color: var(--lia-muted); }.empty { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px; min-height: 180px; padding: 16px; color: var(--lia-muted); font-size: 13px; text-align: center; }.load-more,.empty button { display: block; margin: 14px auto 0; padding: 8px 12px; border: 1px solid var(--lia-line); border-radius: 9px; color: var(--lia-text); background: var(--lia-bg); font-size: 12px; }button:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 2px; }.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }.spin { animation: spin 1s linear infinite; }@keyframes spin { to { transform: rotate(360deg); } }@media(prefers-reduced-motion:reduce) { .spin { animation: none; } }@media(max-width:760px) { input { font-size: 16px; }.search-results { max-height: calc(var(--lia-viewport-height, 100dvh) - 150px); min-height: 120px; } }
</style>
