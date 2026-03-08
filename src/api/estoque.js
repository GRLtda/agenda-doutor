// Camada de comunicação com o módulo de estoque (v2/estoque)

import apiClient from './index'

// ─────────────────────────────────────────────
// PRODUTOS
// ─────────────────────────────────────────────

/**
 * Lista produtos com paginação e filtros
 * @param {object} params - { busca, categoria, ativo, page, limit }
 */
export const getProdutos = (params = {}) => {
    return apiClient.get('/v2/estoque/produtos', { params })
}

/**
 * Busca detalhes de um produto
 * @param {string} id - ID do produto
 */
export const getProduto = (id) => {
    return apiClient.get(`/v2/estoque/produtos/${id}`)
}

/**
 * Cria um novo produto no catálogo
 * @param {object} data - { nome, unidadeMedida, aceitaFracao, quantidadeMinima, categoria, fabricante }
 */
export const createProduto = (data) => {
    return apiClient.post('/v2/estoque/produtos', data)
}

/**
 * Atualização parcial de um produto
 * @param {string} id - ID do produto
 * @param {object} data - campos a atualizar
 */
export const updateProduto = (id, data) => {
    return apiClient.patch(`/v2/estoque/produtos/${id}`, data)
}

/**
 * Soft delete de produto (deletedAt + ativo: false)
 * @param {string} id - ID do produto
 */
export const deleteProduto = (id) => {
    return apiClient.delete(`/v2/estoque/produtos/${id}`)
}

// ─────────────────────────────────────────────
// LOTES
// ─────────────────────────────────────────────

/**
 * Lista lotes com paginação e filtros
 * @param {object} params - { produtoId, status, vencendoEmDias, page, limit }
 */
export const getLotes = (params = {}) => {
    return apiClient.get('/v2/estoque/lotes', { params })
}

/**
 * Busca detalhes de um lote (com populate do produto)
 * @param {string} id - ID do lote
 */
export const getLote = (id) => {
    return apiClient.get(`/v2/estoque/lotes/${id}`)
}

/**
 * Cria lote + registra ENTRADA automaticamente no Livro-Razão
 * @param {object} data - { produtoId, numeroLote, dataValidade, saldoInicial, fornecedor, notaFiscal }
 */
export const createLote = (data) => {
    return apiClient.post('/v2/estoque/lotes', data)
}

/**
 * Atualiza status do lote (apenas DESCARTADO é aceito via PATCH)
 * @param {string} id - ID do lote
 * @param {string} status - 'DESCARTADO'
 */
export const updateLoteStatus = (id, status) => {
    return apiClient.patch(`/v2/estoque/lotes/${id}/status`, { status })
}

// ─────────────────────────────────────────────
// KITS DE PROCEDIMENTO
// ─────────────────────────────────────────────

/**
 * Lista kits com paginação e filtros
 * @param {object} params - { procedimentoId, ativo, page, limit }
 */
export const getKits = (params = {}) => {
    return apiClient.get('/v2/estoque/kits', { params })
}

/**
 * Busca detalhes de um kit
 * @param {string} id - ID do kit
 */
export const getKit = (id) => {
    return apiClient.get(`/v2/estoque/kits/${id}`)
}

/**
 * Cria kit com snapshot de nome/unidade dos produtos
 * @param {object} data - { procedimentoId, nome, itens: [{ produtoId, quantidade }] }
 */
export const createKit = (data) => {
    return apiClient.post('/v2/estoque/kits', data)
}

/**
 * Substituição completa do kit (PUT)
 * @param {string} id - ID do kit
 * @param {object} data - dados completos do kit
 */
export const updateKit = (id, data) => {
    return apiClient.put(`/v2/estoque/kits/${id}`, data)
}

/**
 * Desativa kit (ativo: false)
 * @param {string} id - ID do kit
 */
export const deleteKit = (id) => {
    return apiClient.delete(`/v2/estoque/kits/${id}`)
}

/**
 * Retorna sugestão FEFO de lotes para o procedimento (endpoint central do fluxo de atendimento)
 * @param {string} procedimentoId - ID do procedimento
 */
export const getSugestaoFEFO = (procedimentoId) => {
    return apiClient.get(`/v2/estoque/kits/sugestao/${procedimentoId}`)
}

/**
 * Retorna lotes disponíveis (ATIVO, saldo > 0, não vencidos) para um produto — ordenados por FEFO
 * Usado para troca manual de lote no atendimento
 * @param {string} produtoId - ID do produto
 */
export const getLotesDisponiveis = (produtoId) => {
    return apiClient.get(`/v2/estoque/lotes/disponiveis/${produtoId}`)
}

// ─────────────────────────────────────────────
// MOVIMENTAÇÕES
// ─────────────────────────────────────────────

/**
 * Lista movimentações do Livro-Razão com filtros
 * @param {object} params - { tipo, loteId, produtoId, atendimentoId, dataInicio, dataFim, page, limit }
 */
export const getMovimentacoes = (params = {}) => {
    return apiClient.get('/v2/estoque/movimentacoes', { params })
}

/**
 * Detalhes de uma movimentação específica
 * @param {string} id - ID da movimentação
 */
export const getMovimentacao = (id) => {
    return apiClient.get(`/v2/estoque/movimentacoes/${id}`)
}

/**
 * Registra baixa por atendimento (RN01: requer atendimentoId)
 * @param {object} data - { atendimentoId, pacienteId, itens: [{ loteId, produtoId, quantidade }] }
 */
export const registrarBaixa = (data) => {
    return apiClient.post('/v2/estoque/movimentacoes/baixa', data)
}

/**
 * Registra baixa administrativa (vencimento, avaria, ajuste ou perda)
 * @param {object} data - { loteId, produtoId, motivo, quantidade, observacao }
 */
export const registrarBaixaAdministrativa = (data) => {
    return apiClient.post('/v2/estoque/movimentacoes/administrativa', data)
}

// ─────────────────────────────────────────────
// ALERTAS & DASHBOARD
// ─────────────────────────────────────────────

/**
 * Resumo completo para o Dashboard (alertas + contadores)
 * @param {number} dias - 30, 60 ou 90 para vencimentos
 */
export const getDashboardSummary = (dias = 30) => {
    return apiClient.get('/v2/estoque/alertas/dashboard', { params: { dias } })
}

/**
 * Produtos com saldo total abaixo do estoque mínimo
 */
export const getAlertasEstoqueMinimo = () => {
    return apiClient.get('/v2/estoque/alertas/estoque-minimo')
}

/**
 * Lotes ATIVOS vencendo nos próximos N dias
 * @param {number} dias - 30, 60 ou 90
 */
export const getAlertasVencimentos = (dias = 30) => {
    return apiClient.get('/v2/estoque/alertas/vencimentos', { params: { dias } })
}
