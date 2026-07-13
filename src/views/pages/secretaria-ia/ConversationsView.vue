<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  CalendarDays,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  EyeOff,
  Filter,
  FolderOpen,
  MoreVertical,
  Paperclip,
  Send,
  Inbox,
  LoaderCircle,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Smile,
  Star,
  Tag,
  UserCheck,
  Wallet,
} from 'lucide-vue-next'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
import { useAiSecretaryStore } from '@/stores/aiSecretary'
import backgroundWhats from '@/assets/background_whats.svg'
import whatsappIcon from '@/assets/whatsapp.svg'

const store = useAiSecretaryStore()
const router = useRouter()

const statusFilter = ref('')
const searchTerm = ref('')
const activeTab = ref('all')
const selectedConversationId = ref(null)
const animatedConversationId = ref(null)
const isConversationLoading = ref(false)
const conversationRequestId = ref(0)
const composerMode = ref('reply')
const internalNote = ref('')
const replyMessage = ref('')
const messagesListRef = ref(null)
const tabsListRef = ref(null)
const isScheduleModalOpen = ref(false)
const canScrollTabsBack = ref(false)
const canScrollTabsForward = ref(false)

const counters = computed(() => store.counters)
const conversations = computed(() => store.conversations)
const selectedConversation = computed(() => store.selectedConversation)
const selectedMessages = computed(() => store.selectedMessages)
const composerMessage = computed({
  get() {
    return composerMode.value === 'internal' ? internalNote.value : replyMessage.value
  },
  set(value) {
    if (composerMode.value === 'internal') {
      internalNote.value = value
      return
    }
    replyMessage.value = value
  },
})
const composerPlaceholder = computed(() => (
  composerMode.value === 'internal'
    ? 'Nota interna. Nao sera enviada ao paciente.'
    : 'Digite uma mensagem...'
))
const tabCounters = computed(() => ({
  all: conversations.value.length,
  open: conversations.value.filter((conversation) => conversation.status === 'open').length,
  ai: conversations.value.filter((conversation) => conversation.conversationMode === 'ai' && !conversation.aiPaused).length,
  human: conversations.value.filter((conversation) => conversation.status === 'needs_human' || conversation.conversationMode === 'human').length,
  paused: conversations.value.filter((conversation) => conversation.aiPaused || conversation.conversationMode === 'paused').length,
}))
const conversationTabs = computed(() => [
  { key: 'all', label: 'Todas', count: tabCounters.value.all },
  { key: 'open', label: 'Abertas', count: tabCounters.value.open },
  { key: 'ai', label: 'IA', count: tabCounters.value.ai },
  { key: 'human', label: 'Humanas', count: tabCounters.value.human },
  { key: 'paused', label: 'Pausadas', count: tabCounters.value.paused },
])
const visibleConversations = computed(() => {
  const search = searchTerm.value.trim().toLowerCase()

  return conversations.value
    .filter((conversation) => {
      if (activeTab.value === 'open') return conversation.status === 'open'
      if (activeTab.value === 'ai') return conversation.conversationMode === 'ai' && !conversation.aiPaused
      if (activeTab.value === 'human') {
        return conversation.status === 'needs_human' || conversation.conversationMode === 'human'
      }
      if (activeTab.value === 'paused') {
        return conversation.aiPaused || conversation.conversationMode === 'paused'
      }
      return true
    })
    .filter((conversation) => {
      if (!search) return true
      return [
        getConversationName(conversation),
        conversation.contactPhone,
        getConversationPreview(conversation),
        getChannelLabel(conversation),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    })
})
const scheduleInitialData = computed(() => {
  const patientId = getSavedPatientId(selectedConversation.value)
  if (!patientId) return null

  return {
    patient: selectedConversation.value.patient?._id ? selectedConversation.value.patient : patientId,
    notes: `Origem: conversa WhatsApp com ${getConversationName(selectedConversation.value)}`,
  }
})

async function loadPage() {
  await Promise.all([
    store.fetchSummary(),
    store.fetchConversations(1),
  ])
}

async function loadConversations() {
  await store.fetchConversations(1, { status: statusFilter.value || undefined })
  activeTab.value = 'all'
  updateTabsOverflow()
}

function updateTabsOverflow() {
  nextTick(() => {
    const list = tabsListRef.value
    if (!list) return

    canScrollTabsBack.value = list.scrollLeft > 2
    canScrollTabsForward.value = list.scrollLeft + list.clientWidth < list.scrollWidth - 2
  })
}

function scrollTabsForward() {
  const list = tabsListRef.value
  if (!list) return

  list.scrollBy({
    left: Math.max(120, Math.round(list.clientWidth * 0.62)),
    behavior: 'smooth',
  })
  window.setTimeout(updateTabsOverflow, 260)
}

function scrollTabsBack() {
  const list = tabsListRef.value
  if (!list) return

  list.scrollBy({
    left: -Math.max(120, Math.round(list.clientWidth * 0.62)),
    behavior: 'smooth',
  })
  window.setTimeout(updateTabsOverflow, 260)
}

async function selectConversation(conversation) {
  selectedConversationId.value = conversation._id
  const requestId = conversationRequestId.value + 1
  conversationRequestId.value = requestId
  isConversationLoading.value = true
  animatedConversationId.value = null
  requestAnimationFrame(() => {
    animatedConversationId.value = conversation._id
    window.setTimeout(() => {
      if (animatedConversationId.value === conversation._id) animatedConversationId.value = null
    }, 320)
  })
  try {
    await store.fetchConversation(conversation._id)
  } finally {
    if (conversationRequestId.value === requestId) {
      isConversationLoading.value = false
      scrollMessagesToBottom('auto')
    }
  }
}

async function assignSelected() {
  if (!selectedConversation.value?._id) return
  await store.assignToMe(selectedConversation.value._id)
  await store.fetchConversation(selectedConversation.value._id)
}

async function pauseSelectedAi() {
  if (!selectedConversation.value?._id) return
  await store.pauseAi(selectedConversation.value._id)
  await store.fetchConversation(selectedConversation.value._id)
}

async function resumeSelectedAi() {
  if (!selectedConversation.value?._id) return
  await store.resumeAi(selectedConversation.value._id)
  await store.fetchConversation(selectedConversation.value._id)
}

async function closeSelected() {
  if (!selectedConversation.value?._id) return
  await store.closeConversation(selectedConversation.value._id)
  await store.fetchConversation(selectedConversation.value._id)
}

async function addNote() {
  if (!selectedConversation.value?._id || !internalNote.value.trim()) return
  await store.addInternalNote(selectedConversation.value._id, internalNote.value.trim())
  internalNote.value = ''
  scrollMessagesToBottom()
}

async function sendReply() {
  if (!selectedConversation.value?._id || !replyMessage.value.trim()) return
  await store.sendReply(selectedConversation.value._id, replyMessage.value.trim())
  replyMessage.value = ''
  scrollMessagesToBottom()
}

function toggleInternalComposer() {
  composerMode.value = composerMode.value === 'internal' ? 'reply' : 'internal'
}

async function sendComposerMessage() {
  if (!selectedConversation.value?._id || !composerMessage.value.trim()) return

  if (composerMode.value === 'internal') {
    await addNote()
    composerMode.value = 'reply'
    return
  }

  await sendReply()
}

function scrollMessagesToBottom(behavior = 'smooth') {
  nextTick(() => {
    requestAnimationFrame(() => {
      const list = messagesListRef.value
      if (!list) return
      list.scrollTo({
        top: list.scrollHeight,
        behavior,
      })
    })
  })
}

function getSavedPatientId(conversation) {
  return conversation?.patient?._id || conversation?.patient || null
}

function openScheduleModal() {
  isScheduleModalOpen.value = true
}

function openPatientProfile() {
  const patientId = getSavedPatientId(selectedConversation.value)
  if (!patientId) return

  const route = router.resolve({ name: 'detalhes-paciente', params: { id: patientId } })
  window.open(route.href, '_blank', 'noopener,noreferrer')
}

function isMessagesNearBottom(offset = 140) {
  const list = messagesListRef.value
  if (!list) return true
  return list.scrollHeight - list.scrollTop - list.clientHeight <= offset
}

function formatDateTime(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatConversationTime(value) {
  if (!value) return ''

  const date = new Date(value)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  if (date.toDateString() === yesterday.toDateString()) return 'Ontem'

  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getMessageTime(value) {
  if (!value) return ''
  return new Date(value).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getMessageAuthorLabel(type) {
  const map = {
    patient: 'Paciente',
    ai: 'IA',
    human: 'Humano',
    system: 'Sistema',
  }
  return map[type] || type
}

function isOutboundMessage(message) {
  return message.direction === 'outbound'
}

function isInternalMessage(message) {
  return message.direction === 'internal'
}

function getConversationName(conversation) {
  return conversation.patient?.name || conversation.contactName || conversation.contactPhone || 'Paciente'
}

function getConversationPreview(conversation) {
  if (conversation.summary) return conversation.summary
  if (conversation.humanReason) return conversation.humanReason
  if (conversation.requiresHuman) return 'Atendimento aguardando revisao humana.'
  if (conversation.conversationMode === 'ai' && !conversation.aiPaused) return 'Secretaria IA conduzindo o atendimento.'
  if (conversation.aiPaused) return 'IA pausada pela equipe da clinica.'
  return 'Conversa iniciada pelo paciente.'
}

function getChannelLabel(conversation) {
  return conversation.metadata?.channelLabel || (conversation.channel === 'whatsapp' ? 'WhatsApp' : 'Canal digital')
}

function getAvatarSeed(conversation) {
  const base = getConversationName(conversation)
  return [...base].reduce((acc, char) => acc + char.charCodeAt(0), 0)
}

function getAvatarStyle(conversation) {
  const palettes = [
    ['#d7f4e4', '#21a366'],
    ['#e8f0ff', '#3b82f6'],
    ['#fff1d6', '#f59e0b'],
    ['#f6e8ff', '#a855f7'],
    ['#ffe7ec', '#f43f5e'],
  ]
  const [background, color] = palettes[getAvatarSeed(conversation) % palettes.length]
  return { background, color }
}

function getStatusLabel(status) {
  const map = {
    open: 'Aberta',
    needs_human: 'Precisa humano',
    assigned: 'Assumida',
    closed: 'Encerrada',
  }
  return map[status] || status
}

function getModeLabel(conversation) {
  if (conversation?.aiPaused) return 'IA pausada'
  if (conversation?.conversationMode === 'ai') return 'IA ativa'
  return 'Humano'
}

function getPatientEmail(conversation) {
  return conversation.patient?.email || conversation.metadata?.patientEmail || ''
}

function getPatientTags(conversation) {
  return conversation.metadata?.tags || [
    'Interesse: Dermatologia',
    conversation.status === 'needs_human' ? 'Precisa humano' : 'Primeira consulta',
    getChannelLabel(conversation),
  ]
}

function getNextAppointment(conversation) {
  return conversation.metadata?.nextAppointment || {
    date: 'Sex, 17 de mai de 2025',
    time: '09:00',
    title: 'Consulta - Dermatologia',
    doctor: 'com Dr. Guilherme Silvestre',
    status: 'Confirmada',
  }
}

function getRecentHistory(conversation) {
  return conversation.metadata?.recentHistory || [
    {
      icon: 'payment',
      time: 'Hoje 11:20',
      title: 'Pagamento confirmado',
      description: 'R$ 350,00 via link de pagamento',
    },
    {
      icon: 'calendar',
      time: 'Hoje 11:16',
      title: 'Consulta agendada',
      description: '17/05/2025 às 09:00',
    },
    {
      icon: 'whatsapp',
      time: formatConversationTime(conversation.lastMessageAt || conversation.updatedAt) || 'Hoje 11:12',
      title: 'Início do atendimento',
      description: getChannelLabel(conversation),
    },
  ]
}

onMounted(async () => {
  await loadPage()
  updateTabsOverflow()
})

watch(conversationTabs, updateTabsOverflow, { flush: 'post' })

watch(
  () => [selectedConversationId.value, selectedMessages.value.length, isConversationLoading.value],
  ([conversationId, messageCount, loading], [previousConversationId, previousMessageCount] = []) => {
    if (loading || !messageCount) return

    if (conversationId !== previousConversationId) {
      scrollMessagesToBottom('auto')
      return
    }

    if (messageCount > previousMessageCount && isMessagesNearBottom()) {
      scrollMessagesToBottom('auto')
    }
  },
  { flush: 'post' },
)
</script>

<template>
  <div class="conversations-page">
    <CreateAppointmentModal
      v-if="isScheduleModalOpen"
      :initial-data="scheduleInitialData"
      @close="isScheduleModalOpen = false"
      @saved="isScheduleModalOpen = false"
    />

    <header class="page-header">
      <div>
        <h1 class="title">Conversas</h1>
        <p class="subtitle">Inbox da Secretária IA para revisar, assumir e pausar atendimentos.</p>
      </div>
      <div class="summary-row">
        <span><Inbox :size="16" /> {{ counters.open }} abertas</span>
        <span class="warning"><ShieldAlert :size="16" /> {{ counters.needsHuman }} precisam humano</span>
      </div>
    </header>

    <section class="zap-shell">
      <aside class="conversation-list panel">
        <div class="conversation-tools">
          <label class="search-box" aria-label="Buscar conversas">
            <Search :size="17" />
            <input v-model="searchTerm" type="search" placeholder="Buscar conversas..." />
          </label>
          <button class="filter-button" type="button" aria-label="Filtros de conversas">
            <Filter :size="17" />
          </button>
        </div>

        <div
          class="conversation-tabs-wrap"
          :class="{ 'has-left-fade': canScrollTabsBack, 'has-right-fade': canScrollTabsForward }"
        >
          <button
            v-if="canScrollTabsBack"
            class="tabs-scroll-button back"
            type="button"
            aria-label="Ver filtros anteriores"
            @click="scrollTabsBack"
          >
            <ChevronLeft :size="16" />
          </button>
          <div
            ref="tabsListRef"
            class="conversation-tabs"
            role="tablist"
            aria-label="Filtros rápidos de conversas"
            @scroll="updateTabsOverflow"
          >
            <button
              v-for="tab in conversationTabs"
              :key="tab.key"
              type="button"
              :class="{ active: activeTab === tab.key }"
              @click="activeTab = tab.key"
            >
              {{ tab.label }}
              <span>{{ tab.count }}</span>
            </button>
          </div>
          <button
            v-if="canScrollTabsForward"
            class="tabs-scroll-button"
            type="button"
            aria-label="Ver mais filtros"
            @click="scrollTabsForward"
          >
            <ChevronRight :size="16" />
          </button>
        </div>

        <div class="conversation-scroll">
          <div v-if="store.isLoading && conversations.length === 0" class="state">
            <LoaderCircle :size="20" class="spin" />
            Carregando conversas...
          </div>
          <div v-else-if="visibleConversations.length === 0" class="state compact">
            Nenhuma conversa encontrada.
          </div>

          <button
            v-for="conversation in visibleConversations"
            :key="conversation._id"
            class="conversation-item"
            :class="{
              active: selectedConversationId === conversation._id,
              clicked: animatedConversationId === conversation._id,
            }"
            @click="selectConversation(conversation)"
          >
            <div class="avatar conversation-avatar" :style="getAvatarStyle(conversation)">
              {{ getConversationName(conversation).charAt(0).toUpperCase() }}
            </div>
            <div class="conversation-main">
              <div class="conversation-row">
                <strong id="conversation-name">{{ getConversationName(conversation) }}</strong>
              </div>
              <p class="conversation-preview">{{ getConversationPreview(conversation) }}</p>
              <div class="conversation-meta-row">
                <span class="channel-pill">
                  <img
                    v-if="conversation.channel === 'whatsapp'"
                    class="channel-icon-img"
                    :src="whatsappIcon"
                    alt=""
                  />
                  {{ getChannelLabel(conversation) }}
                </span>
                <small class="status-badge" :class="conversation.status">{{ getStatusLabel(conversation.status) }}</small>
              </div>
            </div>
            <div class="conversation-side">
              <span class="conversation-date">{{ formatConversationTime(conversation.lastMessageAt || conversation.updatedAt) }}</span>
              <span v-if="conversation.unreadCount" class="unread">{{ conversation.unreadCount }}</span>
            </div>
          </button>
        </div>

        <p class="conversation-footer">Sua equipe está cuidando de {{ tabCounters.open }} conversas</p>
      </aside>

      <main class="chat-panel panel">
        <div v-if="!selectedConversation && !isConversationLoading" class="empty-detail">
          <MessageSquare :size="36" />
          <h3>Selecione uma conversa</h3>
          <p>Essa área vai evoluir para a experiência estilo WhatsApp Web da clínica.</p>
        </div>

        <div v-else-if="isConversationLoading" class="chat-loading" :style="{ '--whats-bg': `url(${backgroundWhats})` }">
          <div class="chat-loading-header">
            <span class="skeleton-circle"></span>
            <div>
              <span class="skeleton-line large"></span>
              <span class="skeleton-line medium"></span>
            </div>
          </div>
          <div class="chat-loading-body">
            <span class="skeleton-pill centered"></span>
            <span class="skeleton-message left"></span>
            <span class="skeleton-message right"></span>
            <span class="skeleton-message left short"></span>
            <span class="skeleton-message right tall"></span>
            <span class="skeleton-message left"></span>
          </div>
          <div class="chat-loading-composer">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <template v-else>
          <div class="chat-header">
            <div class="chat-title">
              <div class="avatar chat-avatar" :style="getAvatarStyle(selectedConversation)">
                {{ getConversationName(selectedConversation).charAt(0).toUpperCase() }}
              </div>
              <div>
                <h2>{{ getConversationName(selectedConversation) }}</h2>
                <p>
                  <img class="channel-icon-img" :src="whatsappIcon" alt="" />
                  WhatsApp · {{ selectedConversation.contactPhone }}
                  <span class="chat-online">Online</span>
                </p>
              </div>
            </div>
            <div class="chat-actions">
              <span class="tooltip-trigger" data-tooltip="Assumir conversa">
                <button type="button" class="chat-action-button" aria-label="Assumir conversa" @click="assignSelected">
                  <UserCheck :size="16" />
                </button>
              </span>
              <span v-if="!selectedConversation.aiPaused" class="tooltip-trigger" data-tooltip="Pausar IA">
                <button
                  type="button"
                  class="chat-action-button"
                  aria-label="Pausar IA"
                  @click="pauseSelectedAi"
                >
                  <Pause :size="16" />
                </button>
              </span>
              <span v-else class="tooltip-trigger" data-tooltip="Reativar IA">
                <button
                  type="button"
                  class="chat-action-button"
                  aria-label="Reativar IA"
                  @click="resumeSelectedAi"
                >
                  <Play :size="16" />
                </button>
              </span>
              <span class="tooltip-trigger" data-tooltip="Favoritar conversa">
                <button type="button" class="chat-action-button" aria-label="Favoritar conversa">
                  <Star :size="16" />
                </button>
              </span>
              <span class="tooltip-trigger" data-tooltip="Etiquetar conversa">
                <button type="button" class="chat-action-button" aria-label="Etiquetar conversa">
                  <Tag :size="16" />
                </button>
              </span>
              <span class="tooltip-trigger" data-tooltip="Encerrar conversa">
                <button type="button" class="chat-action-button" aria-label="Encerrar conversa" @click="closeSelected">
                  <CheckCircle :size="16" />
                </button>
              </span>
              <span class="tooltip-trigger" data-tooltip="Mais ações">
                <button type="button" class="chat-action-button" aria-label="Mais ações">
                  <MoreVertical :size="17" />
                </button>
              </span>
            </div>
          </div>

          <div ref="messagesListRef" class="messages-list" :style="{ '--whats-bg': `url(${backgroundWhats})` }">
            <span class="date-divider">Hoje</span>
            <article
              v-for="message in selectedMessages"
              :key="message._id"
              class="message-bubble"
              :class="[
                message.direction,
                message.authorType,
                {
                  outbound: isOutboundMessage(message),
                  internal: isInternalMessage(message),
                },
              ]"
            >
              <p>{{ message.body }}</p>
              <div class="message-meta">
                <span v-if="isInternalMessage(message)" class="message-author">{{ getMessageAuthorLabel(message.authorType) }}</span>
                <span>{{ getMessageTime(message.createdAt) }}</span>
                <span v-if="isOutboundMessage(message)" class="message-checks" aria-label="Mensagem lida">
                  <svg viewBox="0 0 24 24" width="16" preserveAspectRatio="xMidYMid meet" fill="currentColor" aria-hidden="true">
                    <path fill="currentColor" d="M14.73 6.01a1 1 0 0 1 1.41-.15l.01.01a1 1 0 0 1 .15 1.41L7.6 18.01a1 1 0 0 1-.73.37h-.05c-.26 0-.52-.11-.71-.3l-4.03-4.09a.99.99 0 0 1 0-1.41.99.99 0 0 1 1.41 0l3.25 3.29 7.99-9.86Zm5.71.12a1 1 0 0 1 1.41-.15h-.01a1 1 0 0 1 .15 1.41l-8.41 10.45a1 1 0 0 1-.73.37h-.05a1 1 0 0 1-.71-.3l-1.36-1.26a.55.55 0 0 1-.02-.81l.56-.68c.21-.2.53-.21.75-.03l.71.58 7.71-9.58Z" />
                  </svg>
                </span>
              </div>
            </article>
          </div>

          <div class="chat-composer">
            <span class="tooltip-trigger top" data-tooltip="Emoji">
              <button type="button" class="composer-icon-button" aria-label="Emoji">
                <Smile :size="18" />
              </button>
            </span>
            <span class="tooltip-trigger top" data-tooltip="Anexar arquivo">
              <button type="button" class="composer-icon-button" aria-label="Anexar arquivo">
                <Paperclip :size="18" />
              </button>
            </span>
            <span class="tooltip-trigger top" data-tooltip="Nota interna">
              <button
                type="button"
                class="composer-icon-button"
                :class="{ active: composerMode === 'internal' }"
                aria-label="Alternar nota interna"
                @click="toggleInternalComposer"
              >
                <EyeOff :size="18" />
              </button>
            </span>
            <input
              v-model="composerMessage"
              type="text"
              :class="{ 'internal-mode': composerMode === 'internal' }"
              :placeholder="composerPlaceholder"
              :disabled="selectedConversation.status === 'closed' || store.isSaving"
              @keyup.enter="sendComposerMessage"
            />
            <span
              class="tooltip-trigger top"
              :class="{ 'is-disabled': !composerMessage.trim() || selectedConversation.status === 'closed' || store.isSaving }"
              data-tooltip="Enviar mensagem"
            >
              <button
                type="button"
                class="send-round-button"
                aria-label="Enviar mensagem"
                :disabled="!composerMessage.trim() || selectedConversation.status === 'closed' || store.isSaving"
                @click="sendComposerMessage"
              >
                <Send :size="16" />
              </button>
            </span>
          </div>

          <div v-if="false" class="internal-composer">
            <textarea
              v-model="internalNote"
              rows="1"
              placeholder="Nota interna. Não será enviada ao paciente."
            ></textarea>
            <button type="button" :disabled="!internalNote.trim()" @click="addNote">
              <Save :size="16" />
              Nota
            </button>
          </div>
        </template>
      </main>

      <aside class="context-panel panel">
        <div v-if="isConversationLoading" class="context-loading">
          <span class="skeleton-line large"></span>
          <div class="context-loading-card">
            <span class="skeleton-circle"></span>
            <div>
              <span class="skeleton-line large"></span>
              <span class="skeleton-line medium"></span>
              <span class="skeleton-line medium"></span>
            </div>
          </div>
          <span class="skeleton-line medium"></span>
          <div class="context-loading-card block"></div>
          <span class="skeleton-line medium"></span>
          <div class="context-loading-card block small"></div>
          <div class="context-loading-actions">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <template v-else-if="selectedConversation">
          <section class="patient-section">
            <div class="context-title">
              <h2>Detalhes do paciente</h2>
              <ChevronUp :size="15" />
            </div>

            <div class="patient-card">
              <div class="avatar patient-avatar" :style="getAvatarStyle(selectedConversation)">
                {{ getConversationName(selectedConversation).charAt(0).toUpperCase() }}
              </div>
              <div class="patient-main">
                <strong>{{ getConversationName(selectedConversation) }}</strong>
                <span class="patient-online">
                  <span></span>
                  Online
                </span>
              </div>
              <p>{{ selectedConversation.contactPhone }}</p>
              <p v-if="getPatientEmail(selectedConversation)">{{ getPatientEmail(selectedConversation) }}</p>
            </div>
          </section>

          <section class="patient-section">
            <div class="context-title small">
              <h3>Tags</h3>
              <button type="button" aria-label="Adicionar tag"><Plus :size="14" /></button>
            </div>
            <div class="patient-tags">
              <span
                v-for="tag in getPatientTags(selectedConversation)"
                :key="tag"
                :class="{ whatsapp: tag === 'WhatsApp' }"
              >
                {{ tag }}
              </span>
            </div>
          </section>

          <section class="patient-section">
            <h3>Próximo agendamento</h3>
            <div class="appointment-card">
              <CalendarDays :size="20" />
              <div>
                <span>{{ getNextAppointment(selectedConversation).date }}</span>
                <strong>{{ getNextAppointment(selectedConversation).time }}</strong>
                <p>{{ getNextAppointment(selectedConversation).title }}</p>
                <p>{{ getNextAppointment(selectedConversation).doctor }}</p>
              </div>
              <small>{{ getNextAppointment(selectedConversation).status }}</small>
            </div>
          </section>

          <!-- <section class="patient-section">
            <h3>Histórico recente</h3>
            <div class="history-list">
              <article
                v-for="item in getRecentHistory(selectedConversation)"
                :key="`${item.time}-${item.title}`"
                class="history-item"
              >
                <span class="history-icon" :class="item.icon">
                  <Wallet v-if="item.icon === 'payment'" :size="15" />
                  <CalendarDays v-else-if="item.icon === 'calendar'" :size="15" />
                  <img
                    v-else
                    class="channel-icon-img"
                    :src="whatsappIcon"
                    alt=""
                  />
                </span>
                <div>
                  <span>{{ item.time }}</span>
                  <strong>{{ item.title }}</strong>
                  <p>{{ item.description }}</p>
                </div>
              </article>
            </div>
            <button class="full-history-button" type="button">Ver histórico completo</button>
          </section> -->

          <section class="patient-section">
            <h3>Ações rápidas</h3>
            <div class="quick-actions">
              <button class="primary-action" type="button" @click="assignSelected">
                <UserCheck :size="15" />
                Assumir conversa
              </button>
              <button type="button" @click="pauseSelectedAi">
                <Pause :size="15" />
                Pausar IA
              </button>
              <button type="button" @click="openScheduleModal">
                <CalendarDays :size="15" />
                Agendar consulta
              </button>
              <button type="button" :disabled="!getSavedPatientId(selectedConversation)" @click="openPatientProfile">
                <FolderOpen :size="15" />
                Abrir prontuário
              </button>
            </div>
          </section>
        </template>
        <div v-else class="state">
          Selecione uma conversa para ver paciente, agenda e ações rápidas.
        </div>
      </aside>
    </section>
  </div>
</template>

<style scoped>
.conversations-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header,
.panel-header,
.conversation-row,
.chat-header,
.chat-title,
.chat-actions,
.summary-row,
.context-card {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-header,
.panel-header,
.conversation-row,
.chat-header {
  justify-content: space-between;
}

.title {
  margin: 0;
  font-size: 2rem;
  color: #111827;
}

.subtitle,
.panel-header p,
.chat-title p,
.context-card p {
  margin: 0.2rem 0 0;
  color: #64748b;
}

.summary-row span {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.7rem;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 700;
  font-size: 0.82rem;
}

.summary-row .warning {
  background: #fef3c7;
  color: #b45309;
}

.zap-shell {
  display: grid;
  grid-template-columns: minmax(300px, 0.82fr) minmax(520px, 1.7fr) minmax(300px, 0.82fr);
  gap: 1rem;
  height: calc(100vh - 190px);
  min-height: 560px;
  overflow: visible;
}

.panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  min-height: 0;
}

.conversation-list {
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.conversation-tools {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  gap: 0.55rem;
  padding: 0.75rem 0.75rem 0;
  flex-shrink: 0;
}

#conversation-name {
  font-weight: 700;
}

.search-box,
.filter-button {
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  background: #ffffff;
}

.search-box {
  min-width: 0;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  padding: 0 0.7rem;
  color: #94a3b8;
}

.search-box input {
  min-width: 0;
  width: 100%;
  border: 0;
  outline: 0;
  font: inherit;
  color: #334155;
}

.search-box input::placeholder {
  color: #94a3b8;
}

.filter-button {
  height: 38px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  cursor: pointer;
}

.filter-button:hover {
  background: #f8fafc;
  color: var(--azul-principal);
}

.conversation-tabs-wrap {
  position: relative;
  flex-shrink: 0;
  overflow: hidden;
}

.conversation-tabs-wrap::before,
.conversation-tabs-wrap::after {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: 34px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 140ms ease;
}

.conversation-tabs-wrap::before {
  left: 0;
  background: linear-gradient(90deg, #ffffff 20%, rgba(255, 255, 255, 0));
}

.conversation-tabs-wrap::after {
  right: 0;
  background: linear-gradient(270deg, #ffffff 20%, rgba(255, 255, 255, 0));
}

.conversation-tabs-wrap.has-left-fade::before,
.conversation-tabs-wrap.has-right-fade::after {
  opacity: 1;
}

.conversation-tabs {
  display: flex;
  gap: 0.7rem;
  padding: 0.74rem 0.75rem 0.48rem;
  overflow-x: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  transition: padding 140ms ease;
}

.conversation-tabs-wrap.has-left-fade .conversation-tabs {
  padding-left: 2.25rem;
}

.conversation-tabs-wrap.has-right-fade .conversation-tabs {
  padding-right: 2.25rem;
}

.conversation-tabs::-webkit-scrollbar {
  display: none;
}

.tabs-scroll-button {
  position: absolute;
  top: 50%;
  right: 0.2rem;
  z-index: 3;
  width: 26px;
  height: 26px;
  border: 1px solid #dbe3ef;
  border-radius: 999px;
  background: #ffffff;
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transform: translateY(-50%);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.12);
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease, border-color 140ms ease;
}

.tabs-scroll-button.back {
  right: auto;
  left: 0.2rem;
}

.tabs-scroll-button:hover {
  border-color: #b7c5d8;
  background: #f8fafc;
  color: #0f172a;
}

.conversation-tabs button {
  height: 30px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  gap: 0.34rem;
  padding: 0 0.42rem;
  font-weight: 650;
  font-size: 0.72rem;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 6px 6px 0 0;
}

.conversation-tabs button.active {
  color: #15915b;
  border-color: #20b26b;
  background: #e9f8f0;
}

.conversation-tabs span {
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 5px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 0.66rem;
}

.conversation-tabs button.active span {
  background: #d8f5e5;
  color: #15915b;
}

.conversation-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  margin: 0;
  padding: 0;
}

.conversation-footer {
  margin: 0.65rem 0 0;
  padding: 0 0.75rem 0.75rem;
  flex-shrink: 0;
  color: #64748b;
  font-size: 0.72rem;
}

.composer textarea,
.reply-composer textarea {
  border: 1px solid #dbe3ef;
  border-radius: 10px;
  padding: 0.65rem 0.75rem;
  font: inherit;
  background: #ffffff;
}

.conversation-item {
  width: 100%;
  height: 64px;
  border: 0;
  border-top: 1px solid #eef2f7;
  background: transparent;
  border-radius: 0;
  padding: 0.55rem 0.78rem 0.55rem 0.82rem;
  display: flex;
  gap: 0.58rem;
  text-align: left;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transform-origin: center;
  transition: background-color 160ms ease, border-color 160ms ease, box-shadow 160ms ease;
}

.conversation-item:hover,
.conversation-item.active {
  background: #effaf5;
  box-shadow: inset 0 1px 0 #bcebd4, inset 0 -1px 0 #bcebd4;
}

.conversation-item.active::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: #20b26b;
}

.conversation-item.clicked {
  animation: conversation-click 300ms ease;
}

.avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #eef2ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}

.conversation-avatar {
  width: 38px;
  height: 38px;
  margin-top: 0;
  font-size: 0.82rem;
}

.conversation-main {
  min-width: 0;
  flex: 1;
}

.conversation-row strong,
.conversation-row span,
.conversation-row small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-row strong {
  min-width: 0;
  color: #1f2937;
  font-size: 0.78rem;
}

.muted {
  color: #64748b;
}

.conversation-preview {
  margin: 0.1rem 0 0;
  color: #475569;
  font-size: 0.72rem;
  line-height: 1.18;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-meta-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  margin-top: 0.13rem;
  min-width: 0;
}

.channel-pill {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #2fae69;
  font-size: 0.69rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-icon-img {
  width: 13px;
  height: 13px;
  flex-shrink: 0;
  display: inline-block;
  object-fit: contain;
}

.status-badge {
  display: none;
  align-items: center;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.72rem;
  font-weight: 700;
}

.status-badge.needs_human {
  background: #fef3c7;
  color: #b45309;
}

.status-badge.assigned {
  background: #dcfce7;
  color: #15803d;
}

.status-badge.closed {
  background: #f1f5f9;
  color: #64748b;
}

.human-reason {
  margin: 0.4rem 0 0;
  color: #b45309;
  font-size: 0.78rem;
}

.unread {
  min-width: 18px;
  height: 18px;
  border-radius: 7px;
  background: #20b26b;
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.66rem;
  font-weight: 800;
  align-self: flex-end;
  flex-shrink: 0;
}

.conversation-side {
  width: 34px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 0.35rem;
  flex-shrink: 0;
}

.conversation-date {
  color: #64748b;
  font-size: 0.68rem;
  line-height: 1;
  white-space: nowrap;
}

.empty-detail,
.state {
  min-height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 0.5rem;
  color: #64748b;
}

.state.compact {
  min-height: 120px;
}

.chat-panel {
  display: flex;
  flex-direction: column;
}

.chat-actions {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  margin-top: 0.75rem;
  position: relative;
  isolation: isolate;
  background-color: #efe7dc;
  background-image:
    linear-gradient(rgba(239, 231, 220, 0.9), rgba(239, 231, 220, 0.9)),
    var(--whats-bg);
  background-repeat: repeat, repeat;
  background-size: auto, 374px 666px;
  background-position: 0 0, 0 0;
  border-radius: 12px;
  min-height: 360px;
  contain: paint;
}

.messages-list > * {
  position: relative;
  z-index: 1;
}

.message-bubble {
  width: fit-content;
  max-width: 82%;
  padding: 0.75rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid rgba(10, 10, 10, 0.04);
  color: #0a0a0a;
}

.message-bubble.inbound {
  align-self: flex-start;
}

.message-bubble.internal {
  background: #fffbeb;
  border-color: #fde68a;
}

.message-bubble.outbound {
  align-self: flex-end;
  background: #d9fdd3;
}

.message-meta {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  color: #94a3b8;
  font-size: 0.72rem;
  text-transform: uppercase;
}

.message-bubble p {
  margin: 0.35rem 0 0;
  color: #0a0a0a;
  white-space: pre-wrap;
}

.composer,
.reply-composer {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.75rem;
  margin-top: 0.75rem;
  align-items: end;
}

.reply-composer {
  padding-top: 0.75rem;
  border-top: 1px solid #e5e7eb;
}

.composer.internal {
  grid-template-columns: 1fr auto;
}

.composer textarea,
.reply-composer textarea {
  width: 100%;
  resize: vertical;
}

.chat-panel {
  padding: 0;
  overflow: visible;
  background: #ffffff;
}

.chat-header {
  position: relative;
  z-index: 20;
  min-height: 64px;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #e8edf3;
  background: #ffffff;
  flex-shrink: 0;
}

.chat-title {
  min-width: 0;
  gap: 0.7rem;
}

.chat-avatar {
  width: 42px;
  height: 42px;
  font-size: 0.9rem;
}

.chat-title h2 {
  margin: 0;
  color: #111827;
  font-size: 0.9rem;
  line-height: 1.15;
  font-weight: 800;
}

.chat-title p {
  display: flex;
  align-items: center;
  gap: 0.32rem;
  margin-top: 0.22rem;
  color: #64748b;
  font-size: 0.74rem;
  line-height: 1.1;
}

.chat-title .channel-icon-img {
  width: 14px;
  height: 14px;
}

.chat-online {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: #16a34a;
  font-weight: 700;
}

.chat-online::before {
  content: "";
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #16a34a;
}

.chat-actions {
  flex-wrap: nowrap;
  gap: 0.45rem;
}

.chat-action-button {
  width: 36px;
  height: 36px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #ffffff;
  color: #334155;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease;
}

.chat-action-button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}

.tooltip-trigger {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  isolation: isolate;
}

.tooltip-trigger::before,
.tooltip-trigger::after {
  position: absolute;
  left: 50%;
  z-index: 9999;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transform: translate(-50%, 4px) scale(0.98);
  transition: opacity 120ms ease, transform 120ms ease, visibility 0s linear 120ms;
  will-change: opacity, transform;
}

.tooltip-trigger::before {
  content: attr(data-tooltip);
  top: calc(100% + 8px);
  max-width: 180px;
  width: max-content;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
  background: #ffffff;
  color: #0f172a;
  padding: 0.34rem 0.52rem;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.1;
  white-space: nowrap;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
}

.tooltip-trigger::after {
  content: "";
  top: calc(100% + 4px);
  width: 8px;
  height: 8px;
  border-left: 1px solid #e2e8f0;
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  transform: translate(-50%, 4px) rotate(45deg) scale(0.98);
}

.tooltip-trigger.top::before {
  top: auto;
  bottom: calc(100% + 8px);
  transform: translate(-50%, -4px) scale(0.98);
}

.tooltip-trigger.top::after {
  top: auto;
  bottom: calc(100% + 4px);
  transform: translate(-50%, -4px) rotate(45deg) scale(0.98);
}

.chat-actions .tooltip-trigger:last-child::before,
.chat-composer .tooltip-trigger:last-child::before {
  right: 0;
  left: auto;
  transform: translate(0, 4px) scale(0.98);
}

.chat-actions .tooltip-trigger:last-child::after,
.chat-composer .tooltip-trigger:last-child::after {
  right: 14px;
  left: auto;
  transform: translate(0, 4px) rotate(45deg) scale(0.98);
}

.chat-composer .tooltip-trigger.top:last-child::before {
  transform: translate(0, -4px) scale(0.98);
}

.chat-composer .tooltip-trigger.top:last-child::after {
  transform: translate(0, -4px) rotate(45deg) scale(0.98);
}

.tooltip-trigger:hover::before,
.tooltip-trigger:hover::after,
.tooltip-trigger:has(:focus-visible)::before,
.tooltip-trigger:has(:focus-visible)::after {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, 0) scale(1);
  transition-delay: 80ms, 80ms, 0s;
}

