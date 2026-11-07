<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowLeft, ArrowUpRight, ChevronDown, LoaderCircle, MessageSquare, PanelLeftClose, PanelLeftOpen, Search, SquarePen, Trash2, X } from 'lucide-vue-next'
import { useLiaStore } from '@/stores/lia'
import LiaConfirmDialog from './LiaConfirmDialog.vue'
const props = defineProps({ sidebar: Boolean, collapsed: Boolean })
const emit = defineEmits(['new', 'select', 'back', 'toggle'])
const store = useLiaStore()
const search = ref(''), searchVisible = ref(false), searchInput = ref(null), recentToggle = ref(null), recentOpen = ref(true)
const deleting = ref(false), pendingDelete = ref(null), error = ref('')
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
const conversations = computed(() => {
  const query = normalize(search.value.trim())
  return store.conversations.filter(item => !query || normalize(item.title + ' ' + (item.lastMessagePreview || '')).includes(query))
})
async function openSearch() {
  if (props.collapsed) emit('toggle')
  searchVisible.value = true; recentOpen.value = true
  await nextTick(); searchInput.value?.focus()
}
watch(() => props.collapsed, async collapsed => { if (!collapsed && searchVisible.value) { await nextTick(); searchInput.value?.focus() } })
function closeSearch() { search.value = ''; searchVisible.value = false }
function askDelete(conversation) { error.value = ''; pendingDelete.value = conversation }
async function remove() {
  if (!pendingDelete.value || deleting.value) return
  deleting.value = true; error.value = ''
  try { await store.deleteConversation(pendingDelete.value.id); pendingDelete.value = null; await nextTick(); recentToggle.value?.focus() }
  catch { error.value = 'Não foi possível excluir a conversa. Tente novamente.' }
  finally { deleting.value = false }
}
</script>
<template>
  <aside class="lia-history clarity-mask" :class="{ sidebar, collapsed }" aria-label="Histórico de conversas" data-clarity-mask="true" data-sentry-mask>
    <nav class="history-rail" aria-label="Atalhos de conversas">
      <button type="button" class="sidebar-toggle" :aria-label="collapsed ? 'Abrir histórico' : 'Recolher histórico'" :title="collapsed ? 'Abrir histórico' : 'Recolher histórico'" :aria-expanded="!collapsed" @click="emit('toggle')"><PanelLeftOpen v-if="collapsed" :size="18" /><PanelLeftClose v-else :size="18" /></button>
      <button type="button" class="new-conversation" aria-label="Nova conversa" title="Nova conversa" @click="emit('new')"><SquarePen :size="19" /></button>
      <button type="button" aria-label="Buscar conversas" title="Buscar conversas" :aria-expanded="!collapsed && searchVisible" @click="openSearch"><Search :size="19" /></button>
      <button type="button" aria-label="Histórico de conversas" title="Conversas recentes" :aria-pressed="!collapsed" @click="emit('toggle')"><MessageSquare :size="19" /></button>
    </nav>
    <div v-if="!collapsed" class="history-panel">
      <header class="history-heading"><button v-if="!sidebar" type="button" class="back-button" aria-label="Voltar para a conversa" title="Voltar para a conversa" @click="emit('back')"><ArrowLeft :size="17" /></button><button ref="recentToggle" type="button" class="recent-toggle" :aria-expanded="recentOpen" aria-controls="lia-recent-conversations" @click="recentOpen = !recentOpen"><h3>Recentes</h3><ChevronDown :size="15" :class="{ rotated: !recentOpen }" /></button></header>
      <label v-if="searchVisible" class="history-search"><Search :size="15" /><input ref="searchInput" v-model="search" aria-label="Termo para buscar conversas" placeholder="Buscar nas conversas" @input="recentOpen = true" @keydown.esc.stop.prevent="closeSearch" /><button type="button" aria-label="Fechar busca" @click="closeSearch"><X :size="14" /></button></label>
      <div v-show="recentOpen" id="lia-recent-conversations" class="history-scroll">
        <div v-if="store.isLoading && !store.conversations.length" class="history-empty" role="status"><LoaderCircle :size="22" class="spin" /><p>Carregando suas conversas…</p></div>
        <template v-else-if="conversations.length"><article v-for="conversation in conversations" :key="conversation.id" class="history-item" :class="{ selected: store.activeConversationId === conversation.id }"><button type="button" class="history-select" :aria-current="store.activeConversationId === conversation.id ? 'true' : undefined" @click="emit('select', conversation.id)"><MessageSquare :size="15" /><span><strong>{{ conversation.title || 'Nova conversa' }}</strong><small>{{ conversation.lastMessagePreview || 'Conversa iniciada' }}</small></span></button><button type="button" class="delete-button" :aria-label="`Excluir conversa ${conversation.title || ''}`" :disabled="deleting" @click="askDelete(conversation)"><Trash2 :size="14" /></button></article></template>
        <div v-else class="history-empty"><span class="empty-icon"><MessageSquare :size="25" /></span><h3>{{ search ? 'Nenhuma conversa encontrada' : 'Sua primeira conversa começa aqui' }}</h3><p>{{ search ? 'Tente outro termo ou carregue mais conversas.' : 'Sua próxima ideia pode começar com uma pergunta.' }}</p><button v-if="!search" type="button" @click="emit('new')">Nova conversa <ArrowUpRight :size="15" /></button><button v-else type="button" @click="search = ''">Limpar busca</button></div>
        <button v-if="store.nextCursor" type="button" class="load-more" :disabled="store.isLoadingMore" @click="store.loadMore()">{{ store.isLoadingMore ? 'Carregando…' : 'Carregar mais conversas' }}</button>
      </div>
      <p class="history-note">Somente você vê suas conversas.</p>
    </div>
    <LiaConfirmDialog v-if="pendingDelete" :title="pendingDelete.title" :busy="deleting" :error="error" @cancel="pendingDelete = null" @confirm="remove" />
  </aside>
