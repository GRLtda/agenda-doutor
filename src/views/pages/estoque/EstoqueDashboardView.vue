<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEstoqueStore } from '@/stores/estoque'
import { useToast } from 'vue-toastification'
import {
  Package,
  Layers,
  AlertTriangle,
  Clock,
  ChevronRight,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from 'lucide-vue-next'
import gsap from 'gsap'
import StyledSelect from '@/components/global/StyledSelect.vue'

const store = useEstoqueStore()
const router = useRouter()
const toast = useToast()

const diasVencimento = ref(30)
const filtroCategoria = ref('')

onMounted(async () => {
  const res = await store.fetchDashboardSummary(diasVencimento.value)
  if (!res.success) toast.error('Não foi possível carregar o resumo do estoque.')
  
  // Animação inicial opcional
  gsap.from('.nav-card', { 
    y: 20, 
    opacity: 0, 
    duration: 0.5, 
    stagger: 0.1, 
    ease: 'power2.out' 
  })
})

const optionsVencimento = [
  { value: 30, label: 'Vencimento em 30 dias' },
  { value: 60, label: 'Vencimento em 60 dias' },
  { value: 90, label: 'Vencimento em 90 dias' },
]

async function recarregarDashboard() {
  const res = await store.fetchDashboardSummary(diasVencimento.value)
  if (!res.success) toast.error(store.error)
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

const gaugeColor = computed(() => {
  const score = store.healthScore
  if (score >= 80) return '#10b981' // Green
  if (score >= 50) return '#f59e0b' // Yellow
  return '#ef4444' // Red
})

const gaugeText = computed(() => {
  const score = store.healthScore
  if (score >= 80) return 'Excelente'
  if (score >= 60) return 'Bom'
  if (score >= 40) return 'Regular'
  return 'Crítico'
})

const displayedScore = ref(0)
watch(() => store.healthScore, (newVal) => {
  gsap.to(displayedScore, { value: newVal, duration: 1.5, ease: 'power2.out' })
}, { immediate: true })

const last7Days = computed(() => {
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return days
})

const seriesTrends = computed(() => {
  const dates = last7Days.value
  const trends = store.chartData.trends || []
  
  return dates.map(date => {
    const dayData = trends.filter(t => t._id.day === date)
    const entrada = dayData.find(d => d._id.tipo === 'ENTRADA')?.total || 0
    const saida = dayData.filter(d => d._id.tipo.startsWith('SAIDA')).reduce((acc, curr) => acc + curr.total, 0)
    return { date, entrada, saida }
  })
})

const maxTrend = computed(() => {
  const vals = seriesTrends.value.flatMap(d => [d.entrada, d.saida])
  return Math.max(...vals, 10)
})

const maxCategory = computed(() => {
  const vals = store.chartData.categorias.map(c => c.count)
  return Math.max(...vals, 5)
})
const rotasProdutos   = () => router.push({ name: 'estoque-produtos' })
const rotasLotes      = () => router.push({ name: 'estoque-lotes' })
const rotasMovs       = () => router.push({ name: 'estoque-movimentacoes' })
const rotasKits       = () => router.push({ name: 'estoque-kits' })
</script>

<template>
  <div class="estoque-dashboard">
    <!-- Header -->
    <header class="page-header">
      <div>
        <h1 class="title">Estoque</h1>
        <p class="subtitle">Visão geral e inteligência de controle de insumos.</p>
      </div>

      <div class="header-actions">
        <StyledSelect 
          v-model="diasVencimento" 
          :options="optionsVencimento" 
          placeholder="Vencimento"
          @update:modelValue="recarregarDashboard"
          class="select-vencimento"
        />
        <button class="btn-refresh" @click="recarregarDashboard" :disabled="store.loadingAlertas" title="Recarregar dados">
          <RefreshCw :size="16" :class="{ 'spin': store.loadingAlertas }" />
          Atualizar
        </button>
      </div>
    </header>

    <!-- Top Row: Gauge & Quick Stats -->
    <div class="dashboard-row top-row">
      <div class="gauge-card card">
        <div class="gauge-container">
          <svg viewBox="0 0 200 120" class="gauge-svg">
            <!-- Background Arc -->
            <path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="#f3f4f6" stroke-width="12" stroke-linecap="round" />
            
            <!-- Colored Progress Arc -->
            <path 
              id="gauge-path"
              d="M20,100 A80,80 0 0,1 180,100" 
              fill="none" 
              :stroke="gaugeColor" 
              stroke-width="12" 
              stroke-linecap="round"
              stroke-dasharray="251.32"
              :stroke-dashoffset="251.32 - (251.32 * store.healthScore / 100)"
              class="progress-path"
            />
            
            <!-- Center Text -->
            <text x="100" y="80" text-anchor="middle" class="gauge-value">{{ Math.round(displayedScore) }}</text>
            <text x="100" y="100" text-anchor="middle" class="gauge-label">{{ gaugeText }}</text>
          </svg>
        </div>
        <div class="gauge-footer">
          <!-- <span class="health-title">Score de Saúde</span> -->
          <p class="health-desc">Medido por nível de estoque e prazos de validade.</p>
        </div>
      </div>

      <div class="summary-stats-grid">
        <div class="stat-card card clickable" @click="rotasProdutos">
          <div class="stat-icon icon-blue"><Package :size="20" /></div>
          <div class="stat-info">
            <span class="stat-label">Insumos Catalogo</span>
            <span class="stat-value">{{ store.stats.totalProdutos }}</span>
          </div>
        </div>
        <div class="stat-card card clickable" @click="rotasLotes">
          <div class="stat-icon icon-green"><Layers :size="20" /></div>
          <div class="stat-info">
            <span class="stat-label">Lotes Ativos</span>
            <span class="stat-value">{{ store.stats.totalLotesAtivos }}</span>
          </div>
        </div>
        <div class="stat-card card clickable" @click="rotasMovs">
          <div class="stat-icon icon-purple"><TrendingDown :size="20" /></div>
          <div class="stat-info">
            <span class="stat-label">Movimentações</span>
            <span class="stat-value">Consultar</span>
          </div>
        </div>
        <div class="stat-card card clickable" @click="rotasKits">
          <div class="stat-icon icon-orange"><Package :size="20" /></div>
          <div class="stat-info">
            <span class="stat-label">Kits Prontos</span>
            <span class="stat-value">Receitas</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Charts Row -->
    <div class="dashboard-row charts-row">
      <!-- Trends Chart -->
      <div class="chart-card card">
        <div class="chart-header">
          <h3 class="chart-title">Movimentações</h3>
          <div class="chart-legend">
            <span class="legend-item"><span class="dot dot-in"></span> Entradas</span>
            <span class="legend-item"><span class="dot dot-out"></span> Saídas</span>
          </div>
        </div>
        <div class="chart-content">
          <div class="trend-wrapper">
            <div class="trend-grid">
              <div v-for="n in 5" :key="n" class="grid-line"></div>
            </div>
            <div class="trend-bars">
              <div v-for="day in seriesTrends" :key="day.date" class="trend-column">
                <div class="bar-container">
                  <div 
                    class="bar bar-in" 
                    :style="{ height: (day.entrada / maxTrend * 100) + '%' }"
                  >
                    <div class="bar-tooltip">{{ day.entrada }}</div>
                  </div>
                  <div 
                    class="bar bar-out" 
                    :style="{ height: (day.saida / maxTrend * 100) + '%' }"
                  >
                    <div class="bar-tooltip">{{ day.saida }}</div>
                  </div>
                </div>
                <span class="day-label">{{ day.date.split('-')[2] }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Category Chart -->
      <div class="chart-card card">
        <div class="chart-header">
          <h3 class="chart-title">Distribuição por Categoria</h3>
        </div>
        <div class="chart-content">
          <div class="category-bars">
            <div v-for="cat in store.chartData.categorias" :key="cat._id" class="cat-row">
              <span class="cat-label">{{ cat._id || 'Sem Categoria' }}</span>
              <div class="cat-bar-bg">
                <div class="cat-bar-fill" :style="{ width: (cat.count / maxCategory * 100) + '%' }"></div>
              </div>
              <span class="cat-count">{{ cat.count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Alertas -->
    <div class="alertas-grid">
      <!-- Estoque Mínimo -->
      <section class="alerta-card card">
        <div class="alerta-card-header">
          <div class="alerta-title-group">
            <div class="alerta-icon alerta-icon--red"><AlertTriangle :size="18" /></div>
            <h2 class="alerta-title">Estoque mínimo atingido</h2>
          </div>
          <span class="alerta-count" :class="{ 'count--zero': store.alertasEstoqueMinimo.length === 0 }">
            {{ store.alertasEstoqueMinimo.length }}
          </span>
        </div>

        <div v-if="store.loadingAlertas" class="skeleton-list">
          <div v-for="n in 3" :key="n" class="skeleton-row" />
        </div>

        <div v-else-if="store.alertasEstoqueMinimo.length === 0" class="empty-alerta">
          <div class="empty-state-content">
            <p>Estoque saudável.</p>
          </div>
        </div>

        <ul v-else class="alerta-list">
          <li v-for="item in store.alertasEstoqueMinimo" :key="item.produtoId" class="alerta-item">
            <div class="alerta-item-info">
              <span class="alerta-item-nome">{{ item.nomeProduto }}</span>
              <span class="alerta-item-detail">
                {{ item.saldoTotal }} / Mínimo: {{ item.quantidadeMinima }}
              </span>
            </div>
            <button class="btn-link" @click="router.push({ name: 'estoque-produto-detalhe', params: { id: item.produtoId } })">
              Ver <ChevronRight :size="14" />
            </button>
          </li>
        </ul>
      </section>

      <!-- Vencimentos -->
      <section class="alerta-card card">
        <div class="alerta-card-header">
          <div class="alerta-title-group">
            <div class="alerta-icon alerta-icon--yellow"><Clock :size="18" /></div>
            <h2 class="alerta-title">Vencimentos próximos</h2>
          </div>
        </div>

        <div v-if="store.loadingAlertas" class="skeleton-list">
          <div v-for="n in 3" :key="n" class="skeleton-row" />
        </div>

        <div v-else-if="store.alertasVencimentos.length === 0" class="empty-alerta">
          <div class="empty-state-content">
            <p>Sem vencimentos próximos.</p>
          </div>
        </div>

        <ul v-else class="alerta-list">
          <li v-for="lote in store.alertasVencimentos" :key="lote.loteId" class="alerta-item">
            <div class="alerta-item-info">
              <span class="alerta-item-nome">{{ lote.nomeProduto || 'Produto' }}</span>
              <span class="alerta-item-detail">
                Lote {{ lote.numeroLote }} — Venc. {{ formatarData(lote.dataValidade) }}
              </span>
            </div>
            <button class="btn-link" @click="router.push({ name: 'estoque-lotes' })">
              Ver <ChevronRight :size="14" />
            </button>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>

<style scoped>
.estoque-dashboard { padding: 0; animation: fadeIn 0.5s ease-out; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 2rem;
  gap: 1.5rem;
}

.title { font-size: 2.25rem; font-weight: 700; color: #0f172a; letter-spacing: -0.025em; margin: 0; }
.subtitle { color: #64748b; font-size: 1rem; margin-top: 0.25rem; }

.header-actions { display: flex; gap: 0.75rem; align-items: center; }
.select-vencimento { width: 220px; }

.btn-refresh {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  color: #374151;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-refresh:hover { background: #f9fafb; border-color: #d1d5db; }

/* Dashboard Rows */
.dashboard-row { display: grid; gap: 1.5rem; margin-bottom: 1.5rem; }
.top-row { grid-template-columns: 320px 1fr; }
.charts-row { grid-template-columns: 1fr 1fr; }

.card {
  background: white;
  border: 1px solid #f3f4f6;
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.2s ease;
}
.card:hover { border-color: var(--azul-principal); background-color: #fcfdfe; }
.clickable { cursor: pointer; }

/* Gauge Card */
.gauge-card { 
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center;
  padding: 1rem 1.5rem;
}
.gauge-container { width: 100%; max-width: 180px; position: relative; }
.gauge-svg { width: 100%; height: auto; }

.progress-path {
  transition: stroke-dashoffset 1.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.gauge-value { font-size: 44px; font-weight: 900; fill: #111827; }
.gauge-label { font-size: 13px; font-weight: 800; fill: #9ca3af; text-transform: uppercase; letter-spacing: 0.1em; }

.gauge-footer { margin-top: -6px; }
.health-title { font-weight: 800; color: #111827; font-size: 1rem; display: block; }
.health-desc { font-size: 0.75rem; color: #9ca3af; margin-top: 0.15rem; line-height: 1.3; }

/* Summary Stats */
.summary-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
.stat-card { display: flex; align-items: center; gap: 1rem; padding: 1.25rem; }

.stat-icon {
  width: 42px; height: 42px; border-radius: 0.75rem;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.icon-blue   { background: #eff6ff; color: #2563eb; }
.icon-green  { background: #f0fdf4; color: #16a34a; }
.icon-purple { background: #f5f3ff; color: #7c3aed; }
.icon-orange { background: #fff7ed; color: #ea580c; }

.stat-info { display: flex; flex-direction: column; }
.stat-label { font-size: 0.85rem; font-weight: 500; color: #64748b; }
.stat-value { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-top: 2px; }

/* Chart Card */
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
.chart-title { font-size: 1.05rem; font-weight: 600; color: #1f2937; margin: 0; }
.chart-legend { display: flex; gap: 1.25rem; }
.legend-item { font-size: 0.72rem; font-weight: 600; color: #64748b; display: flex; align-items: center; gap: 0.4rem; }
.dot { width: 7px; height: 7px; border-radius: 50%; }
.dot-in { background: var(--azul-principal); }
.dot-out { background: #ff4d94; }

/* Trend Chart Refinado */
.chart-content { height: 220px; width: 100%; position: relative; }
.trend-wrapper { position: relative; width: 100%; height: 100%; display: flex; flex-direction: column; }
.trend-grid { position: absolute; inset: 0 0 25px 0; display: flex; flex-direction: column; justify-content: space-between; z-index: 0; }
.grid-line { width: 100%; height: 1px; background: #f3f4f6; }

.trend-bars { position: relative; z-index: 1; width: 100%; height: 100%; display: flex; justify-content: space-around; align-items: flex-end; }
.trend-column { flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.bar-container { width: 100%; flex: 1; display: flex; align-items: flex-end; justify-content: center; gap: 6px; margin-bottom: 8px; }
.bar { width: 10px; border-radius: 3px 3px 0 0; position: relative; transition: height 0.8s cubic-bezier(0.17, 0.67, 0.83, 0.67); }
.bar:hover .bar-tooltip { opacity: 1; transform: translateX(-50%) translateY(-100%) scale(1); }
.bar-tooltip {
  position: absolute; top: -8px; left: 50%; transform: translateX(-50%) translateY(-50%) scale(0.8);
  background: #111827; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 800;
  opacity: 0; pointer-events: none; transition: all 0.2s; z-index: 10;
}
.bar-in { background: var(--azul-principal); }
.bar-out { background: #ff4d94; }
.day-label { font-size: 0.68rem; font-weight: 800; color: #d1d5db; }

/* Category Bars */
.category-bars { width: 100%; display: flex; flex-direction: column; gap: 1.25rem; padding: 0.5rem 0; }
.cat-row { display: grid; grid-template-columns: 100px 1fr 40px; align-items: center; gap: 1rem; }
.cat-label { font-size: 0.72rem; font-weight: 800; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; line-height: 1; }
.cat-bar-bg { background: #f9fafb; height: 8px; border-radius: 10px; overflow: hidden; }
.cat-bar-fill { height: 100%; background: var(--azul-principal); border-radius: 10px; transition: width 1s ease; position: relative; }
.cat-count { font-size: 0.8rem; font-weight: 900; color: #111827; text-align: right; }

/* Alert Grid */
.alertas-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.alerta-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.alerta-title-group { display: flex; align-items: center; gap: 0.75rem; }
.alerta-icon {
  width: 32px; height: 32px; border-radius: 0.5rem;
  display: flex; align-items: center; justify-content: center;
}
.alerta-icon--red    { background: #fee2e2; color: #dc2626; }
.alerta-icon--yellow { background: #fef9c3; color: #ca8a04; }
.alerta-title { font-size: 1rem; font-weight: 600; color: #1f2937; margin: 0; }
.alerta-count { font-size: 0.75rem; font-weight: 700; padding: 0.2rem 0.5rem; border-radius: 6px; background: #fee2e2; color: #dc2626; }
.count--zero { background: #ecfdf5; color: #10b981; }

.alerta-list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 0.6rem; }
.alerta-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 1rem 1.25rem; background: #ffffff; border-radius: 1rem;
  border: 1px solid #f3f4f6; transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.02);
}
.alerta-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); transform: translateY(-1px); }
.alerta-item-info { display: flex; flex-direction: column; gap: 0.25rem; }
.alerta-item-nome { font-size: 0.9rem; font-weight: 600; color: #1e293b; }
.alerta-item-detail { font-size: 0.8rem; color: #64748b; font-weight: 500; }
.btn-link { 
  display: flex; align-items: center; gap: 0.25rem;
  background: transparent; color: var(--azul-principal);
  border: none; cursor: pointer; padding: 0.375rem 0.6rem;
  font-size: 0.825rem; font-weight: 600; border-radius: 6px;
  transition: background 0.2s;
}
.btn-link:hover { background: #eff6ff; }

.empty-alerta { 
  flex: 1; display: flex; align-items: center; justify-content: center; 
  min-height: 120px; padding: 1.5rem; 
}
.empty-state-content { text-align: center; }
.empty-icon { font-size: 1.5rem; display: block; margin-bottom: 0.5rem; }
.empty-alerta p { color: #9ca3af; font-size: 0.82rem; font-weight: 600; margin: 0; }

.skeleton-row { height: 48px; background: #f3f4f6; border-radius: 0.75rem; animation: pulse 1.5s infinite; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }

@media (max-width: 1024px) {
  .top-row, .charts-row, .alertas-grid { grid-template-columns: 1fr; }
  .top-row { display: flex; flex-direction: column; }
  .summary-stats-grid { order: -1; }
  .gauge-card { order: 0; }
}

@media (max-width: 640px) {
  .summary-stats-grid { grid-template-columns: 1fr; }
  .page-header { flex-direction: column; align-items: flex-start; }
  .header-actions { width: 100%; justify-content: space-between; }
  .select-vencimento { flex: 1; }
}
</style>