.tooltip-trigger:hover::after,
.tooltip-trigger:has(:focus-visible)::after {
  transform: translate(-50%, 0) rotate(45deg) scale(1);
}

.tooltip-trigger.top:hover::before,
.tooltip-trigger.top:has(:focus-visible)::before {
  transform: translate(-50%, 0) scale(1);
}

.tooltip-trigger.top:hover::after,
.tooltip-trigger.top:has(:focus-visible)::after {
  transform: translate(-50%, 0) rotate(45deg) scale(1);
}

.chat-actions .tooltip-trigger:last-child:hover::before,
.chat-actions .tooltip-trigger:last-child:has(:focus-visible)::before,
.chat-composer .tooltip-trigger:last-child:hover::before,
.chat-composer .tooltip-trigger:last-child:has(:focus-visible)::before {
  transform: translate(0, 0) scale(1);
}

.chat-actions .tooltip-trigger:last-child:hover::after,
.chat-actions .tooltip-trigger:last-child:has(:focus-visible)::after,
.chat-composer .tooltip-trigger:last-child:hover::after,
.chat-composer .tooltip-trigger:last-child:has(:focus-visible)::after {
  transform: translate(0, 0) rotate(45deg) scale(1);
}

.tooltip-trigger.is-disabled::before,
.tooltip-trigger.is-disabled::after,
.tooltip-trigger:has(:disabled)::before,
.tooltip-trigger:has(:disabled)::after {
  display: none;
}

