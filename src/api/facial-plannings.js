import apiClient from './index'

export const listFacialPlanningsByPatient = (patientId) => {
  return apiClient.get(`/facial-plannings/patient/${patientId}`)
}

export const listFacialPlanningsByAppointment = (appointmentId) => {
  return apiClient.get(`/facial-plannings/appointment/${appointmentId}`)
}

export const getFacialPlanningById = (id) => {
  return apiClient.get(`/facial-plannings/${id}`)
}

export const createFacialPlanning = (payload) => {
  return apiClient.post('/facial-plannings', payload)
}

export const updateFacialPlanning = (id, payload) => {
  return apiClient.put(`/facial-plannings/${id}`, payload)
}

export const finalizeFacialPlanning = (id, payload) => {
  return apiClient.post(`/facial-plannings/${id}/finalize`, payload)
}

export const reopenFacialPlanning = (id) => {
  return apiClient.post(`/facial-plannings/${id}/reopen`)
}

export const downloadFacialPlanningPdf = (id) => {
  return apiClient.get(`/facial-plannings/${id}/pdf`, {
    responseType: 'blob',
  })
}
