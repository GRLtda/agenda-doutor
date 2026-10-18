<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'
import { Bar } from 'vue-chartjs'
import { ArrowUpRight, ArrowDownLeft, RefreshCw, AlertTriangle, Clock } from 'lucide-vue-next'
import { useEstoqueStore } from '@/stores/estoque'
import FinanceSummaryCard from '@/components/financeiro/FinanceSummaryCard.vue'
import AppButton from '@/components/global/AppButton.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import StockDashboardEmpty from '@/components/estoque/StockDashboardEmpty.vue'

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip)

const store = useEstoqueStore()
const router = useRouter()
const diasVencimento = ref(30)
const isLoading = ref(true)
const loadError = ref('')
const brandColor = ref('#0057FF')
let requestInFlight = false
const optionsVencimento = [
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
]

async function recarregarDashboard() {
  if (requestInFlight) return
  requestInFlight = true
  isLoading.value = true
  loadError.value = ''
  try {
    const result = await store.fetchDashboardSummary(diasVencimento.value)
    if (!result.success) loadError.value = result.error || 'Não foi possível carregar o resumo do estoque.'
  } catch {
    loadError.value = 'Não foi possível carregar o resumo do estoque. Tente novamente.'
  } finally {
    requestInFlight = false
    isLoading.value = false
  }
}
onMounted(() => {
  brandColor.value = getComputedStyle(document.documentElement).getPropertyValue('--azul-principal').trim() || '#0057FF'
  recarregarDashboard()
})

const summaryCards = computed(() => [
  { key: 'produtos', label: 'Insumos no catálogo', value: store.stats.totalProdutos, subtext: 'Produtos cadastrados', route: 'estoque-produtos' },
  { key: 'lotes', label: 'Lotes ativos', value: store.stats.totalLotesAtivos, subtext: 'Disponíveis para controle', route: 'estoque-lotes' },
  { key: 'minimo', label: 'Estoque mínimo', value: store.alertasEstoqueMinimo.length, subtext: 'Produtos que precisam de atenção', route: 'estoque-produtos' },
  { key: 'validade', label: 'Vencimentos próximos', value: store.alertasVencimentos.length, subtext: `Lotes nos próximos ${diasVencimento.value} dias`, route: 'estoque-lotes' },
])
const hasProducts = computed(() => store.stats.totalProdutos > 0)
const healthScore = computed(() => Math.min(100, Math.max(0, Number(store.healthScore) || 0)))
const healthLabel = computed(() => {
  if (!hasProducts.value) return 'Sem dados'
  if (healthScore.value >= 80) return 'Excelente'
  if (healthScore.value >= 60) return 'Bom'
  if (healthScore.value >= 40) return 'Regular'
  return 'Crítico'
})
const healthTone = computed(() => !hasProducts.value ? 'neutral' : healthScore.value >= 80 ? 'good' : healthScore.value >= 50 ? 'attention' : 'critical')
const categories = computed(() => store.chartData.categorias || [])
const totalCategories = computed(() => categories.value.reduce((sum, category) => sum + category.count, 0))
const last7Days = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = new Date()
  date.setDate(date.getDate() - (6 - index))
  return date.toISOString().split('T')[0]
}))
const seriesTrends = computed(() => last7Days.value.map(date => {
  const movements = (store.chartData.trends || []).filter(item => item._id.day === date)
  return {
    date,
    entrada: movements.filter(item => item._id.tipo === 'ENTRADA').reduce((total, item) => total + item.total, 0),
    saida: movements.filter(item => item._id.tipo.startsWith('SAIDA')).reduce((total, item) => total + item.total, 0),
  }
}))
const totalEntradas = computed(() => seriesTrends.value.reduce((sum, day) => sum + day.entrada, 0))
const totalSaidas = computed(() => seriesTrends.value.reduce((sum, day) => sum + day.saida, 0))
const hasMovements = computed(() => totalEntradas.value > 0 || totalSaidas.value > 0)
const chartData = computed(() => ({
  labels: seriesTrends.value.map(day => `${day.date.slice(8)}/${day.date.slice(5, 7)}`),
  datasets: [
    { label: 'Entradas', data: seriesTrends.value.map(day => day.entrada), backgroundColor: brandColor.value, borderRadius: 4, maxBarThickness: 16 },
    { label: 'Saídas', data: seriesTrends.value.map(day => day.saida), backgroundColor: '#c3cfdf', borderRadius: 4, maxBarThickness: 16 },
  ],
}))
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 400 },
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 8 } },
  scales: {
    x: { grid: { display: false }, border: { display: false }, ticks: { color: '#94a3b8', font: { size: 11, weight: 400 } } },
    y: { beginAtZero: true, border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { color: '#94a3b8', precision: 0, maxTicksLimit: 5, font: { size: 11, weight: 400 } } },
  },
}
function formatarData(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR')
}
</script>

