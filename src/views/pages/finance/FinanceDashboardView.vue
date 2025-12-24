<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import AppPagination from '@/components/global/AppPagination.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import FormInput from '@/components/global/FormInput.vue'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Line, Doughnut, Bar } from 'vue-chartjs'
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Search,
  Filter,
  MoreHorizontal,
  CalendarDays, // Import CalendarDays
  ArrowLeft     // Import ArrowLeft
} from 'lucide-vue-next'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

const financeStore = useFinanceStore()
const selectedPeriod = ref('month')
const clientSearch = ref('')
let searchTimeout = null
const procedureSearch = ref('')
let procedureSearchTimeout = null

const periods = [
  { label: 'Hoje', value: 'day' },
  { label: 'Semana', value: 'week' },
  { label: 'Mês', value: 'month' },
  { label: 'Ano', value: 'year' },
  { label: 'Personalizado', value: 'custom' }
]

const customDateRange = ref(null)
const previousPeriod = ref('month') // Store previous period to restore on back

const formatDateDisplay = (dateInput) => {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  return date.toLocaleDateString('pt-BR')
}

onMounted(async () => {
  await Promise.all([
    financeStore.fetchDashboardData(selectedPeriod.value),
    financeStore.fetchTopClients({ period: selectedPeriod.value }),
    financeStore.fetchTopProcedures({ period: selectedPeriod.value })
  ])
})

const handlePeriodChange = async (period) => {
  if (period === 'custom') {
    previousPeriod.value = selectedPeriod.value === 'custom' ? 'month' : selectedPeriod.value
    selectedPeriod.value = period
    // Reset range when switching to custom
    customDateRange.value = null
    return
  }

  selectedPeriod.value = period
  await Promise.all([
    financeStore.fetchDashboardData(period),
    financeStore.fetchTopClients({ period, search: clientSearch.value }),
    financeStore.fetchTopProcedures({ period, search: procedureSearch.value })
  ])
}

const cancelCustomMode = () => {
    handlePeriodChange(previousPeriod.value)
}

const applyCustomFilter = async () => {
  if (!customDateRange.value || !customDateRange.value[0] || !customDateRange.value[1]) return
  
  const startDate = customDateRange.value[0].toISOString().split('T')[0]
  const endDate = customDateRange.value[1].toISOString().split('T')[0]

  isLoadingCustom.value = true
  await Promise.all([
    financeStore.fetchDashboardData('custom', startDate, endDate),
    financeStore.fetchTopClients({ 
      period: 'custom', 
      startDate, 
      endDate, 
      search: clientSearch.value 
    }),
    financeStore.fetchTopProcedures({ 
      period: 'custom', 
      startDate, 
      endDate, 
      search: procedureSearch.value 
    })
  ])
  isLoadingCustom.value = false
}

const isLoadingCustom = ref(false)

const handlePageChange = async (page) => {
    let startDate = null
    let endDate = null
    
    if (selectedPeriod.value === 'custom' && customDateRange.value) {
        startDate = customDateRange.value[0].toISOString().split('T')[0]
        endDate = customDateRange.value[1].toISOString().split('T')[0]
    }

    await financeStore.fetchTopClients({ 
        period: selectedPeriod.value, 
        startDate,
        endDate,
        page, 
        search: clientSearch.value 
    })
}

const handleProcedurePageChange = async (page) => {
    let startDate = null
    let endDate = null
    
    if (selectedPeriod.value === 'custom' && customDateRange.value) {
        startDate = customDateRange.value[0].toISOString().split('T')[0]
        endDate = customDateRange.value[1].toISOString().split('T')[0]
    }

    await financeStore.fetchTopProcedures({ 
        period: selectedPeriod.value, 
        startDate,
        endDate,
        page, 
        search: procedureSearch.value 
    })
}

const handleSearch = (event) => {
    const query = event.target.value
    clientSearch.value = query
    
    clearTimeout(searchTimeout)
    searchTimeout = setTimeout(async () => {
        let startDate = null
        let endDate = null
        
        if (selectedPeriod.value === 'custom' && customDateRange.value) {
            startDate = customDateRange.value[0].toISOString().split('T')[0]
            endDate = customDateRange.value[1].toISOString().split('T')[0]
        }

        await financeStore.fetchTopClients({ 
            period: selectedPeriod.value,
            startDate,
            endDate, 
            page: 1, 
            search: query 
        })
    }, 500)
}

