import { defineStore } from 'pinia'
import { ref } from 'vue'
import apiClient from '@/api'

export const useFinanceStore = defineStore('finance', () => {
  const isLoading = ref(false)
  const error = ref(null)

  // State
  const revenueSummary = ref({ totalRevenue: 0 })
  const revenueByProcedure = ref([])
  const dailyRevenue = ref([])
  const monthlyRevenue = ref([])
  const topClients = ref([])
  const topProcedures = ref([])
  const kpi = ref({
    averageTicket: 0,
    proceduresCount: 0
  })
  const comparison = ref({
    month: { current: 0, previous: 0 },
    week: { current: 0, previous: 0 },
    year: { current: 0, previous: 0 }
  })

  // Actions
  async function fetchDashboardData(period = 'month') {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiClient.get('/finance/dashboard', { params: { period } })
      const data = response.data

      revenueSummary.value = data.revenueSummary
      revenueByProcedure.value = data.revenueByProcedure
      dailyRevenue.value = data.dailyRevenue
      monthlyRevenue.value = data.monthlyRevenue
      topClients.value = data.topClients
      kpi.value = data.kpi
      comparison.value = data.comparison
      topProcedures.value = data.topProcedures

    } catch (err) {
      console.error('Error fetching finance data:', err)
      error.value = 'Erro ao carregar dados financeiros.'
    } finally {
      isLoading.value = false
    }
  }

  // Pagination State
  const topClientsPaginated = ref({
    data: [],
    pagination: {
        total: 0,
        page: 1,
        pages: 1,
        limit: 5
    },
    isLoading: false
  })

  async function fetchTopClients({ period = 'month', page = 1, search = '' } = {}) {
    topClientsPaginated.value.isLoading = true
    try {
        const response = await apiClient.get('/finance/top-clients', { 
            params: { period, page, search } 
        })
        topClientsPaginated.value.data = response.data.data
        topClientsPaginated.value.pagination = response.data.pagination
    } catch (err) {
        console.error('Error fetching top clients:', err)
    } finally {
        topClientsPaginated.value.isLoading = false
    }
  }

  const topProceduresPaginated = ref({
    data: [],
    pagination: {
        total: 0,
        page: 1,
        pages: 1,
        limit: 5
    },
    isLoading: false
  })

  async function fetchTopProcedures({ period = 'month', page = 1, search = '' } = {}) {
    topProceduresPaginated.value.isLoading = true
    try {
        const response = await apiClient.get('/finance/top-procedures', { 
            params: { period, page, search } 
        })
        topProceduresPaginated.value.data = response.data.data
        topProceduresPaginated.value.pagination = response.data.pagination
    } catch (err) {
        console.error('Error fetching top procedures:', err)
    } finally {
        topProceduresPaginated.value.isLoading = false
    }
  }

  return {
    isLoading,
    error,
    revenueSummary,
    revenueByProcedure,
    dailyRevenue,
    monthlyRevenue,
    topClients,
    topProcedures,
    kpi,
    comparison,
    fetchDashboardData,
    
    // Pagination
    topClientsPaginated,
    fetchTopClients,
    topProceduresPaginated,
    fetchTopProcedures
  }
})
