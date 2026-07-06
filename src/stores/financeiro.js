import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as financeiroApi from '@/api/financeiro'

const defaultMeta = () => ({ total: 0, page: 1, limit: 20, pages: 1, totalPages: 1 })

function unwrap(responseData) {
  return responseData?.data ?? responseData ?? {}
}

function normalizeId(item) {
  if (!item || typeof item !== 'object') return item
  return { ...item, _id: item._id || item.id }
}

function normalizeList(responseData, key) {
  const data = unwrap(responseData)
  const raw = data[key] ?? data.items ?? data
  return Array.isArray(raw) ? raw.map(normalizeId) : []
}

function normalizeMeta(responseData, fallback = defaultMeta()) {
  const data = unwrap(responseData)
  const pagination = data.pagination ?? data.meta ?? fallback
  return {
    ...fallback,
    ...pagination,
    totalPages: pagination.totalPages ?? pagination.pages ?? fallback.totalPages,
  }
}

function normalizeConta(responseData) {
  const data = unwrap(responseData)
  return normalizeId(data.conta ?? data.account ?? data)
}

function extractError(err, fallback) {
  return (
    err.response?.data?.error?.message ||
    err.response?.data?.message ||
    err.message ||
    fallback
  )
}

export const useFinanceiroStore = defineStore('financeiroV2', () => {
  const resumo = ref(null)
  const contas = ref([])
  const contaAtual = ref(null)
  const contasMeta = ref(defaultMeta())
  const baixas = ref([])
  const baixasMeta = ref(defaultMeta())
  const movimentosCaixa = ref([])
  const caixaMeta = ref(defaultMeta())
  const categorias = ref([])
  const lucratividadeProcedimentos = ref([])

  const loadingResumo = ref(false)
  const loadingContas = ref(false)
  const loadingCaixa = ref(false)
  const loadingCategorias = ref(false)
  const loadingLucratividade = ref(false)
  const loadingBaixas = ref(false)
  const loadingAcao = ref(false)
  const error = ref(null)

  const categoriasReceita = computed(() =>
    categorias.value.filter((categoria) => ['REVENUE', 'BOTH'].includes(categoria.type))
  )

  const categoriasDespesa = computed(() =>
    categorias.value.filter((categoria) => ['EXPENSE', 'BOTH'].includes(categoria.type))
  )

  async function fetchResumo(params = {}) {
    loadingResumo.value = true
    error.value = null
    try {
      const response = await financeiroApi.getResumo(params)
      resumo.value = unwrap(response.data)
      return { success: true, data: resumo.value }
    } catch (err) {
      console.error('[financeiro] fetchResumo:', err)
      error.value = extractError(err, 'Erro ao carregar resumo financeiro')
      return { success: false, error: error.value }
    } finally {
      loadingResumo.value = false
    }
  }

  async function fetchContas(params = {}) {
    loadingContas.value = true
    error.value = null
    try {
      const response = await financeiroApi.getContas(params)
      contas.value = normalizeList(response.data, 'contas')
      contasMeta.value = normalizeMeta(response.data, contasMeta.value)
      return { success: true, data: contas.value }
    } catch (err) {
      console.error('[financeiro] fetchContas:', err)
      error.value = extractError(err, 'Erro ao carregar contas')
      contas.value = []
      return { success: false, error: error.value }
    } finally {
      loadingContas.value = false
    }
  }

  async function fetchConta(id) {
    loadingContas.value = true
    error.value = null
    try {
      const response = await financeiroApi.getConta(id)
      const data = unwrap(response.data)
      contaAtual.value = normalizeId(data.conta)
      baixas.value = Array.isArray(data.baixas) ? data.baixas.map(normalizeId) : []
      return { success: true, data: contaAtual.value }
    } catch (err) {
      console.error('[financeiro] fetchConta:', err)
      error.value = extractError(err, 'Erro ao carregar conta')
      return { success: false, error: error.value }
    } finally {
      loadingContas.value = false
    }
  }

  async function createConta(data) {
    loadingAcao.value = true
    error.value = null
    try {
      const response = await financeiroApi.createConta(data)
      const conta = normalizeConta(response.data)
      contas.value.unshift(conta)
      return { success: true, data: conta }
    } catch (err) {
      console.error('[financeiro] createConta:', err)
      error.value = extractError(err, 'Erro ao criar conta')
      return { success: false, error: error.value }
    } finally {
      loadingAcao.value = false
    }
  }

  async function updateConta(id, data) {
    loadingAcao.value = true
    error.value = null
    try {
      const response = await financeiroApi.updateConta(id, data)
      const conta = normalizeConta(response.data)
      const index = contas.value.findIndex((item) => item._id === id)
      if (index !== -1) contas.value.splice(index, 1, conta)
      if (contaAtual.value?._id === id) contaAtual.value = conta
      return { success: true, data: conta }
    } catch (err) {
      console.error('[financeiro] updateConta:', err)
      error.value = extractError(err, 'Erro ao atualizar conta')
      return { success: false, error: error.value }
    } finally {
      loadingAcao.value = false
    }
  }

  async function deleteConta(id) {
    loadingAcao.value = true
    error.value = null
    try {
      await financeiroApi.deleteConta(id)
      contas.value = contas.value.filter((item) => item._id !== id)
      return { success: true }
    } catch (err) {
      console.error('[financeiro] deleteConta:', err)
      error.value = extractError(err, 'Erro ao excluir conta')
      return { success: false, error: error.value }
    } finally {
      loadingAcao.value = false
    }
  }

  async function fetchBaixas(accountId, params = {}) {
    loadingBaixas.value = true
    error.value = null
    try {
      const response = await financeiroApi.getBaixas(accountId, params)
      baixas.value = normalizeList(response.data, 'baixas')
      baixasMeta.value = normalizeMeta(response.data, baixasMeta.value)
      return { success: true, data: baixas.value }
    } catch (err) {
      console.error('[financeiro] fetchBaixas:', err)
      error.value = extractError(err, 'Erro ao carregar baixas')
      return { success: false, error: error.value }
    } finally {
      loadingBaixas.value = false
    }
  }

  async function registrarBaixa(accountId, data) {
    loadingAcao.value = true
    error.value = null
    try {
      const response = await financeiroApi.createBaixa(accountId, data)
      const result = unwrap(response.data)
      const conta = normalizeId(result.account)
      const settlement = normalizeId(result.settlement)
      const index = contas.value.findIndex((item) => item._id === conta?._id)
      if (index !== -1) contas.value.splice(index, 1, conta)
      if (contaAtual.value?._id === conta?._id) contaAtual.value = conta
      if (settlement) baixas.value.unshift(settlement)
      return { success: true, data: result }
    } catch (err) {
      console.error('[financeiro] registrarBaixa:', err)
      error.value = extractError(err, 'Erro ao registrar baixa')
      return { success: false, error: error.value }
    } finally {
      loadingAcao.value = false
    }
  }

  async function estornarBaixa(settlementId, data = {}) {
    loadingAcao.value = true
    error.value = null
    try {
      const response = await financeiroApi.estornarBaixa(settlementId, data)
      const result = unwrap(response.data)
      const conta = normalizeId(result.account)
      const index = contas.value.findIndex((item) => item._id === conta?._id)
      if (index !== -1) contas.value.splice(index, 1, conta)
      if (contaAtual.value?._id === conta?._id) contaAtual.value = conta
      return { success: true, data: result }
    } catch (err) {
      console.error('[financeiro] estornarBaixa:', err)
      error.value = extractError(err, 'Erro ao estornar baixa')
      return { success: false, error: error.value }
    } finally {
      loadingAcao.value = false
    }
  }

  async function fetchCaixa(params = {}) {
    loadingCaixa.value = true
    error.value = null
    try {
      const response = await financeiroApi.getCaixa(params)
      movimentosCaixa.value = normalizeList(response.data, 'movimentos')
      caixaMeta.value = normalizeMeta(response.data, caixaMeta.value)
      return { success: true, data: movimentosCaixa.value }
    } catch (err) {
      console.error('[financeiro] fetchCaixa:', err)
      error.value = extractError(err, 'Erro ao carregar caixa')
      movimentosCaixa.value = []
      return { success: false, error: error.value }
    } finally {
      loadingCaixa.value = false
    }
  }

  async function fetchCategorias(params = {}) {
    loadingCategorias.value = true
    error.value = null
    try {
      const response = await financeiroApi.getCategorias(params)
      categorias.value = normalizeList(response.data, 'categorias')
      return { success: true, data: categorias.value }
    } catch (err) {
      console.error('[financeiro] fetchCategorias:', err)
      error.value = extractError(err, 'Erro ao carregar categorias')
      categorias.value = []
      return { success: false, error: error.value }
    } finally {
      loadingCategorias.value = false
    }
  }

  async function fetchLucratividadeProcedimentos(params = {}) {
    loadingLucratividade.value = true
    error.value = null
    try {
      const response = await financeiroApi.getLucratividadeProcedimentos(params)
      lucratividadeProcedimentos.value = normalizeList(response.data, 'procedimentos')
      return { success: true, data: lucratividadeProcedimentos.value }
    } catch (err) {
      console.error('[financeiro] fetchLucratividadeProcedimentos:', err)
      error.value = extractError(err, 'Erro ao carregar lucratividade')
      lucratividadeProcedimentos.value = []
      return { success: false, error: error.value }
    } finally {
      loadingLucratividade.value = false
    }
  }

  return {
    resumo,
    contas,
    contaAtual,
    contasMeta,
    baixas,
    baixasMeta,
    movimentosCaixa,
    caixaMeta,
    categorias,
    categoriasReceita,
    categoriasDespesa,
    lucratividadeProcedimentos,
    loadingResumo,
    loadingContas,
    loadingCaixa,
    loadingCategorias,
    loadingLucratividade,
    loadingBaixas,
    loadingAcao,
    error,
    fetchResumo,
    fetchContas,
    fetchConta,
    createConta,
    updateConta,
    deleteConta,
    fetchBaixas,
    registrarBaixa,
    estornarBaixa,
    fetchCaixa,
    fetchCategorias,
    fetchLucratividadeProcedimentos,
  }
})