.messages-list {
  gap: 0.58rem;
  margin-top: 0;
  min-height: 0;
  padding: 0.85rem 1rem 0.95rem;
  border-radius: 0;
  background-color: #efe7dc;
  background-image:
    linear-gradient(rgba(239, 231, 220, 0.9), rgba(239, 231, 220, 0.9)),
    var(--whats-bg);
  background-repeat: repeat, repeat;
  background-size: auto, 374px 666px;
  background-position: 0 0, 0 0;
  will-change: scroll-position;
}

.date-divider {
  align-self: center;
  border: 1px solid #e7edf4;
  border-radius: 999px;
  background: #ffffff;
  color: #64748b;
  padding: 0.32rem 1.2rem;
  font-size: 0.7rem;
  font-weight: 800;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}

.message-bubble {
  width: fit-content;
  max-width: min(72%, 470px);
  min-width: 98px;
  padding: 0.55rem 0.68rem 0.35rem;
  border: 1px solid rgba(10, 10, 10, 0.04);
  border-radius: 8px;
  background: #ffffff;
  color: #0a0a0a;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.035);
}

.message-bubble.inbound {
  align-self: flex-start;
}

.message-bubble.outbound {
  align-self: flex-end;
  border-color: rgba(10, 10, 10, 0.035);
  background: #d9fdd3;
}

