// stores/estoque.js
// Store principal do módulo de estoque com Optimistic UI e rollback

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as estoqueApi from '@/api/estoque'

export const useEstoqueStore = defineStore('estoque', () => {
    // ─── Estado ───────────────────────────────────────────────────────────────

    // Produtos
    const produtos = ref([])
    const produtoAtual = ref(null)
    const produtosMeta = ref({ total: 0, page: 1, totalPages: 1 })

    // Lotes
    const lotes = ref([])
    const loteAtual = ref(null)
    const lotesMeta = ref({ total: 0, page: 1, totalPages: 1 })

    // Kits
    const kits = ref([])
    const kitAtual = ref(null)
    const kitsMeta = ref({ total: 0, page: 1, totalPages: 1 })

    // Movimentações
    const movimentacoes = ref([])
    const movimentacaoAtual = ref(null)
    const movimentacoesMeta = ref({ total: 0, page: 1, totalPages: 1 })

    // Estatísticas Consolidadas
    const stats = ref({
        totalProdutos: 0,
        totalLotesAtivos: 0,
    })

    const healthScore = ref(0)
    const chartData = ref({
        trends: [],
        categorias: []
    })

    // Alertas
    const alertasEstoqueMinimo = ref([])
    const alertasVencimentos = ref([])

    // Sugestão FEFO
    const sugestaoFEFO = ref(null)

    // Lotes disponíveis para troca manual de lote no atendimento
    const lotesDisponiveis = ref([])
    const loadingLotesDisponiveis = ref(false)

    // Loading states granulares
    const loadingProdutos = ref(false)
    const loadingLotes = ref(false)
    const loadingKits = ref(false)
    const loadingMovimentacoes = ref(false)
    const loadingAlertas = ref(false)
    const loadingAcao = ref(false) // para create/update/delete

    // Erros
    const error = ref(null)

    // ─── Computed ─────────────────────────────────────────────────────────────

    const temAlertasCriticos = computed(
        () => alertasEstoqueMinimo.value.length > 0 || alertasVencimentos.value.length > 0
    )

    const totalAlertas = computed(
        () => alertasEstoqueMinimo.value.length + alertasVencimentos.value.length
    )

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Extrai mensagem de erro da resposta padronizada da API v2
     */
    function extrairMensagemErro(err, fallback) {
        return (
            err.response?.data?.error?.message ||
            err.response?.data?.message ||
            err.message ||
            fallback
        )
    }

    /**
     * Normaliza resposta da API para sempre retornar um array.
     */
    function normalizarLista(responseData) {
        const dataObj = responseData?.data ?? responseData;
        const raw = dataObj?.items ?? dataObj?.produtos ?? dataObj?.lotes ?? dataObj?.movimentacoes ?? dataObj?.kits ?? dataObj ?? [];
        const arr = Array.isArray(raw) ? raw : (Array.isArray(dataObj) ? dataObj : []);
        // Garante _id em cada item
        return arr.map((item) => ({
            ...item,
            _id: item._id || item.id,
        }))
    }

    function normalizarMeta(responseData, fallback) {
        const dataObj = responseData?.data ?? responseData;
        return dataObj?.pagination ?? dataObj?.meta ?? fallback;
    }

    function normalizarItem(responseData) {
        let item = responseData?.data ?? responseData;
        if (!item) return null;

        // Se for um wrapper { produto: { ... } }, { lote: { ... } }, etc
        if (item.produto) item = item.produto;
        else if (item.lote) item = item.lote;
        else if (item.kit) item = item.kit;
        else if (item.movimentacao) item = item.movimentacao;

        return { ...item, _id: item._id || item.id };
    }

    // ─── PRODUTOS ─────────────────────────────────────────────────────────────

    async function fetchProdutos(params = {}) {
        loadingProdutos.value = true
        error.value = null
        try {
            const response = await estoqueApi.getProdutos(params)
            produtos.value = normalizarLista(response.data)
            produtosMeta.value = normalizarMeta(response.data, produtosMeta.value)
            return { success: true }
        } catch (err) {
            console.error('[estoque] fetchProdutos:', err)
            error.value = extrairMensagemErro(err, 'Erro ao carregar produtos')
            produtos.value = [] // garante array mesmo em erro
            return { success: false, error: error.value }
        } finally {
            loadingProdutos.value = false
        }
    }

    async function fetchProduto(id) {
        loadingProdutos.value = true
        error.value = null
        try {
            const response = await estoqueApi.getProduto(id)
            produtoAtual.value = normalizarItem(response.data)
            return { success: true, data: produtoAtual.value }
        } catch (err) {
            console.error('[estoque] fetchProduto:', err)
            error.value = extrairMensagemErro(err, 'Erro ao carregar produto')
            return { success: false, error: error.value }
        } finally {
            loadingProdutos.value = false
        }
    }

    async function createProduto(data) {
        loadingAcao.value = true
        error.value = null

        // Garante que produtos.value é um array antes do unshift optimistic
        if (!Array.isArray(produtos.value)) produtos.value = []

        const tempId = `temp_${Date.now()}`
        const otimista = { ...data, _id: tempId, ativo: true, _isTemp: true }
        produtos.value.unshift(otimista)

        try {
            const response = await estoqueApi.createProduto(data)
            const criado = normalizarItem(response.data)

            const idx = produtos.value.findIndex((p) => p._id === tempId)
            if (idx !== -1) produtos.value.splice(idx, 1, criado)

            return { success: true, data: criado }
        } catch (err) {
            console.error('[estoque] createProduto:', err)
            produtos.value = produtos.value.filter((p) => p._id !== tempId)
            error.value = extrairMensagemErro(err, 'Erro ao criar produto')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    async function updateProduto(id, data) {
        loadingAcao.value = true
        error.value = null

        // Optimistic: salva estado anterior
        const idx = produtos.value.findIndex((p) => p._id === id)
        const anterior = idx !== -1 ? { ...produtos.value[idx] } : null
        if (idx !== -1) produtos.value.splice(idx, 1, { ...anterior, ...data })

        try {
            const response = await estoqueApi.updateProduto(id, data)
            const atualizado = response.data.data
            if (idx !== -1) produtos.value.splice(idx, 1, atualizado)
            if (produtoAtual.value?._id === id) produtoAtual.value = atualizado
            return { success: true, data: atualizado }
        } catch (err) {
            console.error('[estoque] updateProduto:', err)
            // Rollback
            if (idx !== -1 && anterior) produtos.value.splice(idx, 1, anterior)
            error.value = extrairMensagemErro(err, 'Erro ao atualizar produto')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    async function deleteProduto(id) {
        loadingAcao.value = true
        error.value = null

        // Optimistic: remove da lista
        const idx = produtos.value.findIndex((p) => p._id === id)
        const anterior = idx !== -1 ? { ...produtos.value[idx] } : null
        if (idx !== -1) produtos.value.splice(idx, 1)

        try {
            await estoqueApi.deleteProduto(id)
            return { success: true }
        } catch (err) {
            console.error('[estoque] deleteProduto:', err)
            // Rollback
            if (idx !== -1 && anterior) produtos.value.splice(idx, 0, anterior)
            error.value = extrairMensagemErro(err, 'Erro ao excluir produto')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    // ─── LOTES ────────────────────────────────────────────────────────────────

    async function fetchLotes(params = {}) {
        loadingLotes.value = true
        error.value = null
        try {
            const response = await estoqueApi.getLotes(params)
            lotes.value = normalizarLista(response.data)
            lotesMeta.value = normalizarMeta(response.data, lotesMeta.value)
            return { success: true }
        } catch (err) {
            console.error('[estoque] fetchLotes:', err)
            error.value = extrairMensagemErro(err, 'Erro ao carregar lotes')
            lotes.value = []
            return { success: false, error: error.value }
        } finally {
            loadingLotes.value = false
        }
    }

    async function fetchLote(id) {
        loadingLotes.value = true
        error.value = null
        try {
            const response = await estoqueApi.getLote(id)
            loteAtual.value = response.data.data
            return { success: true, data: response.data.data }
        } catch (err) {
            console.error('[estoque] fetchLote:', err)
            error.value = extrairMensagemErro(err, 'Erro ao carregar lote')
            return { success: false, error: error.value }
        } finally {
            loadingLotes.value = false
        }
    }

    async function createLote(data) {
        loadingAcao.value = true
        error.value = null

        if (!Array.isArray(lotes.value)) lotes.value = []

        const tempId = `temp_${Date.now()}`
        const otimista = { ...data, _id: tempId, status: 'ATIVO', saldoAtual: data.saldoInicial, _isTemp: true }
        lotes.value.unshift(otimista)

        try {
            const response = await estoqueApi.createLote(data)
            const criado = response.data.data

            const idx = lotes.value.findIndex((l) => l._id === tempId)
            if (idx !== -1) lotes.value.splice(idx, 1, criado)

            return { success: true, data: criado }
        } catch (err) {
            console.error('[estoque] createLote:', err)
            // Rollback
            lotes.value = lotes.value.filter((l) => l._id !== tempId)
            error.value = extrairMensagemErro(err, 'Erro ao registrar entrada de lote')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    async function descartarLote(id) {
        loadingAcao.value = true
        error.value = null

        // Optimistic
        const idx = lotes.value.findIndex((l) => l._id === id)
        const anterior = idx !== -1 ? { ...lotes.value[idx] } : null
        if (idx !== -1) lotes.value[idx] = { ...anterior, status: 'DESCARTADO' }

        try {
            const response = await estoqueApi.updateLoteStatus(id, 'DESCARTADO')
            const atualizado = response.data.data
            if (idx !== -1) lotes.value.splice(idx, 1, atualizado)
            if (loteAtual.value?._id === id) loteAtual.value = atualizado
            return { success: true }
        } catch (err) {
            console.error('[estoque] descartarLote:', err)
            if (idx !== -1 && anterior) lotes.value.splice(idx, 1, anterior)
            error.value = extrairMensagemErro(err, 'Erro ao descartar lote')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    // ─── KITS ─────────────────────────────────────────────────────────────────

    async function fetchKits(params = {}) {
        loadingKits.value = true
        error.value = null
        try {
            const response = await estoqueApi.getKits(params)
            kits.value = normalizarLista(response.data)
            kitsMeta.value = normalizarMeta(response.data, kitsMeta.value)
            return { success: true }
        } catch (err) {
            console.error('[estoque] fetchKits:', err)
            error.value = extrairMensagemErro(err, 'Erro ao carregar kits')
            kits.value = []
            return { success: false, error: error.value }
        } finally {
            loadingKits.value = false
        }
    }

    async function fetchKit(id) {
        loadingKits.value = true
        error.value = null
        try {
            const response = await estoqueApi.getKit(id)
            kitAtual.value = response.data.data
            return { success: true, data: response.data.data }
        } catch (err) {
            console.error('[estoque] fetchKit:', err)
            error.value = extrairMensagemErro(err, 'Erro ao carregar kit')
            return { success: false, error: error.value }
        } finally {
            loadingKits.value = false
        }
    }

    async function createKit(data) {
        loadingAcao.value = true
        error.value = null

        if (!Array.isArray(kits.value)) kits.value = []

        const tempId = `temp_${Date.now()}`
        const otimista = { ...data, _id: tempId, ativo: true, _isTemp: true }
        kits.value.unshift(otimista)

        try {
            const response = await estoqueApi.createKit(data)
            const criado = normalizarItem(response.data)
            const idx = kits.value.findIndex((k) => k._id === tempId)
            if (idx !== -1) kits.value.splice(idx, 1, criado)
            return { success: true, data: criado }
        } catch (err) {
            console.error('[estoque] createKit:', err)
            kits.value = kits.value.filter((k) => k._id !== tempId)
            error.value = extrairMensagemErro(err, 'Erro ao criar kit')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    async function updateKit(id, data) {
        loadingAcao.value = true
        error.value = null
        const idx = kits.value.findIndex((k) => k._id === id)
        const anterior = idx !== -1 ? { ...kits.value[idx] } : null
        if (idx !== -1) kits.value.splice(idx, 1, { ...anterior, ...data })

        try {
            const response = await estoqueApi.updateKit(id, data)
            const atualizado = response.data.data
            if (idx !== -1) kits.value.splice(idx, 1, atualizado)
            if (kitAtual.value?._id === id) kitAtual.value = atualizado
            return { success: true, data: atualizado }
        } catch (err) {
            console.error('[estoque] updateKit:', err)
            if (idx !== -1 && anterior) kits.value.splice(idx, 1, anterior)
            error.value = extrairMensagemErro(err, 'Erro ao atualizar kit')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    async function deleteKit(id) {
        loadingAcao.value = true
        error.value = null
        const idx = kits.value.findIndex((k) => k._id === id)
        const anterior = idx !== -1 ? { ...kits.value[idx] } : null
        if (idx !== -1) kits.value[idx] = { ...anterior, ativo: false }

        try {
            await estoqueApi.deleteKit(id)
            // Mantém na lista com ativo: false (soft delete)
            return { success: true }
        } catch (err) {
            console.error('[estoque] deleteKit:', err)
            if (idx !== -1 && anterior) kits.value.splice(idx, 1, anterior)
            error.value = extrairMensagemErro(err, 'Erro ao desativar kit')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    // ─── MOVIMENTAÇÕES ────────────────────────────────────────────────────────

    async function fetchMovimentacoes(params = {}) {
        loadingMovimentacoes.value = true
        error.value = null
        try {
            const response = await estoqueApi.getMovimentacoes(params)
            movimentacoes.value = normalizarLista(response.data)
            movimentacoesMeta.value = normalizarMeta(response.data, movimentacoesMeta.value)
            return { success: true }
        } catch (err) {
            console.error('[estoque] fetchMovimentacoes:', err)
            error.value = extrairMensagemErro(err, 'Erro ao carregar movimentações')
            movimentacoes.value = []
            return { success: false, error: error.value }
        } finally {
            loadingMovimentacoes.value = false
        }
    }

    async function registrarBaixa(data) {
        loadingAcao.value = true
        error.value = null
        try {
            const response = await estoqueApi.registrarBaixa(data)
            return { success: true, data: response.data.data }
        } catch (err) {
            console.error('[estoque] registrarBaixa:', err)
            error.value = extrairMensagemErro(err, 'Erro ao registrar baixa')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    async function registrarBaixaAdministrativa(data) {
        loadingAcao.value = true
        error.value = null
        try {
            const response = await estoqueApi.registrarBaixaAdministrativa(data)
            return { success: true, data: response.data.data }
        } catch (err) {
            console.error('[estoque] registrarBaixaAdministrativa:', err)
            error.value = extrairMensagemErro(err, 'Erro ao registrar baixa administrativa')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    // ─── LOTES DISPONÍVEIS PARA TROCA MANUAL ───────────────────────────────────

    /**
     * Busca lotes disponíveis (ATIVO, saldo > 0, não vencidos) para um produto.
     * Ordenados por FEFO. Usado no modal de adição de procedimento para troca de lote.
     */
    async function fetchLotesDisponiveis(produtoId) {
        loadingLotesDisponiveis.value = true
        error.value = null
        lotesDisponiveis.value = []
        try {
            const response = await estoqueApi.getLotesDisponiveis(produtoId)
            lotesDisponiveis.value = response.data?.data?.lotes ?? []
            return { success: true, data: lotesDisponiveis.value }
        } catch (err) {
            console.error('[estoque] fetchLotesDisponiveis:', err)
            error.value = extrairMensagemErro(err, 'Erro ao buscar lotes disponíveis')
            return { success: false, error: error.value }
        } finally {
            loadingLotesDisponiveis.value = false
        }
    }

    // ─── SUGESTÃO FEFO ────────────────────────────────────────────────────────

    async function fetchSugestaoFEFO(procedimentoId) {
        loadingAcao.value = true
        error.value = null
        sugestaoFEFO.value = null
        try {
            const response = await estoqueApi.getSugestaoFEFO(procedimentoId)
            sugestaoFEFO.value = response.data.data
            return { success: true, data: response.data.data }
        } catch (err) {
            console.error('[estoque] fetchSugestaoFEFO:', err)
            error.value = extrairMensagemErro(err, 'Erro ao buscar sugestão de consumo')
            return { success: false, error: error.value }
        } finally {
            loadingAcao.value = false
        }
    }

    // ─── DASHBOARD & ALERTAS ──────────────────────────────────────────────────
    /**
     * Busca resumo completo do Dashboard: Alertas + Contadores
     */
    async function fetchDashboardSummary(diasVencimento = 30) {
        loadingAlertas.value = true
        error.value = null
        try {
            const res = await estoqueApi.getDashboardSummary(diasVencimento)
            if (res.data.success) {
                const data = res.data.data
                alertasEstoqueMinimo.value = data.alertas?.estoqueMinimo?.produtos || []
                alertasVencimentos.value = data.alertas?.vencimentos?.lotes || []
                stats.value = data.stats || { totalProdutos: 0, totalLotesAtivos: 0 }
                healthScore.value = data.healthScore || 0
                chartData.value = data.chartData || { trends: [], categorias: [] }
                return { success: true }
            }
            return { success: false, error: 'Falha ao carregar dashboard' }
        } catch (err) {
            console.error('[estoque] fetchDashboardSummary:', err)
            error.value = extrairMensagemErro(err, 'Erro ao carregar dashboard')
            return { success: false, error: error.value }
        } finally {
            loadingAlertas.value = false
        }
    }

    async function fetchAlertas(diasVencimento = 30) {
        loadingAlertas.value = true
        error.value = null
        try {
            const [resMinimo, resVenc] = await Promise.all([
                estoqueApi.getAlertasEstoqueMinimo(),
                estoqueApi.getAlertasVencimentos(diasVencimento),
            ])
            // Extrai as listas dos objetos de resposta
            alertasEstoqueMinimo.value = resMinimo.data.data?.produtos || []
            alertasVencimentos.value = resVenc.data.data?.lotes || []
            return { success: true }
        } catch (err) {
            console.error('[estoque] fetchAlertas:', err)
            error.value = extrairMensagemErro(err, 'Erro ao carregar alertas')
            return { success: false, error: error.value }
        } finally {
            loadingAlertas.value = false
        }
    }

    // ─── Reset ────────────────────────────────────────────────────────────────

    function resetProdutoAtual() {
        produtoAtual.value = null
    }

    function resetSugestao() {
        sugestaoFEFO.value = null
    }

    // ─── Exports ──────────────────────────────────────────────────────────────

    return {
        // Estado
        produtos,
        produtoAtual,
        produtosMeta,
        lotes,
        loteAtual,
        lotesMeta,
        kits,
        kitAtual,
        kitsMeta,
        movimentacoes,
        movimentacaoAtual,
        movimentacoesMeta,
        stats,
        healthScore,
        chartData,
        alertasEstoqueMinimo,
        alertasVencimentos,
        sugestaoFEFO,
        loadingProdutos,
        loadingLotes,
        loadingKits,
        loadingMovimentacoes,
        loadingAlertas,
        loadingAcao,
        loadingLotesDisponiveis,
        lotesDisponiveis,
        error,

        // Computed
        temAlertasCriticos,
        totalAlertas,

        // Ações — Produtos
        fetchProdutos,
        fetchProduto,
        createProduto,
        updateProduto,
        deleteProduto,

        // Ações — Lotes
        fetchLotes,
        fetchLote,
        createLote,
        descartarLote,

        // Ações — Kits
        fetchKits,
        fetchKit,
        createKit,
        updateKit,
        deleteKit,

        // Ações — Movimentações
        fetchMovimentacoes,
        registrarBaixa,
        registrarBaixaAdministrativa,

        // Ações — FEFO
        fetchSugestaoFEFO,
        fetchLotesDisponiveis,

        // Ações — Alertas & Dashboard
        fetchDashboardSummary,
        fetchAlertas,

        // Helpers
        resetProdutoAtual,
        resetSugestao,
    }
})
