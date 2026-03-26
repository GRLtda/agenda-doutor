import apiClient from './index'

export const fetchKnowledgeTree = () => apiClient.get('/knowledge-base/tree')

export const fetchKnowledgePageBySlug = (slug) =>
  apiClient.get(`/knowledge-base/pages/${encodeURIComponent(slug)}`)
