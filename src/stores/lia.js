import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import {
  cancelLiaAction,
  confirmLiaAction,
  createLiaConversation,
  deleteLiaConversation,
  getLiaConversation,
  getLiaMessages,
  listLiaConversations,
  sendLiaMessage,
} from '@/api/lia'

const STORAGE_PREFIX = 'lia.activeConversationId'

export const useLiaStore = defineStore('lia', () => {
  const activeConversationId = ref(null)
  const conversations = ref([])
  const messages = ref([])
  const isOpen = ref(false)
  const isLoading = ref(false)
  const isSending = ref(false)
  const isLoadingMore = ref(false)
  const nextCursor = ref(null)
  const error = ref(null)
  const initializedKey = ref(null)
  let loadVersion = 0

  const hasActiveConversation = computed(() => Boolean(activeConversationId.value))

  const storageKey = () => {
    const auth = useAuthStore()
    const userId = auth.user?._id || auth.user?.id
    const clinicId = auth.user?.clinic?._id || auth.user?.clinic?.id || auth.user?.clinic
    return userId && clinicId ? `${STORAGE_PREFIX}:${clinicId}:${userId}` : null
  }

  const persistActiveConversation = () => {
    const key = storageKey()
    if (!key) return
    if (activeConversationId.value) localStorage.setItem(key, activeConversationId.value)
    else localStorage.removeItem(key)
  }

  const replaceMessage = (message) => {
    const index = messages.value.findIndex((item) => item.id === message.id)
    if (index >= 0) messages.value.splice(index, 1, message)
    else messages.value.push(message)
  }

  async function loadConversations({ append = false } = {}) {
    if (append ? isLoadingMore.value : isLoading.value) return
    append ? (isLoadingMore.value = true) : (isLoading.value = true)
    try {
      const { data } = await listLiaConversations({ limit: 30, cursor: append ? nextCursor.value : undefined })
      conversations.value = append ? [...conversations.value, ...data.conversations] : data.conversations
      nextCursor.value = data.nextCursor || null
      return data.conversations
    } finally {
      append ? (isLoadingMore.value = false) : (isLoading.value = false)
    }
  }

  async function loadMessages(conversationId = activeConversationId.value) {
    if (!conversationId) {
      messages.value = []
      return []
    }
    const version = ++loadVersion
    isLoading.value = true
    try {
      const { data } = await getLiaMessages(conversationId)
      if (version !== loadVersion || activeConversationId.value !== conversationId) return []
      messages.value = data.messages
      return data.messages
    } catch (requestError) {
      if (requestError.response?.status === 404 && activeConversationId.value === conversationId) startNewConversation()
      throw requestError
    } finally {
      if (version === loadVersion) isLoading.value = false
    }
  }

  async function selectConversation(conversationId) {
    if (!conversationId || conversationId === activeConversationId.value) return loadMessages(conversationId)
    activeConversationId.value = conversationId
    persistActiveConversation()
    return loadMessages(conversationId)
  }

  function startNewConversation() {
    activeConversationId.value = null
    messages.value = []
    error.value = null
    persistActiveConversation()
  }

  async function ensureConversation() {
    if (activeConversationId.value) return activeConversationId.value
    const { data } = await createLiaConversation()
    activeConversationId.value = data.id
    persistActiveConversation()
    conversations.value.unshift({ ...data, lastMessagePreview: '' })
    return data.id
  }

  async function sendMessage(content, options = {}) {
    const message = content?.trim()
    if (!message || isSending.value) return null
    const temporaryMessage = {
      id: `local-${Date.now()}`,
      role: 'user',
      content: message,
      status: 'sending',
      retryOptions: options,
    }
    messages.value.push(temporaryMessage)
    isSending.value = true
    error.value = null
    let conversationId = null
    try {
      conversationId = await ensureConversation()
      const { data } = await sendLiaMessage(conversationId, message, options)
      const temporaryIndex = messages.value.findIndex((item) => item.id === temporaryMessage.id)
      if (temporaryIndex >= 0) messages.value.splice(temporaryIndex, 1, { ...data.userMessage, status: 'sent' })
      else replaceMessage({ ...data.userMessage, status: 'sent' })
      messages.value.push(data.message)
      await loadConversations()
      return data.message
    } catch (requestError) {
      if (conversationId) {
        try {
          await loadMessages(conversationId)
          const wasPersisted = messages.value.some((item) => item.role === 'user' && item.content === message)
          if (wasPersisted) return messages.value.at(-1)
          messages.value.push(temporaryMessage)
        } catch { /* preserve the retry state below */ }
      }
      temporaryMessage.status = 'failed'
      temporaryMessage.error = requestError.response?.data?.message || 'Não foi possível enviar.'
      error.value = temporaryMessage.error
      throw requestError
    } finally {
      isSending.value = false
    }
  }

  async function retryMessage(message, options = {}) {
    const index = messages.value.findIndex((item) => item.id === message.id)
    if (index >= 0) messages.value.splice(index, 1)
    return sendMessage(message.content, { ...(message.retryOptions || {}), ...options })
  }

  async function confirmAction(message, selectedConfirmation = null) {
    const confirmation = selectedConfirmation || message.metadata?.confirmation
    if (!confirmation?.id || confirmation.status !== 'pending' || isSending.value) return
    isSending.value = true
    try {
      const { data } = await confirmLiaAction(activeConversationId.value, confirmation.id)
      replaceMessage(data.message)
    } finally {
      isSending.value = false
    }
  }

  async function cancelAction(message, selectedConfirmation = null) {
    const confirmation = selectedConfirmation || message.metadata?.confirmation
    if (!confirmation?.id || confirmation.status !== 'pending' || isSending.value) return
    isSending.value = true
    try {
      const { data } = await cancelLiaAction(activeConversationId.value, confirmation.id)
      replaceMessage(data.message)
    } finally {
      isSending.value = false
    }
  }

  async function deleteConversation(conversationId) {
    await deleteLiaConversation(conversationId)
    conversations.value = conversations.value.filter((conversation) => conversation.id !== conversationId)
    if (activeConversationId.value === conversationId) {
      const nextConversation = conversations.value[0]
      if (nextConversation) await selectConversation(nextConversation.id)
      else startNewConversation()
    }
  }

  async function initialize() {
    const key = storageKey()
    if (!key || initializedKey.value === key) return
    initializedKey.value = key
    const storedConversationId = localStorage.getItem(key)
    await loadConversations()
    if (storedConversationId) {
      activeConversationId.value = storedConversationId
      try {
        await loadMessages(storedConversationId)
        if (!conversations.value.some((item) => item.id === storedConversationId)) {
          const { data } = await getLiaConversation(storedConversationId)
          conversations.value.unshift({ ...data, lastMessagePreview: messages.value.at(-1)?.content || '' })
        }
      } catch {
        startNewConversation()
      }
    } else {
      startNewConversation()
    }
  }

  return {
    activeConversationId, conversations, messages, isOpen, isLoading, isSending, isLoadingMore, nextCursor, error, hasActiveConversation,
    initialize, loadConversations, loadMore: () => nextCursor.value && loadConversations({ append: true }), loadMessages,
    selectConversation, startNewConversation, sendMessage, retryMessage, confirmAction, cancelAction, deleteConversation,
  }
})
