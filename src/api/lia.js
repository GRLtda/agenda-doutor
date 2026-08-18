import apiClient from './index'

export const createLiaConversation = () => apiClient.post('/lia/conversations')

export const listLiaConversations = ({ limit = 30, cursor } = {}) =>
  apiClient.get('/lia/conversations', { params: { limit, ...(cursor ? { cursor } : {}) } })

export const getLiaConversation = (conversationId) =>
  apiClient.get(`/lia/conversations/${conversationId}`)

export const getLiaMessages = (conversationId) =>
  apiClient.get(`/lia/conversations/${conversationId}/messages`)

export const sendLiaMessage = (conversationId, message, options = {}) =>
  apiClient.post(`/lia/conversations/${conversationId}/messages`, { message, ...options })

export const confirmLiaAction = (conversationId, actionId) =>
  apiClient.post(`/lia/conversations/${conversationId}/actions/${actionId}/confirm`)

export const cancelLiaAction = (conversationId, actionId) =>
  apiClient.post(`/lia/conversations/${conversationId}/actions/${actionId}/cancel`)

export const deleteLiaConversation = (conversationId) =>
  apiClient.delete(`/lia/conversations/${conversationId}`)
