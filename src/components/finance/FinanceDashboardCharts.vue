<script setup>
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useFinanceStore } from '@/stores/finance'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import {
  TrendingUp,
  Activity,
  ChevronLeft,
  ChevronRight
} from 'lucide-vue-next'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
} from 'chart.js'
import { Line, Doughnut } from 'vue-chartjs'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  Filler
)

const props = defineProps({
  selectedPeriod: {
    type: String,
    required: true
  }
})

const financeStore = useFinanceStore()
const legendScrollContainer = ref(null)
const isScrollable = ref(false)
const canScrollLeft = ref(false)
const canScrollRight = ref(false)

const checkScrollConstraints = () => {
  if (!legendScrollContainer.value) return
  const el = legendScrollContainer.value
  isScrollable.value = el.scrollWidth > el.clientWidth
  canScrollLeft.value = el.scrollLeft > 2
  canScrollRight.value = Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth - 2
}

const scrollLegend = (direction) => {
  if (legendScrollContainer.value) {
    if (direction === 'left' && !canScrollLeft.value) return
    if (direction === 'right' && !canScrollRight.value) return

    const scrollAmount = 150
    if (direction === 'left') {
      legendScrollContainer.value.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    } else {
      legendScrollContainer.value.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
    setTimeout(checkScrollConstraints, 350)
  }
}

watch(() => financeStore.revenueByProcedure, () => {
  nextTick(() => {
    checkScrollConstraints()
  })
}, { deep: true })

onMounted(() => {
  setTimeout(checkScrollConstraints, 100)
  window.addEventListener('resize', checkScrollConstraints)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkScrollConstraints)
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0)
}

const getGradient = (ctx, chartArea, colorStart, colorEnd) => {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  gradient.addColorStop(0, colorStart)
  gradient.addColorStop(1, colorEnd)
  return gradient
}

const dailyRevenueChartData = computed(() => {
  const isDay = props.selectedPeriod === 'day'
  const isYear = props.selectedPeriod === 'year'

  let revenueData = []
  let previousDataRaw = []

  if (isDay) {
    revenueData = financeStore.hoursRevenue || []
    previousDataRaw = financeStore.previousHoursRevenue || []
  } else if (isYear) {
    revenueData = financeStore.monthlyRevenue || []
    previousDataRaw = [] 
  } else {
    revenueData = financeStore.dailyRevenue || []
    previousDataRaw = financeStore.previousDailyRevenue || []
  }

  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return {
    labels: revenueData.map(d => {
      if (isDay) {
        const timePart = d._id.split(' ')[1] || d._id
        return timePart
      }
      if (isYear) {
        return months[d._id - 1] || d._id
      }
      if (typeof d._id === 'string' && d._id.includes('-')) {
        const date = new Date(d._id + 'T00:00:00')
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      }
      return d._id
    }),
    datasets: [
      {
        label: 'Período Atual',
        borderColor: '#3b82f6',
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return null
          return getGradient(ctx, chartArea, 'rgba(59, 130, 246, 0.0)', 'rgba(59, 130, 246, 0.2)')
        },
        data: revenueData.map(d => d.totalRevenue),
        tension: 0.4,
        fill: true,
        pointRadius: isYear ? 4 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
      },
      {
        label: 'Período Anterior',
        borderColor: '#94a3b8',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        data: previousDataRaw.length ? previousDataRaw.map(d => d.totalRevenue) : [],
        tension: 0.4,
        fill: false,
        pointRadius: isYear ? 4 : 0,
        pointHoverRadius: 6,
        pointBackgroundColor: '#94a3b8',
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
        hoverOffset: 2
      }
    ]
  }
})

const mainChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { 
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        font: { family: "'Montserrat', sans-serif", size: 11 },
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
      displayColors: true,
      usePointStyle: true,
      callbacks: {
        label: (context) => {
          const label = context.dataset.label || '';
          const value = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.raw);
          return ` ${label}: ${value}`;
        }
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
  cutout: '80%',
  borderRadius: 10,
  spacing: 5,
  plugins: {
    legend: {
      display: false
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
</script>

<template>
    <div class="charts-section">
      <!-- Main Chart -->
      <div class="chart-card main-chart-card">
        <div class="card-header">
          <div class="header-text-group">
            <h3 class="card-title">Evolução da Receita</h3>
            <p class="card-subtitle">Acompanhe o crescimento da receita no período selecionado.</p>
          </div>
          <div class="ubc-icon-wrapper">
            <TrendingUp :size="20" class="text-blue-600" />
          </div>
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
          <div class="header-text-group">
            <h3 class="card-title">Por Procedimento</h3>
            <p class="card-subtitle">Distribuição da receita gerada por tipo de serviço.</p>
          </div>
          <div class="ubc-icon-wrapper">
            <Activity :size="20" class="text-blue-600" />
          </div>
        </div>
        <div class="doughnut-content-wrapper h-full flex flex-col">
          <div v-if="financeStore.isLoading" class="w-full h-full flex flex-col items-center justify-center min-h-[300px]">
             <AppSkeleton width="200px" height="200px" borderRadius="50%" class="mb-4" />
             <AppSkeleton width="80%" height="20px" class="mb-2" />
             <AppSkeleton width="60%" height="20px" />
          </div>
          <template v-else>
            <div class="doughnut-wrapper relative" style="height: 240px; margin-bottom: 2rem; flex-shrink: 0;">
              <Doughnut :data="proceduresChartData" :options="doughnutOptions" />
              <div class="doughnut-center-text absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style="font-family: var(--fonte-principal), 'Montserrat', sans-serif;">
                <span class="text-[0.7rem] font-semibold text-slate-500 uppercase tracking-widest mb-0.5">Total</span>
                <span class="text-lg font-bold text-[#0f172a]">{{ formatCurrency(proceduresChartData.datasets[0].data.reduce((acc, val) => acc + val, 0)) }}</span>
              </div>
            </div>
            
            <div class="w-full flex items-center justify-center gap-1 group px-1">
              <button v-show="isScrollable" @click="scrollLegend('left')" type="button" :class="canScrollLeft ? 'opacity-100 hover:text-blue-600 hover:bg-slate-50' : 'opacity-30 cursor-not-allowed'" class="flex-shrink-0 z-10 w-6 h-6 flex items-center justify-center bg-white rounded-full shadow border border-slate-200 text-slate-400 transition-all duration-200">
                <ChevronLeft :size="14" />
              </button>

              <div ref="legendScrollContainer" @scroll="checkScrollConstraints" class="custom-doughnut-legend flex-1 flex gap-4 px-2 overflow-x-auto hide-scrollbar scroll-smooth" style="font-family: var(--fonte-principal), 'Montserrat', sans-serif; padding-bottom: 0.25rem;">
                <div v-for="(label, index) in proceduresChartData.labels" :key="index" class="flex items-start gap-2 py-0.5 flex-shrink-0 w-36">
                  <div class="w-3 h-3 rounded-full mt-1 flex-shrink-0" :style="{ backgroundColor: proceduresChartData.datasets[0].backgroundColor[index] }"></div>
                  <div class="flex flex-col min-w-0 flex-1 gap-0.5">
                    <span class="text-[0.82rem] font-medium text-slate-700 truncate leading-snug" :title="label">{{ label }}</span>
                    <span class="text-[0.75rem] text-slate-500 leading-normal">{{ formatCurrency(proceduresChartData.datasets[0].data[index]) }}</span>
                  </div>
                </div>
              </div>

              <button v-show="isScrollable" @click="scrollLegend('right')" type="button" :class="canScrollRight ? 'opacity-100 hover:text-blue-600 hover:bg-slate-50' : 'opacity-30 cursor-not-allowed'" class="flex-shrink-0 z-10 w-6 h-6 flex items-center justify-center bg-white rounded-full shadow border border-slate-200 text-slate-400 transition-all duration-200">
                <ChevronRight :size="14" />
              </button>
            </div>
          </template>
        </div>
      </div>
    </div>
</template>

<style scoped>
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
  border-radius: 1.25rem;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--preto);
}

.card-subtitle {
  font-size: 0.875rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
  font-weight: 400;
}

.ubc-icon-wrapper {
  background-color: #eff6ff;
  padding: 0.6rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
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

.hide-scrollbar {
  -ms-overflow-style: none; /* IE and Edge */
  scrollbar-width: none; /* Firefox */
}
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}

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
    flex-direction: row;
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
</style>
