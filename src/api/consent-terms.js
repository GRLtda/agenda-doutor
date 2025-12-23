import apiClient from './index'

// --- TEMPLATES ---

// Busca a lista de todos os modelos
export const getConsentTermTemplates = () => {
    return apiClient.get('/consent-terms/templates')
}

// Cria um novo modelo
export const createConsentTermTemplate = (templateData) => {
    return apiClient.post('/consent-terms/templates', templateData)
}

// Busca um modelo completo pelo ID
export const getConsentTermTemplateById = (templateId) => {
    return apiClient.get(`/consent-terms/templates/${templateId}`)
}

// Atualiza um modelo pelo ID
export const updateConsentTermTemplate = (templateId, templateData) => {
    return apiClient.put(`/consent-terms/templates/${templateId}`, templateData)
}

// Deleta um modelo pelo ID
export const deleteConsentTermTemplate = (templateId) => {
    return apiClient.delete(`/consent-terms/templates/${templateId}`)
}

// Duplica um modelo
export const duplicateConsentTermTemplate = (templateId) => {
    return apiClient.post(`/consent-terms/templates/${templateId}/duplicate`)
}

// --- RESPOSTAS (PACIENTE/CLÍNICA) ---

// Atribui um termo a um paciente
export const assignConsentTerm = (patientId, payload) => {
    // payload: { templateId, tokenTtlDays?, sendNotification? }
    return apiClient.post(`/patients/${patientId}/consent-terms`, payload)
}

// Busca todos os termos de um paciente
export const getConsentTermsForPatient = (patientId, params = {}) => {
    return apiClient.get(`/patients/${patientId}/consent-terms`, { params })
}

// Busca um termo específico do paciente (com assinatura)
export const getConsentTermById = (patientId, termId) => {
    return apiClient.get(`/patients/${patientId}/consent-terms/${termId}`)
}

// Busca termos pendentes da clínica
export const getPendingConsentTerms = (page = 1, limit = 20) => {
    return apiClient.get('/consent-terms/pending', {
        params: { page, limit }
    })
}

// Download do PDF do termo assinado
export const downloadConsentTermPdf = (patientId, termId) => {
    return apiClient.get(`/patients/${patientId}/consent-terms/${termId}/pdf`, {
        responseType: 'blob'
    })
}

// --- PÚBLICAS (PACIENTE COM LINK) ---

// Busca o termo público usando o token
export const getPublicConsentTerm = (token) => {
    return apiClient.get(`/consent-terms/public/${token}`)
}

// Paciente submete assinatura
export const submitConsentTermSignature = (token, payload) => {
    // payload: { signatureData, acceptedTerms, identityConfirmation }
    return apiClient.put(`/consent-terms/public/${token}`, payload)
}
