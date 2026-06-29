<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Activity,
  CalendarDays,
  TrendingUp,
  Users,
  SearchX,
} from 'lucide-vue-next'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js'
import { Doughnut, Line } from 'vue-chartjs'
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import FinanceSummaryCard from '@/components/financeiro/FinanceSummaryCard.vue'
import { useFinanceiroStore } from '@/stores/financeiro'
import { useFinanceStore } from '@/stores/finance'

ChartJS.register(
  ArcElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
)

const financeiroStore = useFinanceiroStore()
const analyticsStore = useFinanceStore()

const dateRange = ref([startOfMonthDate(), endOfMonthDate()])
const summaryCarouselIndex = ref(0)
const analyticsCarouselIndex = ref(0)
const summaryCarouselDrag = createCarouselDragState()
const analyticsCarouselDrag = createCarouselDragState()

const resumo = computed(() => financeiroStore.resumo || {})
const profit = computed(() => resumo.value.profit || {})
const receivable = computed(() => resumo.value.receivable || {})
const payable = computed(() => resumo.value.payable || {})
const cash = computed(() => resumo.value.cash || {})
const alerts = computed(() => resumo.value.alerts || {})
const recentCashMovements = computed(() =>
  [...(financeiroStore.movimentosCaixa || [])]
    .sort((a, b) => new Date(b.settledAt || b.createdAt || 0) - new Date(a.settledAt || a.createdAt || 0))
    .slice(0, 6)
)
const revenueSparkline = computed(() => {
  const values = (analyticsStore.dailyRevenue || []).map((item) => Number(item.totalRevenue || 0))
  return values.length >= 2 ? values : buildSparkline(analyticsStore.revenueSummary.totalRevenue, [0.64, 0.72, 0.7, 0.82, 0.78, 0.91, 1])
})
const receivableSparkline = computed(() =>
  buildSparkline(receivable.value.openCents, [0.62, 0.7, 0.66, 0.78, 0.76, 0.88, 0.84, 1])
)
const payableSparkline = computed(() =>
  buildSparkline(payable.value.openCents, [0.92, 0.82, 0.86, 0.74, 0.78, 0.68, 0.72, 0.58])
)
const cashSparkline = computed(() =>
  buildSparkline(cash.value.balanceCents, [0.58, 0.64, 0.72, 0.7, 0.82, 0.8, 0.9, 1])
)
const profitSparkline = computed(() =>
  buildSparkline(profit.value.grossProfitCents, [0.7, 0.68, 0.76, 0.74, 0.84, 0.78, 0.92, 0.88])
)
const averageTicketSparkline = computed(() =>
  buildSparkline(analyticsStore.kpi.averageTicket, [0.72, 0.7, 0.78, 0.76, 0.86, 0.82, 0.9, 0.96])
)
const proceduresSparkline = computed(() =>
  buildSparkline(analyticsStore.kpi.proceduresCount, [0.52, 0.62, 0.58, 0.74, 0.7, 0.86, 0.8, 0.92])
)
const appointmentsSparkline = computed(() =>
  buildSparkline(analyticsStore.kpi.appointmentsCount, [0.64, 0.6, 0.7, 0.68, 0.8, 0.84, 0.82, 0.94])
)

const financeSummaryCards = computed(() => [
  {
    key: 'receivable',
    theme: 'blue',
    label: 'Entradas em aberto',
    value: money(receivable.value.openCents),
    subtext: `${receivable.value.count || 0} contas no período`,
    sparkline: receivableSparkline.value,
    sparklineTone: 'green',
  },
  {
    key: 'payable',
    theme: 'red',
    label: 'Saídas em aberto',
    value: money(payable.value.openCents),
    subtext: `${payable.value.count || 0} contas no período`,
    sparkline: payableSparkline.value,
    sparklineTone: 'red',
  },
  {
    key: 'cash',
    theme: 'green',
    label: 'Caixa disponível',
    value: money(cash.value.balanceCents),
    subtext: `Recebido ${money(cash.value.receivedCents)}`,
    sparkline: cashSparkline.value,
    sparklineTone: 'green',
  },
  {
    key: 'profit',
    theme: 'amber',
    label: 'Resultado bruto',
    value: money(profit.value.grossProfitCents),
    subtext: `${profit.value.marginPercent || 0}% de margem`,
    sparkline: profitSparkline.value,
    sparklineTone: 'amber',
  },
])

const analyticsSummaryCards = computed(() => [
  {
    key: 'revenue',
    label: 'Faturamento',
    value: moneyValue(analyticsStore.revenueSummary.totalRevenue),
    sparkline: revenueSparkline.value,
    sparklineTone: 'green',
  },
  {
    key: 'ticket',
    label: 'Ticket médio',
    value: moneyValue(analyticsStore.kpi.averageTicket),
    sparkline: averageTicketSparkline.value,
    sparklineTone: 'blue',
  },
  {
    key: 'procedures',
    label: 'Procedimentos',
    value: analyticsStore.kpi.proceduresCount || 0,
    sparkline: proceduresSparkline.value,
    sparklineTone: 'slate',
  },
  {
    key: 'appointments',
    label: 'Atendimentos',
    value: analyticsStore.kpi.appointmentsCount || 0,
    sparkline: appointmentsSparkline.value,
    sparklineTone: 'blue',
  },
])
const procedureProfitMap = computed(() => {
  const map = new Map()
  financeiroStore.lucratividadeProcedimentos.forEach((item) => {
    const key = item._id?.name || item.name
    if (key) map.set(key, item)
  })
  return map
})