<template>
  <div class="stock-dashboard" :aria-busy="isLoading">
    <header class="page-header">
      <div>
        <h1>Estoque</h1>
        <p>Resumo dos insumos, movimentações e pontos de atenção da clínica.</p>
      </div>
      <div class="header-tools">
        <fieldset class="expiry-filter" :disabled="isLoading">
          <legend class="sr-only">Prazo dos vencimentos</legend>
          <StyledSelect v-model="diasVencimento" :options="optionsVencimento" placeholder="Vencimento" @update:model-value="recarregarDashboard">
            <template #prefix><span class="expiry-prefix"><Clock :size="16" aria-hidden="true" />Vencimento</span></template>
          </StyledSelect>
        </fieldset>
        <AppButton class="refresh-button" variant="outline" :loading="isLoading" aria-label="Atualizar resumo do estoque" @click="recarregarDashboard">
          <RefreshCw :size="16" /> Atualizar
        </AppButton>
      </div>
    </header>

    <div v-if="loadError" class="load-error panel" role="alert">
      <AlertTriangle :size="22" aria-hidden="true" />
      <div><h2>Não foi possível carregar o estoque</h2><p>{{ loadError }}</p></div>
      <AppButton variant="outline" @click="recarregarDashboard">Tentar novamente</AppButton>
    </div>

    <template v-else>
      <div class="summary-grid">
        <button v-for="card in summaryCards" :key="card.key" type="button" class="summary-link" :disabled="isLoading" @click="router.push({ name: card.route })">
          <FinanceSummaryCard :label="card.label" :value="card.value" :subtext="card.subtext" :loading="isLoading" />
        </button>
      </div>

      <div class="overview-grid">
        <section class="panel health-panel">
          <div class="section-header"><h2>Saúde do estoque</h2><p>Níveis de estoque e prazos de validade.</p></div>
          <div v-if="isLoading" class="panel-skeleton"><AppSkeleton height="135px" /><AppSkeleton width="65%" /></div>
          <template v-else>
            <div class="health-gauge" :class="`health-gauge--${healthTone}`" role="meter" aria-label="Saúde do estoque" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="hasProducts ? healthScore : undefined" :aria-valuetext="hasProducts ? `${healthScore} de 100, ${healthLabel}` : 'Sem insumos cadastrados'">
              <svg viewBox="0 0 240 145" aria-hidden="true" class="gauge-svg">
                <path d="M28 122 A92 92 0 0 1 212 122" fill="none" stroke="#edf2f7" stroke-width="11" stroke-linecap="round" />
                <path d="M28 122 A92 92 0 0 1 212 122" fill="none" stroke="currentColor" stroke-width="11" stroke-linecap="round" pathLength="100" stroke-dasharray="100" :stroke-dashoffset="100 - (hasProducts ? healthScore : 0)" class="gauge-progress" />
                <text x="28" y="143" text-anchor="middle" class="gauge-limit">0</text>
                <text x="212" y="143" text-anchor="middle" class="gauge-limit">100</text>
              </svg>
              <div class="gauge-copy"><span class="gauge-value">{{ hasProducts ? healthScore : '—' }}</span><span class="gauge-unit">de 100 pontos</span></div>
            </div>
            <span class="health-status" :class="`health-status--${healthTone}`"><span aria-hidden="true"></span>{{ healthLabel }}</span>
            <p class="health-note">{{ hasProducts ? 'Acompanhe os alertas abaixo para manter os insumos em dia.' : 'O indicador estará disponível após cadastrar seus insumos.' }}</p>
          </template>
        </section>

        <section class="panel movement-panel">
          <div class="section-header section-header--with-action"><div><h2>Movimentações</h2><p>Entradas e saídas nos últimos 7 dias.</p></div><AppButton variant="ghost" size="sm" :to="{ name: 'estoque-movimentacoes' }" aria-label="Ver movimentações">Ver todas <ArrowUpRight :size="14" /></AppButton></div>
          <div v-if="isLoading" class="panel-skeleton"><AppSkeleton height="200px" /></div>
          <template v-else>
            <div class="movement-totals">
              <div><ArrowDownLeft :size="15" class="entry-icon" /><span>Entradas</span><strong>{{ totalEntradas }}</strong></div>
              <div><ArrowUpRight :size="15" class="exit-icon" /><span>Saídas</span><strong>{{ totalSaidas }}</strong></div>
            </div>
            <div v-if="hasMovements" class="chart-body"><Bar :data="chartData" :options="chartOptions" aria-label="Entradas e saídas de estoque nos últimos sete dias" /></div>
            <StockDashboardEmpty v-else title="Nenhuma movimentação" text="As entradas e saídas dos últimos 7 dias aparecerão aqui." />
          </template>
        </section>

        <section class="panel category-panel">
          <div class="section-header"><h2>Por categoria</h2><p>Distribuição dos insumos cadastrados.</p></div>
          <div v-if="isLoading" class="panel-skeleton"><AppSkeleton v-for="n in 4" :key="n" height="28px" /></div>
          <div v-else-if="categories.length" class="category-list">
            <div v-for="category in categories" :key="category._id || 'none'" class="category-item">
              <div><span>{{ category._id || 'Sem categoria' }}</span><strong>{{ category.count }}</strong></div>
              <div class="category-track"><div :style="{ width: `${totalCategories ? category.count / totalCategories * 100 : 0}%` }"></div></div>
            </div>
          </div>
          <StockDashboardEmpty v-else title="Nenhum insumo cadastrado" text="As categorias aparecerão conforme os produtos forem cadastrados." />
        </section>
      </div>

      <div class="alerts-grid">
        <section class="panel alert-panel">
          <div class="section-header alert-header">
            <div class="heading-with-icon"><span class="section-icon"><AlertTriangle :size="17" /></span><div><h2>Estoque mínimo</h2><p>Insumos que precisam de reposição.</p></div></div>
            <span v-if="!isLoading" class="count-badge" :class="{ 'has-alerts': store.alertasEstoqueMinimo.length }">{{ store.alertasEstoqueMinimo.length }}</span>
          </div>
          <div v-if="isLoading" class="panel-skeleton"><AppSkeleton v-for="n in 2" :key="n" height="46px" /></div>
          <StockDashboardEmpty v-else-if="!store.alertasEstoqueMinimo.length" title="Estoque em dia" text="Nenhum insumo está abaixo do estoque mínimo." />
          <ul v-else class="alert-list">
            <li v-for="item in store.alertasEstoqueMinimo" :key="item.produtoId">
              <div><h3>{{ item.nomeProduto }}</h3><p>Saldo: {{ item.saldoTotal }} · Mínimo: {{ item.quantidadeMinima }}</p></div>
              <AppButton variant="ghost" size="sm" :aria-label="`Ver ${item.nomeProduto}`" @click="router.push({ name: 'estoque-produto-detalhe', params: { id: item.produtoId } })">Ver insumo <ArrowUpRight :size="14" /></AppButton>
            </li>
          </ul>
        </section>
        <section class="panel alert-panel">
          <div class="section-header alert-header">
            <div class="heading-with-icon"><span class="section-icon"><Clock :size="17" /></span><div><h2>Vencimentos próximos</h2><p>Lotes com validade nos próximos {{ diasVencimento }} dias.</p></div></div>
            <span v-if="!isLoading" class="count-badge" :class="{ 'has-alerts': store.alertasVencimentos.length }">{{ store.alertasVencimentos.length }}</span>
          </div>
          <div v-if="isLoading" class="panel-skeleton"><AppSkeleton v-for="n in 2" :key="n" height="46px" /></div>
          <StockDashboardEmpty v-else-if="!store.alertasVencimentos.length" title="Nenhum vencimento próximo" :text="`Nenhum lote vence nos próximos ${diasVencimento} dias.`" />
          <ul v-else class="alert-list">
            <li v-for="lote in store.alertasVencimentos" :key="lote.loteId">
              <div><h3>{{ lote.nomeProduto || 'Produto' }}</h3><p>Lote {{ lote.numeroLote }} · Vence em {{ formatarData(lote.dataValidade) }}</p></div>
              <AppButton variant="ghost" size="sm" @click="router.push({ name: 'estoque-lotes' })">Ver lotes <ArrowUpRight :size="14" /></AppButton>
            </li>
          </ul>
        </section>
      </div>

    </template>
  </div>
