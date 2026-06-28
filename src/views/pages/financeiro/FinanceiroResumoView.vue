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

const resumo = computed(() => financeiroStore.resumo || {})
const profit = computed(() => resumo.value.profit || {})
const receivable = computed(() => resumo.value.receivable || {})
const payable = computed(() => resumo.value.payable || {})
const cash = computed(() => resumo.value.cash || {})
const alerts = computed(() => resumo.value.alerts || {})
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

    <div class="kpi-grid" :class="{ 'is-loading': financeiroStore.loadingResumo }">
      <FinanceSummaryCard
        theme="blue"
        label="Entradas em aberto"
        :value="money(receivable.openCents)"
        :subtext="`${receivable.count || 0} contas no período`"
        :sparkline="receivableSparkline"
        sparkline-tone="green"
      />
      <FinanceSummaryCard
        theme="red"
        label="Saídas em aberto"
        :value="money(payable.openCents)"
        :subtext="`${payable.count || 0} contas no período`"
        :sparkline="payableSparkline"
        sparkline-tone="red"
      />
      <FinanceSummaryCard
        theme="green"
        label="Caixa disponível"
        :value="money(cash.balanceCents)"
        :subtext="`Recebido ${money(cash.receivedCents)}`"
        :sparkline="cashSparkline"
        sparkline-tone="green"
      />
      <FinanceSummaryCard
        theme="amber"
        label="Resultado bruto"
        :value="money(profit.grossProfitCents)"
        :subtext="`${profit.marginPercent || 0}% de margem`"
        :sparkline="profitSparkline"
        sparkline-tone="amber"
      />
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
                <th>
                  Procedimento
                </th>
                <th>
                  Quantidade
                </th>
                <th>
                  Receita
                </th>
                <th>
                  Custo
                </th>
                <th>
                  Lucro
                </th>
                <th>
                  Margem
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in financeiroStore.lucratividadeProcedimentos" :key="item._id?.procedureId || item._id?.name">
                <td>{{ item._id?.name || 'Procedimento' }}</td>
                <td>{{ item.quantity || 0 }}</td>
                <td>{{ money(item.revenueCents) }}</td>
                <td>{{ money(item.costCents) }}</td>
                <td class="txt-green">{{ money(item.grossProfitCents) }}</td>
                <td>{{ item.marginPercent || 0 }}%</td>
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

      <section class="table-wrapper section--limited section--categories">
        <div class="section-header">
          <div>
            <h2>Categorias do período</h2>
            <p>Receitas e despesas agrupadas por categoria.</p>
          </div>
        </div>

        <div class="distribution-list">
          <div class="distribution-group">
            <h3>Receitas</h3>
            <div v-for="item in resumo.revenueByCategory || []" :key="item._id || 'sem-categoria-receita'" class="distribution-item">
              <span>{{ item.category?.name || 'Sem categoria' }}</span>
              <strong>{{ money(item.amountCents) }}</strong>
            </div>
            <p v-if="!(resumo.revenueByCategory || []).length" class="muted">Sem receitas categorizadas.</p>
          </div>

          <div class="distribution-group">
            <h3>Despesas</h3>
            <div v-for="item in resumo.expenseByCategory || []" :key="item._id || 'sem-categoria-despesa'" class="distribution-item">
              <span>{{ item.category?.name || 'Sem categoria' }}</span>
              <strong>{{ money(item.amountCents) }}</strong>
            </div>
            <p v-if="!(resumo.expenseByCategory || []).length" class="muted">Sem despesas categorizadas.</p>
          </div>
        </div>
      </section>
    </div>

    <div class="analytics-header">
      <div>
        <h2>Visão de desempenho</h2>
        <p>Indicadores de receita, pacientes e procedimentos para decisão.</p>
      </div>
    </div>

    <div class="analytics-kpis" :class="{ 'is-loading': analyticsStore.isLoading }">
      <FinanceSummaryCard
        label="Faturamento"
        :value="moneyValue(analyticsStore.revenueSummary.totalRevenue)"
        :sparkline="revenueSparkline"
        sparkline-tone="green"
      />
      <FinanceSummaryCard
        label="Ticket médio"
        :value="moneyValue(analyticsStore.kpi.averageTicket)"
        :sparkline="averageTicketSparkline"
        sparkline-tone="blue"
      />
      <FinanceSummaryCard
        label="Procedimentos"
        :value="analyticsStore.kpi.proceduresCount || 0"
        :sparkline="proceduresSparkline"
        sparkline-tone="slate"
      />
      <FinanceSummaryCard
        label="Atendimentos"
        :value="analyticsStore.kpi.appointmentsCount || 0"
        :sparkline="appointmentsSparkline"
        sparkline-tone="blue"
      />
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
                <th>
                  Paciente
                </th>
                <th>
                  Procedimentos
                </th>
                <th>
                  Receita
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="client in analyticsStore.topClientsPaginated.data" :key="client._id">
                <td>
                  <div class="ranking-name">
                    <span class="avatar">{{ client.name?.charAt(0) || 'P' }}</span>
                    <strong>{{ client.name || 'Paciente' }}</strong>
                  </div>
                </td>
                <td>{{ client.appointmentsCount || 0 }}</td>
                <td class="txt-green">{{ moneyValue(client.totalRevenue) }}</td>
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
                <th>
                  Procedimento
                </th>
                <th>
                  Qtd.
                </th>
                <th>
                  Receita
                </th>
                <th>
                  Lucro
                </th>
                <th>
                  Margem
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="proc in analyticsTopProcedures" :key="proc._id">
                <td><strong>{{ proc._id || 'Procedimento' }}</strong></td>
                <td>{{ proc.count || 0 }}</td>
                <td>{{ moneyValue(proc.totalRevenue) }}</td>
                <td class="txt-green">{{ proc.profitCents !== undefined ? money(proc.profitCents) : '-' }}</td>
                <td>{{ proc.marginPercent !== undefined ? `${proc.marginPercent}%` : '-' }}</td>
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

.section--categories {
  max-height: 430px;
}

.section--categories .distribution-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
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

  .period-trigger {
    width: 100%;
    justify-content: space-between;
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
