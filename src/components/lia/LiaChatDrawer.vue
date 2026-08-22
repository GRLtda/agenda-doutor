<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { Bot, CalendarDays, Clock3, History, LoaderCircle, MoreHorizontal, Plus, Search, Send, Sparkles, Trash2, UserRound, X } from 'lucide-vue-next'
import { marked } from 'marked'
import SideDrawer from '@/components/global/SideDrawer.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import LiaActionConfirmationCard from '@/components/lia/LiaActionConfirmationCard.vue'
import LiaAnalyticsCard from '@/components/lia/LiaAnalyticsCard.vue'
import { useAuthStore } from '@/stores/auth'
import { useLiaStore } from '@/stores/lia'
import { useLiaPageContext } from '@/composables/useLiaPageContext'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])
const authStore = useAuthStore()
const liaStore = useLiaStore()
const pageContext = useLiaPageContext()
const input = ref('')
const messageList = ref(null)
const showHistory = ref(false)
const openMenuId = ref(null)
const suggestions = [{ label: 'Como está minha agenda hoje?', icon: CalendarDays }, { label: 'Buscar paciente', icon: Search }, { label: 'Agendar paciente', icon: Sparkles }, { label: 'Ver horários disponíveis', icon: Clock3 }]
const canSend = computed(() => input.value.trim().length > 0 && !liaStore.isSending)
const markdownRenderer = new marked.Renderer()
markdownRenderer.html = () => ''
markdownRenderer.image = ({ text }) => text
markdownRenderer.link = function ({ tokens }) { return this.parser.parseInline(tokens) }
const renderMarkdown = (content) => marked.parse(content || '', { async: false, breaks: true, gfm: true, renderer: markdownRenderer })
const scrollToLatest = async () => { await nextTick(); if (messageList.value) messageList.value.scrollTop = messageList.value.scrollHeight }
const patientOptions = (message) => (message.metadata?.patientOptions || []).map((patient) => ({ value: patient.id, label: `${patient.name}${patient.phone ? ` · ${patient.phone}` : ''}` }))
const messageConfirmations = (message) => message.metadata?.confirmations?.length ? message.metadata.confirmations : message.metadata?.confirmation ? [message.metadata.confirmation] : []

const groupedConversations = computed(() => {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
  const week = new Date(now); week.setDate(week.getDate() - 7)
  const month = new Date(now); month.setDate(month.getDate() - 30)
  const groups = [{ label: 'Hoje', items: [] }, { label: 'Ontem', items: [] }, { label: 'Últimos 7 dias', items: [] }, { label: 'Últimos 30 dias', items: [] }, { label: 'Mais antigas', items: [] }]
  liaStore.conversations.forEach((conversation) => {
    const date = new Date(conversation.updatedAt)
    ;(date >= now ? groups[0] : date >= yesterday ? groups[1] : date >= week ? groups[2] : date >= month ? groups[3] : groups[4]).items.push(conversation)
  })
  return groups.filter((group) => group.items.length)
})

const submit = async (value = input.value, options = {}) => {
  const message = value.trim()
  if (!message || liaStore.isSending) return
  input.value = ''
  try { await liaStore.sendMessage(message, { ...options, ...(pageContext.value ? { pageContext: pageContext.value } : {}) }) } catch { /* message remains visible with retry */ }
  await scrollToLatest()
}
const choosePatient = async (message, patientId) => {
  if (!patientId || liaStore.isSending || message.selectedPatientId) return
  const patient = message.metadata?.patientOptions?.find((item) => item.id === patientId)
  if (!patient) return
  message.selectedPatientId = patientId
  await submit(`Quero o paciente ${patient.name}.`, { selectedPatientId: patientId })
}
const chooseAlternativeTime = async (message, time) => {
  const alternatives = message.metadata?.availabilityAlternatives
  if (!alternatives?.date || !time) return
  await submit(`Pode ser às ${time}.`, { ...(alternatives.patientId ? { selectedPatientId: alternatives.patientId } : {}), selectedAlternative: { date: alternatives.date, time, professionalId: alternatives.professionalId, durationMinutes: alternatives.durationMinutes } })
}
const retryMessage = (message) => liaStore.retryMessage(message, { ...(pageContext.value ? { pageContext: pageContext.value } : {}) })
const selectConversation = async (id) => { showHistory.value = false; openMenuId.value = null; try { await liaStore.selectConversation(id) } catch {} await scrollToLatest() }
const newConversation = () => { liaStore.startNewConversation(); showHistory.value = false; openMenuId.value = null }
const removeConversation = async (conversation) => { openMenuId.value = null; if (!window.confirm(`Excluir a conversa “${conversation.title}”?`)) return; await liaStore.deleteConversation(conversation.id); showHistory.value = false }
watch(() => props.open, async (isOpen) => { if (!isOpen) return; await liaStore.initialize(); await scrollToLatest() }, { immediate: true })
watch(() => liaStore.messages.length, scrollToLatest)
</script>