.message-bubble.internal {
  align-self: center;
  border-color: #d9e2ec;
  border-style: dashed;
  background: rgba(248, 250, 252, 0.94);
  max-width: min(52%, 360px);
  color: #475569;
}

.message-bubble p {
  margin: 0;
  color: #0a0a0a;
  font-size: 0.78rem;
  line-height: 1.35;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.message-bubble.internal p {
  color: #475569;
  font-size: 0.72rem;
  text-align: center;
}

.message-meta {
  justify-content: flex-end;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.18rem;
  color: #64748b;
  font-size: 0.64rem;
  line-height: 1;
  text-transform: none;
}

.message-author {
  margin-right: auto;
  color: #a16207;
  font-weight: 800;
}

.message-checks {
  display: inline-flex;
  align-items: center;
  color: #007bfc;
  line-height: 1;
}

.message-checks svg {
  display: block;
  width: 16px;
  height: 16px;
}

.chat-composer {
  position: relative;
  z-index: 20;
  display: grid;
  grid-template-columns: 36px 36px 36px minmax(0, 1fr) 42px;
  gap: 0.48rem;
  align-items: center;
  padding: 0.58rem 0.75rem;
  border-top: 1px solid #e5eaf1;
  background: #ffffff;
  flex-shrink: 0;
}

.composer-icon-button,
.send-round-button {
  border: 1px solid #dfe6ee;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.composer-icon-button {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: #ffffff;
  color: #64748b;
}

.composer-icon-button.active {
  border-color: #20b26b;
  background: #e9f8f0;
  color: #168452;
}

.chat-composer input {
  width: 100%;
  height: 36px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  padding: 0 0.75rem;
  outline: 0;
  color: #334155;
  font: inherit;
  font-size: 0.76rem;
}

.chat-composer input.internal-mode {
  border-style: dashed;
  border-color: #20b26b;
  background: #f4fbf7;
  color: #166534;
}

.chat-composer input::placeholder {
  color: #94a3b8;
}

.send-round-button {
  width: 42px;
  height: 42px;
  border: 0;
  border-radius: 999px;
  background: #17a664;
  color: #ffffff;
}

.send-round-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.internal-composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.45rem;
  align-items: center;
  padding: 0 0.75rem 0.65rem;
  background: #ffffff;
  flex-shrink: 0;
}

