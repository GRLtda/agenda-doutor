<script setup>
import { computed, nextTick, ref } from 'vue'
import { ChevronDown, LoaderCircle, MessageSquare, MoreHorizontal, PanelLeftClose, Pin, Search, SquarePen } from 'lucide-vue-next'
import { useLiaStore } from '@/stores/lia'
import LiaConfirmDialog from './LiaConfirmDialog.vue'
import LiaConversationMenu from './LiaConversationMenu.vue'
import LiaRenameDialog from './LiaRenameDialog.vue'
defineProps({ sidebar: Boolean })
const emit = defineEmits(['new', 'select', 'back', 'search'])
const store = useLiaStore()
const recentToggle = ref(null), recentOpen = ref(true), menu = ref(null), renaming = ref(null), pendingDelete = ref(null)
const busy = ref(false), error = ref('')
function setRecentToggle(element) { recentToggle.value = element }
const groups = computed(() => [
  { label: 'Fixadas', items: store.conversations.filter(item => item.pinnedAt) },
  { label: 'Recentes', items: store.conversations.filter(item => !item.pinnedAt) },
])
function openMenu(conversation, event) {
  if (busy.value) return
  error.value = ''
  menu.value = menu.value?.conversation.id === conversation.id ? null : { conversation, anchor: event.currentTarget }
}
function rename() { renaming.value = menu.value.conversation; menu.value = null }
function askDelete() { pendingDelete.value = menu.value.conversation; menu.value = null; error.value = '' }
async function pin() {
  const conversation = menu.value.conversation
  menu.value = null; busy.value = true; error.value = ''
  try { await store.updateConversation(conversation.id, { pinned: !conversation.pinnedAt }) }
  catch { error.value = 'Não foi possível alterar a fixação. Tente novamente.' }
  finally { busy.value = false }
}
async function remove() {
  if (!pendingDelete.value || busy.value) return
  busy.value = true; error.value = ''
  try { await store.deleteConversation(pendingDelete.value.id); pendingDelete.value = null; await nextTick(); recentToggle.value?.focus() }
  catch { error.value = 'Não foi possível excluir a conversa. Tente novamente.' }
  finally { busy.value = false }
}
</script>
<template>
  <aside class="lia-history clarity-mask" :class="{ sidebar }" aria-label="Histórico de conversas" data-clarity-mask="true" data-sentry-mask>
    <div class="sidebar-heading"><span>Conversas</span><button type="button" class="back-button" aria-label="Recolher histórico" title="Fechar lateral" @click="emit('back')"><PanelLeftClose :size="18" /></button></div>
    <nav class="history-shortcuts" aria-label="Atalhos de conversas">
      <button type="button" class="new-conversation" @click="emit('new')"><SquarePen :size="18" /><span>Nova conversa</span></button>
      <button type="button" aria-label="Buscar conversas" @click="emit('search')"><Search :size="18" /><span>Buscar conversas</span></button>
      <button type="button" aria-label="Conversas recentes" @click="emit('search')"><MessageSquare :size="18" /><span>Conversas recentes</span></button>
    </nav>
    <p v-if="error && !pendingDelete" class="history-error" role="alert">{{ error }}</p>
    <div class="history-scroll">
      <p v-if="store.isLoading && !store.conversations.length" class="history-empty" role="status"><LoaderCircle :size="20" class="spin" />Carregando conversas…</p>
      <section v-for="group in groups" :key="group.label" class="history-group">
        <button v-if="group.label === 'Recentes'" :ref="setRecentToggle" type="button" class="recent-toggle" :aria-expanded="recentOpen" aria-controls="lia-recent-conversations" @click="recentOpen = !recentOpen"><span>Recentes</span><ChevronDown :size="14" :class="{ rotated: !recentOpen }" /></button>
        <h3 v-else-if="group.items.length">{{ group.label }}</h3>
        <div v-show="group.label !== 'Recentes' || recentOpen" :id="group.label === 'Recentes' ? 'lia-recent-conversations' : undefined">
          <article v-for="conversation in group.items" :key="conversation.id" class="history-item" :class="{ selected: store.activeConversationId === conversation.id }">
            <button type="button" class="history-select" :title="conversation.title || 'Nova conversa'" :aria-current="store.activeConversationId === conversation.id ? 'true' : undefined" @click="emit('select', conversation.id)"><span>{{ conversation.title || 'Nova conversa' }}</span><Pin v-if="conversation.pinnedAt" :size="12" aria-label="Fixada" /></button>
            <button type="button" class="conversation-options" :aria-label="`Opções da conversa ${conversation.title || ''}`" aria-haspopup="menu" :aria-expanded="menu?.conversation.id === conversation.id" :disabled="busy" @click="openMenu(conversation, $event)"><MoreHorizontal :size="18" /></button>
          </article>
          <div v-if="group.label === 'Recentes' && !store.conversations.length && !store.isLoading" class="history-empty"><p>Sua primeira conversa começa aqui</p><button type="button" @click="emit('new')">Conversar com a Lia</button></div>
        </div>
      </section>
      <button v-if="store.nextCursor" type="button" class="load-more" :disabled="store.isLoadingMore" @click="store.loadMore()">{{ store.isLoadingMore ? 'Carregando…' : 'Carregar mais conversas' }}</button>
    </div>
    <p class="history-note">Somente você vê suas conversas.</p>
    <LiaConversationMenu v-if="menu" :key="menu.conversation.id" :anchor="menu.anchor" :pinned="!!menu.conversation.pinnedAt" @close="menu = null" @rename="rename" @pin="pin" @delete="askDelete" />
    <LiaRenameDialog v-if="renaming" :conversation="renaming" @close="renaming = null" />
    <LiaConfirmDialog v-if="pendingDelete" :title="pendingDelete.title" :busy="busy" :error="error" @cancel="pendingDelete = null; error = ''" @confirm="remove" />
  </aside>