</template>
<style scoped>
.lia-history { display: flex; flex: 1; min-width: 0; min-height: 0; height: 100%; color: var(--lia-text); background: var(--lia-bg); border-right: 1px solid var(--lia-line); }.sidebar { flex: 0 0 288px; width: 288px; }.collapsed { flex: 0 0 52px; width: 52px; }
button,input { font: inherit; }button { cursor: pointer; }.history-rail { display: flex; flex-direction: column; align-items: center; flex: 0 0 51px; gap: 9px; padding: 12px 6px; box-sizing: border-box; }.history-rail button { display: grid; place-items: center; width: 36px; height: 36px; padding: 0; border: 0; border-radius: 11px; background: transparent; color: var(--lia-muted); }.history-rail button:hover,.history-rail button[aria-pressed=true] { color: var(--lia-text); background: var(--lia-soft); }.history-rail .new-conversation { color: var(--lia-text); background: var(--lia-soft); }.history-rail .sidebar-toggle { margin-bottom: 10px; }
.history-panel { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; padding: 16px 10px 16px 0; }.history-heading { display: flex; align-items: center; gap: 4px; margin-bottom: 12px; }.back-button { display: grid; place-items: center; width: 28px; height: 30px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: var(--lia-muted); }.recent-toggle { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex: 1; min-height: 30px; padding: 5px 8px; border: 0; border-radius: 8px; color: var(--lia-muted); background: transparent; }.recent-toggle h3 { margin: 0; font-size: 12px; font-weight: 550; }.recent-toggle svg { transition: transform .15s; }.rotated { transform: rotate(-90deg); }.recent-toggle:hover,.back-button:hover { color: var(--lia-text); background: var(--lia-soft); }
.history-search { display: flex; align-items: center; gap: 7px; margin: 0 0 12px; padding: 9px; border: 1px solid var(--lia-line); border-radius: 10px; color: var(--lia-muted); background: var(--lia-bg); }.history-search:focus-within { border-color: var(--lia-blue); }.history-search input { width: 100%; min-width: 0; padding: 0; border: 0; outline: none; background: transparent; color: var(--lia-text); font-size: 12px; }.history-search button { display: grid; place-items: center; padding: 0; border: 0; color: inherit; background: transparent; }
.history-scroll { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; }.history-item { display: flex; align-items: center; margin: 3px 0; border: 1px solid transparent; border-radius: 11px; }.history-item:hover { background: var(--lia-soft); }.history-item.selected { background: var(--lia-tint); }.history-select { display: flex; align-items: flex-start; gap: 8px; flex: 1; min-width: 0; padding: 11px 8px; border: 0; text-align: left; background: transparent; color: var(--lia-muted); }.history-select>svg { margin-top: 2px; flex-shrink: 0; }.history-select>span { min-width: 0; }.history-select strong,.history-select small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.history-select strong { color: var(--lia-text); font-size: 12px; font-weight: 500; }.history-select small { margin-top: 4px; font-size: 10px; color: var(--lia-muted); }.delete-button { display: grid; place-items: center; flex: 0 0 27px; width: 27px; height: 30px; margin-right: 3px; padding: 0; border: 0; border-radius: 8px; color: var(--lia-muted); background: transparent; opacity: 0; }.history-item:hover .delete-button,.delete-button:focus-visible { opacity: 1; }.delete-button:hover { color: #dc4d62; background: #dc4d6210; }@media(hover:none) { .delete-button { opacity: 1; } }
.history-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 220px; height: 100%; padding: 20px 6px; box-sizing: border-box; text-align: center; }.empty-icon { display: grid; place-items: center; width: 48px; height: 48px; border: 1px solid var(--lia-line); border-radius: 16px; color: var(--lia-muted); }.history-empty h3 { margin: 17px 0 8px; font-size: 13px; font-weight: 550; line-height: 1.5; }.history-empty p { margin: 0; color: var(--lia-muted); font-size: 11px; line-height: 1.7; }.history-empty button { display: flex; align-items: center; gap: 6px; margin-top: 20px; border: 0; background: transparent; color: var(--lia-blue); font-size: 12px; }.history-note { margin: auto 0 0; padding-top: 16px; text-align: center; color: var(--lia-muted); font-size: 10px; }.load-more { display: block; margin: 16px auto; padding: 8px 10px; border: 1px solid var(--lia-line); border-radius: 9px; color: var(--lia-muted); background: var(--lia-bg); font-size: 11px; }button:disabled { opacity: .5; cursor: default; }button:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 2px; }.spin { animation: spin 1s linear infinite; }@keyframes spin { to { transform: rotate(360deg); } }@media(prefers-reduced-motion: reduce) { .spin { animation: none; }.recent-toggle svg { transition: none; } }
</style>
