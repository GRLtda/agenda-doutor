<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowUpRight, History, LoaderCircle, MessageSquare, Plus, Search, Trash2, X } from 'lucide-vue-next'
import { useLiaStore } from '@/stores/lia'

defineProps({ sidebar: Boolean })
const emit = defineEmits(['new', 'select', 'back'])
const store = useLiaStore()
const search = ref('')
const deleting = ref(null)
const pendingDelete = ref(null)
const error = ref('')
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR')
const groups = computed(() => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1)
  const week = new Date(today); week.setDate(week.getDate() - 7)
  const result = [{ label: 'Hoje', items: [] }, { label: 'Ontem', items: [] }, { label: 'Últimos 7 dias', items: [] }, { label: 'Anteriores', items: [] }]
  const query = normalize(search.value.trim())
  for (const item of store.conversations) {
    if (query && !normalize(item.title + ' ' + (item.lastMessagePreview || '')).includes(query)) continue
    const date = new Date(item.updatedAt)
    result[date >= today ? 0 : date >= yesterday ? 1 : date >= week ? 2 : 3].items.push(item)
  }
  return result.filter(group => group.items.length)
})
async function remove(conversation) {
  deleting.value = conversation.id; error.value = ''
  try { await store.deleteConversation(conversation.id); pendingDelete.value = null }
  catch { error.value = 'Não foi possível excluir a conversa. Tente novamente.' }
  finally { deleting.value = null }
}
</script>

<template>
  <aside class="lia-history clarity-mask" :class="{ sidebar }" aria-label="Histórico de conversas" data-clarity-mask="true" data-sentry-mask>
    <header class="history-heading">
      <button v-if="!sidebar" type="button" class="back-button" aria-label="Voltar para a conversa" @click="emit('back')"><ArrowLeft :size="17" /></button>
      <div><h2>Suas conversas</h2><p>Retome de onde parou.</p></div>
      <History v-if="sidebar" :size="17" />
    </header>
    <button type="button" class="new-conversation" @click="emit('new')"><Plus :size="17" /> Nova conversa <ArrowUpRight :size="16" /></button>
    <label v-if="store.conversations.length" class="history-search"><Search :size="15" /><input v-model="search" aria-label="Buscar conversas" placeholder="Buscar conversas" /><button v-if="search" type="button" aria-label="Limpar busca" @click="search = ''"><X :size="13" /></button></label>
    <p v-if="error" role="alert" class="history-error">{{ error }}</p>
    <div class="history-scroll">
      <div v-if="store.isLoading && !store.conversations.length" class="history-empty" role="status"><LoaderCircle :size="22" class="spin" /><p>Carregando suas conversas…</p></div>
      <template v-else-if="groups.length">
        <section v-for="group in groups" :key="group.label" class="history-group">
          <h3>{{ group.label }}</h3>
          <article v-for="conversation in group.items" :key="conversation.id" class="history-item" :class="{ selected: store.activeConversationId === conversation.id }">
            <div class="history-row">
              <button type="button" class="history-select" :aria-current="store.activeConversationId === conversation.id ? 'true' : undefined" @click="emit('select', conversation.id)"><MessageSquare :size="16" /><span><strong>{{ conversation.title || 'Nova conversa' }}</strong><small>{{ conversation.lastMessagePreview || 'Conversa iniciada' }}</small></span></button>
              <button type="button" class="delete-button" :aria-label="`Excluir conversa ${conversation.title || ''}`" :disabled="!!deleting" @click="pendingDelete = pendingDelete === conversation.id ? null : conversation.id"><Trash2 :size="14" /></button>
            </div>
            <div v-if="pendingDelete === conversation.id" class="delete-confirmation"><p>Excluir esta conversa?</p><div><button type="button" :disabled="!!deleting" @click="pendingDelete = null">Manter</button><button type="button" class="destructive" :disabled="!!deleting" @click="remove(conversation)">{{ deleting === conversation.id ? 'Excluindo…' : 'Excluir' }}</button></div></div>
          </article>
        </section>
      </template>
      <div v-else class="history-empty"><span class="empty-icon"><MessageSquare :size="25" /></span><h3>{{ search ? 'Nenhuma conversa encontrada' : 'Sua primeira conversa começa aqui' }}</h3><p>{{ search ? 'Tente outro termo ou carregue mais conversas.' : 'Pergunte sobre sua agenda, encontre pacientes ou explore os números da clínica.' }}</p><button v-if="!search" type="button" @click="emit('new')">Conversar com a Lia <ArrowUpRight :size="15" /></button><button v-else type="button" @click="search = ''">Limpar busca</button></div>
      <button v-if="store.nextCursor" type="button" class="load-more" :disabled="store.isLoadingMore" @click="store.loadMore()">{{ store.isLoadingMore ? 'Carregando…' : 'Carregar mais conversas' }}</button>
    </div>
    <p class="history-note">Somente você vê suas conversas.</p>
  </aside>
</template>

