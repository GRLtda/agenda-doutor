import apiClient from './index'

export const getResumo = (params = {}) => {
  return apiClient.get('/v2/financeiro/resumo', { params })
}

export const getContas = (params = {}) => {
  return apiClient.get('/v2/financeiro/contas', { params })
}

export const getConta = (id) => {
  return apiClient.get(`/v2/financeiro/contas/${id}`)
}

export const createConta = (data) => {
  return apiClient.post('/v2/financeiro/contas', data)
}

export const updateConta = (id, data) => {
  return apiClient.patch(`/v2/financeiro/contas/${id}`, data)
}

export const deleteConta = (id) => {
  return apiClient.delete(`/v2/financeiro/contas/${id}`)
}

export const getBaixas = (accountId, params = {}) => {
  return apiClient.get(`/v2/financeiro/contas/${accountId}/baixas`, { params })
}

export const createBaixa = (accountId, data) => {
  return apiClient.post(`/v2/financeiro/contas/${accountId}/baixas`, data)
}

export const estornarBaixa = (settlementId, data = {}) => {
  return apiClient.delete(`/v2/financeiro/baixas/${settlementId}`, { data })
}

export const getCaixa = (params = {}) => {
  return apiClient.get('/v2/financeiro/caixa', { params })
}

export const getCategorias = (params = {}) => {
  return apiClient.get('/v2/financeiro/categorias', { params })
}

export const createCategoria = (data) => {
  return apiClient.post('/v2/financeiro/categorias', data)
}

export const updateCategoria = (id, data) => {
  return apiClient.patch(`/v2/financeiro/categorias/${id}`, data)
}

export const deleteCategoria = (id) => {
  return apiClient.delete(`/v2/financeiro/categorias/${id}`)
}

export const getLucratividadeProcedimentos = (params = {}) => {
  return apiClient.get('/v2/financeiro/lucratividade/procedimentos', { params })
}