const handleProcedureSearch = (event) => {
    const query = event.target.value
    procedureSearch.value = query
    
    clearTimeout(procedureSearchTimeout)
    procedureSearchTimeout = setTimeout(async () => {
        let startDate = null
        let endDate = null
        
        if (selectedPeriod.value === 'custom' && customDateRange.value) {
            startDate = customDateRange.value[0].toISOString().split('T')[0]
            endDate = customDateRange.value[1].toISOString().split('T')[0]
        }

        await financeStore.fetchTopProcedures({ 
            period: selectedPeriod.value,
            startDate,
            endDate, 
            page: 1, 
            search: query 
        })
    }, 500)
}

// --- Chart Configurations ---

// Gradient Helper
const getGradient = (ctx, chartArea, colorStart, colorEnd) => {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)
  return gradient
}

const dailyRevenueChartData = computed(() => {
  // Quando período é 'day', usa hoursRevenue; caso contrário, usa dailyRevenue
  const revenueData = selectedPeriod.value === 'day' 
    ? (financeStore.hoursRevenue || [])
    : (financeStore.dailyRevenue || [])
  
  return {
    labels: revenueData.map(d => {
      if (selectedPeriod.value === 'day') {
        // Para dia, mostra apenas a hora (ex: "13:00")
        const timePart = d._id.split(' ')[1] || d._id
        return timePart
      }
      const date = new Date(d._id + 'T00:00:00')
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    }),
    datasets: [
      {
        label: selectedPeriod.value === 'day' ? 'Receita por Hora' : 'Receita',
        borderColor: '#3b82f6', // Azul Principal
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return null
          return getGradient(ctx, chartArea, 'rgba(59, 130, 246, 0.0)', 'rgba(59, 130, 246, 0.2)')
        },
        data: revenueData.map(d => d.totalRevenue),
        tension: 0.4, // Smooth curve
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }
    ]
  }
})

const proceduresChartData = computed(() => {
  const top5 = financeStore.revenueByProcedure.slice(0, 5)
  return {
    labels: top5.map(p => p._id),
    datasets: [
      {
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
        data: top5.map(p => p.totalRevenue),
        borderWidth: 0,
        hoverOffset: 4
      }
    ]
  }
})

const monthlyRevenueChartData = computed(() => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
  return {
    labels: financeStore.monthlyRevenue.map(d => months[d._id - 1]),
    datasets: [
      {
        label: 'Faturamento Mensal',
        borderColor: '#3b82f6', // Azul Principal
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return null
          return getGradient(ctx, chartArea, 'rgba(59, 130, 246, 0.0)', 'rgba(59, 130, 246, 0.2)')
        },
        data: financeStore.monthlyRevenue.map(d => d.totalRevenue),
        tension: 0.4,
        fill: true,
        pointRadius: 4, // Slightly visible points for months
        pointHoverRadius: 6,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      }
    ]
  }
})

const mainChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#1e293b',
      bodyColor: '#475569',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      displayColors: false,
      callbacks: {
        label: (context) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.raw)
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: '#f1f5f9',
        borderDash: [5, 5]
      },
      ticks: {
        font: { family: "'Montserrat', sans-serif", size: 11 },
        color: '#94a3b8',
        callback: (value) => new Intl.NumberFormat('pt-BR', { notation: "compact", compactDisplay: "short" }).format(value)
      },
      border: { display: false }
    },
    x: {
      grid: { display: false },
      ticks: {
        font: { family: "'Montserrat', sans-serif", size: 11 },
        color: '#94a3b8'
      },
      border: { display: false }
    }
  },
  interaction: {
    intersect: false,
    mode: 'index',
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '75%', // Thinner ring
  borderRadius: 20, // Rounded ends
  spacing: 5,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        font: { family: "'Montserrat', sans-serif", size: 12 },
        color: '#64748b'
      }
    },
    tooltip: {
      backgroundColor: '#fff',
      titleColor: '#1e293b',
      bodyColor: '#475569',
      borderColor: '#e2e8f0',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: (context) => {
            const value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.raw)
            return ` ${context.label}: ${value}`
        }
      }
    }
  }
}