.internal-composer textarea {
  width: 100%;
  min-height: 34px;
  max-height: 72px;
  resize: vertical;
  border: 1px dashed #d6deea;
  border-radius: 8px;
  padding: 0.48rem 0.65rem;
  color: #475569;
  font: inherit;
  font-size: 0.72rem;
}

.internal-composer button {
  min-height: 34px;
  border: 1px solid #dfe6ee;
  border-radius: 8px;
  background: #f8fafc;
  color: #475569;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.65rem;
  font-weight: 800;
  font-size: 0.72rem;
  cursor: pointer;
}

.internal-composer button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.chat-loading,
.context-loading {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.chat-loading {
  flex: 1;
  background: #ffffff;
}

.chat-loading-header {
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #e8edf3;
}

.chat-loading-header > div {
  display: grid;
  gap: 0.45rem;
}

.chat-loading-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding: 0.9rem 1rem;
  background-color: #efe7dc;
  background-image:
    linear-gradient(rgba(239, 231, 220, 0.9), rgba(239, 231, 220, 0.9)),
    var(--whats-bg);
  background-repeat: repeat, repeat;
  background-size: auto, 374px 666px;
  background-position: 0 0, 0 0;
}

.chat-loading-composer {
  display: grid;
  grid-template-columns: 36px minmax(0, 1fr) 42px;
  gap: 0.5rem;
  padding: 0.58rem 0.75rem;
  border-top: 1px solid #e5eaf1;
}

