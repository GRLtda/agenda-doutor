// api/patients.js

import apiClient from './index'

/**
 * Busca a lista de pacientes com paginação.
 * @param {object} params - Parâmetros de paginação.
 * @param {number} params.page - O número da página.
 * @param {number} params.limit - O número de itens por página.
 * @returns {Promise}
 */
export const getPatients = (params = {}) => {
  // Alteramos aqui para extrair os parâmetros de forma segura
  return apiClient.get('/patients', {
    params: {
      page: params.page || 1,
      limit: params.limit || 10,
    },
  })
}

/**
 * Busca todos os pacientes com paginação.
 * Rota: GET /api/patients
 * @param {object} params - Parâmetros de paginação (ex: { page: 1, limit: 10 }).
 */
export const getAllPatients = (params) => {
  return apiClient.get('/patients', { params });
}

export const createPatient = (patientData) => {
  return apiClient.post('/patients', patientData)
}

export const getPatientById = (patientId) => {
  return apiClient.get(`/patients/${patientId}`);
};

export const updatePatient = (patientId, patientData) => {
  return apiClient.put(`/patients/${patientId}`, patientData);
};

export const deletePatient = (patientId) => {
  return apiClient.delete(`/patients/${patientId}`);
};

export const searchPatients = (query) => {
  // Esta função chama a rota GET /patients, mas adiciona o parâmetro 'search'
  return apiClient.get('/patients', {
    params: {
      search: query,
    },
  })
}

// Busca pacientes que fazem aniversário no mês atual
export const getBirthdayPatients = () => {
  return apiClient.get('/patients/birthdays/month')
}

export const addProcedureToPatient = (patientId, procedureData) => {
  return apiClient.post(`/patients/${patientId}/procedures`, procedureData)
}

