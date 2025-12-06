// api/procedures.js

import apiClient from './index'

/**
 * Busca todos os procedimentos da clínica
 * @returns {Promise}
 */
export const getProcedures = () => {
  return apiClient.get('/procedures')
}

/**
 * Cria um novo procedimento
 * @param {object} procedureData - Dados do procedimento
 * @returns {Promise}
 */
export const createProcedure = (procedureData) => {
  return apiClient.post('/procedures', procedureData)
}

/**
 * Atualiza um procedimento existente
 * @param {string} procedureId - ID do procedimento
 * @param {object} procedureData - Dados atualizados
 * @returns {Promise}
 */
export const updateProcedure = (procedureId, procedureData) => {
  return apiClient.put(`/procedures/${procedureId}`, procedureData)
}

/**
 * Remove um procedimento (soft delete)
 * @param {string} procedureId - ID do procedimento
 * @returns {Promise}
 */
export const deleteProcedure = (procedureId) => {
  return apiClient.delete(`/procedures/${procedureId}`)
}