// Helpers
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0)
}

const getComparisonClass = (current, previous) => {
    if (!previous) return 'neutral'
    if (current >= previous) return 'positive'
    return 'negative'
}

const getComparisonIcon = (current, previous) => {
    if (!previous) return null
    if (current >= previous) return ArrowUpRight
    return ArrowDownRight
}

const getComparisonPercent = (current, previous) => {
    if (!previous) return 0
    return Math.round(((current - previous) / previous) * 100)
}
</script>

<template>
  <div class="finance-dashboard">
    <!-- Header -->
    <header class="page-header">
      <div class="header-text">
        <h1 class="title">Dashboard Financeiro</h1>
        <p class="subtitle">Visão geral do desempenho da sua clínica.</p>
      </div>
      
      <div class="header-right">
        <Transition name="slide-fade" mode="out-in">
            <!-- Normal Tabs -->
            <div v-if="selectedPeriod !== 'custom'" class="period-tabs" key="tabs">
                <button 
                v-for="period in periods" 
                :key="period.value"
                @click="handlePeriodChange(period.value)"
                class="tab-btn"
                :class="{ 'active': selectedPeriod === period.value }"
                >
                {{ period.label }}
                </button>
            </div>

            <!-- Custom Mode Controls -->
            <div v-else class="custom-controls" key="custom">
                <button class="back-btn" @click="cancelCustomMode" title="Voltar">
                    <ArrowLeft :size="18" />
                </button>
                
                <div class="date-picker-wrapper-inline">
                    <VueDatePicker
                        v-model="customDateRange"
                        range
                        :enable-time-picker="false"
                        locale="pt-BR"
                        format="dd/MM/yyyy"
                        auto-apply
                        :clearable="false"
                        placeholder="Selecione o período"
                    >
                        <template #trigger>
                        <div class="custom-date-trigger-inline">
                            <div class="date-value">
                                {{ customDateRange && customDateRange[0] ? formatDateDisplay(customDateRange[0]) : 'Data Inicial' }}
                            </div>
                            <span class="separator-inline">até</span>
                            <div class="date-value">
                                {{ customDateRange && customDateRange[1] ? formatDateDisplay(customDateRange[1]) : 'Data Final' }}
                                <CalendarDays :size="14" class="text-slate-400" />
                            </div>
                        </div>
                        </template>
                    </VueDatePicker>
                </div>

                <button 
                    class="apply-btn-inline" 
                    @click="applyCustomFilter"
                    :disabled="!customDateRange || !customDateRange[0] || !customDateRange[1] || isLoadingCustom"
                >
                    <span v-if="isLoadingCustom">...</span>
                    <span v-else>Filtrar</span>
                </button>
            </div>
        </Transition>
      </div>
    </header>

    <!-- Top Row: Balance & KPIs -->
    <div class="top-grid">
      <!-- Main Balance Card -->
      <div class="balance-card">
        <div class="balance-header">
          <span class="balance-label">Faturamento Total</span>
          <div class="balance-icon-bg">
            <DollarSign :size="20" />
          </div>
        </div>
        <div class="balance-content">
          <div v-if="financeStore.isLoading">
             <AppSkeleton width="180px" height="36px" class="mb-2" bg="rgba(255,255,255,0.2)" shimmer="rgba(255,255,255,0.3)" />
             <AppSkeleton width="140px" height="24px" borderRadius="2rem" bg="rgba(255,255,255,0.2)" shimmer="rgba(255,255,255,0.3)" />
          </div>
          <template v-else>
            <h2 class="balance-value">{{ formatCurrency(financeStore.revenueSummary.totalRevenue) }}</h2>
            <div class="balance-trend" :class="getComparisonClass(financeStore.comparison.month.current, financeStore.comparison.month.previous)">
                <component :is="getComparisonIcon(financeStore.comparison.month.current, financeStore.comparison.month.previous)" :size="16" />
                <span>{{ getComparisonPercent(financeStore.comparison.month.current, financeStore.comparison.month.previous) }}% vs período anterior</span>
            </div>
          </template>
        </div>
      </div>

      <!-- KPI Cards (Small) -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Ticket Médio</span>
          <TrendingUp :size="18" class="text-emerald-500" />
        </div>
        <div class="kpi-body">
          <AppSkeleton v-if="financeStore.isLoading" width="100px" height="28px" />
          <span v-else class="kpi-value">{{ formatCurrency(financeStore.kpi.averageTicket) }}</span>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Procedimentos</span>
          <Activity :size="18" class="text-violet-500" />
        </div>
        <div class="kpi-body">
          <template v-if="financeStore.isLoading">
             <AppSkeleton width="60px" height="28px" class="mb-1" />
             <AppSkeleton width="80px" height="14px" />
          </template>
          <template v-else>
            <span class="kpi-value">{{ financeStore.kpi.proceduresCount }}</span>
            <span class="kpi-sub">realizados</span>
          </template>
        </div>
      </div>

      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">Melhor Cliente</span>
          <Users :size="18" class="text-amber-500" />
        </div>
        <div class="kpi-body">
          <template v-if="financeStore.isLoading">
             <AppSkeleton width="120px" height="20px" class="mb-1" />
             <AppSkeleton width="90px" height="14px" />
          </template>
          <template v-else>
            <span class="kpi-value text-sm truncate" :title="financeStore.topClients[0]?.name">{{ financeStore.topClients[0]?.name || '-' }}</span>
            <span class="kpi-sub">{{ formatCurrency(financeStore.topClients[0]?.totalRevenue) }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Middle Row: Charts -->
    <div class="charts-section">
      <!-- Main Chart -->
      <div class="chart-card main-chart-card">
        <div class="card-header">
          <h3 class="card-title">Evolução da Receita</h3>
        </div>
        <div class="chart-wrapper">
          <div v-if="financeStore.isLoading" class="w-full h-full flex items-end gap-2 px-4 pb-4">
             <AppSkeleton width="100%" height="100%" borderRadius="0.5rem" />
          </div>
          <Line v-else :data="dailyRevenueChartData" :options="mainChartOptions" />
        </div>
      </div>

      <!-- Doughnut Chart -->
      <div class="chart-card doughnut-card">
        <div class="card-header">
          <h3 class="card-title">Por Procedimento</h3>
        </div>
        <div class="doughnut-wrapper">
          <div v-if="financeStore.isLoading" class="w-full h-full flex items-center justify-center">
             <AppSkeleton width="200px" height="200px" borderRadius="50%" />
          </div>
          <Doughnut v-else :data="proceduresChartData" :options="doughnutOptions" />
        </div>
      </div>
    </div>

    <!-- Monthly Revenue Bar Chart (Full Width) -->
    <div class="chart-card full-width mb-8">
        <div class="card-header">
            <h3 class="card-title">Faturamento Mensal (Ano Atual)</h3>
        </div>
        <div class="chart-wrapper">
            <div v-if="financeStore.isLoading" class="w-full h-full flex items-end gap-2 px-4 pb-4">
                <AppSkeleton width="100%" height="100%" borderRadius="0.5rem" />
            </div>
            <Line v-else :data="monthlyRevenueChartData" :options="mainChartOptions" />
        </div>
    </div>

    <!-- Bottom Row: Transactions & Top Procedures -->
    <div class="lists-grid">
      <!-- Top Clients Table -->
      <div class="table-card">
        <div class="card-header">
          <h3 class="card-title">Top Clientes</h3>
          <div class="search-box">
            <Search :size="14" />
            <input 
                type="text" 
                placeholder="Buscar..." 
                v-model="clientSearch"
                @input="handleSearch"
            />
          </div>
        </div>
        
        <!-- Mobile Cards View -->
        <div class="mobile-cards-list">
          <template v-if="financeStore.topClientsPaginated.isLoading">
            <div v-for="i in 3" :key="i" class="mobile-card">
              <div class="mobile-card-header">
                <AppSkeleton width="36px" height="36px" borderRadius="50%" />
                <div class="mobile-card-info">
                  <AppSkeleton width="100px" height="14px" class="mb-1" />
                  <AppSkeleton width="60px" height="12px" />
                </div>
              </div>
              <AppSkeleton width="80px" height="18px" />
            </div>
          </template>
          <template v-else>
            <div v-for="client in financeStore.topClientsPaginated.data" :key="client._id" class="mobile-card">
              <div class="mobile-card-header">
                <div class="client-avatar">{{ client.name.charAt(0) }}</div>
                <div class="mobile-card-info">
                  <span class="mobile-card-name">{{ client.name }}</span>
                  <span class="mobile-card-sub">{{ client.appointmentsCount }} procedimentos</span>
                </div>
              </div>
              <span class="mobile-card-value">{{ formatCurrency(client.totalRevenue) }}</span>
            </div>
            <div v-if="financeStore.topClientsPaginated.data.length === 0" class="mobile-empty">
              Nenhum cliente encontrado.
            </div>
          </template>
        </div>

        <!-- Desktop Table View -->
        <div class="table-responsive desktop-only">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th class="text-center">Procedimento</th>
                <th class="text-right">Total Gasto</th>
                <th class="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="financeStore.topClientsPaginated.isLoading">
                  <tr v-for="i in 5" :key="i">
                      <td>
                          <div class="flex items-center gap-3">
                              <AppSkeleton width="32px" height="32px" borderRadius="50%" />
                              <AppSkeleton width="120px" height="16px" />
                          </div>
                      </td>
                      <td class="text-center"><AppSkeleton width="40px" height="16px" class="mx-auto" /></td>
                      <td class="text-right"><AppSkeleton width="80px" height="16px" class="ml-auto" /></td>
                      <td class="text-right"><AppSkeleton width="60px" height="20px" borderRadius="1rem" class="ml-auto" /></td>
                  </tr>
              </template>
              <template v-else>
                <tr v-for="client in financeStore.topClientsPaginated.data" :key="client._id">
                    <td>
                    <div class="client-info">
                        <div class="client-avatar">{{ client.name.charAt(0) }}</div>
                        <span class="client-name">{{ client.name }}</span>
                    </div>
                    </td>
                    <td class="text-center">{{ client.appointmentsCount }}</td>
                    <td class="text-right font-bold">{{ formatCurrency(client.totalRevenue) }}</td>
                    <td class="text-right">
                        <span class="status-badge success">Ativo</span>
                    </td>
                </tr>
                <tr v-if="financeStore.topClientsPaginated.data.length === 0">
                    <td colspan="4" class="text-center py-8 text-muted">Nenhum cliente encontrado.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="card-footer" v-if="financeStore.topClientsPaginated.pagination.total > 0">
            <AppPagination
                :current-page="financeStore.topClientsPaginated.pagination.page"
                :total-pages="financeStore.topClientsPaginated.pagination.pages"
                :total-items="financeStore.topClientsPaginated.pagination.total"
                :limit="financeStore.topClientsPaginated.pagination.limit"
                @page-change="handlePageChange"
            ></AppPagination>
        </div>
      </div>

      <!-- Top Procedures Table -->
      <div class="table-card">
        <div class="card-header">
          <h3 class="card-title">Procedimentos Mais Realizados</h3>
          <div class="search-box">
            <Search :size="14" />
            <input 
                type="text" 
                placeholder="Buscar..." 
                v-model="procedureSearch"
                @input="handleProcedureSearch"
            />
          </div>
        </div>

        <!-- Mobile Cards View -->
        <div class="mobile-cards-list">
          <template v-if="financeStore.topProceduresPaginated.isLoading">
            <div v-for="i in 3" :key="i" class="mobile-card">
              <div class="mobile-card-header">
                <div class="mobile-card-info">
                  <AppSkeleton width="120px" height="14px" class="mb-1" />
                  <AppSkeleton width="50px" height="12px" />
                </div>
              </div>
              <AppSkeleton width="80px" height="18px" />
            </div>
          </template>
          <template v-else>
            <div v-for="proc in financeStore.topProceduresPaginated.data" :key="proc._id" class="mobile-card">
              <div class="mobile-card-header">
                <div class="mobile-card-info">
                  <span class="mobile-card-name">{{ proc._id }}</span>
                  <span class="mobile-card-sub">{{ proc.count }} realizados</span>
                </div>
              </div>
              <span class="mobile-card-value text-emerald-600">{{ formatCurrency(proc.totalRevenue) }}</span>
            </div>
            <div v-if="financeStore.topProceduresPaginated.data.length === 0" class="mobile-empty">
              Nenhum procedimento encontrado.
            </div>
          </template>
        </div>

        <!-- Desktop Table View -->
        <div class="table-responsive desktop-only">
          <table class="premium-table">
            <thead>
              <tr>
                <th>Procedimento</th>
                <th class="text-right">Qtd.</th>
                <th class="text-right">Receita</th>
              </tr>
            </thead>
            <tbody>
              <template v-if="financeStore.topProceduresPaginated.isLoading">
                  <tr v-for="i in 5" :key="i">
                      <td><AppSkeleton width="150px" height="16px" /></td>
                      <td class="text-right"><AppSkeleton width="40px" height="16px" class="ml-auto" /></td>
                      <td class="text-right"><AppSkeleton width="80px" height="16px" class="ml-auto" /></td>
                  </tr>
              </template>
              <template v-else>
                <tr v-for="proc in financeStore.topProceduresPaginated.data" :key="proc._id">
                    <td>
                    <span class="font-medium text-slate-700">{{ proc._id }}</span>
                    </td>
                    <td class="text-right">{{ proc.count }}</td>
                    <td class="text-right font-bold text-emerald-600">{{ formatCurrency(proc.totalRevenue) }}</td>
                </tr>
                <tr v-if="financeStore.topProceduresPaginated.data.length === 0">
                    <td colspan="3" class="text-center py-8 text-muted">Nenhum procedimento encontrado.</td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div class="card-footer" v-if="financeStore.topProceduresPaginated.pagination.total > 0">
            <AppPagination
                :current-page="financeStore.topProceduresPaginated.pagination.page"
                :total-pages="financeStore.topProceduresPaginated.pagination.pages"
                :total-items="financeStore.topProceduresPaginated.pagination.total"
                :limit="financeStore.topProceduresPaginated.pagination.limit"
                @page-change="handleProcedurePageChange"
            ></AppPagination>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.finance-dashboard {
  /* Using system standard font family */
  font-family: var(--fonte-principal);
  color: var(--preto);
  /* Removed max-width to match system full-width layout */
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center; /* Changed to center to match PatientsListView */
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-right {
    display: flex;
    align-items: center;
    min-height: 52px; /* Prevent layout shift */
}

.title {
  font-size: 2.25rem; /* Matched PatientsListView title size */
  font-weight: 700;
  margin-bottom: 0.25rem;
  color: var(--preto); /* Using system variable */
}

.subtitle {
  color: var(--cinza-texto); /* Using system variable */
  font-size: 1rem; /* Standard body size */
}

/* Period Tabs */
.period-tabs {
  display: flex;
  background-color: #f1f5f9;
  padding: 0.25rem;
  border-radius: 0.75rem;
}

.tab-btn {
  padding: 0.5rem 1.25rem;
  border: none;
  background: transparent;
  color: var(--cinza-texto);
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background-color: var(--branco);
  color: var(--azul-principal);
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.tab-btn:hover:not(.active) {
  color: var(--preto);
}

/* Custom Controls Inline */
.custom-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background-color: var(--branco);
    padding: 0.25rem;
    border-radius: 0.75rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    border: 1px solid #e5e7eb;
}

.back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border: none;
    background: transparent;
    border-radius: 0.5rem;
    color: var(--cinza-texto);
    cursor: pointer;
    transition: all 0.2s;
}

.back-btn:hover {
    background-color: #f1f5f9;
    color: var(--preto);
}

.date-picker-wrapper-inline {
    width: 260px;
}

.custom-date-trigger-inline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem 0.75rem;
  background-color: transparent;
  cursor: pointer;
  height: 36px;
  gap: 0.5rem;
}

