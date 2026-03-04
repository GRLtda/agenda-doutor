<script setup>
// EstoqueDashboardView.vue — Dashboard do módulo de estoque
import { ref, onMounted, computed } from 'vue'
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
} from 'lucide-vue-next'

const store = useEstoqueStore()
const router = useRouter()
const toast = useToast()

const diasVencimento = ref(30)

onMounted(async () => {
  const [resAlertas, resProdutos, resLotes] = await Promise.all([
    store.fetchAlertas(diasVencimento.value),
    store.fetchProdutos({ limit: 1 }),
    store.fetchLotes({ status: 'ATIVO', limit: 1 }),
  ])
  if (!resAlertas.success) toast.error('Não foi possível carregar os alertas.')
})

async function recarregarAlertas() {
  const res = await store.fetchAlertas(diasVencimento.value)
  if (!res.success) toast.error(store.error)
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

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
        <p class="subtitle">Visão geral e alertas do controle de insumos.</p>
      </div>
      <button class="btn-refresh" @click="recarregarAlertas" :disabled="store.loadingAlertas" title="Recarregar alertas">
        <RefreshCw :size="16" :class="{ 'spin': store.loadingAlertas }" />
        Atualizar
      </button>
    </header>

    <!-- Cards de navegação rápida -->
    <div class="nav-cards">
      <button class="nav-card" @click="rotasProdutos">
        <div class="nav-card-icon nav-card-icon--blue"><Package :size="22" /></div>
        <div class="nav-card-text">
          <span class="nav-card-label">Produtos</span>
          <span class="nav-card-hint">Catálogo de insumos</span>
        </div>
        <ChevronRight :size="18" class="nav-card-arrow" />
      </button>

      <button class="nav-card" @click="rotasLotes">
        <div class="nav-card-icon nav-card-icon--green"><Layers :size="22" /></div>
        <div class="nav-card-text">
          <span class="nav-card-label">Lotes</span>
          <span class="nav-card-hint">Estoque físico por lote</span>
        </div>
        <ChevronRight :size="18" class="nav-card-arrow" />
      </button>

      <button class="nav-card" @click="rotasMovs">
        <div class="nav-card-icon nav-card-icon--purple"><RefreshCw :size="22" /></div>
        <div class="nav-card-text">
          <span class="nav-card-label">Movimentações</span>
          <span class="nav-card-hint">Livro-Razão</span>
        </div>
        <ChevronRight :size="18" class="nav-card-arrow" />
      </button>

      <button class="nav-card" @click="rotasKits">
        <div class="nav-card-icon nav-card-icon--orange"><Package :size="22" /></div>
        <div class="nav-card-text">
          <span class="nav-card-label">Kits</span>
          <span class="nav-card-hint">Receitas de procedimento</span>
        </div>
        <ChevronRight :size="18" class="nav-card-arrow" />
      </button>
    </div>

    <!-- Alertas -->
    <div class="alertas-grid">
      <!-- Estoque Mínimo -->
      <section class="alerta-card">
        <div class="alerta-card-header">
          <div class="alerta-title-group">
            <div class="alerta-icon alerta-icon--red"><AlertTriangle :size="18" /></div>
            <h2 class="alerta-title">Estoque mínimo atingido</h2>
          </div>
          <span class="alerta-count" :class="{ 'count--zero': store.alertasEstoqueMinimo.length === 0 }">
            {{ store.alertasEstoqueMinimo.length }} produto(s)
          </span>
        </div>

        <div v-if="store.loadingAlertas" class="skeleton-list">
          <div v-for="n in 3" :key="n" class="skeleton-row" />
        </div>

        <div v-else-if="store.alertasEstoqueMinimo.length === 0" class="empty-alerta">
          <span>✅</span> Todos os produtos estão com saldo adequado.
        </div>

        <ul v-else class="alerta-list">
          <li v-for="item in store.alertasEstoqueMinimo" :key="item.produtoId" class="alerta-item">
            <div class="alerta-item-info">
              <span class="alerta-item-nome">{{ item.nome }}</span>
              <span class="alerta-item-detail">
                Saldo: <strong>{{ item.saldoTotal }}</strong> / Mínimo: <strong>{{ item.quantidadeMinima }}</strong>
              </span>
            </div>
            <button class="btn-link" @click="router.push({ name: 'estoque-produto-detalhe', params: { id: item.produtoId } })">
              Ver <ChevronRight :size="14" />
            </button>
          </li>
        </ul>
      </section>

      <!-- Vencimentos -->
      <section class="alerta-card">
        <div class="alerta-card-header">
          <div class="alerta-title-group">
            <div class="alerta-icon alerta-icon--yellow"><Clock :size="18" /></div>
            <h2 class="alerta-title">Vencimentos próximos</h2>
          </div>
          <div class="dias-selector">
            <select class="dias-select" v-model="diasVencimento" @change="recarregarAlertas">
              <option :value="30">30 dias</option>
              <option :value="60">60 dias</option>
              <option :value="90">90 dias</option>
            </select>
          </div>
        </div>

        <div v-if="store.loadingAlertas" class="skeleton-list">
          <div v-for="n in 3" :key="n" class="skeleton-row" />
        </div>

        <div v-else-if="store.alertasVencimentos.length === 0" class="empty-alerta">
          <span>✅</span> Nenhum lote vencendo nos próximos {{ diasVencimento }} dias.
        </div>

        <ul v-else class="alerta-list">
          <li v-for="lote in store.alertasVencimentos" :key="lote._id" class="alerta-item">
            <div class="alerta-item-info">
              <span class="alerta-item-nome">{{ lote.produto?.nome || 'Produto' }}</span>
              <span class="alerta-item-detail">
                Lote <strong>{{ lote.numeroLote }}</strong> — Vence em {{ formatarData(lote.dataValidade) }}
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
.estoque-dashboard { padding: 0; }

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
}

