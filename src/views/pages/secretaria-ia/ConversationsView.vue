<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Bot,
  CheckCircle,
  Send,
  Inbox,
  LoaderCircle,
  MessageSquare,
  Pause,
  Play,
  Save,
  ShieldAlert,
  UserCheck,
} from 'lucide-vue-next'
import { useAiSecretaryStore } from '@/stores/aiSecretary'
import AppButton from '@/components/global/AppButton.vue'

const store = useAiSecretaryStore()

const statusFilter = ref('')
const selectedConversationId = ref(null)
const internalNote = ref('')
const replyMessage = ref('')

const counters = computed(() => store.counters)
const conversations = computed(() => store.conversations)
const selectedConversation = computed(() => store.selectedConversation)
const selectedMessages = computed(() => store.selectedMessages)

async function loadPage() {
  await Promise.all([
    store.fetchSummary(),
    store.fetchConversations(1),
  ])
}

async function loadConversations() {
  await store.fetchConversations(1, { status: statusFilter.value || undefined })
}

async function selectConversation(conversation) {
  selectedConversationId.value = conversation._id
  await store.fetchConversation(conversation._id)
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
}

async function sendReply() {
  if (!selectedConversation.value?._id || !replyMessage.value.trim()) return
  await store.sendReply(selectedConversation.value._id, replyMessage.value.trim())
  replyMessage.value = ''
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

function getConversationName(conversation) {
  return conversation.patient?.name || conversation.contactName || conversation.contactPhone || 'Paciente'
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

onMounted(loadPage)
</script>

<template>
  <div class="conversations-page">
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
        <div class="panel-header">
          <div>
            <h2>Inbox</h2>
            <p>Mensagens recebidas pelo WhatsApp.</p>
          </div>
          <select v-model="statusFilter" class="select-input" @change="loadConversations">
            <option value="">Todos</option>
            <option value="open">Abertas</option>
            <option value="needs_human">Precisam humano</option>
            <option value="assigned">Assumidas</option>
            <option value="closed">Encerradas</option>
          </select>
        </div>

        <div v-if="store.isLoading && conversations.length === 0" class="state">
          <LoaderCircle :size="20" class="spin" />
          Carregando conversas...
        </div>
        <div v-else-if="conversations.length === 0" class="state">
          Nenhuma conversa registrada ainda.
        </div>

        <button
          v-for="conversation in conversations"
          :key="conversation._id"
          class="conversation-item"
          :class="{ active: selectedConversationId === conversation._id }"
          @click="selectConversation(conversation)"
        >
          <div class="avatar">{{ getConversationName(conversation).charAt(0).toUpperCase() }}</div>
          <div class="conversation-main">
            <div class="conversation-row">
              <strong>{{ getConversationName(conversation) }}</strong>
              <span>{{ formatDateTime(conversation.lastMessageAt || conversation.updatedAt) }}</span>
            </div>
            <div class="conversation-row muted">
              <small>{{ conversation.contactPhone }}</small>
              <small class="status-badge" :class="conversation.status">{{ getStatusLabel(conversation.status) }}</small>
            </div>
            <p v-if="conversation.humanReason" class="human-reason">{{ conversation.humanReason }}</p>
          </div>
          <span v-if="conversation.unreadCount" class="unread">{{ conversation.unreadCount }}</span>
        </button>
      </aside>

      <main class="chat-panel panel">
        <div v-if="!selectedConversation" class="empty-detail">
          <MessageSquare :size="36" />
          <h3>Selecione uma conversa</h3>
          <p>Essa área vai evoluir para a experiência estilo WhatsApp Web da clínica.</p>
        </div>

        <template v-else>
          <div class="chat-header">
            <div class="chat-title">
              <div class="avatar">{{ getConversationName(selectedConversation).charAt(0).toUpperCase() }}</div>
              <div>
                <h2>{{ getConversationName(selectedConversation) }}</h2>
                <p>{{ selectedConversation.contactPhone }} · {{ getModeLabel(selectedConversation) }}</p>
              </div>
            </div>
            <div class="chat-actions">
              <AppButton variant="secondary" @click="assignSelected">
                <UserCheck :size="16" />
                Assumir
              </AppButton>
              <AppButton
                v-if="!selectedConversation.aiPaused"
                variant="default"
                @click="pauseSelectedAi"
              >
                <Pause :size="16" />
                Pausar IA
              </AppButton>
              <AppButton v-else variant="default" @click="resumeSelectedAi">
                <Play :size="16" />
                Reativar IA
              </AppButton>
              <AppButton variant="default" @click="closeSelected">
                <CheckCircle :size="16" />
                Encerrar
              </AppButton>
            </div>
          </div>

          <div class="messages-list">
            <article
              v-for="message in selectedMessages"
              :key="message._id"
              class="message-bubble"
              :class="[message.direction, message.authorType]"
            >
              <div class="message-meta">
                <span>{{ message.authorType }}</span>
                <span>{{ formatDateTime(message.createdAt) }}</span>
              </div>
              <p>{{ message.body }}</p>
            </article>
          </div>

          <div class="reply-composer">
            <textarea
              v-model="replyMessage"
              rows="3"
              placeholder="Responder ao paciente pelo WhatsApp..."
              :disabled="selectedConversation.status === 'closed' || store.isSaving"
            ></textarea>
            <AppButton
              variant="primary"
              :disabled="!replyMessage.trim() || selectedConversation.status === 'closed' || store.isSaving"
              @click="sendReply"
            >
              <Send :size="16" />
              Enviar
            </AppButton>
          </div>

          <div class="composer internal">
            <textarea
              v-model="internalNote"
              rows="3"
              placeholder="Nota interna. Não será enviada ao paciente."
            ></textarea>
            <AppButton variant="primary" :disabled="!internalNote.trim()" @click="addNote">
              <Save :size="16" />
              Nota
            </AppButton>
          </div>
        </template>
      </main>

      <aside class="context-panel panel">
        <div v-if="selectedConversation">
          <h2>Contexto</h2>
          <div class="context-card">
            <Bot :size="18" />
            <div>
              <strong>{{ getModeLabel(selectedConversation) }}</strong>
              <p>{{ selectedConversation.humanReason || 'Sem alerta humano ativo.' }}</p>
            </div>
          </div>
          <div class="context-list">
            <span>Status</span>
            <strong>{{ getStatusLabel(selectedConversation.status) }}</strong>
            <span>Paciente</span>
            <strong>{{ selectedConversation.patient?.name || 'Nao vinculado' }}</strong>
            <span>Ultima mensagem</span>
            <strong>{{ formatDateTime(selectedConversation.lastMessageAt) }}</strong>
          </div>
        </div>
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
  grid-template-columns: minmax(280px, 0.85fr) minmax(0, 1.35fr) minmax(240px, 0.65fr);
  gap: 1rem;
  min-height: calc(100vh - 210px);
}

.panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  min-height: 0;
}

.conversation-list {
  overflow-y: auto;
}

.select-input,
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
  border: 1px solid transparent;
  background: transparent;
  border-radius: 10px;
  padding: 0.75rem;
  margin-top: 0.5rem;
  display: flex;
  gap: 0.75rem;
  text-align: left;
  cursor: pointer;
}

.conversation-item:hover,
.conversation-item.active {
  background: #f8fafc;
  border-color: #dbeafe;
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

.muted {
  color: #64748b;
}

.status-badge {
  display: inline-flex;
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
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--azul-principal);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
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
  background: #f8fafc;
  border-radius: 12px;
  min-height: 360px;
}

.message-bubble {
  max-width: 82%;
  padding: 0.75rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
}

.message-bubble.internal {
  background: #fffbeb;
  border-color: #fde68a;
}

.message-bubble.outbound {
  align-self: flex-end;
  background: #eef2ff;
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

@media (max-width: 1100px) {
  .zap-shell {
    grid-template-columns: 1fr;
  }

  .page-header,
  .chat-header,
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .composer,
  .reply-composer {
    grid-template-columns: 1fr;
  }
}
</style>