.context-loading {
  gap: 0.75rem;
}

.context-loading-card {
  min-height: 92px;
  border: 1px solid #e5eaf1;
  border-radius: 8px;
  padding: 0.75rem;
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 0.7rem;
}

.context-loading-card.block {
  min-height: 110px;
  display: block;
}

.context-loading-card.small {
  min-height: 86px;
}

.context-loading-actions {
  display: grid;
  gap: 0.5rem;
}

.skeleton-circle,
.skeleton-line,
.skeleton-pill,
.skeleton-message,
.chat-loading-composer span,
.context-loading-actions span,
.context-loading-card.block {
  position: relative;
  overflow: hidden;
  background: #eef2f6;
}

.skeleton-circle::after,
.skeleton-line::after,
.skeleton-pill::after,
.skeleton-message::after,
.chat-loading-composer span::after,
.context-loading-actions span::after,
.context-loading-card.block::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.72), transparent);
  animation: skeleton-shimmer 1.15s infinite;
}

.skeleton-circle {
  width: 42px;
  height: 42px;
  border-radius: 999px;
}

.skeleton-line {
  display: block;
  height: 10px;
  border-radius: 999px;
}

.skeleton-line.large {
  width: 150px;
}

.skeleton-line.medium {
  width: 108px;
}

.skeleton-pill {
  width: 70px;
  height: 28px;
  border-radius: 999px;
}