<style scoped>
.lia-history { display: flex; flex-direction: column; min-width: 0; min-height: 0; height: 100%; padding: 24px; color: var(--lia-text); background: var(--lia-bg); }
.sidebar { width: 260px; flex: 0 0 260px; padding: 22px 16px 16px; border-right: 1px solid var(--lia-line); background: color-mix(in srgb, var(--lia-soft) 65%, var(--lia-bg)); }
.history-heading { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; }.history-heading>svg { margin-left: auto; color: var(--lia-muted); }.history-heading h2 { margin: 0; font-size: 16px; font-weight: 650; letter-spacing: -.3px; }.history-heading p { margin: 4px 0 0; color: var(--lia-muted); font-size: 12px; }
button,input { font: inherit; }button { cursor: pointer; }.back-button,.delete-button,.history-search button { display: grid; place-items: center; flex: 0 0 auto; border: 0; background: transparent; color: var(--lia-muted); }.back-button { width: 30px; height: 34px; border-radius: 9px; }.back-button:hover { background: var(--lia-soft); }
.new-conversation { display: flex; align-items: center; gap: 8px; min-height: 42px; width: 100%; padding: 10px 12px; border: 1px solid color-mix(in srgb, var(--lia-blue) 18%, var(--lia-line)); border-radius: 12px; background: var(--lia-tint); color: var(--lia-blue); font-size: 12px; font-weight: 650; }.new-conversation>svg:last-child { margin-left: auto; }.new-conversation:hover { background: color-mix(in srgb, var(--lia-blue) 12%, var(--lia-surface)); }
.history-search { display: flex; align-items: center; gap: 7px; margin: 16px 0 6px; padding: 9px 10px; border: 1px solid var(--lia-line); border-radius: 10px; color: var(--lia-muted); background: var(--lia-bg); }.history-search:focus-within { border-color: var(--lia-blue); }.history-search input { width: 100%; min-width: 0; padding: 0; border: 0; outline: none; background: transparent; color: var(--lia-text); font-size: 12px; }
.history-scroll { flex: 1; min-height: 0; overflow-y: auto; scrollbar-width: thin; }.history-group h3 { margin: 22px 10px 7px; color: var(--lia-muted); font-size: 10px; letter-spacing: .07em; text-transform: uppercase; font-weight: 600; }.history-item { margin: 3px 0; border: 1px solid transparent; border-radius: 11px; }.history-item:hover { background: var(--lia-soft); }.history-item.selected { border-color: color-mix(in srgb, var(--lia-blue) 12%, transparent); background: var(--lia-tint); }.history-row { display: flex; align-items: center; }.history-select { display: flex; align-items: flex-start; gap: 9px; flex: 1; min-width: 0; padding: 11px 9px; border: 0; text-align: left; background: transparent; color: var(--lia-muted); }.history-select>svg { margin-top: 2px; flex-shrink: 0; }.history-select>span { min-width: 0; }.history-select strong,.history-select small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.history-select strong { color: var(--lia-text); font-size: 12px; font-weight: 550; }.history-select small { margin-top: 4px; font-size: 11px; color: var(--lia-muted); }.delete-button { width: 28px; height: 30px; border-radius: 8px; margin-right: 4px; }.delete-button:hover { color: #dc4d62; background: #dc4d6210; }
.delete-confirmation { padding: 0 9px 10px; }.delete-confirmation p { margin: 0 0 7px; font-size: 11px; }.delete-confirmation>div { display: flex; gap: 7px; }.delete-confirmation button { border: 1px solid var(--lia-line); border-radius: 7px; padding: 5px 9px; font-size: 11px; color: var(--lia-text); background: var(--lia-bg); }.delete-confirmation .destructive { color: #c43d51; border-color: #c43d5140; background: #c43d5110; }
.history-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 250px; height: 100%; padding: 24px 8px; text-align: center; }.empty-icon { display: grid; place-items: center; width: 56px; height: 56px; border: 1px solid var(--lia-line); border-radius: 18px; color: var(--lia-blue); background: var(--lia-surface); box-shadow: 0 6px 20px #14233d05; }.history-empty h3 { margin: 17px 0 8px; font-size: 15px; font-weight: 600; line-height: 1.45; }.history-empty p { max-width: 270px; margin: 0; color: var(--lia-muted); font-size: 12px; line-height: 1.7; }.history-empty button { display: flex; align-items: center; gap: 6px; margin-top: 20px; border: 0; background: transparent; color: var(--lia-blue); font-size: 12px; font-weight: 600; }.sidebar .history-empty { padding: 24px 6px; }.sidebar .history-empty h3 { font-size: 13px; }.sidebar .history-empty p { font-size: 11px; }.history-note { margin: 18px 0 0; text-align: center; color: var(--lia-muted); font-size: 10px; }.history-error { color: #bd4354; font-size: 12px; }.load-more { display: block; margin: 16px auto; padding: 8px 12px; border: 1px solid var(--lia-line); border-radius: 9px; color: var(--lia-muted); background: var(--lia-surface); font-size: 11px; }button:disabled { opacity: .5; cursor: default; }button:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 2px; }.spin { animation: spin 1s linear infinite; }@keyframes spin { to { transform: rotate(360deg); } }@media(prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
