<script setup>
import { computed, inject, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ArrowDown, ArrowUpRight, CalendarDays, Check, Clock3, Copy, Maximize2, Minimize2, PanelLeftOpen, RotateCcw, ShieldCheck, Users, Wallet, X } from 'lucide-vue-next'
import { routerKey } from 'vue-router'
import { useMediaQuery } from '@vueuse/core'
import { renderLiaMarkdown as renderMarkdown } from '@/utils/liaMarkdown'
import StyledSelect from '@/components/global/StyledSelect.vue'
import LiaChatShell from './LiaChatShell.vue'
import LiaAvatar from './LiaAvatar.vue'
import LiaConversationHistory from './LiaConversationHistory.vue'
import LiaConversationSearch from './LiaConversationSearch.vue'
import LiaActionConfirmationCard from './LiaActionConfirmationCard.vue'
import LiaAnalyticsCard from './LiaAnalyticsCard.vue'
import LiaConversationSkeleton from './LiaConversationSkeleton.vue'
import LiaVoiceInput from './LiaVoiceInput.vue'
import LiaResponseFeedback from './LiaResponseFeedback.vue'
import { useAuthStore } from '@/stores/auth'
import { useLiaStore } from '@/stores/lia'
import { useLiaPageContext } from '@/composables/useLiaPageContext'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close'])
const authStore = useAuthStore()
const liaStore = useLiaStore()
const router = inject(routerKey, null)
const pageContext = useLiaPageContext()
const input = ref('')
const textarea = ref(null)
const messageList = ref(null)
const historyButton = ref(null)
const showHistory = ref(false)
const searchOpen = ref(false)
const voiceBusy = ref(false)
const voiceContext = computed(() => JSON.stringify([authStore.user?._id, authStore.user?.clinic, liaStore.activeConversationId]))
const expanded = ref(false)
const mobile = useMediaQuery('(max-width: 760px), (max-height: 500px) and (pointer: coarse)')
const historySidebar = computed(() => expanded.value && !mobile.value)
const chatVisible = computed(() => historySidebar.value || !showHistory.value)
const conversationTitle = computed(() => liaStore.conversations.find(item => item.id === liaStore.activeConversationId)?.title || '')
watch(expanded, value => { showHistory.value = value && !mobile.value })
const nearBottom = ref(true)
const copiedId = ref(null)
const copyError = ref('')
const openedAt = ref(Date.now())
const reaction = ref('attentive')
let reactionTimer
let previousActions = new Map()
const avatarState = computed(() => {
  if (liaStore.isSending) return liaStore.streamText || ['writing', 'done'].includes(liaStore.streamStatus?.phase) ? 'responding' : 'thinking'
  const last = liaStore.messages.at(-1)
  if (liaStore.error || last?.status === 'failed' || last && messageConfirmations(last).some(card => card.status === 'failed')) return 'error'
  return reaction.value
})
const canSend = computed(() => input.value.trim().length > 0 && !liaStore.isSending && !voiceBusy.value && !liaStore.isLoading && liaStore.isAvailable)
const followups = computed(() => {
  const last = liaStore.messages.at(-1)
  return last?.role === 'assistant' && Array.isArray(last.metadata?.suggestions) ? last.metadata.suggestions.slice(0, 2) : []
})
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
  { title: 'Agenda do dia', description: 'Atendimentos e horários de hoje', prompt: 'Como está minha agenda hoje?', icon: CalendarDays },
  { title: 'Acompanhar pacientes', description: 'Consulte o histórico de procedimentos', prompt: 'Quero um relatório de pacientes pelo último procedimento realizado. Me ajude a definir o procedimento e o período.', icon: Users },
  { title: financialAccess.value ? 'Resultados da clínica' : 'Movimento da clínica', description: financialAccess.value ? 'Recebimentos e valores a receber' : 'Atendimentos realizados no mês', prompt: financialAccess.value ? 'Faça um resumo dos recebimentos e do saldo a receber da clínica neste mês, explicando a diferença entre os valores.' : 'Quantos atendimentos foram realizados neste mês na clínica?', icon: financialAccess.value ? Wallet : CalendarDays },
  { title: 'Horários disponíveis', description: 'Encontre espaço na agenda', prompt: 'Quero encontrar um horário disponível para uma consulta. Quais informações você precisa?', icon: Clock3 },
])
const patientOptions = message => (message.metadata?.patientOptions || []).map(patient => ({ value: patient.id, label: `${patient.name}${patient.phone ? ` · ${patient.phone}` : ''}` }))
const messageConfirmations = message => message.metadata?.confirmations?.length ? message.metadata.confirmations : message.metadata?.confirmation ? [message.metadata.confirmation] : []
watch(() => liaStore.isSending, (sending, wasSending) => {
  clearTimeout(reactionTimer)
  reaction.value = 'attentive'
  if (sending) { previousActions = new Map(liaStore.messages.flatMap(messageConfirmations).map(card => [card.id, card.status])); return }
  if (!wasSending || !props.open || liaStore.error) return
  const changed = liaStore.messages.flatMap(messageConfirmations).filter(card => previousActions.get(card.id) !== card.status)
  if (changed.some(card => card.status === 'failed')) reaction.value = 'error'
  else if (changed.some(card => card.status === 'success')) reaction.value = 'success'
  else if (liaStore.messages.at(-1)?.metadata?.patientOptions?.length > 1) reaction.value = 'surprised'
  else if (liaStore.messages.at(-1)?.role === 'assistant') reaction.value = 'responding'
  reactionTimer = setTimeout(() => { reaction.value = 'attentive' }, reaction.value === 'success' ? 3200 : reaction.value === 'surprised' ? 2600 : 4200)
})
watch(() => props.open, open => { if (!open) { clearTimeout(reactionTimer); reaction.value = 'attentive'; searchOpen.value = false } })
onBeforeUnmount(() => clearTimeout(reactionTimer))
const messageTime = value => value && !Number.isNaN(new Date(value).getTime()) ? new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : ''
async function scrollToLatest(force = false) {
  await nextTick()
  if (messageList.value && (force || nearBottom.value)) messageList.value.scrollTop = messageList.value.scrollHeight
}
function keepComposerVisible() {
  if (nearBottom.value) void scrollToLatest(true)
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
async function onVoiceTranscript(text, options = {}) {
  input.value = text
  await resizeInput()
  if (options.send) await submit()
  else textarea.value?.focus()
}
async function openPatient(id) {
  if (!/^[a-f0-9]{24}$/i.test(id) || !router) return
  await router.push({ name: 'detalhes-paciente', params: { id } })
  expanded.value = false; showHistory.value = false
  if (mobile.value) emit('close')
}
async function submit(value = input.value, options = {}) {
  const message = value.trim()
  if (!message || liaStore.isSending || liaStore.isLoading || voiceBusy.value || !liaStore.isAvailable) return
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
  searchOpen.value = false
  if (id !== liaStore.activeConversationId) input.value = ''
  showHistory.value = false; nearBottom.value = true; copyError.value = ''
  try { await liaStore.selectConversation(id) } catch { /* Store presents the error. */ }
  await scrollToLatest(true)
  if (props.open) textarea.value?.focus()
}
async function closeHistory() { showHistory.value = false; await nextTick(); historyButton.value?.focus() }
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
  <LiaChatShell :open="open" :expanded="expanded" @close="emit('close')" @viewportchange="keepComposerVisible">
    <header class="lia-header">
      <div class="header-leading"><button ref="historyButton" type="button" class="open-history" :aria-label="showHistory ? 'Fechar histórico' : 'Abrir histórico'" title="Conversas" :aria-expanded="showHistory" @click="showHistory = !showHistory"><PanelLeftOpen :size="18" /></button><span class="conversation-title clarity-mask" data-clarity-mask="true" data-sentry-mask>{{ conversationTitle }}</span></div>
      <nav class="header-actions" aria-label="Controles da Lia">
        <button v-if="!mobile" type="button" class="view-mode" :aria-label="expanded ? 'Recolher conversa' : 'Expandir conversa'" :title="expanded ? 'Voltar à janela compacta' : 'Abrir em janela ampliada'" :aria-pressed="expanded" @click="expanded = !expanded"><Minimize2 v-if="expanded" :size="14" /><Maximize2 v-else :size="14" /><span>{{ expanded ? 'Reduzir' : 'Ampliar' }}</span></button>
        <button type="button" aria-label="Fechar Lia" title="Fechar Lia" @click="emit('close')"><X :size="18" /></button>
      </nav>
    </header>
    <div class="lia-body" :class="{ 'with-sidebar': historySidebar }">
      <LiaConversationHistory v-if="showHistory" :sidebar="historySidebar" @new="newConversation" @select="selectConversation" @back="closeHistory" @search="searchOpen = true" />
      <main v-show="chatVisible" class="lia-chat" :class="{ 'is-welcome': !liaStore.messages.length }">
        <div v-if="pageContext" class="page-context"><span></span> Ficha do paciente em contexto</div>
        <div v-if="liaStore.error" class="chat-error" role="alert"><span>{{ liaStore.error }}</span><button type="button" aria-label="Tentar carregar a Lia novamente" @click="liaStore.initialize()"><RotateCcw :size="14" /></button></div>
        <div ref="messageList" class="messages clarity-mask" data-clarity-mask="true" data-sentry-mask :aria-busy="liaStore.isLoading" @scroll.passive="onScroll">
          <button v-if="liaStore.messagesCursor" type="button" class="load-more" :disabled="liaStore.isLoading" @click="loadOlder">Carregar mensagens anteriores</button>
          <LiaConversationSkeleton v-if="liaStore.isLoading && !liaStore.messages.length" />
          <section v-else-if="!liaStore.messages.length" class="welcome" aria-label="Começar uma conversa">
            <div class="welcome-art"><LiaAvatar class="welcome-character" intro :state="avatarState" :active="open && chatVisible" /></div>
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
              <LiaAnalyticsCard v-for="(card, index) in message.metadata?.analyticsCards || []" :key="`analytics-${index}`" :card="card" :conversation-id="liaStore.activeConversationId" :load-page="liaStore.loadReportPage" @navigate="openPatient" />
              <div v-if="message.role === 'assistant' && message.metadata?.patientOptions?.length > 1" class="patient-picker" :class="{ 'is-selected': liaStore.isSending || !!message.selectedPatientId }"><StyledSelect :model-value="message.selectedPatientId || ''" :options="patientOptions(message)" label="Quem é o paciente?" required placeholder="Selecione um paciente" @update:model-value="choosePatient(message, $event)" /></div>
              <section v-if="message.role === 'assistant' && message.metadata?.availabilityAlternatives?.times?.length" class="time-alternatives"><h3><Clock3 :size="14" /> Horários disponíveis</h3><div><button v-for="time in message.metadata.availabilityAlternatives.times" :key="typeof time === 'string' ? time : time.startAt" type="button" :disabled="liaStore.isSending" @click="chooseAlternativeTime(message, time)">{{ alternativeLabel(time) }}</button></div></section>
              <LiaResponseFeedback v-if="message.role === 'assistant' && message.content" :message="message" :conversation-id="liaStore.activeConversationId"><button type="button" class="copy-message" :aria-label="copiedId === message.id ? 'Resposta copiada' : 'Copiar resposta'" @click="copyMessage(message)"><Check v-if="copiedId === message.id" :size="12" /><Copy v-else :size="12" />{{ copiedId === message.id ? 'Copiado' : 'Copiar' }}</button></LiaResponseFeedback>
            </article>
          </div>
          <article v-if="liaStore.isSending && liaStore.streamText" class="streamed-answer" aria-label="Resposta em andamento" aria-busy="true"><div class="message-label"><LiaAvatar class="message-character" :active="false" /><span>Lia</span></div><div class="message-content"><div class="markdown" v-html="renderMarkdown(liaStore.streamText)"></div></div></article>
          <div v-if="liaStore.isSending && liaStore.streamStatus?.phase !== 'done'" class="lia-activity" role="status" aria-live="polite"><LiaAvatar class="thinking-character" :state="avatarState" :active="open" /><div><strong>{{ liaStore.streamText ? 'Respondendo' : 'Um instante' }}</strong><span>{{ liaStore.streamStatus?.label || 'Preparando a resposta' }}</span></div></div>
          <p v-if="copyError" role="status" class="copy-error">{{ copyError }}</p>
        </div>
        <button v-if="!nearBottom && liaStore.messages.length" type="button" class="scroll-latest" aria-label="Ir para a última mensagem" @click="nearBottom = true; scrollToLatest(true)"><ArrowDown :size="15" /> Últimas mensagens</button>
        <footer class="lia-footer">
          <div v-if="followups.length && !liaStore.isSending && !liaStore.isLoading" class="followups" aria-label="Sugestões para continuar"><button v-for="suggestion in followups" :key="suggestion.prompt" type="button" :disabled="voiceBusy" @click="useSuggestion(suggestion)">{{ suggestion.label }}</button></div>
          <form class="composer" :class="{ 'is-voice': voiceBusy }" @submit.prevent="submit()">
            <label for="lia-message" class="sr-only">Mensagem para a Lia</label>
            <textarea id="lia-message" ref="textarea" v-model="input" v-show="!voiceBusy" data-clarity-mask="true" data-sentry-mask :disabled="liaStore.isSending || liaStore.isLoading || voiceBusy" maxlength="4000" rows="1" placeholder="Lia, me ajuda com…" @keydown.enter="onEnter"></textarea>
            <div class="composer-bottom">
              <LiaVoiceInput :active="open && chatVisible" :context-key="voiceContext" :can-send="canSend" :disabled="liaStore.isSending || liaStore.isLoading || !!input.trim()" @busy="voiceBusy = $event" @transcript="onVoiceTranscript" @submit="submit()">
                <span class="composer-hint"><span class="composer-dot"></span>{{ liaStore.isSending ? 'Lia está pensando' : 'Vamos conversar' }}</span>
                <small v-if="input.length > 3600" class="composer-count">{{ input.length }}/4000</small>
              </LiaVoiceInput>
            </div>
          </form>
          <div class="footer-note"><ShieldCheck :size="11" /><span>Confira as informações. A Lia pode cometer erros.</span></div>
        </footer>
      </main>
    </div>
    <LiaConversationSearch v-if="searchOpen" @close="searchOpen = false" @select="selectConversation" />
  </LiaChatShell>
</template>

<style scoped src="./liaChat.css"></style>