.separator-inline {
    color: #94a3b8;
    font-size: 0.8rem;
    padding: 0 0.25rem;
}

.apply-btn-inline {
    padding: 0 1rem;
    height: 36px;
    background-color: var(--azul-principal);
    color: var(--branco);
    border: none;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
}

.apply-btn-inline:hover {
    background-color: var(--azul-escuro);
}

.apply-btn-inline:disabled {
    background-color: #cbd5e1;
    cursor: not-allowed;
}

/* Animations */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

/* Original Custom Filter Bar Styles Removed */

/* Grid Layouts */
.top-grid {
  display: grid;
  grid-template-columns: 1.5fr repeat(3, 1fr);
  gap: 1.5rem;
  margin-bottom: 2rem;
}

@media (max-width: 1024px) {
  .top-grid {
    grid-template-columns: 1fr 1fr;
  }
  .balance-card {
      grid-column: span 2;
  }
}

@media (max-width: 640px) {
  .top-grid {
    grid-template-columns: 1fr;
  }
  .balance-card {
      grid-column: span 1;
  }
}

/* Balance Card */
.balance-card {
  background: linear-gradient(135deg, var(--azul-principal) 0%, var(--azul-escuro) 100%);
  color: var(--branco);
  padding: 1.75rem;
  border-radius: 1rem; /* Standard radius */
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.4);
  min-height: 160px;
}