<template>
  <SideDrawer v-if="open" size="md" @close="emit('close')">
    <template #header>
      <header class="lia-header">
        <div class="lia-avatar"><Bot :size="19" /></div>
        <div><h2>{{ showHistory ? 'Conversas' : 'Lia' }}</h2><p>{{ showHistory ? 'Seu histórico com a Lia' : 'Assistente do Agenda Doutor' }}</p></div>
        <div class="header-actions"><button type="button" title="Nova conversa" @click="newConversation"><Plus :size="18" /></button><button type="button" title="Histórico" @click="showHistory = !showHistory"><History :size="17" /></button><button class="mobile-close-btn" aria-label="Fechar Lia" @click="emit('close')"><X :size="20" /></button></div>
      </header>
    </template>

    <section v-if="showHistory" class="history-list">
      <div v-if="liaStore.isLoading && !liaStore.conversations.length" class="history-loading"><LoaderCircle :size="17" class="spin" /> Carregando conversas...</div>
      <template v-for="group in groupedConversations" :key="group.label"><h3>{{ group.label }}</h3><article v-for="conversation in group.items" :key="conversation.id" class="history-item" :class="{ active: liaStore.activeConversationId === conversation.id }"><button class="history-select" type="button" @click="selectConversation(conversation.id)"><strong>{{ conversation.title }}</strong><span>{{ conversation.lastMessagePreview || 'Sem mensagens' }}</span></button><button class="history-menu" type="button" aria-label="Opções" @click="openMenuId = openMenuId === conversation.id ? null : conversation.id"><MoreHorizontal :size="17" /></button><div v-if="openMenuId === conversation.id" class="history-menu-popover"><button type="button" @click="removeConversation(conversation)"><Trash2 :size="15" /> Excluir conversa</button></div></article></template>
      <button v-if="liaStore.nextCursor" class="load-more" type="button" :disabled="liaStore.isLoadingMore" @click="liaStore.loadMore()">{{ liaStore.isLoadingMore ? 'Carregando...' : 'Carregar mais' }}</button><p v-if="!liaStore.isLoading && !liaStore.conversations.length" class="history-empty">Nenhuma conversa anterior.</p>
    </section>

    <section v-else ref="messageList" class="messages" aria-live="polite">
      <div v-if="!liaStore.messages.length" class="welcome"><div class="welcome-mark"><Sparkles :size="21" /></div><h3>Olá, sou a Lia.</h3><p>Como posso ajudar hoje?</p><div class="suggestions"><button v-for="suggestion in suggestions" :key="suggestion.label" type="button" :disabled="liaStore.isSending" @click="submit(suggestion.label)"><component :is="suggestion.icon" :size="15" />{{ suggestion.label }}</button></div></div>
      <article v-for="message in liaStore.messages" :key="message.id" class="message" :class="message.role">
        <div class="message-icon"><img v-if="message.role === 'user' && authStore.user?.profilePhotoUrl" class="message-avatar" :src="authStore.user.profilePhotoUrl" alt="" /><UserRound v-else-if="message.role === 'user'" :size="14" /><Bot v-else :size="15" /></div>
        <div class="message-stack"><div class="message-content"><div class="markdown" v-html="renderMarkdown(message.content)"></div><p v-if="message.status === 'failed'" class="message-state failed-state">{{ message.error }} <button type="button" @click="retryMessage(message)">Tentar novamente</button></p>
          <LiaActionConfirmationCard v-for="confirmation in messageConfirmations(message)" :key="confirmation.id" :confirmation="confirmation" :disabled="liaStore.isSending" @confirm="liaStore.confirmAction(message, confirmation)" @cancel="liaStore.cancelAction(message, confirmation)" />
          <LiaAnalyticsCard v-for="(card, index) in message.metadata?.analyticsCards || []" :key="`analytics-${index}`" :card="card" />
          <div v-if="message.role === 'assistant' && message.metadata?.patientOptions?.length > 1" class="patient-picker" :class="{ 'is-selected': liaStore.isSending || !!message.selectedPatientId }"><StyledSelect :model-value="message.selectedPatientId || ''" :options="patientOptions(message)" label="Quem é o paciente?" required placeholder="Selecione" @update:model-value="choosePatient(message, $event)" /></div></div>
          <section v-if="message.role === 'assistant' && message.metadata?.availabilityAlternatives?.times?.length" class="time-alternatives"><div><Clock3 :size="15" /><strong>Horários disponíveis</strong></div><div class="time-options"><button v-for="time in message.metadata.availabilityAlternatives.times" :key="time" type="button" :disabled="liaStore.isSending" @click="chooseAlternativeTime(message, time)">{{ time }}</button></div></section>
        </div>
      </article>
      <div v-if="liaStore.isSending" class="lia-activity"><div class="message-icon"><Bot :size="15" /></div><div><LoaderCircle :size="15" class="spin" /> Lia está pensando...</div></div>
    </section>

    <template v-if="!showHistory" #footer><div class="lia-footer"><form class="composer" @submit.prevent="submit()"><textarea v-model="input" :disabled="liaStore.isSending" maxlength="4000" rows="1" placeholder="Pergunte alguma coisa para a Lia..." @keydown.enter.exact.prevent="submit()"></textarea><button type="submit" :disabled="!canSend" aria-label="Enviar mensagem"><Send :size="17" /></button></form><p class="privacy-note">A Lia pode cometer erros. Por isso, lembre-se de conferir informações relevantes.</p></div></template>
  </SideDrawer>
