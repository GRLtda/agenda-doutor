import apiClient from './index'

/**
 * Busca agendamentos dentro de um período de datas.
 * @param {object} params - Parâmetros de data.
 * @param {string} params.startDate - Data de início (YYYY-MM-DD).
 * @param {string} params.endDate - Data de fim (YYYY-MM-DD).
 * @returns {Promise}
 */
export const getAppointments = ({ startDate, endDate }) => {
  return apiClient.get('/appointments', {
    params: { startDate, endDate },
  })
}

export const createAppointment = (appointmentData) => {
  return apiClient.post('/appointments', appointmentData)
}

export const updateAppointment = (appointmentId, data) => {
  return apiClient.put(`/appointments/${appointmentId}`, data)
}

export const rescheduleAppointment = (appointmentId, data) => {
  return apiClient.patch(`/appointments/${appointmentId}/reschedule`, data)
}

/**
 * ✨ Busca um agendamento específico pelo ID.
 * @param {string} appointmentId - ID do agendamento.
 * @returns {Promise}
 */
export const getAppointmentById = (appointmentId) => {
  return apiClient.get(`/appointments/${appointmentId}`)
}

/**
 * ✨ NOVA FUNÇÃO ADICIONADA ✨
 * Verifica se há conflito de horário para um paciente.
 * @param {string} patientId - ID do paciente.
 * @param {string} startTime - Data e hora de início (ISO String).
 * @param {string} endTime - Data e hora de fim (ISO String).
 * @returns {Promise}
 */
export const checkConflict = (patientId, startTime, endTime) => {
  return apiClient.get('/appointments/check-conflict', {
    params: { patientId, startTime, endTime },
  })
}

export const deleteAppointment = (appointmentId) => {
  return apiClient.delete(`/appointments/${appointmentId}`)
}