.balance-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.balance-label {
  font-size: 0.95rem;
  font-weight: 500;
  opacity: 0.9;
}

.balance-icon-bg {
  background-color: rgba(255, 255, 255, 0.2);
  padding: 0.5rem;
  border-radius: 0.75rem;
  display: flex;
}

.balance-value {
  font-size: 2.25rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  letter-spacing: -0.02em;
}

.balance-trend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  padding: 0.25rem 0.75rem;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 2rem;
  width: fit-content;
}

.balance-trend.positive { color: #86efac; background-color: rgba(134, 239, 172, 0.15); }
.balance-trend.negative { color: #fca5a5; background-color: rgba(252, 165, 165, 0.15); }
.balance-trend.neutral { color: #e2e8f0; }

/* KPI Cards */
.kpi-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb; /* Standard border color */
  border-radius: 1rem; /* Standard radius */
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.kpi-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.kpi-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.kpi-label {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  font-weight: 600;
}

.kpi-body {
  display: flex;
  flex-direction: column;
}

.kpi-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--preto);
  line-height: 1.2;
}

.kpi-sub {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
}

@media (max-width: 1200px) {
  .charts-section {
    grid-template-columns: 1.5fr 1fr;
  }
}

@media (max-width: 1024px) {
  .charts-section {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.chart-card.full-width {
  width: 100%;
}

.mb-8 {
  margin-bottom: 2rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--preto);
}

.chart-wrapper {
  height: 300px;
  width: 100%;
  max-width: 100%;
  position: relative;
}

.doughnut-wrapper {
  height: 300px;
  width: 100%;
  max-width: 100%;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.doughnut-card {
  min-width: 0;
}

/* Responsividade dos gráficos */
@media (max-width: 768px) {
  .charts-section {
    gap: 1rem;
  }

  .chart-wrapper {
    height: 250px;
  }
  
  .doughnut-wrapper {
    height: 280px;
  }
  
  .chart-card {
    padding: 1rem;
  }
  
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
}

@media (max-width: 480px) {
  .chart-wrapper {
    height: 200px;
  }
  
  .doughnut-wrapper {
    height: 220px;
  }
  
  .card-title {
    font-size: 0.95rem;
  }
}

/* Lists Grid */
.lists-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .lists-grid {
    grid-template-columns: 1fr;
  }
}

/* Table Section */
.table-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.5rem;
  height: 550px;
  display: flex;
  flex-direction: column;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #f8fafc;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.search-box input {
  border: none;
  background: transparent;
  outline: none;
  font-size: 0.875rem;
  color: #334155;
  width: 150px;
}

.table-responsive {
  overflow-x: auto;
  flex: 1;
  overflow-y: auto;
}

.premium-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 0.3rem;
}

