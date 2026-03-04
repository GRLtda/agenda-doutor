<script setup>
// MovimentacoesView.vue — Livro-Razão de movimentações (imutável)
import { ref, computed, onMounted } from 'vue'
import { useEstoqueStore } from '@/stores/estoque'
import { Search, X, BookOpen } from 'lucide-vue-next'
import EstoqueMovimentacaoTipo from '@/components/estoque/EstoqueMovimentacaoTipo.vue'

const store = useEstoqueStore()

const tipo = ref('')
const dataInicio = ref('')
const dataFim = ref('')
const page = ref(1)

onMounted(() => carregar())

async function carregar() {
  const params = { page: page.value, limit: 25 }
  if (tipo.value)       params.tipo      = tipo.value
  if (dataInicio.value) params.dataInicio = dataInicio.value
  if (dataFim.value)    params.dataFim   = dataFim.value
  await store.fetchMovimentacoes(params)
}

function limpar() {
  tipo.value = ''
  dataInicio.value = ''
  dataFim.value = ''
  page.value = 1
  carregar()
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const temFiltros = computed(() => tipo.value || dataInicio.value || dataFim.value)
const totalPaginas = computed(() => store.movimentacoesMeta?.totalPages || 1)
function irParaPagina(p) { page.value = p; carregar() }
</script>

<template>
  <div class="mov-page">
    <header class="page-header">
      <div>
        <h1 class="title">Movimentações</h1>
        <p class="subtitle">Livro-Razão imutável — todas as entradas e saídas de estoque.</p>
      </div>
    </header>

    <!-- Filtros -->
    <div class="filtros-bar">
      <select class="filter-select" v-model="tipo" @change="carregar()">
        <option value="">Todos os tipos</option>
        <option value="ENTRADA">Entrada</option>
        <option value="SAIDA_USO">Saída — Uso</option>
        <option value="SAIDA_ADMINISTRATIVA">Saída — Administrativa</option>
        <option value="COMPENSACAO">Compensação</option>
      </select>

      <div class="date-group">
        <input class="filter-input" type="date" v-model="dataInicio" @change="carregar()" placeholder="De" title="Data início" />
        <span class="date-sep">→</span>
        <input class="filter-input" type="date" v-model="dataFim" @change="carregar()" placeholder="Até" title="Data fim" />
      </div>

      <button v-if="temFiltros" class="btn-clear" @click="limpar"><X :size="14" /> Limpar</button>
    </div>

    <!-- Tabela -->
    <div class="table-wrapper" :class="{ 'is-loading': store.loadingMovimentacoes && store.movimentacoes.length > 0 }">
      <!-- Desktop -->
      <div class="desktop-only table-container">
        <table>
          <thead>
            <tr>
              <th>Tipo</th>
              <th>Produto</th>
              <th>Lote</th>
              <th>Quantidade</th>
              <th>Motivo</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="store.loadingMovimentacoes && store.movimentacoes.length === 0">
              <tr v-for="n in 8" :key="n" class="skeleton-row">
                <td v-for="c in 6" :key="c"><div class="skeleton" :style="`width:${30+c*10}%`"></div></td>
              </tr>
            </template>

            <template v-else-if="!store.loadingMovimentacoes && store.movimentacoes.length === 0">
              <tr><td colspan="6" class="empty-cell">
                <div class="empty-state">
                  <div class="empty-icon"><BookOpen :size="28"/></div>
                  <h3>Nenhuma movimentação encontrada</h3>
                  <p>{{ temFiltros ? 'Tente ajustar os filtros.' : 'As movimentações aparecerão aqui após entradas, saídas e baixas.' }}</p>
                </div>
              </td></tr>
            </template>

            <template v-else>
              <tr v-for="mov in store.movimentacoes" :key="mov._id" class="mov-row">
                <td><EstoqueMovimentacaoTipo :tipo="mov.tipo" /></td>
                <td class="produto-nome">{{ mov.produto?.nome || mov.produtoId || '—' }}</td>
                <td class="lote-num">{{ mov.lote?.numeroLote || mov.loteId || '—' }}</td>
                <td class="qtd" :class="mov.tipo === 'ENTRADA' ? 'qtd--entrada' : 'qtd--saida'">
                  {{ mov.tipo === 'ENTRADA' ? '+' : '-' }}{{ mov.quantidade }}
                </td>
                <td class="txt-gray">{{ mov.motivo || (mov.atendimentoId ? 'Atendimento' : '—') }}</td>
                <td class="txt-gray data-cel">{{ formatarData(mov.createdAt) }}</td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="mobile-list">
        <template v-if="store.loadingMovimentacoes && store.movimentacoes.length === 0">
          <div v-for="n in 5" :key="n" class="mov-card skeleton-card">
            <div class="skeleton" style="width:45%;height:.9rem;margin-bottom:.4rem"></div>
            <div class="skeleton" style="width:30%;height:.75rem"></div>
          </div>
        </template>
        <div v-for="mov in store.movimentacoes" :key="mov._id" class="mov-card">
          <div class="mov-card-body">
            <EstoqueMovimentacaoTipo :tipo="mov.tipo" />
            <span class="produto-nome">{{ mov.produto?.nome || '—' }}</span>
            <span class="lote-num">{{ mov.lote?.numeroLote || '—' }}</span>
            <span class="txt-gray" style="font-size:.78rem">{{ formatarData(mov.createdAt) }}</span>
          </div>
          <span class="qtd" :class="mov.tipo === 'ENTRADA' ? 'qtd--entrada' : 'qtd--saida'">
            {{ mov.tipo === 'ENTRADA' ? '+' : '-' }}{{ mov.quantidade }}
          </span>
        </div>
        <div v-if="!store.loadingMovimentacoes && store.movimentacoes.length === 0" class="empty-cell">
          <div class="empty-state">
            <div class="empty-icon"><BookOpen :size="24"/></div>
            <h3>Sem movimentações</h3>
          </div>
        </div>
      </div>

      <!-- Paginação -->
      <div v-if="totalPaginas > 1" class="paginacao">
        <button class="btn-pag" :disabled="page <= 1" @click="irParaPagina(page-1)">← Anterior</button>
        <span class="pag-info">{{ page }} / {{ totalPaginas }}</span>
        <button class="btn-pag" :disabled="page >= totalPaginas" @click="irParaPagina(page+1)">Próxima →</button>
      </div>
    </div>

    <!-- Nota legenda -->
    <p class="legenda">📋 O Livro-Razão é imutável — registros não podem ser editados ou excluídos.</p>
  </div>
</template>

<style scoped>
.mov-page { padding: 0; }
.page-header { margin-bottom: 1.5rem; }
.title { font-size: 2rem; font-weight: 700; margin-bottom: .25rem; }
.subtitle { color: var(--cinza-texto); }

.filtros-bar { display:flex; gap:.75rem; flex-wrap:wrap; margin-bottom:1.5rem; align-items:center; }
.filter-select, .filter-input {
  padding:.6rem .875rem; border:1.5px solid #e5e7eb; border-radius:.75rem;
  font-size:.875rem; color:#374151; background:#fff; cursor:pointer; outline:none;
}
.date-group { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; }
.date-sep { color:#d1d5db; font-size:.85rem; }
.btn-clear { display:inline-flex; align-items:center; gap:.35rem; padding:.6rem .875rem; border:1.5px solid #e5e7eb; border-radius:.75rem; font-size:.85rem; font-weight:600; cursor:pointer; background:#fff; color:#6b7280; }
.btn-clear:hover { background:#fee2e2; border-color:#fca5a5; color:#dc2626; }

.table-wrapper { background:#fff; border:1px solid #e5e7eb; border-radius:1rem; overflow:hidden; position:relative; }
.table-wrapper.is-loading { opacity:.55; pointer-events:none; }
.table-container { overflow-x:auto; }
table { width:100%; border-collapse:collapse; }
th, td { padding:.875rem 1.25rem; text-align:left; border-bottom:1px solid #e5e7eb; vertical-align:middle; font-size:.875rem; }
tbody tr:last-child td { border-bottom:none; }
th { background:#f9fafb; color:#6b7280; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em; }
.mov-row:hover td { background:#f9fafb; }

.produto-nome { font-weight:600; color:#111827; }
.lote-num { color:#6b7280; font-size:.82rem; }
.txt-gray { color:#9ca3af; }
.data-cel { white-space:nowrap; font-size:.8rem; }

.qtd { font-weight:800; font-size:.95rem; }
.qtd--entrada { color:#059669; }
.qtd--saida { color:#dc2626; }

.empty-cell { padding:4rem; text-align:center; }
.empty-state { display:flex; flex-direction:column; align-items:center; gap:.75rem; max-width:320px; margin:0 auto; }
.empty-icon { width:56px; height:56px; background:#eff6ff; color:var(--azul-principal); border-radius:50%; display:flex; align-items:center; justify-content:center; }
.empty-state h3 { font-size:1.1rem; font-weight:700; color:#111827; margin:0; }
.empty-state p { color:#9ca3af; font-size:.875rem; margin:0; text-align:center; }

.paginacao { display:flex; align-items:center; justify-content:center; gap:1rem; padding:1rem; border-top:1px solid #f3f4f6; }
.btn-pag { padding:.45rem 1rem; border:1.5px solid #e5e7eb; border-radius:.65rem; font-size:.85rem; font-weight:600; cursor:pointer; background:#fff; color:#374151; }
.btn-pag:hover:not(:disabled) { background:#f9fafb; }
.btn-pag:disabled { opacity:.4; cursor:not-allowed; }
.pag-info { font-size:.85rem; color:#6b7280; }

.legenda { margin-top: 1rem; font-size:.8rem; color:#9ca3af; text-align:center; }

.skeleton { background:#e5e7eb; border-radius:.4rem; height:.9rem; animation:pulse 1.5s ease infinite; }
.skeleton-row td { padding:.5rem 1.25rem; }

.mobile-list { display:none; }
.mov-card { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid #f3f4f6; gap:.75rem; }
.mov-card:last-child { border:none; }
.mov-card-body { display:flex; flex-direction:column; gap:.25rem; flex:1; }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

@media (max-width:768px) {
  .desktop-only { display:none; }
  .mobile-list { display:block; }
  .filtros-bar { flex-direction:column; }
  .date-group { width:100%; }
}
</style>
