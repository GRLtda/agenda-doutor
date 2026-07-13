import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useToast } from 'vue-toastification'
import {
  addAiInternalMessage,
  assignAiConversationToMe,
  closeAiConversation,
  createAiKnowledgeItem,
  deleteAiKnowledgeItem,
  getAiConversation,
  getAiSecretarySummary,
  listAiConversations,
  listAiKnowledgeItems,
  pauseAiConversation,
  resumeAiConversation,
  sendAiConversationReply,
  updateAiKnowledgeItem,
  updateAiSecretarySettings,
} from '@/api/ai-secretary'

function unwrap(response) {
  return response?.data?.data ?? response?.data ?? null
}

function getApiErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error?.message ||
    error.response?.data?.error ||
    fallback
  )
}

export const useAiSecretaryStore = defineStore('aiSecretary', () => {
  const toast = useToast()

  const settings = ref(null)
  const counters = ref({ open: 0, needsHuman: 0, assigned: 0, knowledgeCount: 0 })
  const conversations = ref([])
  const selectedConversation = ref(null)
  const selectedMessages = ref([])
  const knowledgeItems = ref([])
  const pagination = ref({ total: 0, page: 1, limit: 25, pages: 1 })
  const isLoading = ref(false)
  const isSaving = ref(false)

  async function fetchSummary() {
    isLoading.value = true
    try {
      const data = unwrap(await getAiSecretarySummary())
      settings.value = data.settings
      counters.value = data.counters || counters.value
      return data
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Nao foi possivel carregar a Secretaria IA.'))
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function saveSettings(payload) {
    isSaving.value = true
    try {
      settings.value = unwrap(await updateAiSecretarySettings(payload))
      toast.success('Configuracoes salvas.')
      return settings.value
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao salvar configuracoes.'))
      throw error
    } finally {
      isSaving.value = false
    }
  }

  async function fetchKnowledgeItems(params = {}) {
    const data = unwrap(await listAiKnowledgeItems(params))
    knowledgeItems.value = data || []
    return knowledgeItems.value
  }

  async function createKnowledgeItem(payload) {
    isSaving.value = true
    try {
      const item = unwrap(await createAiKnowledgeItem(payload))
      knowledgeItems.value = [item, ...knowledgeItems.value]
      toast.success('Item adicionado a base de conhecimento.')
      await fetchSummary()
      return item
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao criar item.'))
      throw error
    } finally {
      isSaving.value = false
    }
  }

  async function updateKnowledgeItem(id, payload) {
    isSaving.value = true
    try {
      const item = unwrap(await updateAiKnowledgeItem(id, payload))
      knowledgeItems.value = knowledgeItems.value.map((current) => (current._id === id ? item : current))
      toast.success('Item atualizado.')
      return item
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao atualizar item.'))
      throw error
    } finally {
      isSaving.value = false
    }
  }

  async function removeKnowledgeItem(id) {
    if (!confirm('Remover este item da base de conhecimento?')) return
    try {
      await deleteAiKnowledgeItem(id)
      knowledgeItems.value = knowledgeItems.value.filter((item) => item._id !== id)
      toast.success('Item removido.')
      await fetchSummary()
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao remover item.'))
      throw error
    }
  }

  async function fetchConversations(page = 1, filters = {}) {
    isLoading.value = true
    try {
      const data = unwrap(await listAiConversations({ page, limit: pagination.value.limit, ...filters }))
      conversations.value = data.items || []
      pagination.value = {
        total: data.total || 0,
        page: data.page || 1,
        limit: data.limit || 25,
        pages: Math.ceil((data.total || 0) / (data.limit || 25)),
      }
      return conversations.value
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao carregar conversas.'))
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function fetchConversation(id) {
    const data = unwrap(await getAiConversation(id))
    selectedConversation.value = data.conversation
    selectedMessages.value = data.messages || []
    return data
  }

  async function assignToMe(id) {
    const conversation = unwrap(await assignAiConversationToMe(id))
    selectedConversation.value = conversation
    await fetchConversations(pagination.value.page)
    toast.success('Conversa assumida.')
    return conversation
  }

  async function closeConversation(id) {
    const conversation = unwrap(await closeAiConversation(id))
    selectedConversation.value = conversation
    await fetchConversations(pagination.value.page)
    toast.success('Conversa encerrada.')
    return conversation
  }

  async function pauseAi(id, reason = 'IA pausada pela equipe') {
    const conversation = unwrap(await pauseAiConversation(id, reason))
    selectedConversation.value = conversation
    await fetchConversations(pagination.value.page)
    toast.success('IA pausada nesta conversa.')
    return conversation
  }

  async function resumeAi(id) {
    const conversation = unwrap(await resumeAiConversation(id))
    selectedConversation.value = conversation
    await fetchConversations(pagination.value.page)
    toast.success('IA reativada nesta conversa.')
    return conversation
  }

  async function addInternalNote(id, body) {
    const message = unwrap(await addAiInternalMessage(id, body))
    selectedMessages.value = [...selectedMessages.value, message]
    await fetchConversation(id)
    return message
  }

  async function sendReply(id, body) {
    isSaving.value = true
    try {
      const data = unwrap(await sendAiConversationReply(id, body))
      if (data?.message) {
        selectedMessages.value = [...selectedMessages.value, data.message]
      }
      if (data?.conversation) {
        selectedConversation.value = data.conversation
      }
      await fetchConversation(id)
      await fetchConversations(pagination.value.page)
      toast.success('Mensagem enviada pelo WhatsApp.')
      return data
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao enviar resposta.'))
      throw error
    } finally {
      isSaving.value = false
    }
  }

  return {
    settings,
    counters,
    conversations,
    selectedConversation,
    selectedMessages,
    knowledgeItems,
    pagination,
    isLoading,
    isSaving,
    fetchSummary,
    saveSettings,
    fetchKnowledgeItems,
    createKnowledgeItem,
    updateKnowledgeItem,
    removeKnowledgeItem,
    fetchConversations,
    fetchConversation,
    assignToMe,
    closeConversation,
    pauseAi,
    resumeAi,
    addInternalNote,
    sendReply,
  }
})
