import apiClient from './index'

/**
 * Cria um novo registro de prontuário.
 * Rota: POST /api/records
 * @param {object} recordData - Dados do prontuário (patientId, content, etc).
 */
export const createRecord = (recordData) => {
  return apiClient.post('/records', recordData)
}

/**
 * Busca um prontuário pelo ID do agendamento.
 * Rota: GET /api/records/appointment/:appointmentId
 * @param {string} appointmentId - O ID do agendamento.
 */
export const getByAppointmentId = (appointmentId) => {
  return apiClient.get(`/records/appointment/${appointmentId}`)
}

/**
 * Atualiza um registro de prontuário existente.
 * Rota: PUT /api/records/:recordId
 * @param {string} recordId - O ID do prontuário a ser atualizado.
 * @param {object} recordData - Os dados a serem atualizados (content, durationInSeconds, etc).
 */
export const updateRecord = (recordId, recordData) => {
  return apiClient.put(`/records/${recordId}`, recordData)
}

/**
 * Faz upload de uma imagem e anexa a um prontuário existente.
 * Rota: POST /api/records/:recordId/attachments/image
 * @param {string} recordId - O ID do prontuário.
 * @param {File} file - O arquivo de imagem.
 */
export const uploadImageAttachment = (recordId, file) => {
  const formData = new FormData()
  formData.append('image', file)

  return apiClient.post(`/records/${recordId}/attachments/image`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}

/**
 * Lista todos os prontuários de um paciente com paginação.
 * Rota: GET /api/records/patient/:patientId
 * @param {string} patientId - O ID do paciente.
 * @param {object} params - Parâmetros de paginação (ex: { page: 1, limit: 10 }).
 */
export const listRecordsByPatient = (patientId, params) => {
  return apiClient.get(`/records/patient/${patientId}`, { params })
}

/**
 * Remove um anexo de um prontuário.
 * Rota: DELETE /api/records/:recordId/attachments/:uploadId
 * @param {string} recordId - O ID do prontuário.
 * @param {string} uploadId - O ID do anexo a ser removido.
 */
export const removeAttachment = (recordId, uploadId) => {
  return apiClient.delete(`/records/${recordId}/attachments/${uploadId}`)
}

/**
 * Adiciona um procedimento ao prontuário do atendimento.
 * Rota: POST /api/records/procedures
 * @param {object} procedureData - Dados do procedimento (appointmentId, procedureId, discountPercentage, quantity).
 */
export const addProcedureToRecord = (procedureData) => {
  return apiClient.post('/records/procedures', procedureData)
}
