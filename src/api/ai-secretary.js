import apiClient from './index'

export const getAiSecretarySummary = () => {
  return apiClient.get('/v2/ai-secretary/summary')
}

export const getAiSecretarySettings = () => {
  return apiClient.get('/v2/ai-secretary/settings')
}

export const updateAiSecretarySettings = (payload) => {
  return apiClient.put('/v2/ai-secretary/settings', payload)
}

export const listAiKnowledgeItems = (params = {}) => {
  return apiClient.get('/v2/ai-secretary/knowledge', { params })
}

export const createAiKnowledgeItem = (payload) => {
  return apiClient.post('/v2/ai-secretary/knowledge', payload)
}

export const updateAiKnowledgeItem = (id, payload) => {
  return apiClient.patch(`/v2/ai-secretary/knowledge/${id}`, payload)
}

export const deleteAiKnowledgeItem = (id) => {
  return apiClient.delete(`/v2/ai-secretary/knowledge/${id}`)
}

export const listAiConversations = (params = {}) => {
  return apiClient.get('/v2/ai-secretary/conversations', { params })
}

export const getAiConversation = (id) => {
  return apiClient.get(`/v2/ai-secretary/conversations/${id}`)
}

export const assignAiConversationToMe = (id) => {
  return apiClient.post(`/v2/ai-secretary/conversations/${id}/assign-to-me`)
}

export const closeAiConversation = (id) => {
  return apiClient.post(`/v2/ai-secretary/conversations/${id}/close`)
}

export const pauseAiConversation = (id, reason) => {
  return apiClient.post(`/v2/ai-secretary/conversations/${id}/pause-ai`, { reason })
}

export const resumeAiConversation = (id) => {
  return apiClient.post(`/v2/ai-secretary/conversations/${id}/resume-ai`)
}

export const addAiInternalMessage = (id, body) => {
  return apiClient.post(`/v2/ai-secretary/conversations/${id}/internal-message`, { body })
}

export const sendAiConversationReply = (id, body) => {
  return apiClient.post(`/v2/ai-secretary/conversations/${id}/reply`, { body })
}
