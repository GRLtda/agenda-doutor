import apiClient from './index'
import { sendLiaMessageStream } from './liaStream'

export const getLiaAccess = () => apiClient.get('/lia/access')

export const createLiaConversation = () => apiClient.post('/lia/conversations')

export const listLiaConversations = ({ limit = 30, cursor, search } = {}, { signal } = {}) =>
  apiClient.get('/lia/conversations', { params: { limit, ...(cursor ? { cursor } : {}), ...(search !== undefined ? { search } : {}) }, ...(signal ? { signal } : {}) })

export const updateLiaConversation = (conversationId, changes) =>
  apiClient.patch(`/lia/conversations/${conversationId}`, changes)

export const getLiaConversation = (conversationId) =>
  apiClient.get(`/lia/conversations/${conversationId}`)

export const getLiaMessages = (conversationId, params = {}) =>
  apiClient.get(`/lia/conversations/${conversationId}/messages`, { params })

export const getLiaReportPage = (conversationId, reportId, page, signal) =>
  apiClient.get(`/lia/conversations/${conversationId}/reports/${reportId}`, { params: { page }, signal })

export const transcribeLiaAudio = (audio, signal) => {
  const form = new FormData(); form.append('audio', audio, 'mensagem.wav')
  return apiClient.post('/lia/transcriptions', form, { signal, headers: { 'Content-Type': undefined }, timeout: 35000 })
}

export const sendLiaMessage = (conversationId, message, options = {}, transport = {}) =>
  sendLiaMessageStream(conversationId, message, options, transport)

export const submitLiaFeedback = (conversationId, messageId, feedback) =>
  apiClient.post(`/lia/conversations/${conversationId}/messages/${messageId}/feedback`, feedback)

export const confirmLiaAction = (conversationId, actionId) =>
  apiClient.post(`/lia/conversations/${conversationId}/actions/${actionId}/confirm`)

export const cancelLiaAction = (conversationId, actionId) =>
  apiClient.post(`/lia/conversations/${conversationId}/actions/${actionId}/cancel`)

export const deleteLiaConversation = (conversationId) =>
  apiClient.delete(`/lia/conversations/${conversationId}`)