</template>

<style scoped>
.stock-dashboard { display: flex; flex-direction: column; gap: 1.15rem; color: #0f172a; }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; }
.page-header h1 { margin: 0; font-family: var(--fonte-titulo); font-size: clamp(1.45rem, 1.3vw + 1rem, 2rem); font-weight: 650; line-height: 1.12; }
.page-header p { margin: .35rem 0 0; color: #64748b; font-size: .92rem; font-weight: 400; }
.header-tools { display: flex; align-items: center; flex-wrap: wrap; gap: .75rem; margin-left: auto; }
.expiry-filter { min-width: 250px; padding: 0; margin: 0; border: 0; }
.expiry-prefix { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; color: #64748b; font-weight: 400; }
.header-tools :deep(.refresh-button) { height: 44px; min-height: 44px; border-radius: .75rem; padding: 0 .875rem; font-size: .95rem; border-color: #d1d5db; box-shadow: 0 1px 2px rgb(15 23 42 / 4%); }
.expiry-filter:disabled { opacity: .6; }
.summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: .9rem; }
.summary-link { padding: 0; border: 0; background: none; text-align: left; font: inherit; cursor: pointer; border-radius: .75rem; min-width: 0; }
.summary-link:focus-visible { outline: 2px solid var(--azul-principal); outline-offset: 3px; }
.summary-link:disabled { cursor: default; }
.summary-link :deep(.summary-card) { height: 100%; }
.overview-grid { display: grid; grid-template-columns: minmax(230px, .85fr) minmax(0, 1.5fr) minmax(240px, 1fr); gap: 1rem; }
.panel { background: var(--branco, #fff); border: 1px solid #e8edf4; border-radius: .85rem; min-width: 0; overflow: hidden; box-shadow: 0 1px 2px rgb(15 23 42 / 2.5%), 0 12px 28px rgb(15 23 42 / 2.8%); }
.section-header { padding: .95rem 1.1rem; border-bottom: 1px solid #edf2f7; }
.section-header--with-action { display: flex; justify-content: space-between; align-items: center; gap: 10px; }
.section-header--with-action :deep(.app-button) { flex-shrink: 0; }
.section-header h2, .load-error h2 { margin: 0; font-size: .98rem; font-weight: 600; color: #0f172a; }
.section-header p, .load-error p { margin: .25rem 0 0; font-size: .78rem; line-height: 1.4; color: #64748b; font-weight: 400; }
.health-panel { display: flex; flex-direction: column; align-items: center; }
.health-panel .section-header { align-self: stretch; }
.health-gauge { width: min(100%, 240px); position: relative; margin: 20px 0 4px; color: var(--azul-principal, #0057ff); }
.health-gauge--attention { color: #d6aa67; }
.health-gauge--critical { color: #d98181; }
.health-gauge--neutral { color: #cbd5e1; }
.gauge-svg { display: block; width: 100%; height: auto; overflow: visible; }
.gauge-progress { transition: stroke-dashoffset .6s ease-out; }
.gauge-limit { fill: #94a3b8; font-family: var(--fonte-principal); font-size: 11px; font-weight: 400; }
.gauge-copy { position: absolute; top: 44%; left: 0; right: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.gauge-value { color: #1e293b; font-size: 38px; font-weight: 500; line-height: 1.1; font-variant-numeric: tabular-nums; letter-spacing: -1px; }
.gauge-unit { color: #64748b; font-size: 11px; font-weight: 400; }
.health-status { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 4px 10px; background: #f1f5f9; color: #64748b; font-size: 11px; font-weight: 500; margin-top: 5px; }
.health-status > span { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
.health-status--good { color: #44816f; background: #eef7f3; }
.health-status--attention { color: #916d38; background: #faf4e9; }
.health-status--critical { color: #ad6262; background: #fcf0f0; }
.health-note { color: #64748b; font-size: .75rem; font-weight: 400; line-height: 1.5; text-align: center; max-width: 250px; margin: 12px 18px 20px; }
.movement-totals { display: flex; gap: 24px; padding: 16px 20px 0; }
.movement-totals > div { display: flex; align-items: center; gap: 6px; color: #64748b; font-size: 12px; }
.movement-totals strong { margin-left: 4px; font-size: 16px; font-weight: 500; color: #1e293b; font-variant-numeric: tabular-nums; }
.entry-icon { color: var(--azul-principal, #0057ff); }
.exit-icon { color: #94a3b8; }
.chart-body { height: 225px; padding: 16px 18px 18px; }
.category-list { display: flex; flex-direction: column; gap: 20px; padding: 22px 20px; max-height: 286px; overflow-y: auto; }
.category-item > div:first-child { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 8px; color: #334155; font-size: 13px; }
.category-item span { overflow-wrap: anywhere; }
.category-item strong { font-weight: 500; color: #334155; font-variant-numeric: tabular-nums; }
.category-track { height: 8px; background: #f1f5f9; border-radius: 999px; overflow: hidden; }
.category-track > div { height: 100%; background: var(--azul-principal, #0057ff); border-radius: inherit; }
.alerts-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.alert-panel { display: flex; flex-direction: column; }
.alert-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.heading-with-icon { display: flex; align-items: center; gap: 10px; }
.section-icon { display: flex; padding: 8px; background: #f5f7fb; color: #8293ab; border-radius: 9px; flex-shrink: 0; }
.count-badge { color: #64748b; background: #f1f5f9; border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 500; }
.count-badge.has-alerts { color: #916d38; background: #faf4e9; }
.alert-list { list-style: none; padding: 0 1.1rem; margin: 0; max-height: 290px; overflow-y: auto; }
.alert-list li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 15px 0; border-bottom: 1px solid #f1f5f9; }
.alert-list li:last-child { border-bottom: 0; }
.alert-list li > div { min-width: 0; }
.alert-list h3 { margin: 0; color: #334155; font-size: 13px; font-weight: 500; overflow-wrap: anywhere; }
.alert-list p { color: #64748b; font-size: 12px; font-weight: 400; margin: 5px 0 0; overflow-wrap: anywhere; }
.alert-list :deep(.app-button) { flex-shrink: 0; }
.panel-skeleton { width: 100%; display: flex; flex-direction: column; gap: 16px; align-items: center; padding: 22px; min-height: 210px; }
.load-error { display: flex; align-items: center; gap: 16px; padding: 24px; color: #916d38; }
.load-error :deep(.app-button) { margin-left: auto; flex-shrink: 0; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
@media (max-width: 1200px) {
  .overview-grid { grid-template-columns: minmax(230px, .8fr) minmax(0, 1.5fr); }
  .category-panel { grid-column: 1 / -1; }
  .category-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .page-header { flex-wrap: wrap; }
}
@media (max-width: 760px) {
  .summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .overview-grid, .alerts-grid { grid-template-columns: minmax(0, 1fr); }
  .category-panel { grid-column: auto; }
  .category-list { display: flex; }
  .header-tools { margin-left: 0; width: 100%; }
  .expiry-filter { flex: 1; min-width: 0; }
  .load-error { flex-wrap: wrap; }
  .load-error :deep(.app-button) { margin-left: 0; }
}
@media (max-width: 420px) {
  .summary-grid { grid-template-columns: minmax(0, 1fr); }
  .header-tools { align-items: stretch; flex-direction: column; }
  .alert-list li { align-items: flex-start; flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) { .gauge-progress { transition: none; } }
</style>
