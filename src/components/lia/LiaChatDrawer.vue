<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpRight, CalendarDays, Check, Clock3, Copy, History, Maximize2, Minimize2, Plus, RotateCcw, ShieldCheck, Users, Wallet, X } from 'lucide-vue-next'
import { useMediaQuery } from '@vueuse/core'
import { renderLiaMarkdown as renderMarkdown } from '@/utils/liaMarkdown'
import StyledSelect from '@/components/global/StyledSelect.vue'
import LiaChatShell from './LiaChatShell.vue'
import LiaAvatar from './LiaAvatar.vue'
import LiaConversationHistory from './LiaConversationHistory.vue'
import LiaActionConfirmationCard from './LiaActionConfirmationCard.vue'
import LiaAnalyticsCard from './LiaAnalyticsCard.vue'
import LiaResponseFeedback from './LiaResponseFeedback.vue'
import { useAuthStore } from '@/stores/auth'
import { useLiaStore } from '@/stores/lia'
import { useLiaPageContext } from '@/composables/useLiaPageContext'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])
const authStore = useAuthStore()
const liaStore = useLiaStore()
const pageContext = useLiaPageContext()
const input = ref('')
const textarea = ref(null)
const messageList = ref(null)
const showHistory = ref(false)
const expanded = ref(false)
const mobile = useMediaQuery('(max-width: 760px)')
const historySidebar = computed(() => expanded.value && !mobile.value)
const chatVisible = computed(() => historySidebar.value || !showHistory.value)
const nearBottom = ref(true)
const copiedId = ref(null)
const copyError = ref('')
const openedAt = ref(Date.now())
const canSend = computed(() => input.value.trim().length > 0 && !liaStore.isSending && liaStore.isAvailable)
const firstName = computed(() => authStore.user?.name?.trim().split(/\s+/)[0] || '')
const greeting = computed(() => {
  const hour = Number(new Intl.DateTimeFormat('pt-BR', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' }).format(new Date(openedAt.value)))
  return `${hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'}${firstName.value ? `, ${firstName.value}` : ''}`
})
const financialAccess = computed(() => {
  const user = authStore.user
  return Array.isArray(user?.permissions) ? user.permissions.includes('*') || user.permissions.includes('financial.read') : ['owner', 'gerente'].includes(user?.role)
})
const suggestions = computed(() => [
  { title: 'Organizar meu dia', description: 'Veja os próximos atendimentos', prompt: 'Como está minha agenda hoje?', icon: CalendarDays },
  { title: 'Encontrar retornos', description: 'Pacientes que podem voltar', prompt: 'Quais pacientes fizeram Botox há mais de quatro meses?', icon: RotateCcw },
  { title: financialAccess.value ? 'Explorar resultados' : 'Conhecer minha clínica', description: financialAccess.value ? 'Entenda os números da clínica' : 'Consulte os dados dos pacientes', prompt: financialAccess.value ? 'Quais são os 10 pacientes que mais gastaram na clínica em todo o histórico?' : 'Quantos pacientes estão cadastrados na minha clínica?', icon: financialAccess.value ? Wallet : Users },
  { title: 'Encontrar um horário', description: 'Consulte a disponibilidade', prompt: 'Quais horários estão disponíveis para atendimento amanhã?', icon: Clock3 },
])
const patientOptions = message => (message.metadata?.patientOptions || []).map(patient => ({ value: patient.id, label: `${patient.name}${patient.phone ? ` · ${patient.phone}` : ''}` }))
const messageConfirmations = message => message.metadata?.confirmations?.length ? message.metadata.confirmations : message.metadata?.confirmation ? [message.metadata.confirmation] : []
const messageTime = value => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : ''
async function scrollToLatest(force = false) {
  await nextTick()
  if (messageList.value && (force || nearBottom.value)) messageList.value.scrollTop = messageList.value.scrollHeight
}
function onScroll() {
  const el = messageList.value
  if (el) nearBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 80
}
async function resizeInput() {
  await nextTick()
  if (!textarea.value) return
  textarea.value.style.height = 'auto'
  textarea.value.style.height = `${Math.min(textarea.value.scrollHeight, 132)}px`
}
async function loadOlder() {
  const element = messageList.value
  const height = element?.scrollHeight || 0
  const top = element?.scrollTop || 0
  nearBottom.value = false
  await liaStore.loadOlderMessages()
  await nextTick()
  if (element) element.scrollTop = top + element.scrollHeight - height
}
async function useSuggestion(suggestion) { input.value = suggestion.prompt; await resizeInput(); textarea.value?.focus() }
async function submit(value = input.value, options = {}) {
  const message = value.trim()
  if (!message || liaStore.isSending || !liaStore.isAvailable) return
  input.value = ''; nearBottom.value = true
  await resizeInput()
  const pending = liaStore.sendMessage(message, { ...options, ...(pageContext.value ? { pageContext: pageContext.value } : {}) })
  await scrollToLatest(true)
  try { await pending } catch { /* Failed messages keep a retry action. */ }
  await scrollToLatest(); textarea.value?.focus()
}
function onEnter(event) {
  if (event.isComposing || event.keyCode === 229 || event.shiftKey) return
  event.preventDefault(); void submit()
}
async function choosePatient(message, patientId) {
  if (!patientId || liaStore.isSending || message.selectedPatientId) return
  const patient = message.metadata?.patientOptions?.find(item => item.id === patientId)
  if (!patient) return
  message.selectedPatientId = patientId
  await submit(`Quero o paciente ${patient.name}.`, { selectedPatientId: patientId })
}
async function chooseAlternativeTime(message, value) {
  const alternatives = message.metadata?.availabilityAlternatives
  const time = typeof value === 'string' ? value : value.time
  const date = typeof value === 'string' ? alternatives?.date : value.date
  if (!date || !time) return
  await submit(`Pode ser em ${date} às ${time}.`, { ...(alternatives.patientId ? { selectedPatientId: alternatives.patientId } : {}), selectedAlternative: { date, time, professionalId: alternatives.professionalId, durationMinutes: alternatives.durationMinutes } })
}
const alternativeLabel = value => typeof value === 'string' ? value : `${value.date.split('-').reverse().join('/')} às ${value.time}`
async function retryMessage(message) { try { await liaStore.retryMessage(message, { ...(pageContext.value ? { pageContext: pageContext.value } : {}) }) } catch { /* Store preserves retry state. */ } }
async function selectConversation(id) {
  if (id !== liaStore.activeConversationId) input.value = ''
  showHistory.value = false; nearBottom.value = true; copyError.value = ''
  try { await liaStore.selectConversation(id) } catch { /* Store presents the error. */ }
  await scrollToLatest(true)
}
async function newConversation() {
  liaStore.startNewConversation(); showHistory.value = false; input.value = ''; copiedId.value = null; copyError.value = ''
  await nextTick(); textarea.value?.focus()
}
async function copyMessage(message) {
  try { await navigator.clipboard.writeText(message.content); copiedId.value = message.id; copyError.value = '' }
  catch { copyError.value = 'Não foi possível copiar. Selecione o texto da resposta para copiá-lo.' }
}
watch(input, resizeInput)
watch(() => props.open, async open => { if (open) { openedAt.value = Date.now(); await liaStore.initialize(); await scrollToLatest(true) } }, { immediate: true })
watch(() => liaStore.messages.length, () => scrollToLatest())
watch(() => liaStore.streamText, () => scrollToLatest())
watch(chatVisible, () => { resizeInput(); scrollToLatest() })
watch(expanded, () => { resizeInput(); scrollToLatest() })
watch(() => [props.open, liaStore.messages.some(message => messageConfirmations(message).some(card => card.status === 'processing'))], ([open, processing], _previous, onCleanup) => {
  if (!open || !processing) return
  const timer = setInterval(() => { if (!liaStore.isSending) void liaStore.loadMessages().catch(() => {}) }, 5000)
  onCleanup(() => clearInterval(timer))
}, { immediate: true })
</script>

<template>
  <LiaChatShell :open="open" :expanded="expanded" @close="emit('close')">
    <header class="lia-header">
      <div class="lia-identity"><LiaAvatar class="header-character" :active="open" :thinking="liaStore.isSending" /><div><h1>Lia <span>Agenda Doutor</span></h1><p><i :class="{ thinking: liaStore.isSending }"></i>{{ liaStore.isSending ? 'Preparando uma resposta' : 'Um cuidado a mais com sua rotina' }}</p></div></div>
      <nav class="header-actions" aria-label="Controles da Lia">
        <button type="button" aria-label="Nova conversa" title="Nova conversa" @click="newConversation"><Plus :size="18" /></button>
        <button v-if="!historySidebar" type="button" aria-label="Histórico de conversas" title="Histórico de conversas" :aria-pressed="showHistory" @click="showHistory = !showHistory"><History :size="17" /></button>
        <button type="button" :aria-label="expanded ? 'Recolher conversa' : 'Expandir conversa'" :title="expanded ? 'Recolher' : 'Expandir'" :aria-pressed="expanded" @click="expanded = !expanded"><Minimize2 v-if="expanded" :size="16" /><Maximize2 v-else :size="16" /></button>
        <button type="button" aria-label="Fechar Lia" title="Fechar Lia" @click="emit('close')"><X :size="18" /></button>
      </nav>
    </header>
    <div class="lia-body" :class="{ 'with-sidebar': historySidebar }">
      <LiaConversationHistory v-if="historySidebar || showHistory" :sidebar="historySidebar" @new="newConversation" @select="selectConversation" @back="showHistory = false" />
      <main v-show="chatVisible" class="lia-chat" :class="{ 'is-welcome': !liaStore.messages.length }">
        <div v-if="pageContext" class="page-context"><span></span> Ficha do paciente em contexto</div>
        <div v-if="liaStore.error" class="chat-error" role="alert"><span>{{ liaStore.error }}</span><button type="button" aria-label="Tentar carregar a Lia novamente" @click="liaStore.initialize()"><RotateCcw :size="14" /></button></div>
        <div ref="messageList" class="messages clarity-mask" data-clarity-mask="true" data-sentry-mask :aria-busy="liaStore.isLoading" @scroll.passive="onScroll">
          <button v-if="liaStore.messagesCursor" type="button" class="load-more" :disabled="liaStore.isLoading" @click="loadOlder">Carregar mensagens anteriores</button>
          <div v-if="liaStore.isLoading && !liaStore.messages.length" class="loading-conversation" role="status"><span class="loading-dot"></span> Abrindo sua conversa…</div>
          <section v-else-if="!liaStore.messages.length" class="welcome" aria-label="Começar uma conversa">
            <div class="welcome-art"><LiaAvatar class="welcome-character" intro :active="open && chatVisible" /></div>
            <p class="greeting">{{ greeting }}</p><h2>O que vamos<br /><span>cuidar hoje?</span></h2>
            <p class="welcome-description">Sua agenda, seus pacientes e os números<br /> da clínica. Vamos por partes.</p>
            <div class="suggestions"><button v-for="suggestion in suggestions" :key="suggestion.title" type="button" :disabled="liaStore.isSending" @click="useSuggestion(suggestion)"><span class="suggestion-icon"><component :is="suggestion.icon" :size="17" /></span><span><strong>{{ suggestion.title }}</strong><small>{{ suggestion.description }}</small></span><ArrowUpRight :size="14" class="suggestion-arrow" /></button></div>
          </section>
          <div v-else class="conversation" role="log" aria-label="Mensagens da conversa" aria-live="polite" aria-relevant="additions">
            <article v-for="message in liaStore.messages" :key="message.id" class="message" :class="message.role">
              <div class="message-label"><LiaAvatar v-if="message.role === 'assistant'" class="message-character" :active="false" /><span>{{ message.role === 'user' ? 'Você' : 'Lia' }}</span><time v-if="messageTime(message.createdAt)">{{ messageTime(message.createdAt) }}</time></div>
              <div class="message-content"><div class="markdown" v-html="renderMarkdown(message.content)"></div></div>
              <p v-if="message.status === 'failed'" class="message-failed" role="alert">{{ message.error }} <button type="button" :disabled="liaStore.isSending" @click="retryMessage(message)"><RotateCcw :size="12" /> Tentar novamente</button></p>
              <LiaActionConfirmationCard v-for="confirmation in messageConfirmations(message)" :key="confirmation.id" :confirmation="confirmation" :disabled="liaStore.isSending" @confirm="liaStore.confirmAction(message, confirmation)" @cancel="liaStore.cancelAction(message, confirmation)" />
              <LiaAnalyticsCard v-for="(card, index) in message.metadata?.analyticsCards || []" :key="`analytics-${index}`" :card="card" />
              <div v-if="message.role === 'assistant' && message.metadata?.patientOptions?.length > 1" class="patient-picker" :class="{ 'is-selected': liaStore.isSending || !!message.selectedPatientId }"><StyledSelect :model-value="message.selectedPatientId || ''" :options="patientOptions(message)" label="Quem é o paciente?" required placeholder="Selecione um paciente" @update:model-value="choosePatient(message, $event)" /></div>
              <section v-if="message.role === 'assistant' && message.metadata?.availabilityAlternatives?.times?.length" class="time-alternatives"><h3><Clock3 :size="14" /> Horários disponíveis</h3><div><button v-for="time in message.metadata.availabilityAlternatives.times" :key="typeof time === 'string' ? time : time.startAt" type="button" :disabled="liaStore.isSending" @click="chooseAlternativeTime(message, time)">{{ alternativeLabel(time) }}</button></div></section>
              <LiaResponseFeedback v-if="message.role === 'assistant' && message.content" :message="message" :conversation-id="liaStore.activeConversationId"><button type="button" class="copy-message" :aria-label="copiedId === message.id ? 'Resposta copiada' : 'Copiar resposta'" @click="copyMessage(message)"><Check v-if="copiedId === message.id" :size="12" /><Copy v-else :size="12" />{{ copiedId === message.id ? 'Copiado' : 'Copiar' }}</button></LiaResponseFeedback>
            </article>
          </div>
          <article v-if="liaStore.isSending && liaStore.streamText" class="streamed-answer" aria-label="Resposta em andamento" aria-busy="true"><div class="message-label"><LiaAvatar class="message-character" :active="false" /><span>Lia</span></div><div class="message-content"><div class="markdown" v-html="renderMarkdown(liaStore.streamText)"></div></div></article>
          <div v-if="liaStore.isSending && liaStore.streamStatus?.phase !== 'done'" class="lia-activity" role="status" aria-live="polite"><LiaAvatar class="thinking-character" thinking :active="open" /><div><strong>{{ liaStore.streamText ? 'Respondendo' : 'Um instante' }}</strong><span>{{ liaStore.streamStatus?.label || 'Preparando a resposta' }}</span></div></div>
          <p v-if="copyError" role="status" class="copy-error">{{ copyError }}</p>
        </div>
        <button v-if="!nearBottom && liaStore.messages.length" type="button" class="scroll-latest" aria-label="Ir para a última mensagem" @click="nearBottom = true; scrollToLatest(true)"><ArrowDown :size="15" /> Últimas mensagens</button>
        <footer class="lia-footer">
          <div v-if="liaStore.messages.length && !liaStore.isSending" class="followups"><button type="button" @click="useSuggestion(suggestions[0])">Minha agenda</button><button type="button" @click="useSuggestion(suggestions[1])">Retornos de pacientes</button><button type="button" @click="newConversation">Outro assunto <Plus :size="12" /></button></div>
          <form class="composer" @submit.prevent="submit()"><label for="lia-message" class="sr-only">Mensagem para a Lia</label><textarea id="lia-message" ref="textarea" v-model="input" data-clarity-mask="true" data-sentry-mask :disabled="liaStore.isSending" maxlength="4000" rows="1" placeholder="Lia, me ajuda com…" @keydown.enter="onEnter"></textarea><div class="composer-bottom"><span><span class="composer-dot"></span> {{ liaStore.isSending ? 'Lia está pensando' : 'Vamos conversar' }}</span><small v-if="input.length > 3600">{{ input.length }}/4000</small><button type="submit" :disabled="!canSend" aria-label="Enviar mensagem"><ArrowUp :size="19" :stroke-width="2.3" /></button></div></form>
          <div class="footer-note"><ShieldCheck :size="11" /><span>Confira as informações. A Lia pode cometer erros.</span></div>
        </footer>
      </main>
    </div>
  </LiaChatShell>
</template>

<style scoped src="./liaChat.css"></style>
