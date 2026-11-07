import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  cancelLiaAction, confirmLiaAction, createLiaConversation, deleteLiaConversation,
  getLiaAccess, getLiaConversation, getLiaMessages, listLiaConversations, sendLiaMessage,
} from '@/api/lia'

const STORAGE_PREFIX = 'lia.activeConversationId'
const newRequestId = () => globalThis.crypto?.randomUUID?.() || 'lia-' + Date.now() + '-' + Math.random().toString(36).slice(2)

export const useLiaStore = defineStore('lia', () => {
  const activeConversationId = ref(null)
  const conversations = ref([])
  const messages = ref([])
  const isOpen = ref(false)
  const isAvailable = ref(false)
  const isSending = ref(false)
  const streamStatus = ref(null)
  const streamText = ref('')
  let sendController = null
  const isLoadingMore = ref(false)
  const loadingConversations = ref(false)
  const loadingMessages = ref(false)
  const nextCursor = ref(null)
  const messagesCursor = ref(null)
  const error = ref(null)
  const initializedKey = ref(null)
  const isLoading = computed(() => loadingConversations.value || loadingMessages.value)
  const hasActiveConversation = computed(() => Boolean(activeConversationId.value))
  let identityVersion = 0
  let viewVersion = 0
  let loadVersion = 0
  let listVersion = 0
  let initializePromise = null

  function storageKey() {
    const auth = useAuthStore()
    const userId = auth.user?._id || auth.user?.id
    const clinicId = auth.user?.clinic?._id || auth.user?.clinic?.id || auth.user?.clinic
    return userId && clinicId ? STORAGE_PREFIX + ':' + clinicId + ':' + userId : null
  }
  function identityKey() {
    const user = useAuthStore().user
    if (!user) return null
    return JSON.stringify([user._id || user.id, user.clinic?._id || user.clinic?.id || user.clinic || null, user.role, user.permissions || null])
  }
  let lastIdentity = identityKey()
  function reset() {
    sendController?.abort()
    sendController = null
    streamStatus.value = null
    streamText.value = ''
    identityVersion++
    viewVersion++
    loadVersion++
    listVersion++
    activeConversationId.value = null
    conversations.value = []
    messages.value = []
    nextCursor.value = null
    messagesCursor.value = null
    isOpen.value = false
    isAvailable.value = false
    isSending.value = false
    isLoadingMore.value = false
    loadingConversations.value = false
    loadingMessages.value = false
    error.value = null
    initializedKey.value = null
    initializePromise = null
    lastIdentity = identityKey()
  }
  watch(identityKey, () => reset(), { flush: 'sync' })
  function ensureIdentity() {
    if (lastIdentity !== identityKey()) reset()
  }
  function handleAccessDenied(requestError) {
    if (!['LIA_NOT_AVAILABLE', 'LIA_ACCESS_CHANGED', 'AUTH_SESSION_REVOKED'].includes(requestError.response?.data?.code)) return false
    reset()
    initializedKey.value = identityKey()
    return true
  }
  const identityTicket = () => ({ identity: identityKey(), identityVersion })
  const sameIdentity = ticket => ticket.identity === identityKey() && ticket.identityVersion === identityVersion
  const viewTicket = () => ({ ...identityTicket(), viewVersion, conversationId: activeConversationId.value })
  const sameView = ticket => sameIdentity(ticket) && ticket.viewVersion === viewVersion && ticket.conversationId === activeConversationId.value

  function persistActiveConversation() {
    const key = storageKey()
    if (!key) return
    if (activeConversationId.value) localStorage.setItem(key, activeConversationId.value)
    else localStorage.removeItem(key)
  }
  function replaceMessage(message) {
    if (!message) return
    const index = messages.value.findIndex(item => item.id === message.id)
    if (index >= 0) messages.value.splice(index, 1, message)
    else messages.value.push(message)
  }
  async function loadConversations({ append = false } = {}) {
    ensureIdentity()
    if (!isAvailable.value || !identityKey() || (append && isLoadingMore.value)) return []
    const ticket = identityTicket()
    const version = ++listVersion
    if (append) isLoadingMore.value = true
    else loadingConversations.value = true
    try {
      const { data } = await listLiaConversations({ limit: 30, cursor: append ? nextCursor.value : undefined })
      if (!sameIdentity(ticket) || version !== listVersion) return []
      conversations.value = append ? [...conversations.value, ...data.conversations] : data.conversations
      nextCursor.value = data.nextCursor || null
      return data.conversations
    } catch (requestError) {
      if (sameIdentity(ticket)) handleAccessDenied(requestError)
      throw requestError
    } finally {
      if (sameIdentity(ticket) && version === listVersion) {
        isLoadingMore.value = false
        loadingConversations.value = false
      }
    }
  }
  async function loadMessages(conversationId = activeConversationId.value, { older = false } = {}) {
    ensureIdentity()
    if (!isAvailable.value || !conversationId) return []
    const ticket = viewTicket()
    const version = ++loadVersion
    loadingMessages.value = true
    try {
      const { data } = await getLiaMessages(conversationId, { limit: 50, before: older ? messagesCursor.value : undefined })
      if (!sameView(ticket) || conversationId !== activeConversationId.value || version !== loadVersion) return []
      messages.value = older
        ? [...data.messages.filter(item => !messages.value.some(current => current.id === item.id)), ...messages.value]
        : data.messages
      messagesCursor.value = data.nextCursor || null
      return data.messages
    } catch (requestError) {
      if (sameView(ticket) && handleAccessDenied(requestError)) throw requestError
      if (sameView(ticket)) {
        if (requestError.response?.status === 404) startNewConversation()
        else error.value = requestError.response?.data?.message || 'Não foi possível carregar as mensagens.'
      }
      throw requestError
    } finally {
      if (sameView(ticket) && version === loadVersion) loadingMessages.value = false
    }
  }
  function invalidateView() {
    sendController?.abort()
    sendController = null
    streamStatus.value = null
    streamText.value = ''
    viewVersion++
    loadVersion++
    isSending.value = false
    loadingMessages.value = false
    messages.value = []
    messagesCursor.value = null
    error.value = null
  }
  async function selectConversation(conversationId) {
    ensureIdentity()
    if (!isAvailable.value || !conversationId) return []
    if (conversationId !== activeConversationId.value) {
      invalidateView()
      activeConversationId.value = conversationId
      persistActiveConversation()
    }
    return loadMessages(conversationId)
  }
  function startNewConversation() {
    ensureIdentity()
    invalidateView()
    activeConversationId.value = null
    persistActiveConversation()
  }
  async function ensureConversation(ticket) {
    if (activeConversationId.value) return activeConversationId.value
    const { data } = await createLiaConversation()
    if (!sameView(ticket)) return null
    activeConversationId.value = data.id
    ticket.conversationId = data.id
    persistActiveConversation()
    conversations.value.unshift({ ...data, lastMessagePreview: '' })
    return data.id
  }
  async function sendMessage(content, options = {}) {
    ensureIdentity()
    const message = content?.trim()
    if (!isAvailable.value || !message || isSending.value || !identityKey()) return null
    const ticket = viewTicket()
    const clientMessageId = options.clientMessageId || newRequestId()
    const retryOptions = { ...options, clientMessageId }
    const temporaryMessage = { id: 'local-' + clientMessageId, role: 'user', content: message, status: 'sending', retryOptions }
    messages.value.push(temporaryMessage)
    isSending.value = true
    streamText.value = ''
    streamStatus.value = { phase: 'starting', label: 'Enviando sua solicitação' }
    const controller = new AbortController()
    sendController = controller
    error.value = null
    let conversationId = null
    try {
      conversationId = await ensureConversation(ticket)
      if (!conversationId || !sameView(ticket)) return null
      const { data } = await sendLiaMessage(conversationId, message, retryOptions, { signal: controller.signal, onEvent: event => {
        if (!sameView(ticket) || controller.signal.aborted) return
        if (event.type === 'status') streamStatus.value = { phase: event.phase, label: event.label }
        if (event.type === 'text') { streamText.value = event.content; streamStatus.value = { phase: 'writing', label: 'Escrevendo a resposta' } }
      } })
      if (!sameView(ticket)) return null
      streamText.value = ''
      streamStatus.value = { phase: 'done', label: 'Resposta concluída' }
      messages.value = messages.value.filter(item => item.id !== temporaryMessage.id)
      replaceMessage({ ...data.userMessage, status: 'sent' })
      replaceMessage(data.message)
      // Refreshing the history list must not turn a successful answer into a failed send.
      await loadConversations().catch(() => {})
      return data.message
    } catch (requestError) {
      if (!sameView(ticket)) return null
      streamText.value = ''
      if (handleAccessDenied(requestError)) throw requestError
      if (conversationId) {
        try {
          await loadMessages(conversationId)
          if (!sameView(ticket)) return null
          const persisted = messages.value.find(item => item.role === 'user' && item.metadata?.clientMessageId === clientMessageId)
          const response = persisted && messages.value.find(item => item.role === 'assistant' && item.metadata?.replyTo === persisted.id)
          if (response) return response
          if (persisted) temporaryMessage.id = persisted.id
        } catch { /* keep a visible retryable failure */ }
      }
      if (!sameView(ticket)) return null
      temporaryMessage.status = 'failed'
      temporaryMessage.error = requestError.response?.data?.message || 'Não foi possível obter a resposta da Lia. Tente novamente.'
      replaceMessage(temporaryMessage)
      error.value = temporaryMessage.error
      throw requestError
    } finally {
      if (sendController === controller) sendController = null
      if (sameView(ticket)) { isSending.value = false; streamStatus.value = null; streamText.value = '' }
    }
  }
  async function retryMessage(message, options = {}) {
    messages.value = messages.value.filter(item => item.id !== message.id)
    return sendMessage(message.content, { ...options, ...(message.retryOptions || {}) })
  }
  async function updateAction(message, selectedConfirmation, operation) {
    ensureIdentity()
    if (!isAvailable.value) return
    const confirmation = selectedConfirmation || message.metadata?.confirmation
    if (!confirmation?.id || !(confirmation.status === 'pending' || confirmation.status === 'processing' && confirmation.recoverable) || isSending.value) return
    const ticket = viewTicket()
    isSending.value = true
    streamStatus.value = { phase: 'confirmation', label: operation === confirmLiaAction ? 'Verificando e confirmando a ação' : 'Cancelando a ação solicitada' }
    error.value = null
    try {
      const { data } = await operation(ticket.conversationId, confirmation.id)
      if (sameView(ticket)) replaceMessage(data.message)
    } catch (requestError) {
      if (!sameView(ticket)) return
      if (handleAccessDenied(requestError)) return
      await loadMessages(ticket.conversationId).catch(() => {})
      if (sameView(ticket)) {
        const current = messages.value.flatMap(item => item.metadata?.confirmations || [item.metadata?.confirmation]).find(item => item?.id === confirmation.id)
        error.value = current?.status === 'success' ? null : requestError.response?.data?.message || 'Não foi possível concluir a ação. Confira o estado do card.'
      }
    } finally {
      if (sameView(ticket)) { isSending.value = false; streamStatus.value = null }
    }
  }
  const confirmAction = (message, confirmation) => updateAction(message, confirmation, confirmLiaAction)
  const cancelAction = (message, confirmation) => updateAction(message, confirmation, cancelLiaAction)

  async function deleteConversation(conversationId) {
    ensureIdentity()
    if (!isAvailable.value) return
    const ticket = identityTicket()
    try { await deleteLiaConversation(conversationId) } catch (requestError) {
      if (sameIdentity(ticket)) handleAccessDenied(requestError)
      throw requestError
    }
    if (!sameIdentity(ticket)) return
    conversations.value = conversations.value.filter(item => item.id !== conversationId)
    if (activeConversationId.value === conversationId) {
      if (conversations.value[0]) await selectConversation(conversations.value[0].id)
      else startNewConversation()
    }
  }
  async function initialize() {
    ensureIdentity()
    const key = identityKey()
    if (!key || initializedKey.value === key) return
    if (initializePromise) return initializePromise
    error.value = null
    const ticket = viewTicket()
    const storedConversationId = storageKey() && localStorage.getItem(storageKey())
    const pending = (async () => {
      try {
        const { data: access } = await getLiaAccess()
        if (!sameView(ticket)) return
        isAvailable.value = access?.enabled === true
        if (!isAvailable.value) {
          reset()
          initializedKey.value = key
          return
        }
        await loadConversations()
        if (!sameView(ticket)) return
        if (storedConversationId) {
          activeConversationId.value = storedConversationId
          ticket.conversationId = storedConversationId
          try {
            await loadMessages(storedConversationId)
            if (!sameView(ticket)) return
            if (!conversations.value.some(item => item.id === storedConversationId)) {
              const { data } = await getLiaConversation(storedConversationId)
              if (!sameView(ticket)) return
              conversations.value.unshift({ ...data, lastMessagePreview: messages.value.at(-1)?.content || '' })
            }
          } catch (requestError) {
            if (requestError.response?.status !== 404) throw requestError
          }
        }
        if (sameIdentity(ticket)) initializedKey.value = key
      } catch (requestError) {
        if (sameIdentity(ticket)) isAvailable.value = false
        if (sameIdentity(ticket)) error.value = requestError.response?.data?.message || 'Não foi possível carregar a Lia. Abra novamente para tentar.'
      } finally {
        if (initializePromise === pending) initializePromise = null
      }
    })()
    initializePromise = pending
    return pending
  }
  return {
    activeConversationId, conversations, messages, isOpen, isAvailable, isLoading, isSending, isLoadingMore, streamStatus, streamText,
    nextCursor, messagesCursor, error, hasActiveConversation, initialize, loadConversations,
    loadMore: () => loadConversations({ append: true }).catch(() => { error.value = 'Não foi possível carregar mais conversas.' }), loadMessages,
    loadOlderMessages: () => messagesCursor.value && loadMessages(activeConversationId.value, { older: true }).catch(() => []),
    selectConversation, startNewConversation, sendMessage, retryMessage, confirmAction, cancelAction, deleteConversation, reset,
  }
})
