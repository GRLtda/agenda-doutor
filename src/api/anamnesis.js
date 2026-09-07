import apiClient from './index'

const BASE_URL = '/v2/anamnesis'
const JSON_TIMEOUT = 15_000
const PDF_TIMEOUT = 30_000
const RETRYABLE_STATUS = new Set([500, 502, 503])

const wait = (milliseconds) => new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds))

export function createIdempotencyKey() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID()

  const random = globalThis.crypto?.getRandomValues
    ? globalThis.crypto.getRandomValues(new Uint32Array(4)).join('-')
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

  return `anamnesis-${random}`
}

async function submitWithRetry(url, payload, idempotencyKey) {
  let lastError

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await apiClient.put(url, payload, {
        timeout: JSON_TIMEOUT,
        headers: { 'Idempotency-Key': idempotencyKey },
      })
    } catch (error) {
      lastError = error
      const status = error.response?.status
      const isNetworkFailure = !error.response || error.code === 'ECONNABORTED'

      if (attempt === 2 || (!isNetworkFailure && !RETRYABLE_STATUS.has(status))) {
        throw error
      }

      const baseDelay = 1_000 * 2 ** attempt
      await wait(baseDelay + Math.floor(Math.random() * 250))
    }
  }

  throw lastError
}

export const getAnamnesisTemplates = (page = 1, limit = 100) =>
  apiClient.get(`${BASE_URL}/templates`, { params: { page, limit }, timeout: JSON_TIMEOUT })

export const createAnamnesisTemplate = (templateData) =>
  apiClient.post(`${BASE_URL}/templates`, templateData, { timeout: JSON_TIMEOUT })

export const deleteAnamnesisTemplate = (templateId) =>
  apiClient.delete(`${BASE_URL}/templates/${templateId}`, { timeout: JSON_TIMEOUT })

export const getAnamnesisTemplateById = (templateId) =>
  apiClient.get(`${BASE_URL}/templates/${templateId}`, { timeout: JSON_TIMEOUT })

export const updateAnamnesisTemplate = (templateId, templateData) =>
  apiClient.patch(`${BASE_URL}/templates/${templateId}`, templateData, { timeout: JSON_TIMEOUT })

export const assignAnamnesis = (patientId, payload) =>
  apiClient.post(`${BASE_URL}/patients/${patientId}/responses`, payload, { timeout: JSON_TIMEOUT })

export const getPublicAnamnesis = (token) =>
  apiClient.get(`${BASE_URL}/public/${encodeURIComponent(token)}`, { timeout: JSON_TIMEOUT })

export const submitPublicAnamnesis = (token, payload, idempotencyKey) =>
  submitWithRetry(
    `${BASE_URL}/public/${encodeURIComponent(token)}`,
    payload,
    idempotencyKey,
  )

export const getAnamnesisForPatient = (patientId, page = 1, limit = 100, status = 'ALL') =>
  apiClient.get(`${BASE_URL}/patients/${patientId}/responses`, {
    params: { page, limit, status },
    timeout: JSON_TIMEOUT,
  })

export const getAnamnesisResponse = (patientId, responseId) =>
  apiClient.get(`${BASE_URL}/patients/${patientId}/responses/${responseId}`, {
    timeout: JSON_TIMEOUT,
  })

export const updateAnamnesisResponse = (
  patientId,
  responseId,
  payload,
  idempotencyKey,
) =>
  submitWithRetry(
    `${BASE_URL}/patients/${patientId}/responses/${responseId}`,
    payload,
    idempotencyKey,
  )

export const getAnamnesisResponses = (
  page = 1,
  limit = 20,
  status = 'ACTIVE',
  search = '',
) =>
  apiClient.get(`${BASE_URL}/responses`, {
    params: { page, limit, status, ...(search ? { search } : {}) },
    timeout: JSON_TIMEOUT,
  })

export const downloadAnamnesisPdf = (patientId, responseId) =>
  apiClient.get(`${BASE_URL}/patients/${patientId}/responses/${responseId}/pdf`, {
    responseType: 'blob',
    timeout: PDF_TIMEOUT,
  })

export const rotateAnamnesisPublicAccess = (patientId, responseId, payload) =>
  apiClient.post(
    `${BASE_URL}/patients/${patientId}/responses/${responseId}/public-access`,
    payload,
    { timeout: JSON_TIMEOUT },
  )

export const revokeAnamnesisPublicAccess = (patientId, responseId) =>
  apiClient.delete(
    `${BASE_URL}/patients/${patientId}/responses/${responseId}/public-access`,
    { timeout: JSON_TIMEOUT },
  )
