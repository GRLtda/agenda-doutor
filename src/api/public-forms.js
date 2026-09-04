import api from './index'

export const listPublicForms = () => api.get('/public-forms')
export const getPublicFormAdmin = (id) => api.get(`/public-forms/${id}`)
export const createPublicForm = (payload) => api.post('/public-forms', payload)
export const updatePublicForm = (id, payload) => api.put(`/public-forms/${id}`, payload)
export const publishPublicForm = (id) => api.post(`/public-forms/${id}/publish`)
export const disablePublicForm = (id) => api.post(`/public-forms/${id}/disable`)
export const regeneratePublicFormToken = (id) => api.post(`/public-forms/${id}/regenerate-token`)
export const getPublicForm = (token) => api.get(`/public/forms/${token}`)
export const submitPublicForm = (token, payload, idempotencyKey) => api.post(`/public/forms/${token}/submissions`, payload, { headers: { 'Idempotency-Key': idempotencyKey } })