const analyticsTopProcedures = computed(() =>
  (analyticsStore.topProceduresPaginated.data || []).map((item) => {
    const profit = procedureProfitMap.value.get(item._id)
    return {
      ...item,
      profitCents: profit?.grossProfitCents,
      marginPercent: profit?.marginPercent,
    }
  })
)

function wrapIndex(current, total, direction) {
  if (total <= 0) return 0
  const next = current + direction
  return (next + total) % total
}

function createCarouselDragState() {
  return {
    pointerId: null,
    startX: 0,
    currentX: 0,
    offset: 0,
    isDragging: false,
    suppressClick: false,
  }
}

function getCarouselContext(type) {
  if (type === 'summary') {
    return {
      index: summaryCarouselIndex,
      drag: summaryCarouselDrag,
      total: financeSummaryCards.value.length,
    }
  }

  return {
    index: analyticsCarouselIndex,
    drag: analyticsCarouselDrag,
    total: analyticsSummaryCards.value.length,
  }
}

function activateCarouselCard(type, nextIndex) {
  const { index, total } = getCarouselContext(type)
  if (total <= 0) return
  index.value = ((nextIndex % total) + total) % total
}

function handleCarouselPointerDown(type, event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return

  const { drag } = getCarouselContext(type)
  drag.pointerId = event.pointerId
  drag.startX = event.clientX
  drag.currentX = event.clientX
  drag.offset = 0
  drag.isDragging = false
  drag.suppressClick = false

  if (event.currentTarget?.setPointerCapture) {
    event.currentTarget.setPointerCapture(event.pointerId)
  }
}

function handleCarouselPointerMove(type, event) {
  const { drag } = getCarouselContext(type)
  if (drag.pointerId !== event.pointerId) return

  drag.currentX = event.clientX
  const delta = drag.currentX - drag.startX
  drag.offset = delta

  if (Math.abs(delta) > 6) {
    drag.isDragging = true
  }
}

function handleCarouselPointerUp(type) {
  const { index, drag, total } = getCarouselContext(type)
  if (drag.pointerId === null) return

  const delta = drag.currentX - drag.startX
  const threshold = 42

  if (Math.abs(delta) >= threshold && total > 1) {
    index.value = delta < 0 ? wrapIndex(index.value, total, 1) : wrapIndex(index.value, total, -1)
  }

  drag.pointerId = null
  drag.startX = 0
  drag.currentX = 0
  drag.offset = 0
  drag.suppressClick = true
  window.setTimeout(() => {
    drag.suppressClick = false
    drag.isDragging = false
  }, 0)
}

function handleCarouselPointerCancel(type) {
  const { drag } = getCarouselContext(type)
  drag.pointerId = null
  drag.startX = 0
  drag.currentX = 0
  drag.offset = 0
  drag.isDragging = false
  drag.suppressClick = false
}

function handleCarouselCardClick(type, index) {
  const { drag, total } = getCarouselContext(type)
  if (drag.suppressClick || drag.isDragging || total <= 1) return
  activateCarouselCard(type, index)
}

function getCarouselCardState(index, activeIndex, total) {
  const distance = getCarouselDistance(index, activeIndex, total)
  if (distance === 0) return 'is-active'
  if (Math.abs(distance) === 1) return 'is-neighbor'
  return 'is-far'
}

function getCarouselDistance(index, activeIndex, total) {
  if (total <= 0) return 0
  const raw = index - activeIndex
  const wrapped = ((raw % total) + total) % total
  return wrapped > total / 2 ? wrapped - total : wrapped
}

function getCarouselCardStyle(index, activeIndex, total, dragOffset = 0) {
  const distance = getCarouselDistance(index, activeIndex, total)
  const absDistance = Math.abs(distance)
  const isActive = distance === 0
  const isNeighbor = absDistance === 1
  const direction = distance === 0 ? 0 : Math.sign(distance)
  const dragShift = Math.max(-60, Math.min(60, dragOffset * 0.2))

  let translateX = '0px'
  let scale = 1
  let opacity = 1
  let blur = '0px'
  let zIndex = 4

  if (isActive) {
    translateX = `${dragShift}px`
    scale = 1
    opacity = 1
    zIndex = 5
  } else if (isNeighbor) {
    translateX = `${direction * 56 + dragShift * 0.35}px`
    scale = 0.95
    opacity = 0.74
    blur = '1.8px'
    zIndex = 4 - absDistance
  } else {
    translateX = `${direction * 82 + dragShift * 0.2}px`
    scale = 0.9
    opacity = 0.42
    blur = '4px'
    zIndex = 1
  }

  return {
    transform: `translateX(${translateX}) scale(${scale})`,
    opacity,
    filter: `blur(${blur})`,
    zIndex,
  }
}