.skeleton-pill.centered {
  align-self: center;
}

.skeleton-message {
  width: min(58%, 360px);
  height: 54px;
  border-radius: 8px;
}

.skeleton-message.right {
  align-self: flex-end;
  width: min(48%, 320px);
}

.skeleton-message.short {
  width: min(38%, 260px);
}

.skeleton-message.tall {
  height: 82px;
}

.chat-loading-composer span {
  height: 36px;
  border-radius: 8px;
}

.chat-loading-composer span:first-child,
.chat-loading-composer span:last-child {
  width: 36px;
}

.context-loading-actions span {
  height: 38px;
  border-radius: 8px;
}

.context-panel {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 0.85rem;
  overflow-y: auto;
}

.patient-section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.patient-section h3,
.context-title h2 {
  margin: 0;
  color: #111827;
  font-size: 0.82rem;
  font-weight: 800;
}

.context-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.context-title.small button {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 7px;
  background: #f8fafc;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.patient-card,
.appointment-card,
.history-list,
.quick-actions button,
.full-history-button {
  border: 1px solid #e5eaf1;
  background: #ffffff;
  border-radius: 8px;
}

.patient-card {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  column-gap: 0.7rem;
  row-gap: 0.32rem;
  padding: 0.75rem;
}

.patient-avatar {
  width: 46px;
  height: 46px;
  grid-row: span 5;
}

.patient-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.patient-main strong,
.patient-card p {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.patient-main strong {
  color: #111827;
  font-size: 0.82rem;
}

.patient-online {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  color: #16a34a;
  font-size: 0.7rem;
  font-weight: 700;
}

.patient-online span {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: #16a34a;
}

.patient-card p {
  grid-column: 2;
  margin: 0;
  color: #475569;
  font-size: 0.72rem;
}

.patient-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.patient-tags span {
  max-width: 100%;
  border-radius: 999px;
  background: #eaf8f1;
  color: #168452;
  padding: 0.22rem 0.45rem;
  font-size: 0.62rem;
  font-weight: 800;
}

.patient-tags span:nth-child(2) {
  background: #eaf1ff;
  color: #2563eb;
}

.patient-tags .whatsapp {
  background: #e4f7ec;
  color: #16965f;
}

.appointment-card {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  gap: 0.65rem;
  align-items: start;
  padding: 0.75rem;
}

.appointment-card > svg {
  color: #334155;
  margin-top: 0.15rem;
}

.appointment-card span,
.history-item span {
  color: #64748b;
  font-size: 0.7rem;
}

.appointment-card strong {
  display: block;
  color: #111827;
  font-size: 1rem;
  line-height: 1.1;
  margin: 0.1rem 0 0.35rem;
}

.appointment-card p,
.history-item p {
  margin: 0.12rem 0 0;
  color: #475569;
  font-size: 0.68rem;
}

.appointment-card small {
  align-self: center;
  border-radius: 999px;
  background: #dff6e9;
  color: #168452;
  padding: 0.25rem 0.45rem;
  font-size: 0.62rem;
  font-weight: 800;
}

.history-list {
  overflow: hidden;
}

.history-item {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: 0.55rem;
  padding: 0.58rem 0.7rem;
  border-bottom: 1px solid #edf2f7;
}

.history-item:last-child {
  border-bottom: 0;
}

.history-icon {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  background: #f8fafc;
  color: #64748b;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.history-icon.payment {
  color: #16a34a;
}

.history-icon.calendar {
  color: #2563eb;
}

.history-icon.whatsapp {
  color: #16a34a;
}

.history-icon .channel-icon-img {
  width: 14px;
  height: 14px;
}

.history-item strong {
  display: block;
  color: #111827;
  font-size: 0.72rem;
  line-height: 1.15;
}

.full-history-button {
  width: 100%;
  height: 34px;
  color: #334155;
  font-weight: 800;
  font-size: 0.7rem;
  cursor: pointer;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
}

.quick-actions button {
  min-height: 38px;
  padding: 0 0.55rem;
  color: #334155;
  font-weight: 800;
  font-size: 0.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
}

.quick-actions button:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.quick-actions .primary-action,
.quick-actions button:nth-child(2) {
  grid-column: 1 / -1;
}

.quick-actions .primary-action {
  border-color: #0f9f62;
  background: #0f9f62;
  color: #ffffff;
}

.context-card {
  align-items: flex-start;
  padding: 0.9rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.context-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.35rem;
  margin-top: 1rem;
}

.context-list span {
  color: #94a3b8;
  font-size: 0.75rem;
  text-transform: uppercase;
}

.context-list strong {
  color: #334155;
  margin-bottom: 0.4rem;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes conversation-click {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(0.985);
    box-shadow: inset 0 0 0 1px rgba(32, 178, 107, 0.22);
  }
  100% {
    transform: scale(1);
  }
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

@media (max-width: 1100px) {
  .zap-shell {
    grid-template-columns: 1fr;
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .conversation-list {
    height: min(620px, calc(100vh - 180px));
  }

  .page-header,
  .chat-header,
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .chat-composer {
    grid-template-columns: 36px 36px 36px minmax(0, 1fr) 42px;
  }

  .internal-composer {
    grid-template-columns: 1fr;
  }
}
</style>