.title { font-size: 2rem; font-weight: 700; margin-bottom: 0.25rem; }
.subtitle { color: var(--cinza-texto); }

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  background: #fff;
  color: #374151;
  transition: all 0.15s ease;
}
.btn-refresh:hover { background: #f9fafb; }
.btn-refresh:disabled { opacity: 0.5; cursor: not-allowed; }

/* Nav Cards */
.nav-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.nav-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem;
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 1rem;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;
  width: 100%;
}
.nav-card:hover {
  border-color: var(--azul-principal);
  box-shadow: 0 4px 16px rgba(82, 130, 255, 0.1);
  transform: translateY(-1px);
}

.nav-card-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 0.75rem;
  flex-shrink: 0;
}
.nav-card-icon--blue    { background: #eff6ff; color: #2563eb; }
.nav-card-icon--green   { background: #f0fdf4; color: #16a34a; }
.nav-card-icon--purple  { background: #f5f3ff; color: #7c3aed; }
.nav-card-icon--orange  { background: #fff7ed; color: #ea580c; }

.nav-card-text { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
.nav-card-label { font-weight: 700; font-size: 0.95rem; color: #111827; }
.nav-card-hint  { font-size: 0.78rem; color: #9ca3af; }
.nav-card-arrow { color: #d1d5db; flex-shrink: 0; }

/* Alertas */
.alertas-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.alerta-card {
  background: #fff;
  border: 1.5px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
}

.alerta-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  background: #fafbfc;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.alerta-title-group { display: flex; align-items: center; gap: 0.75rem; }
.alerta-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 0.6rem;
}
.alerta-icon--red    { background: #fee2e2; color: #dc2626; }
.alerta-icon--yellow { background: #fef9c3; color: #ca8a04; }

.alerta-title { font-weight: 700; font-size: 0.95rem; color: #111827; margin: 0; }

.alerta-count {
  font-size: 0.8rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  background: #fee2e2;
  color: #dc2626;
  border-radius: 999px;
}
.count--zero { background: #f0fdf4; color: #16a34a; }

.dias-select {
  padding: 0.3rem 0.75rem;
  border: 1.5px solid #e5e7eb;
  border-radius: 0.6rem;
  font-size: 0.82rem;
  font-weight: 600;
  color: #374151;
  background: #fff;
  cursor: pointer;
  outline: none;
}

.empty-alerta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 2rem 1.5rem;
  color: #6b7280;
  font-size: 0.9rem;
}

.alerta-list { list-style: none; padding: 0; margin: 0; }
.alerta-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.875rem 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  transition: background 0.15s;
}
.alerta-item:last-child { border-bottom: none; }
.alerta-item:hover { background: #fafbfc; }

.alerta-item-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
.alerta-item-nome  { font-weight: 600; font-size: 0.9rem; color: #111827; }
.alerta-item-detail { font-size: 0.78rem; color: #9ca3af; }

.btn-link {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--azul-principal);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.4rem;
  white-space: nowrap;
}
.btn-link:hover { background: #eff6ff; }

/* Skeleton */
.skeleton-list { padding: 0.75rem 1.5rem; display: flex; flex-direction: column; gap: 0.6rem; }
.skeleton-row {
  height: 48px;
  background: #f3f4f6;
  border-radius: 0.6rem;
  animation: pulse 1.5s ease infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 0.8s linear infinite; }

@media (max-width: 640px) {
  .nav-cards { grid-template-columns: 1fr 1fr; }
  .alertas-grid { grid-template-columns: 1fr; }
}
</style>