const revenueHoverLinePlugin = {
  id: 'revenueHoverLine',
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() || []
    if (!active.length || !chart.chartArea) return

    const { ctx, chartArea } = chart
    const x = active[0].element.x

    ctx.save()
    ctx.beginPath()
    ctx.setLineDash([4, 5])
    ctx.lineWidth = 1.2
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.58)'
    ctx.moveTo(x, chartArea.top + 2)
    ctx.lineTo(x, chartArea.bottom)
    ctx.stroke()
    ctx.restore()
  },
}

function chartAreaGradient(context, color) {
  const { chart } = context
  const { chartArea, ctx } = chart
  if (!chartArea) return color.replace('1)', '0.1)')

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
  gradient.addColorStop(0, color.replace('1)', '0.24)'))
  gradient.addColorStop(0.5, color.replace('1)', '0.08)'))
  gradient.addColorStop(1, color.replace('1)', '0)'))
  return gradient
}

const revenueEvolutionChartData = computed(() => {
  const data = analyticsStore.dailyRevenue || []
  const previous = analyticsStore.previousDailyRevenue || []

  return {
    labels: data.map((item) => {
      if (typeof item._id === 'string' && item._id.includes('-')) {
        return new Date(`${item._id}T00:00:00`).toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: 'short',
        })
      }
      return item._id
    }),
    datasets: [
      {
        label: 'Receita',
        data: data.map((item) => item.totalRevenue || 0),
        borderColor: '#10b981',
        backgroundColor: (context) => chartAreaGradient(context, 'rgba(16, 185, 129, 1)'),
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#fff',
        pointBorderWidth: 2.4,
        pointRadius: 0,
        pointHoverRadius: 4.5,
        pointHitRadius: 18,
        borderWidth: 2,
        tension: 0.42,
        cubicInterpolationMode: 'monotone',
        fill: 'origin',
      },
      {
        label: 'Período anterior',
        data: previous.map((item) => item.totalRevenue || 0),
        borderColor: '#ef4444',
        backgroundColor: 'transparent',
        pointBackgroundColor: '#ef4444',
        pointBorderColor: '#fff',
        pointBorderWidth: 2.4,
        pointRadius: 0,
        pointHoverRadius: 4.5,
        pointHitRadius: 18,
        borderWidth: 1.7,
        tension: 0.42,
        cubicInterpolationMode: 'monotone',
        fill: false,
      },
    ],
  }
})

