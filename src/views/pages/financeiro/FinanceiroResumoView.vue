<script setup>
import { computed, onMounted, reactive } from 'vue'
import {
  Activity,
  CalendarDays,
  CircleDollarSign,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  Tag,
  Hash,
  DollarSign,
  Percent,
  SearchX,
  User
} from 'lucide-vue-next'
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
import AppButton from '@/components/global/AppButton.vue'
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

const filters = reactive({
  startDate: startOfMonth(),
  endDate: endOfMonth(),
})

const resumo = computed(() => financeiroStore.resumo || {})
const profit = computed(() => resumo.value.profit || {})
const receivable = computed(() => resumo.value.receivable || {})
const payable = computed(() => resumo.value.payable || {})
const cash = computed(() => resumo.value.cash || {})
const alerts = computed(() => resumo.value.alerts || {})
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
        label: 'Periodo atual',
        data: data.map((item) => item.totalRevenue || 0),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.14)',
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Periodo anterior',
        data: previous.map((item) => item.totalRevenue || 0),
        borderColor: '#94a3b8',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        pointRadius: 0,
        tension: 0.4,
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
        backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'],
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
  plugins: {
    legend: {
      display: true,
      position: 'top',
      align: 'end',
      labels: {
        usePointStyle: true,
        boxWidth: 8,
        color: '#64748b',
        font: { family: "'Montserrat', sans-serif", size: 11 },
      },
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
        label: (context) => ` ${context.dataset.label}: ${moneyValue(context.raw)}`,
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#f1f5f9' },
      ticks: {
        color: '#94a3b8',
        callback: (value) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(value),
      },
      border: { display: false },
    },
    x: {
      grid: { display: false },
      ticks: { color: '#94a3b8', maxRotation: 0 },
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

function startOfMonth() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10)
}

function endOfMonth() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().slice(0, 10)
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

function load() {
  const params = {
    startDate: filters.startDate,
    endDate: filters.endDate,
  }
  financeiroStore.fetchResumo(params)
  financeiroStore.fetchLucratividadeProcedimentos(params)
  analyticsStore.fetchDashboardData('custom', filters.startDate, filters.endDate)
  analyticsStore.fetchTopClients({
    period: 'custom',
    startDate: filters.startDate,
    endDate: filters.endDate,
    page: 1,
  })
  analyticsStore.fetchTopProcedures({
    period: 'custom',
    startDate: filters.startDate,
    endDate: filters.endDate,
    page: 1,
  })
}

onMounted(load)
</script>

