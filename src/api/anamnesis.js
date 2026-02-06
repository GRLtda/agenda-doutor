import apiClient from './index'

// Busca a lista de todos os modelos
export const getAnamnesisTemplates = () => {
  return apiClient.get('/anamnesis-templates')
}

// Cria um novo modelo
export const createAnamnesisTemplate = (templateData) => {
  return apiClient.post('/anamnesis-templates', templateData)
}

// Deleta um modelo pelo ID
export const deleteAnamnesisTemplate = (templateId) => {
  return apiClient.delete(`/anamnesis-templates/${templateId}`)
}

// Busca um modelo completo pelo ID
export const getAnamnesisTemplateById = (templateId) => {
  return apiClient.get(`/anamnesis-templates/${templateId}`)
}

// Atualiza um modelo pelo ID
export const updateAnamnesisTemplate = (templateId, templateData) => {
  return apiClient.put(`/anamnesis-templates/${templateId}`, templateData)
}

// Atribui uma anamnese (cria uma resposta pendente)
export const assignAnamnesis = (patientId, payload) => {
  // O backend espera { templateId, mode, tokenTtlDays, sendNotification }
  return apiClient.post(`/patients/${patientId}/anamnesis`, payload)
}

// Busca o formulário público usando o token do paciente
export const getPublicAnamnesis = (token) => {
  return apiClient.get(`/anamnesis/public/${token}`)
}

export const submitPublicAnamnesis = (token, payload) => {
  return apiClient.put(`/anamnesis/public/${token}`, payload)
}

// Busca todas as respostas de anamnese de um paciente
export const getAnamnesisForPatient = (patientId) => {
  return apiClient.get(`/patients/${patientId}/anamnesis`)
}

// ✨ FUNÇÃO ADICIONADA ✨
// Médico atualiza as respostas de uma anamnese
export const updateAnamnesisResponse = (patientId, responseId, payload) => {
  // 'payload' é o objeto { answers: [...] }
  return apiClient.put(`/patients/${patientId}/anamnesis/${responseId}`, payload)
}

// Busca todas as anamneses pendentes da clínica com paginação
export const getPendingAnamneses = (page = 1, limit = 20) => {
  return apiClient.get('/anamnesis/pending', {
    params: { page, limit }
  })
}

// Download do PDF de uma anamnese respondida
export const downloadAnamnesisPdf = (patientId, anamnesisId) => {
  return apiClient.get(`/patients/${patientId}/anamnesis/${anamnesisId}/pdf`, {
    responseType: 'blob'
  })
}