</template>

<style scoped>
.lia-header{display:flex;align-items:center;gap:.75rem;padding:1rem 1.25rem;border-bottom:1px solid #eef0f3}.lia-avatar,.welcome-mark,.message-icon{display:grid;place-items:center;flex:0 0 auto;border-radius:50%}.lia-avatar{width:35px;height:35px;color:#fff;background:var(--azul-principal,#2563eb);box-shadow:0 5px 12px rgba(37,99,235,.22)}.lia-header h2{margin:0;color:#172033;font-size:1rem;line-height:1.1}.lia-header p{margin:.18rem 0 0;color:#7b8495;font-size:.75rem}.header-actions{display:flex;align-items:center;gap:.15rem;margin-left:auto}.header-actions button{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:.5rem;color:#66738a;background:transparent;cursor:pointer}.header-actions button:hover{color:#2563eb;background:#f0f5ff}
.messages{display:flex;min-height:0;flex:1;flex-direction:column;gap:.9rem;overflow-y:auto;padding:.2rem 0 .8rem}.welcome{margin:auto 0;padding:1.4rem .2rem;text-align:center}.welcome-mark{width:42px;height:42px;margin:0 auto .8rem;color:#2563eb;background:#eef4ff}.welcome h3{margin:0;color:#1e293b;font-size:1.02rem}.welcome p{margin:.5rem auto 1.1rem;color:#687386;font-size:.84rem}.suggestions{display:flex;flex-direction:column;gap:.45rem;text-align:left}.suggestions button{display:flex;align-items:center;gap:.55rem;padding:.68rem .75rem;border:1px solid #e8ebef;border-radius:.65rem;color:#40506a;background:#fff;font:inherit;font-size:.8rem;cursor:pointer}.suggestions button:hover:not(:disabled){border-color:#c7d8f9;background:#f6f9ff}.suggestions button:disabled{opacity:.55}
.message{display:flex;align-items:flex-start;gap:.5rem;max-width:91%}.message-stack{min-width:0;max-width:100%}.message-content{padding:.65rem .75rem;border-radius:.2rem .78rem .78rem .78rem;color:#263247;background:#f3f5f8;font-size:.84rem;line-height:1.48;overflow-wrap:anywhere}.markdown :deep(p){margin:0}.markdown :deep(p+p){margin-top:.58rem}.markdown :deep(ul),.markdown :deep(ol){margin:.45rem 0 0;padding-left:1.15rem}.markdown :deep(li+li){margin-top:.18rem}.markdown :deep(strong){font-weight:700}.markdown :deep(code){padding:.08rem .25rem;border-radius:.25rem;color:#243a64;background:rgba(80,110,160,.1);font-size:.78rem}.message-icon{width:25px;height:25px;margin-top:.1rem;overflow:hidden;color:#637089;background:#edf0f5}.message-avatar{width:100%;height:100%;object-fit:cover}.message.user{align-self:flex-end;flex-direction:row-reverse}.message.user .message-content{border-radius:.78rem .2rem .78rem .78rem;color:#fff;background:var(--azul-principal,#2563eb)}.message.user .message-icon{color:#3566bf;background:#e7efff}.message-state{display:flex;align-items:center;gap:.3rem;margin:.38rem 0 0;font-size:.7rem;opacity:.78}.failed-state button{margin-left:.2rem;border:0;color:inherit;background:transparent;font:inherit;font-weight:700;text-decoration:underline;cursor:pointer}
.patient-picker{margin-top:.72rem;padding-top:.65rem;border-top:1px solid #dfe5ed}.patient-picker :deep(.form-group){margin:0}.patient-picker.is-selected :deep(.select-button){pointer-events:none;opacity:.7}.time-alternatives{margin-top:.42rem;padding:.05rem .1rem 0}.time-alternatives>div:first-child{display:flex;align-items:center;gap:.4rem;margin:0 0 .42rem;color:#526078;font-size:.75rem}.time-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.4rem}.time-options button{min-height:34px;border:1px solid #cdd9ee;border-radius:.5rem;color:#2563eb;background:#fff;font:inherit;font-size:.77rem;font-weight:700;cursor:pointer}.time-options button:hover:not(:disabled){border-color:#2563eb;background:#f1f6ff}.time-options button:disabled{opacity:.55}
.lia-footer{padding:0 1.25rem 1.1rem}.composer{display:flex;align-items:flex-end;gap:.55rem;border:1px solid #dfe4ea;border-radius:.75rem;padding:.38rem;background:#fff}.composer:focus-within{border-color:#9dbaf1;box-shadow:0 0 0 3px rgba(37,99,235,.09)}.composer textarea{flex:1;max-height:112px;resize:none;border:0;outline:0;padding:.45rem .5rem;color:#24324a;background:transparent;font:inherit;font-size:.84rem;line-height:1.4}.composer textarea::placeholder{color:#9aa3b1}.composer button{display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:.55rem;color:#fff;background:#2563eb;cursor:pointer}.composer button:disabled{opacity:.42;cursor:default}.privacy-note{margin:.55rem .15rem 0;color:#9aa3b1;font-size:.69rem;text-align:center}.spin{animation:spin 1s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}
.history-list{position:relative;display:flex;flex-direction:column;gap:.3rem}.new-conversation-btn{display:flex;align-items:center;justify-content:center;gap:.4rem;margin-bottom:.7rem;padding:.62rem;border:1px solid #cbdaf5;border-radius:.62rem;color:#2563eb;background:#f6f9ff;font:inherit;font-size:.8rem;font-weight:700;cursor:pointer}.history-list h3{margin:.65rem .1rem .2rem;color:#8a94a5;font-size:.69rem;font-weight:750;text-transform:uppercase;letter-spacing:.045em}.history-item{position:relative;display:flex;align-items:center;border-radius:.62rem}.history-item.active{background:#eef4ff}.history-select{min-width:0;flex:1;padding:.62rem .5rem;border:0;border-radius:.62rem;text-align:left;color:#2b3850;background:transparent;font:inherit;cursor:pointer}.history-select strong,.history-select span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.history-select strong{font-size:.8rem;font-weight:650}.history-select span{margin-top:.17rem;color:#8a94a5;font-size:.71rem}.history-menu{display:grid;place-items:center;width:30px;height:30px;margin-right:.25rem;border:0;border-radius:.45rem;color:#7c8798;background:transparent;cursor:pointer}.history-menu:hover{background:#e4eaf4}.history-menu-popover{position:absolute;z-index:2;right:.2rem;top:2.1rem;padding:.25rem;border:1px solid #e0e5ed;border-radius:.5rem;background:#fff;box-shadow:0 8px 20px rgba(37,49,70,.13)}.history-menu-popover button{display:flex;align-items:center;gap:.35rem;white-space:nowrap;padding:.45rem;border:0;border-radius:.35rem;color:#c23b3b;background:#fff;font:inherit;font-size:.73rem;cursor:pointer}.history-menu-popover button:hover{background:#fff2f2}.load-more{margin:.8rem auto 0;padding:.48rem .75rem;border:1px solid #d9e1ec;border-radius:.5rem;color:#526078;background:#fff;font:inherit;font-size:.76rem;cursor:pointer}.history-loading,.history-empty{margin:1.2rem 0;color:#7b8798;font-size:.8rem;text-align:center}.history-loading{display:flex;align-items:center;justify-content:center;gap:.4rem}
.lia-activity{display:flex;align-items:center;gap:.5rem;color:#738096;font-size:.77rem}.lia-activity>div:last-child{display:flex;align-items:center;gap:.38rem;padding:.45rem .6rem;border-radius:.65rem;background:#f3f5f8}
</style>