<template>
  <div class="finance-page">
    <div class="page-header">
      <div>
        <h1 class="title">Financeiro</h1>
        <p class="subtitle">Controle financeiro com contas, caixa e lucratividade.</p>
      </div>
      <div class="header-actions">
        <AppButton to="/financeiro/a-receber" variant="outline" size="sm">A receber</AppButton>
        <AppButton to="/financeiro/a-pagar" variant="outline" size="sm">A pagar</AppButton>
      </div>
    </div>

    <div class="filtros-bar">
      <div class="input-with-icon">
        <CalendarDays :size="16" />
        <input v-model="filters.startDate" type="date" @change="load" />
      </div>
      <div class="input-with-icon">
        <CalendarDays :size="16" />
        <input v-model="filters.endDate" type="date" @change="load" />
      </div>
    </div>

    <div class="kpi-grid" :class="{ 'is-loading': financeiroStore.loadingResumo }">
      <FinanceSummaryCard
        theme="blue"
        :icon="CircleDollarSign"
        label="A receber em aberto"
        :value="money(receivable.openCents)"
        :subtext="`${receivable.count || 0} contas no periodo`"
      />
      <FinanceSummaryCard
        theme="red"
        :icon="Receipt"
        label="A pagar em aberto"
        :value="money(payable.openCents)"
        :subtext="`${payable.count || 0} contas no periodo`"
      />
      <FinanceSummaryCard
        theme="green"
        :icon="Wallet"
        label="Saldo de caixa"
        :value="money(cash.balanceCents)"
        :subtext="`Recebido ${money(cash.receivedCents)}`"
      />
      <FinanceSummaryCard
        theme="amber"
        :icon="TrendingUp"
        label="Lucro bruto"
        :value="money(profit.grossProfitCents)"
        :subtext="`${profit.marginPercent || 0}% de margem`"
      />
    </div>

    <div class="alert-row">
      <div class="alert-card">
        <span>Recebimentos atrasados</span>
        <strong>{{ alerts.overdueReceivables || 0 }}</strong>
      </div>
      <div class="alert-card">
        <span>Pagamentos vencidos</span>
        <strong>{{ alerts.overduePayables || 0 }}</strong>
      </div>
      <div class="alert-card">
        <span>A receber nos proximos 7 dias</span>
        <strong>{{ alerts.next7DaysReceivables || 0 }}</strong>
      </div>
      <div class="alert-card">
        <span>A pagar nos proximos 7 dias</span>
        <strong>{{ alerts.next7DaysPayables || 0 }}</strong>
      </div>
    </div>

    <div class="content-grid">
      <section class="table-wrapper">
        <div class="section-header">
          <div>
            <h2>Lucro por procedimento</h2>
            <p>Receita, custo e margem por procedimento finalizado.</p>
          </div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>
                  <div class="th-content">
                    <Tag :size="14" />
                    <span>Procedimento</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <Hash :size="14" />
                    <span>Quantidade</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <DollarSign :size="14" />
                    <span>Receita</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <DollarSign :size="14" />
                    <span>Custo</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <DollarSign :size="14" />
                    <span>Lucro</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <Percent :size="14" />
                    <span>Margem</span>
                  </div>
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
                    text="Nenhum procedimento com custo no periodo."
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
            <h2>Distribuicao</h2>
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
        <h2>Analise financeira</h2>
        <p>Indicadores de receita, pacientes e procedimentos para decisao.</p>
      </div>
    </div>

    <div class="analytics-kpis" :class="{ 'is-loading': analyticsStore.isLoading }">
      <FinanceSummaryCard
        label="Faturamento"
        :value="moneyValue(analyticsStore.revenueSummary.totalRevenue)"
      />
      <FinanceSummaryCard
        label="Ticket médio"
        :value="moneyValue(analyticsStore.kpi.averageTicket)"
      />
      <FinanceSummaryCard
        label="Procedimentos"
        :value="analyticsStore.kpi.proceduresCount || 0"
      />
      <FinanceSummaryCard
        label="Atendimentos"
        :value="analyticsStore.kpi.appointmentsCount || 0"
      />
    </div>

    <div class="charts-grid">
      <section class="table-wrapper chart-card">
        <div class="section-header">
          <div>
            <h2>Evolucao da receita</h2>
            <p>Comparacao do periodo atual com o anterior.</p>
          </div>
          <div class="section-icon"><TrendingUp :size="18" /></div>
        </div>
        <div class="chart-wrapper">
          <Line :data="revenueEvolutionChartData" :options="lineOptions" />
        </div>
      </section>

      <section class="table-wrapper chart-card">
        <div class="section-header">
          <div>
            <h2>Receita por procedimento</h2>
            <p>Distribuicao dos principais servicos.</p>
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
            <p>Ranking por volume financeiro no periodo.</p>
          </div>
          <div class="section-icon"><Users :size="18" /></div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>
                  <div class="th-content">
                    <User :size="14" />
                    <span>Paciente</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <Hash :size="14" />
                    <span>Procedimentos</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <DollarSign :size="14" />
                    <span>Receita</span>
                  </div>
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
            <p>Receita antiga combinada com lucro do controle novo.</p>
          </div>
          <div class="section-icon"><Activity :size="18" /></div>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>
                  <div class="th-content">
                    <Activity :size="14" />
                    <span>Procedimento</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <Hash :size="14" />
                    <span>Qtd.</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <DollarSign :size="14" />
                    <span>Receita</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <DollarSign :size="14" />
                    <span>Lucro</span>
                  </div>
                </th>
                <th>
                  <div class="th-content">
                    <Percent :size="14" />
                    <span>Margem</span>
                  </div>
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
.finance-page { display:flex; flex-direction:column; gap:1.5rem; }
.page-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; }
.title { margin:0; font-family:var(--fonte-titulo); font-size:1.75rem; font-weight:700; color:var(--preto); }
.subtitle { margin:.35rem 0 0; color:#64748b; font-size:.95rem; }
.header-actions { display:flex; gap:.75rem; flex-wrap:wrap; }
.filtros-bar { display:flex; gap:.75rem; flex-wrap:wrap; }
.input-with-icon { display:flex; align-items:center; gap:.5rem; min-height:40px; padding:0 .75rem; border:1px solid #e5e7eb; border-radius:.5rem; background:#fff; color:#64748b; }
.input-with-icon input { border:0; outline:0; color:#111827; background:transparent; font-size:.9rem; }
.kpi-grid { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:1rem; }
.kpi-grid.is-loading { opacity:.6; pointer-events:none; }
.alert-row { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:.75rem; }
.alert-card { display:flex; justify-content:space-between; align-items:center; gap:1rem; padding:.9rem 1rem; background:#fff; border:1px solid #e5e7eb; border-radius:.75rem; }
.alert-card span { color:#64748b; font-size:.9rem; }
.alert-card strong { color:#111827; font-size:1.2rem; }
.content-grid { display:grid; grid-template-columns:minmax(0, 1.3fr) minmax(320px, .7fr); gap:1rem; }
.table-wrapper {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
  position: relative;
}
.section-header { display:flex; justify-content:space-between; gap:1rem; padding:1rem 1.25rem; border-bottom:1px solid #e5e7eb; }
.section-header h2 { margin:0; font-family:var(--fonte-titulo); font-size:1rem; font-weight:700; color:#111827; }
.section-header p { margin:.25rem 0 0; color:#64748b; font-size:.88rem; }
.section-icon { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border-radius:.65rem; background:#eff6ff; color:#2563eb; flex-shrink:0; }
.table-container { overflow-x:auto; }
table {
  width: 100%;
  border-collapse: collapse;
}
th, td {
  padding: 1rem 1.5rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  vertical-align: middle;
  white-space: nowrap;
}
tbody tr:last-child td {
  border-bottom: none;
}
th {
  background-color: #f9fafb;
  color: var(--cinza-texto);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.th-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.table-row {
  transition: background-color 0.2s ease;
}
.table-row:hover td {
  background-color: #f9fafb;
}
.txt-green { color:#059669; font-weight:600; }
.distribution-list { padding:1rem 1.25rem; display:flex; flex-direction:column; gap:1.25rem; }
.distribution-group h3 { margin:0 0 .75rem; font-size:.9rem; font-weight:800; color:#111827; }
.distribution-item { display:flex; justify-content:space-between; gap:1rem; padding:.65rem 0; border-bottom:1px solid #f1f5f9; font-size:.9rem; }
.distribution-item span, .muted { color:#64748b; }
.distribution-item strong { color:#111827; }
.muted { margin:0; font-size:.9rem; }
.analytics-header { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; margin-top:.5rem; }
.analytics-header h2 { margin:0; font-family:var(--fonte-titulo); font-size:1.25rem; font-weight:800; color:#111827; }
.analytics-header p { margin:.3rem 0 0; color:#64748b; font-size:.95rem; }
.analytics-kpis { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:1rem; }
.analytics-kpis.is-loading { opacity:.6; pointer-events:none; }
.charts-grid { display:grid; grid-template-columns:minmax(0, 1.35fr) minmax(340px, .65fr); gap:1rem; }
.rankings-grid { display:grid; grid-template-columns:1fr 1fr; gap:1rem; }
.chart-card { min-height:420px; }
.chart-wrapper { height:340px; padding:1rem 1.25rem 1.25rem; }
.doughnut-layout { display:grid; grid-template-columns:minmax(220px, 280px) 1fr; gap:1rem; align-items:center; padding:1rem 1.25rem 1.25rem; }
.doughnut-wrapper { position:relative; height:260px; min-width:220px; }
.doughnut-center { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; pointer-events:none; text-align:center; }
.doughnut-center span { color:#64748b; font-size:.72rem; font-weight:800; text-transform:uppercase; }
.doughnut-center strong { color:#111827; font-size:1rem; font-weight:800; max-width:150px; line-height:1.2; }
.legend-list { display:flex; flex-direction:column; gap:.75rem; min-width:0; }
.legend-item { display:flex; gap:.65rem; align-items:flex-start; min-width:0; }
.legend-dot { width:11px; height:11px; border-radius:999px; flex-shrink:0; margin-top:.3rem; }
.legend-item div { display:flex; flex-direction:column; gap:.15rem; min-width:0; }
.legend-item strong { color:#334155; font-size:.88rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.legend-item small { color:#64748b; font-size:.8rem; }
.ranking-name { display:flex; align-items:center; gap:.65rem; min-width:0; }
.avatar { width:30px; height:30px; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; border-radius:999px; color:#2563eb; background:#dbeafe; font-size:.82rem; font-weight:800; }
.ranking-name strong { color:#111827; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
@media (max-width: 1180px) {
  .kpi-grid, .alert-row, .analytics-kpis { grid-template-columns:repeat(2, minmax(0,1fr)); }
  .content-grid, .charts-grid, .rankings-grid { grid-template-columns:1fr; }
}
@media (max-width: 640px) {
  .kpi-grid, .alert-row, .analytics-kpis { grid-template-columns:1fr; }
  .header-actions, .filtros-bar { width:100%; }
  .input-with-icon { width:100%; }
  .doughnut-layout { grid-template-columns:1fr; }
  .chart-wrapper { height:300px; padding:1rem; }
  .doughnut-wrapper { height:240px; }
}
</style>