.premium-table th {
  text-align: left;
  color: var(--cinza-texto);
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  padding: 0.75rem 1rem;
  letter-spacing: 0.05em;
}

.premium-table td {
  padding: 1rem;
  background-color: #fff;
  border-top: 1px solid #f1f5f9;
  border-bottom: 1px solid #f1f5f9;
  color: var(--preto);
}

.premium-table tr:first-child td {
    border-top: none;
}

.premium-table tr:hover td {
    background-color: #f8fafc;
}

.client-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.client-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #eff6ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.875rem;
}

.client-name {
  font-weight: 600;
  color: var(--preto);
  font-size: 0.95rem;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-badge.success {
  background-color: #ecfdf5;
  color: #059669;
}

.text-center { text-align: center; }
.text-right { text-align: right; }
.font-bold { font-weight: 700; }
.text-muted { color: var(--cinza-texto); }
.font-medium { font-weight: 500; }

/* Helpers */
.text-emerald-500 { color: #10b981; }
.text-emerald-600 { color: #059669; }
.text-violet-500 { color: #8b5cf6; }
.text-amber-500 { color: #f59e0b; }
.text-slate-700 { color: #334155; }
/* Card Footer */
.card-footer {
  padding: 1rem;
  border-top: 1px solid #f1f5f9;
}

/* ===================== */
/* Mobile Card Components */
/* ===================== */

.mobile-cards-list {
  display: none;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
  overflow-y: auto;
}

.mobile-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem;
  background-color: #f8fafc;
  border-radius: 0.75rem;
  transition: background-color 0.15s ease;
}

.mobile-card:hover {
  background-color: #f1f5f9;
}

.mobile-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.mobile-card-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.mobile-card-name {
  font-weight: 600;
  color: var(--preto);
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-card-sub {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  margin-top: 0.125rem;
}

.mobile-card-value {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--preto);
  white-space: nowrap;
  margin-left: 0.5rem;
}

.mobile-empty {
  text-align: center;
  padding: 2rem;
  color: var(--cinza-texto);
  font-size: 0.875rem;
}

/* ===================== */
/* Mobile Responsive     */
/* ===================== */

@media (max-width: 768px) {
  .finance-dashboard {
    padding: 0;
  }

  /* Show mobile cards, hide desktop tables */
  .mobile-cards-list {
    display: flex;
  }

  .desktop-only {
    display: none !important;
  }

  /* Header Mobile */
  .page-header {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .header-text {
    width: 100%;
    text-align: center;
  }

  .title {
    font-size: 1.75rem;
    margin-bottom: 0.25rem;
  }

  .subtitle {
    font-size: 0.875rem;
  }

  /* Period Tabs Mobile */
  .period-tabs {
    width: 100%;
    justify-content: center;
    background-color: #f1f5f9;
  }

  .tab-btn {
    flex: 1;
    padding: 0.625rem 0.75rem;
    font-size: 0.8rem;
    text-align: center;
    white-space: nowrap;
  }

  /* Balance Card Mobile */
  .balance-card {
    padding: 1.25rem;
    min-height: auto;
  }

  .balance-value {
    font-size: 1.75rem;
  }

  .balance-trend {
    font-size: 0.75rem;
    padding: 0.25rem 0.625rem;
  }

  /* KPI Cards Mobile */
  .kpi-card {
    padding: 1.25rem;
  }

  .kpi-value {
    font-size: 1.25rem;
  }

  /* Charts Mobile */
  .chart-card {
    padding: 1rem;
  }

  .card-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .card-title {
    font-size: 1rem;
  }

  .chart-wrapper,
  .doughnut-wrapper {
    height: 250px;
  }

  /* Table Cards Mobile */
  .table-card {
    padding: 1rem;
    height: auto;
    min-height: auto;
    max-height: none;
  }

  .search-box {
    width: 100%;
    padding: 0.5rem 0.875rem;
  }

  .search-box input {
    width: 100%;
    font-size: 0.875rem;
  }

  /* Card Footer Mobile */
  .card-footer {
    padding: 0.875rem;
  }

  /* Client Avatar in mobile cards */
  .mobile-card .client-avatar {
    width: 36px;
    height: 36px;
    font-size: 0.875rem;
    flex-shrink: 0;
  }
}

/* Extra small devices */
@media (max-width: 480px) {
  .title {
    font-size: 1.5rem;
  }

  .balance-value {
    font-size: 1.5rem;
  }

  .balance-trend span {
    font-size: 0.7rem;
  }

  .kpi-value {
    font-size: 1.1rem;
  }

  .kpi-label {
    font-size: 0.8rem;
  }

  .chart-wrapper,
  .doughnut-wrapper {
    height: 200px;
  }

  .mobile-card {
    padding: 0.75rem;
  }

  .mobile-card-name {
    font-size: 0.85rem;
  }

  .mobile-card-value {
    font-size: 0.875rem;
  }

  .tab-btn {
    padding: 0.5rem 0.5rem;
    font-size: 0.75rem;
  }
}
</style>
