// api/documents.js

import apiClient from './index'

// ==================== DOCUMENT TYPES ====================

/**
 * Lista todos os tipos de documento da clínica
 * @param {boolean} includeInactive - Incluir tipos inativos
 */
export const getDocumentTypes = (includeInactive = false) => {
    return apiClient.get('/documents/types', {
        params: { includeInactive }
    })
}

/**
 * Cria um novo tipo de documento
 * @param {object} data - { name, code, description, template, requiresSignature, fields }
 */
export const createDocumentType = (data) => {
    return apiClient.post('/documents/types', data)
}

/**
 * Atualiza um tipo de documento existente
 */
export const updateDocumentType = (id, data) => {
    return apiClient.put(`/documents/types/${id}`, data)
}

// ==================== DOCUMENT CRUD ====================

/**
 * Lista documentos com filtros e paginação
 * @param {object} params - { patientId, status, documentTypeId, page, limit }
 */
export const getDocuments = (params = {}) => {
    return apiClient.get('/documents', { params })
}

/**
 * Obtém detalhes de um documento específico
 */
export const getDocument = (id) => {
    return apiClient.get(`/documents/${id}`)
}

/**
 * Cria um novo documento (rascunho)
 * @param {object} data - { patientId, documentTypeId, title, content }
 */
export const createDocument = (data) => {
    return apiClient.post('/documents', data)
}

/**
 * Atualiza um documento existente (apenas rascunho ou falha na assinatura)
 * @param {object} data - { title, content, changeDescription }
 */
export const updateDocument = (id, data) => {
    return apiClient.put(`/documents/${id}`, data)
}

/**
 * Cancela um documento
 * @param {string} reason - Motivo do cancelamento
 */
export const cancelDocument = (id, reason) => {
    return apiClient.delete(`/documents/${id}`, {
        data: { reason }
    })
}

// ==================== PDF GENERATION ====================

/**
 * Gera o PDF preview do documento
 */
export const generatePdf = (id) => {
    return apiClient.post(`/documents/${id}/pdf`)
}

// ==================== DIGITAL SIGNATURE ====================

/**
 * Solicita assinatura digital do documento
 * Retorna o PDF em base64 e opções de assinatura para o Web PKI
 * @param {string} signatureAppearance - 'visible' ou 'invisible'
 */
export const requestSignature = (id, signatureAppearance = 'invisible') => {
    return apiClient.post(`/documents/${id}/request-signature`, {
        signatureAppearance
    })
}

/**
 * Envia o PDF assinado para o backend
 * @param {object} data - { signedPdfBase64, originalPdfHash, signatureAppearance, certificateInfo }
 */
export const submitSignedPdf = (id, data) => {
    return apiClient.post(`/documents/${id}/signed`, data)
}

/**
 * Obtém informações da assinatura do documento
 */
export const getSignature = (id) => {
    return apiClient.get(`/documents/${id}/signature`)
}

// ==================== DOWNLOAD & SEND ====================

/**
 * Obtém URL para download do documento
 */
export const downloadDocument = (id) => {
    return apiClient.get(`/documents/${id}/download`)
}

/**
 * Envia documento ao paciente
 * @param {object} data - { method: 'email'|'whatsapp', email?, phone? }
 */
export const sendDocument = (id, data) => {
    return apiClient.post(`/documents/${id}/send`, data)
}

// ==================== HISTORY & VERSIONS ====================

/**
 * Obtém histórico de auditoria do documento
 */
export const getHistory = (id) => {
    return apiClient.get(`/documents/${id}/history`)
}

/**
 * Obtém versões do documento
 */
export const getVersions = (id) => {
    return apiClient.get(`/documents/${id}/versions`)
}