const proceduresChartData = computed(() => {
  const top5 = (analyticsStore.revenueByProcedure || []).slice(0, 5)
  return {
    labels: top5.map((item) => item._id || 'Procedimento'),
    datasets: [
      {
        backgroundColor: ['#10b981', '#60a5fa', '#f59e0b', '#a78bfa', '#f472b6'],
        data: top5.map((item) => item.totalRevenue || 0),
        borderWidth: 0,
        hoverOffset: 2,
      },
    ],
  }
})

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  hover: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      display: false,
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        color: '#64748b',
        font: { family: "'DM Sans', sans-serif", size: 11 },
      },
    },
    tooltip: {
      enabled: true,
      backgroundColor: '#fff',
      titleColor: '#0f172a',
      bodyColor: '#475569',
      borderColor: 'rgba(226, 232, 240, 0.68)',
      borderWidth: 1,
      padding: 14,
      cornerRadius: 10,
      caretSize: 0,
      displayColors: true,
      usePointStyle: true,
      boxPadding: 6,
      bodySpacing: 8,
      titleMarginBottom: 10,
      titleFont: { family: "'DM Sans', sans-serif", size: 13, weight: 700 },
      bodyFont: { family: "'DM Sans', sans-serif", size: 12, weight: 500 },
      shadowOffsetX: 0,
      callbacks: {
        title: (items) => items[0]?.label || '',
        label: (context) => `${context.dataset.label}    ${moneyValue(context.raw)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: true,
        color: 'rgba(226, 232, 240, 0.78)',
        drawBorder: false,
        drawTicks: false,
        lineWidth: 1,
      },
      ticks: {
        color: '#9ca3af',
        padding: 8,
        font: { family: "'DM Sans', sans-serif", size: 11, weight: 500 },
        callback: (value) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value),
      },
      border: { display: false },
    },
    x: {
      grid: { display: false },
      ticks: {
        color: '#9ca3af',
        maxRotation: 0,
        padding: 10,
        font: { family: "'DM Sans', sans-serif", size: 11, weight: 500 },
      },
      border: { display: false },
    },
  },
}

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '68%',
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
      callbacks: {
        label: (context) => ` ${context.label}: ${moneyValue(context.raw)}`,
      },
    },
  },
}

function startOfMonthDate() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonthDate() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function money(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(cents || 0) / 100)
}

function moneyValue(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0))
}

function buildSparkline(value, multipliers) {
  const base = Math.max(Math.abs(Number(value || 0)), 1)
  return multipliers.map((multiplier, index) => Math.round(base * multiplier + index))
}

function formatDateDisplay(dateInput) {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  return date.toLocaleDateString('pt-BR')
}

function typeLabel(type) {
  const labels = {
    RECEIPT: 'Recebimento',
    PAYMENT: 'Retirada',
    REVERSAL: 'Estorno',
  }
  return labels[type] || type || 'Movimentação'
}

function methodLabel(method) {
  const labels = {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    CARTAO_CREDITO: 'Cartão de crédito',
    CARTAO_DEBITO: 'Cartão de débito',
    BOLETO: 'Boleto',
    TRANSFERENCIA: 'Transferência',
    OUTRO: 'Outro',
  }
  return labels[method] || method || '-'
}

function movementValueClass(type) {
  if (type === 'RECEIPT') return 'is-receipt'
  if (type === 'PAYMENT') return 'is-payment'
  return 'is-reversal'
}

function formatMovementMeta(item) {
  return [
    formatDateDisplay(item.settledAt || item.createdAt),
    methodLabel(item.method),
  ].filter(Boolean).join(' · ')
}

function formatDateForApi(dateInput) {
  if (!dateInput) return null
  const date = new Date(dateInput)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getRangeDates() {
  const [startRaw, endRaw] = dateRange.value || []
  return {
    startDate: formatDateForApi(startRaw),
    endDate: formatDateForApi(endRaw),
  }
}

function onRangeChange(value) {
  if (!Array.isArray(value) || value.length < 2 || !value[0] || !value[1]) return
  dateRange.value = value
  load()
}

function load() {
  const { startDate, endDate } = getRangeDates()
  const params = {
    startDate,
    endDate,
  }
  financeiroStore.fetchResumo(params)
  financeiroStore.fetchLucratividadeProcedimentos(params)
  financeiroStore.fetchCaixa(params)
  analyticsStore.fetchDashboardData('custom', startDate, endDate)
  analyticsStore.fetchTopClients({
    period: 'custom',
    startDate,
    endDate,
    page: 1,
  })
  analyticsStore.fetchTopProcedures({
    period: 'custom',
    startDate,
    endDate,
    page: 1,
  })
}

onMounted(load)
</script>

<template>
  <div class="finance-page">
    <div class="page-header">
      <div class="page-copy">
        <h1 class="title">Financeiro</h1>
        <p class="subtitle">Resumo do período com entradas, saídas e resultado da clínica.</p>
      </div>

      <div class="header-tools">
        <VueDatePicker
          :model-value="dateRange"
          @update:model-value="onRangeChange"
          range
          multi-calendars
          :enable-time-picker="false"
          locale="pt-BR"
          format="dd/MM/yyyy"
          auto-apply
          teleport="body"
          :z-index="12000"
          :clearable="false"
        >
          <template #trigger>
            <button class="period-trigger" type="button" aria-label="Selecionar período">
              <CalendarDays :size="15" />
              <span class="period-trigger__text">
                <strong>{{ formatDateDisplay(dateRange[0]) || '01/06/2026' }}</strong>
                <span>até</span>
                <strong>{{ formatDateDisplay(dateRange[1]) || '30/06/2026' }}</strong>
              </span>
            </button>
          </template>
        </VueDatePicker>
      </div>
    </div>

    <div class="kpi-grid desktop-grid" :class="{ 'is-loading': financeiroStore.loadingResumo }">
      <FinanceSummaryCard
        v-for="card in financeSummaryCards"
        :key="card.key"
        :theme="card.theme"
        :label="card.label"
        :value="card.value"
        :subtext="card.subtext"
        :sparkline="card.sparkline"
        :sparkline-tone="card.sparklineTone"
      />
    </div>

    <div
      class="carousel-shell mobile-carousel"
      :class="{ 'is-loading': financeiroStore.loadingResumo }"
      @pointerdown="handleCarouselPointerDown('summary', $event)"
      @pointermove="handleCarouselPointerMove('summary', $event)"
      @pointerup="handleCarouselPointerUp('summary')"
      @pointercancel="handleCarouselPointerCancel('summary')"
    >
      <div class="carousel-stack">
        <FinanceSummaryCard
          v-for="(card, index) in financeSummaryCards"
          :key="card.key"
          class="carousel-card"
          :class="getCarouselCardState(index, summaryCarouselIndex, financeSummaryCards.length)"
          :style="getCarouselCardStyle(index, summaryCarouselIndex, financeSummaryCards.length, summaryCarouselDrag.offset)"
          @click="handleCarouselCardClick('summary', index)"
          :theme="card.theme"
          :label="card.label"
          :value="card.value"
          :subtext="card.subtext"
          :sparkline="card.sparkline"
          :sparkline-tone="card.sparklineTone"
        />
      </div>
    </div>

    <div class="pending-strip">
      <span class="pending-strip__label">Pendências do período</span>
      <div class="pending-items">
        <div class="pending-item">
          <span>Recebimentos vencidos</span>
          <strong>{{ alerts.overdueReceivables || 0 }}</strong>
        </div>
        <div class="pending-item">
          <span>Pagamentos vencidos</span>
          <strong>{{ alerts.overduePayables || 0 }}</strong>
        </div>
        <div class="pending-item">
          <span>Entram em 7 dias</span>
          <strong>{{ alerts.next7DaysReceivables || 0 }}</strong>
        </div>
        <div class="pending-item">
          <span>Saem em 7 dias</span>
          <strong>{{ alerts.next7DaysPayables || 0 }}</strong>
        </div>
      </div>
    </div>

    <div class="content-grid">
      <section class="table-wrapper section--limited section--procedures">
        <div class="section-header">
          <div>
            <h2>Performance por procedimento</h2>
            <p>Receita, custo e margem por procedimento finalizado.</p>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Procedimento</th>
                <th>Quantidade</th>
                <th>Receita</th>
                <th>Custo</th>
                <th>Lucro</th>
                <th>Margem</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in financeiroStore.lucratividadeProcedimentos" :key="item._id?.procedureId || item._id?.name">
                <td data-label="Procedimento" class="procedure-cell"><strong>{{ item._id?.name || 'Procedimento' }}</strong></td>
                <td data-label="Quantidade" class="procedure-metric"><span>{{ item.quantity || 0 }}</span></td>
                <td data-label="Receita" class="procedure-money">{{ money(item.revenueCents) }}</td>
                <td data-label="Custo" class="procedure-money procedure-money--muted">{{ money(item.costCents) }}</td>
                <td data-label="Lucro" class="procedure-money procedure-money--profit">{{ money(item.grossProfitCents) }}</td>
                <td data-label="Margem" class="procedure-badge"><span>{{ item.marginPercent || 0 }}%</span></td>
              </tr>
              <tr v-if="!financeiroStore.loadingLucratividade && financeiroStore.lucratividadeProcedimentos.length === 0">
                <td colspan="6" style="padding: 0; border: 0;">
                  <AppEmptyState
                    title="Nenhum procedimento"
                    text="Nenhum procedimento com custo no período."
                    :icon="SearchX"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="table-wrapper section--limited section--movements">
        <div class="section-header">
          <div>
            <h2>Lançamentos do caixa</h2>
            <p>Recebimentos e retiradas registrados no período.</p>
          </div>
        </div>

        <div class="movement-list">
          <div
            v-for="item in recentCashMovements"
            :key="item._id"
            class="movement-card"
            :class="`movement-card--${item.type === 'RECEIPT' ? 'receipt' : item.type === 'PAYMENT' ? 'payment' : 'reversal'}`"
          >
            <div class="movement-card__main">
              <div class="movement-card__head">
                <strong>{{ item.accountId?.title || 'Lançamento' }}</strong>
                <span>{{ typeLabel(item.type) }}</span>
              </div>
              <p>{{ item.accountId?.party?.name || 'Sem parte vinculada' }}</p>
              <small>{{ formatMovementMeta(item) }}</small>
            </div>
            <div class="movement-card__value" :class="movementValueClass(item.type)">
              {{ money(item.amountCents) }}
            </div>
          </div>

          <p v-if="!recentCashMovements.length" class="muted">Nenhum lançamento encontrado no período.</p>
        </div>
      </section>
    </div>

    <div class="analytics-header">
      <div>
        <h2>Visão de desempenho</h2>
        <p>Indicadores de receita, pacientes e procedimentos para decisão.</p>
      </div>
    </div>

    <div class="analytics-kpis desktop-grid" :class="{ 'is-loading': analyticsStore.isLoading }">
      <FinanceSummaryCard
        v-for="card in analyticsSummaryCards"
        :key="card.key"
        :label="card.label"
        :value="card.value"
        :sparkline="card.sparkline"
        :sparkline-tone="card.sparklineTone"
      />
    </div>

    <div
      class="carousel-shell mobile-carousel"
      :class="{ 'is-loading': analyticsStore.isLoading }"
      @pointerdown="handleCarouselPointerDown('analytics', $event)"
      @pointermove="handleCarouselPointerMove('analytics', $event)"
      @pointerup="handleCarouselPointerUp('analytics')"
      @pointercancel="handleCarouselPointerCancel('analytics')"
    >
      <div class="carousel-stack">
        <FinanceSummaryCard
          v-for="(card, index) in analyticsSummaryCards"
          :key="card.key"
          class="carousel-card"
          :class="getCarouselCardState(index, analyticsCarouselIndex, analyticsSummaryCards.length)"
          :style="getCarouselCardStyle(index, analyticsCarouselIndex, analyticsSummaryCards.length, analyticsCarouselDrag.offset)"
          @click="handleCarouselCardClick('analytics', index)"
          :label="card.label"
          :value="card.value"
          :sparkline="card.sparkline"
          :sparkline-tone="card.sparklineTone"
        />
      </div>
    </div>

    <div class="charts-grid">
      <section class="table-wrapper chart-card">
        <div class="section-header">
          <div>
            <h2>Evolução da receita</h2>
            <p>Comparação do período atual com o anterior.</p>
          </div>
          <div class="section-icon"><TrendingUp :size="18" /></div>
        </div>
        <div class="chart-wrapper">
          <Line :data="revenueEvolutionChartData" :options="lineOptions" :plugins="[revenueHoverLinePlugin]" />
        </div>
      </section>

      <section class="table-wrapper chart-card">
        <div class="section-header">
          <div>
            <h2>Receita por procedimento</h2>
            <p>Distribuição dos principais serviços.</p>
          </div>
          <div class="section-icon"><Activity :size="18" /></div>
        </div>
        <div class="doughnut-layout">
          <div class="doughnut-wrapper">
            <Doughnut :data="proceduresChartData" :options="doughnutOptions" />
            <div class="doughnut-center">
              <span>Total</span>
              <strong>{{ moneyValue(proceduresChartData.datasets[0].data.reduce((sum, value) => sum + value, 0)) }}</strong>
            </div>
          </div>
          <div class="legend-list">
            <div v-for="(label, index) in proceduresChartData.labels" :key="label" class="legend-item">
              <span class="legend-dot" :style="{ backgroundColor: proceduresChartData.datasets[0].backgroundColor[index] }"></span>
              <div>
                <strong>{{ label }}</strong>
                <small>{{ moneyValue(proceduresChartData.datasets[0].data[index]) }}</small>
              </div>
            </div>
            <p v-if="proceduresChartData.labels.length === 0" class="muted">Sem dados de procedimento.</p>
          </div>
        </div>
      </section>
    </div>

    <div class="rankings-grid">
      <section class="table-wrapper">
        <div class="section-header">
          <div>
            <h2>Pacientes mais lucrativos</h2>
            <p>Ranking por volume financeiro no período.</p>
          </div>
          <div class="section-icon"><Users :size="18" /></div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Procedimentos</th>
                <th>Receita</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in analyticsStore.topClientsPaginated.data" :key="client._id">
                <td data-label="Paciente">
                  <div class="ranking-name">
                    <span class="avatar">{{ client.name?.charAt(0) || 'P' }}</span>
                    <strong>{{ client.name || 'Paciente' }}</strong>
                  </div>
                </td>
                <td data-label="Procedimentos">{{ client.appointmentsCount || 0 }}</td>
                <td data-label="Receita" class="txt-green">{{ moneyValue(client.totalRevenue) }}</td>
              </tr>
              <tr v-if="!analyticsStore.topClientsPaginated.isLoading && analyticsStore.topClientsPaginated.data.length === 0">
                <td colspan="3" style="padding: 0; border: 0;">
                  <AppEmptyState
                    title="Nenhum paciente"
                    text="Nenhum paciente encontrado."
                    :icon="SearchX"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="table-wrapper">
        <div class="section-header">
          <div>
            <h2>Procedimentos mais fortes</h2>
            <p>Receita combinada com lucro do controle financeiro.</p>
          </div>
          <div class="section-icon"><Activity :size="18" /></div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Procedimento</th>
                <th>Qtd.</th>
                <th>Receita</th>
                <th>Lucro</th>
                <th>Margem</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proc in analyticsTopProcedures" :key="proc._id">
                <td data-label="Procedimento"><strong>{{ proc._id || 'Procedimento' }}</strong></td>
                <td data-label="Qtd.">{{ proc.count || 0 }}</td>
                <td data-label="Receita">{{ moneyValue(proc.totalRevenue) }}</td>
                <td data-label="Lucro" class="txt-green">{{ proc.profitCents !== undefined ? money(proc.profitCents) : '-' }}</td>
                <td data-label="Margem">{{ proc.marginPercent !== undefined ? `${proc.marginPercent}%` : '-' }}</td>
              </tr>
              <tr v-if="!analyticsStore.topProceduresPaginated.isLoading && analyticsStore.topProceduresPaginated.data.length === 0">
                <td colspan="5" style="padding: 0; border: 0;">
                  <AppEmptyState
                    title="Nenhum procedimento"
                    text="Nenhum procedimento encontrado."
                    :icon="SearchX"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.finance-page {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  color: #0f172a;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.page-copy {
  min-width: 260px;
}

.title {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: clamp(1.45rem, 1.3vw + 1rem, 2rem);
  font-weight: 650;
  line-height: 1.12;
  color: #0f172a;
  letter-spacing: 0;
}

.subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.92rem;
  font-weight: 400;
}

.header-tools {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-left: auto;
}

.period-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  justify-content: flex-start;
  text-align: left;
  min-height: 40px;
  padding: 0 0.9rem;
  border: 1px solid #e5eaf1;
  border-radius: 0.8rem;
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  font-family: var(--fonte-principal);
  font-size: 0.86rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.period-trigger:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.period-trigger__text {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.45rem;
  min-width: 0;
  white-space: nowrap;
}

.period-trigger__text strong {
  font-weight: 600;
}

.period-trigger__text span {
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 500;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.desktop-grid {
  display: grid;
}

.mobile-carousel {
  display: none;
}

.kpi-grid.is-loading,
.analytics-kpis.is-loading {
  opacity: 0.62;
  pointer-events: none;
}

.pending-strip {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.65rem 0.8rem;
  background: #fff;
  border: 1px solid #e8edf4;
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
}

.pending-strip__label {
  flex-shrink: 0;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.pending-items {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  width: 100%;
}

.pending-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  min-height: 36px;
  padding: 0 0.75rem;
  border-left: 1px solid #eef2f7;
}

.pending-item span {
  color: #64748b;
  font-size: 0.84rem;
}

.pending-item strong {
  color: #0f172a;
  font-size: 1rem;
  font-weight: 650;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.65fr);
  gap: 1rem;
}

.table-wrapper {
  background-color: var(--branco);
  border: 1px solid #e8edf4;
  border-radius: 0.85rem;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025), 0 12px 28px rgba(15, 23, 42, 0.028);
}

.section--limited {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section--procedures {
  max-height: 430px;
}

.section--procedures .table-container {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.section--movements {
  max-height: 430px;
}

.section--movements .movement-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 1rem 1.1rem 1.05rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.95rem 1.1rem;
  border-bottom: 1px solid #edf2f7;
}

.section-header h2 {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 0.98rem;
  font-weight: 650;
  color: #0f172a;
}

.section-header p {
  margin: 0.22rem 0 0;
  color: #64748b;
  font-size: 0.84rem;
  line-height: 1.35;
}

.section-icon {
  width: 31px;
  height: 31px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.6rem;
  background: #f8fafc;
  color: #2563eb;
  flex-shrink: 0;
}

.table-container {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th, td {
  padding: 0.9rem 1.1rem;
  text-align: left;
  border-bottom: 1px solid #edf2f7;
  vertical-align: middle;
  white-space: nowrap;
  font-size: 0.88rem;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover td {
  background: #fbfdff;
}

th {
  background-color: #fbfcfe;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.txt-green {
  color: #059669;
  font-weight: 650;
}

.procedure-cell strong {
  display: block;
  color: #0f172a;
  font-weight: 650;
  line-height: 1.2;
}

.procedure-metric,
.procedure-money,
.procedure-badge {
  font-variant-numeric: tabular-nums;
}

.procedure-metric span,
.procedure-badge span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.1rem;
  min-height: 1.8rem;
  padding: 0 0.55rem;
  border-radius: 999px;
  background: #f8fafc;
  color: #0f172a;
  font-weight: 650;
}

.procedure-money {
  color: #0f172a;
  font-weight: 600;
}

.procedure-money--muted {
  color: #475569;
}

.procedure-money--profit {
  color: #059669;
  font-weight: 700;
}

.procedure-badge span {
  background: #eff6ff;
  color: #2563eb;
}

.movement-list {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.movement-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.8rem 0.9rem;
  background: #fff;
  border: 1px solid #e8edf4;
  border-right: 0;
  border-radius: 0.85rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
}

.movement-card--receipt {
  border-left: 3px solid #10b981;
}

.movement-card--payment {
  border-left: 3px solid #ef4444;
}

.movement-card--reversal {
  border-left: 3px solid #64748b;
}

.movement-card__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.movement-card__head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  min-width: 0;
}

.movement-card__head strong {
  min-width: 0;
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.movement-card__head span {
  max-width: 42%;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.movement-card__main p {
  margin: 0;
  color: #475569;
  font-size: 0.85rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.movement-card__main small {
  color: #94a3b8;
  font-size: 0.75rem;
}

.movement-card__value {
  flex-shrink: 0;
  font-size: 0.94rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.movement-card__value.is-receipt {
  color: #059669;
}

.movement-card__value.is-payment {
  color: #dc2626;
}

.movement-card__value.is-reversal {
  color: #475569;
}

.distribution-list {
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.distribution-group h3 {
  margin: 0 0 0.65rem;
  font-size: 0.82rem;
  font-weight: 650;
  color: #0f172a;
}

.distribution-item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.58rem 0;
  border-bottom: 1px solid #f1f5f9;
  font-size: 0.86rem;
}

.distribution-item span,
.muted {
  color: #64748b;
}

.distribution-item strong {
  color: #0f172a;
  font-weight: 650;
}

.muted {
  margin: 0;
  font-size: 0.86rem;
}

.analytics-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.2rem;
}

.analytics-header h2 {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 1.15rem;
  font-weight: 650;
  color: #0f172a;
}

.analytics-header p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.analytics-kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.carousel-shell {
  position: relative;
  min-width: 0;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  overflow: visible;
}

.carousel-shell::before,
.carousel-shell::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(100, 116, 139, 0.52);
  font-size: 1.45rem;
  font-weight: 400;
  line-height: 1;
  pointer-events: none;
  z-index: 6;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.82);
}

.carousel-shell::before {
  content: '‹';
  left: 0.1rem;
}

.carousel-shell::after {
  content: '›';
  right: 0.1rem;
}

.carousel-shell:active {
  cursor: grabbing;
}

.carousel-stack {
  position: relative;
  height: 156px;
  min-width: 0;
  overflow: visible;
  padding-inline: 0.55rem;
}

.carousel-card {
  position: absolute;
  inset: 0 0.35rem;
  transition:
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.34s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
  will-change: transform, opacity, filter;
  cursor: pointer;
}

.carousel-card.is-active {
  z-index: 5;
  opacity: 1;
  transform: translateX(0) scale(1);
  filter: none;
}

.carousel-card.is-neighbor {
  opacity: 0.74;
  pointer-events: auto;
}

.carousel-card.is-far {
  z-index: 1;
  opacity: 0.38;
  filter: blur(4px) saturate(0.9);
  pointer-events: none;
}

.charts-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(340px, 0.65fr);
  gap: 1rem;
}

.rankings-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.chart-card {
  min-height: 410px;
}

.chart-wrapper {
  height: 330px;
  padding: 1rem 1.1rem 1.2rem;
}

.doughnut-layout {
  display: grid;
  grid-template-columns: minmax(210px, 270px) 1fr;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.1rem 1.2rem;
}

.doughnut-wrapper {
  position: relative;
  height: 250px;
  min-width: 210px;
}

.doughnut-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  text-align: center;
}

.doughnut-center span {
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 650;
  text-transform: uppercase;
}

.doughnut-center strong {
  color: #0f172a;
  font-size: 0.96rem;
  font-weight: 650;
  max-width: 150px;
  line-height: 1.2;
}

.legend-list {
  display: flex;
  flex-direction: column;
  gap: 0.72rem;
  min-width: 0;
}

.legend-item {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  min-width: 0;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
  margin-top: 0.32rem;
}

.legend-item div {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
}

.legend-item strong {
  color: #334155;
  font-size: 0.85rem;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.legend-item small {
  color: #64748b;
  font-size: 0.78rem;
}

.ranking-name {
  display: flex;
  align-items: center;
  gap: 0.62rem;
  min-width: 0;
}

.avatar {
  width: 29px;
  height: 29px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 999px;
  color: #2563eb;
  background: #eff6ff;
  font-size: 0.8rem;
  font-weight: 650;
}

.ranking-name strong {
  color: #0f172a;
  font-weight: 650;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (max-width: 1180px) {
  .page-header {
    flex-direction: column;
  }

  .header-tools {
    width: 100%;
    justify-content: flex-start;
  }

  .kpi-grid,
  .analytics-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .pending-strip {
    align-items: flex-start;
    flex-direction: column;
  }

  .pending-items {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid,
  .charts-grid,
  .rankings-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .finance-page {
    gap: 1rem;
  }

  .header-tools {
    width: 100%;
  }

  .kpi-grid,
  .analytics-kpis,
  .pending-items {
    grid-template-columns: 1fr;
  }

  .desktop-grid {
    display: none !important;
  }

  .mobile-carousel {
    display: block;
  }

  .period-trigger {
    width: 100%;
    justify-content: flex-start;
    gap: 0.5rem;
    padding-inline: 0.8rem;
  }

  .section--procedures,
  .section--movements,
  .rankings-grid .table-wrapper {
    max-height: 380px;
  }

  .section--procedures,
  .section--movements,
  .rankings-grid .table-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .section--procedures .table-container,
  .section--movements .movement-list,
  .rankings-grid .table-container {
    flex: 1;
    min-height: 0;
    overflow: auto;
    padding: 0.65rem 0.7rem 0.8rem;
  }

  .section--movements .movement-list {
    gap: 0.75rem;
  }

  .movement-card {
    align-items: flex-start;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.85rem 0.85rem 0.9rem;
  }

  .movement-card__head span {
    max-width: 34%;
    font-size: 0.66rem;
  }

  .movement-card__value {
    margin-left: auto;
  }

  .section--procedures table,
  .rankings-grid table {
    display: block;
    border-spacing: 0;
  }

  .section--procedures thead,
  .rankings-grid thead {
    display: none;
  }

  .section--procedures tbody,
  .rankings-grid tbody {
    display: block;
  }

  .section--procedures tbody tr,
  .rankings-grid tbody tr {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem 0.8rem;
    padding: 0.8rem 0.85rem;
    margin-bottom: 0.7rem;
    background: #ffffff;
    border: 1px solid #e8edf4;
    border-radius: 0.9rem;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
  }

  .section--procedures tbody tr td,
  .rankings-grid tbody tr td {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 0.2rem;
    padding: 0;
    border: 0;
    white-space: normal;
    min-width: 0;
  }

  .section--procedures tbody tr td::before,
  .rankings-grid tbody tr td::before {
    content: attr(data-label);
    color: #94a3b8;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    line-height: 1.1;
  }

  .section--procedures tbody tr td:first-child,
  .rankings-grid tbody tr td:first-child {
    grid-column: 1 / -1;
  }

  .section--procedures tbody tr td:first-child strong,
  .rankings-grid tbody tr td:first-child strong {
    font-size: 0.94rem;
    font-weight: 650;
    color: #0f172a;
  }

  .section--procedures tbody tr td:nth-child(5),
  .section--procedures tbody tr td:nth-child(6),
  .rankings-grid tbody tr td:nth-child(3) {
    justify-content: flex-end;
  }

  .rankings-grid tbody tr td:first-child::before {
    margin-bottom: 0.15rem;
  }

  .ranking-name {
    width: 100%;
  }

  .ranking-name strong {
    white-space: normal;
  }

  .carousel-stack {
    height: 162px;
    padding-inline: 0.2rem;
  }

  .carousel-shell::before,
  .carousel-shell::after {
    width: 1.25rem;
    height: 1.25rem;
    font-size: 1.2rem;
  }

  .pending-item {
    border-left: 0;
    border-top: 1px solid #eef2f7;
    padding: 0.65rem 0;
  }

  .doughnut-layout {
    grid-template-columns: 1fr;
  }

  .chart-wrapper {
    height: 300px;
    padding: 1rem;
  }

  .doughnut-wrapper {
    height: 240px;
  }
}
</style>