</template>
<style scoped>
.lia-history { display: flex; flex-direction: column; flex: 1; min-width: 0; min-height: 0; height: 100%; box-sizing: border-box; padding: 8px 12px 16px; border-right: 1px solid var(--lia-line); color: var(--lia-text); background: var(--lia-bg); }.sidebar { flex: 0 0 250px; width: 250px; }button { cursor: pointer; font: inherit; }.sidebar-heading { display: flex; align-items: center; justify-content: space-between; padding: 0 4px 12px 10px; color: var(--lia-muted); font-size: 12px; }.back-button { display: grid; place-items: center; width: 32px; height: 32px; border: 0; border-radius: 8px; background: transparent; color: inherit; }.history-shortcuts { display: grid; gap: 4px; margin-bottom: 24px; }.history-shortcuts button { display: flex; align-items: center; gap: 11px; min-height: 42px; padding: 10px; border: 0; border-radius: 10px; color: var(--lia-text); background: transparent; text-align: left; font-size: 12px; }.history-shortcuts button:hover,.back-button:hover { background: var(--lia-soft); }.history-shortcuts .new-conversation { background: var(--lia-soft); }
.history-scroll { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; }.history-group h3,.recent-toggle { margin: 0 0 8px; padding: 8px 10px; color: var(--lia-muted); font-size: 11px; font-weight: 500; }.recent-toggle { display: flex; align-items: center; justify-content: space-between; width: 100%; border: 0; border-radius: 8px; background: transparent; }.recent-toggle:hover { background: var(--lia-soft); }.recent-toggle svg { transition: transform .15s; }.rotated { transform: rotate(-90deg); }.history-item { display: flex; align-items: center; min-height: 39px; margin: 3px 0; border-radius: 9px; }.history-item:hover { background: var(--lia-soft); }.history-item.selected { background: var(--lia-tint); }.history-select { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; padding: 11px 10px; border: 0; text-align: left; background: transparent; color: var(--lia-text); font-size: 12px; }.history-select>span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.history-select svg { flex-shrink: 0; color: var(--lia-muted); }.conversation-options { display: grid; place-items: center; flex: 0 0 28px; width: 28px; height: 30px; margin-right: 3px; padding: 0; border: 0; border-radius: 8px; color: var(--lia-muted); background: transparent; opacity: 0; }.history-item:hover .conversation-options,.conversation-options:focus-visible,.conversation-options[aria-expanded=true] { opacity: 1; }.conversation-options:hover { color: var(--lia-text); background: var(--lia-bg); }@media(hover:none) { .conversation-options { opacity: 1; } }
.history-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 28px 10px; text-align: center; font-size: 12px; color: var(--lia-muted); }.history-empty button { border: 0; color: var(--lia-blue); background: transparent; font-size: 12px; }.history-note { margin: 0; padding-top: 18px; text-align: center; color: var(--lia-muted); font-size: 10px; }.history-error { padding: 0 8px; color: #c43d51; font-size: 12px; }.load-more { display: block; margin: 16px auto; padding: 8px 10px; border: 1px solid var(--lia-line); border-radius: 9px; color: var(--lia-muted); background: var(--lia-bg); font-size: 11px; }button:disabled { opacity: .5; cursor: default; }button:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 2px; }.spin { animation: spin 1s linear infinite; }@keyframes spin { to { transform: rotate(360deg); } }@media(prefers-reduced-motion: reduce) { .spin { animation: none; }.recent-toggle svg { transition: none; } }
</style>
