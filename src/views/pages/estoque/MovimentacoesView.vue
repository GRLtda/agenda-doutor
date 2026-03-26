<script setup>
// MovimentacoesView.vue — Livro-Razão de movimentações (imutável)
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEstoqueStore } from '@/stores/estoque'
import { Search, X, BookOpen, CalendarDays } from 'lucide-vue-next'
import { format } from 'date-fns'
import EstoqueMovimentacaoTipo from '@/components/estoque/EstoqueMovimentacaoTipo.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const store = useEstoqueStore()
const router = useRouter()

const tipo = ref('')
const today = new Date()
const dataInicio = ref(today)
const dataFim = ref(today)
const page = ref(1)

const tipoOptions = [
  { label: 'Todos os tipos', value: '' },
  { label: 'Entrada', value: 'ENTRADA' },
  { label: 'Saída — Uso', value: 'SAIDA_USO' },
  { label: 'Saída — Administrativa', value: 'SAIDA_ADMINISTRATIVA' },
  { label: 'Compensação', value: 'COMPENSACAO' },
]

onMounted(() => carregar())

async function carregar() {
  const params = { page: page.value, limit: 25 }
  if (tipo.value)       params.tipo      = tipo.value
  if (dataInicio.value) params.dataInicio = format(dataInicio.value, 'yyyy-MM-dd')
  if (dataFim.value)    params.dataFim   = format(dataFim.value, 'yyyy-MM-dd')
  await store.fetchMovimentacoes(params)
}

function limpar() {
  tipo.value = ''
  dataInicio.value = null
  dataFim.value = null
  page.value = 1
  carregar()
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

function formatarDataCurta(dateInput) {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  return date.toLocaleDateString('pt-BR')
}

function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return '—'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const temFiltros = computed(() => tipo.value || dataInicio.value || dataFim.value)
const totalPaginas = computed(() => store.movimentacoesMeta?.totalPages || 1)
function irParaPagina(p) { page.value = p; carregar() }

// Remove prefixo USO_ do motivo: USO_PACIENTE → PACIENTE
function formatarMotivo(motivo) {
  if (!motivo) return null
  return motivo.replace(/^USO_/, '')
}

// Navega para o perfil do paciente
function irParaPaciente(id) {
  if (id) router.push({ name: 'detalhes-paciente', params: { id } })
}

// Retorna "#XXXX " com os 4 primeiros chars do atendimentoId
function prefixoAtendimento(atendimentoId) {
  if (!atendimentoId) return ''
  const id = atendimentoId._id ?? atendimentoId
  return `#${String(id).slice(0, 4).toUpperCase()} `
}
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
      <div style="width: 220px">
        <StyledSelect
          v-model="tipo"
          :options="tipoOptions"
          @update:modelValue="carregar()"
        />
      </div>

      <div class="date-group">
        <VueDatePicker
          v-model="dataInicio"
          :enable-time-picker="false"
          locale="pt-BR"
          format="dd/MM/yyyy"
          auto-apply
          :clearable="true"
          :teleport="true"
          @update:modelValue="carregar()"
        >
          <template #trigger>
            <button type="button" class="filter-input date-trigger" title="Data início">
              <span>{{ dataInicio ? formatarDataCurta(dataInicio) : 'De' }}</span>
              <CalendarDays :size="14" class="text-slate-400" />
            </button>
          </template>
        </VueDatePicker>

        <span class="date-sep">→</span>

        <VueDatePicker
          v-model="dataFim"
          :enable-time-picker="false"
          locale="pt-BR"
          format="dd/MM/yyyy"
          auto-apply
          :clearable="true"
          :teleport="true"
          @update:modelValue="carregar()"
        >
          <template #trigger>
            <button type="button" class="filter-input date-trigger" title="Data fim">
              <span>{{ dataFim ? formatarDataCurta(dataFim) : 'Até' }}</span>
              <CalendarDays :size="14" class="text-slate-400" />
            </button>
          </template>
        </VueDatePicker>
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
              <th>Produto / Lote</th>
              <th>Qtd</th>
              <th>Responsável</th>
              <th>Motivo / Paciente</th>
              <th>Origem custo</th>
              <th>Custo unit.</th>
              <th>Custo total</th>
              <th>Consumo</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="store.loadingMovimentacoes && store.movimentacoes.length === 0">
              <tr v-for="n in 8" :key="n" class="skeleton-row">
                <td v-for="c in 10" :key="c"><div class="skeleton" :style="`width:${25+c*7}%`"></div></td>
              </tr>
            </template>

            <template v-else-if="!store.loadingMovimentacoes && store.movimentacoes.length === 0">
              <tr><td colspan="10" class="empty-cell">
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
                <!-- Produto + Lote consolidados numa coluna -->
                <td class="produto-lote-cell">
                  <span class="produto-nome">{{ mov.produto?.nome || mov.produtoId || '—' }}</span>
                  <span class="lote-num">{{ mov.lote?.numeroLote || (mov.loteId && typeof mov.loteId === 'string' ? mov.loteId.slice(-6) : '—') }}</span>
                </td>
                <td class="qtd" :class="mov.tipo === 'ENTRADA' ? 'qtd--entrada' : 'qtd--saida'">
                  {{ mov.tipo === 'ENTRADA' ? '+' : '-' }}{{ mov.quantidade }}
                </td>
                <td>
                  <div class="user-info">
                    <img v-if="mov.fotoUrl" :src="mov.fotoUrl" class="user-avatar" loading="lazy" />
                    <div v-else class="user-avatar-placeholder">{{ mov.usuario?.name?.[0] || '?' }}</div>
                    <span class="name-truncate" :title="mov.usuario?.name">{{ mov.usuario?.name || 'Sistema' }}</span>
                  </div>
                </td>
                <td class="txt-gray">
                  <div class="motivo-cell">
                    <span v-if="mov.motivoSaida" class="motivo-tag">{{ formatarMotivo(mov.motivoSaida) }}</span>
                    <!-- Paciente: link clicável com #ID + nome truncado -->
                    <button
                      v-if="mov.paciente"
                      class="patient-link name-truncate"
                      :title="mov.paciente.name"
                      @click="irParaPaciente(mov.paciente._id || mov.pacienteId)"
                    >
                      {{ prefixoAtendimento(mov.atendimentoId) }}{{ mov.paciente.name }}
                    </button>
                    <span v-else-if="!mov.motivoSaida && mov.tipo !== 'ENTRADA'">—</span>
                    <span v-else-if="mov.tipo === 'ENTRADA'">Entrada de estoque</span>
                    <div v-if="mov.observacao" class="mov-obs" :title="mov.observacao">
                      {{ mov.observacao }}
                    </div>
                  </div>
                </td>
                <td class="txt-gray">{{ mov.origemCusto || '—' }}</td>
                <td class="txt-gray">{{ formatarMoeda(mov.custoUnitario ?? mov.snapshotLote?.custoUnitario) }}</td>
                <td class="txt-gray">{{ formatarMoeda(mov.custoTotal ?? mov.snapshotLote?.custoTotalEstimado) }}</td>
                <!-- Coluna de consumo: snapshot do lote quando existir -->
                <td class="consumo-cell">
                  <div v-if="mov.snapshotLote" class="snapshot-info">
                    <span class="snapshot-produto" :title="mov.snapshotLote.nomeProduto">{{ mov.snapshotLote.nomeProduto }}</span>
                    <span class="snapshot-lote">Lote {{ mov.snapshotLote.numeroLote }}</span>
                  </div>
                  <span v-else class="txt-gray">—</span>
                </td>
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
            <div class="card-header-flex">
              <EstoqueMovimentacaoTipo :tipo="mov.tipo" />
              <span class="txt-gray data-cel-mb">{{ formatarData(mov.createdAt) }}</span>
            </div>
            <span class="produto-nome-mb">{{ mov.produto?.nome || '—' }}</span>
            <span class="lote-num-mb">Lote: {{ mov.lote?.numeroLote || '—' }}</span>
            <div class="card-meta">
              <span class="responsible name-truncate" style="max-width:100px">{{ mov.usuario?.name || 'Sistema' }}</span>
              <!-- Paciente: link clicável com #ID + nome truncado no mobile -->
              <button
                v-if="mov.paciente"
                class="patient name-truncate"
                style="max-width:120px"
                :title="mov.paciente.name"
                @click="irParaPaciente(mov.paciente._id || mov.pacienteId)"
              >
                {{ prefixoAtendimento(mov.atendimentoId) }}{{ mov.paciente.name }}
              </button>
              <span v-else-if="mov.motivoSaida" class="motivo-tag">{{ formatarMotivo(mov.motivoSaida) }}</span>
            </div>
            <div class="txt-gray" style="font-size:.75rem">Origem custo: {{ mov.origemCusto || '—' }}</div>
            <div class="txt-gray" style="font-size:.75rem">Custo: {{ formatarMoeda(mov.custoUnitario ?? mov.snapshotLote?.custoUnitario) }} · Total: {{ formatarMoeda(mov.custoTotal ?? mov.snapshotLote?.custoTotalEstimado) }}</div>
            <!-- Snapshot de consumo no mobile -->
            <div v-if="mov.snapshotLote" class="snapshot-mb">
              <span>{{ mov.snapshotLote.nomeProduto }} · Lote {{ mov.snapshotLote.numeroLote }} · {{ mov.snapshotLote.quantidadeConsumida }} un</span>
            </div>
            <div v-if="mov.observacao" class="mov-obs-mb">{{ mov.observacao }}</div>
          </div>
          <div class="card-right">
            <span class="qtd" :class="mov.tipo === 'ENTRADA' ? 'qtd--entrada' : 'qtd--saida'">
              {{ mov.tipo === 'ENTRADA' ? '+' : '-' }}{{ mov.quantidade }}
            </span>
          </div>
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
    <p class="legenda">Registros não podem ser editados ou excluídos.</p>
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
  height: 40px;
}
.date-group { display:flex; align-items:center; gap:.4rem; flex-wrap:wrap; }
.date-sep { color:#d1d5db; font-size:.85rem; }
.date-trigger { display:inline-flex; align-items:center; gap:.5rem; min-width:160px; justify-content:space-between; }
.date-group :deep(.dp__main) { width:auto; display:inline-flex; }
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

.user-info { display:flex; align-items:center; gap:.65rem; }
.user-avatar { width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid #e5e7eb; }
.user-avatar-placeholder { width:32px; height:32px; border-radius:50%; background:#f3f4f6; color:#9ca3af; display:flex; align-items:center; justify-content:center; font-size:.78rem; font-weight:700; border:1px solid #e5e7eb; }

.name-truncate {
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: inline-block;
}

.produto-lote-cell {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.motivo-cell { display:flex; flex-direction:column; gap:.25rem; }
.motivo-tag { font-size:.68rem; font-weight:700; text-transform:uppercase; color:#6b7280; }

/* Paciente: botão estilizado como link clicável */
.patient-link {
  font-size:.82rem;
  color: var(--azul-principal);
  font-weight: 600;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
  text-align: left;
  font-family: inherit;
  transition: opacity 0.15s;
}
.patient-link:hover { opacity: 0.75; text-decoration: underline; }

/* Coluna de consumo / snapshot */
.consumo-cell { min-width: 140px; }
.snapshot-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.snapshot-produto {
  font-size: .78rem;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 160px;
}
.snapshot-lote {
  font-size: .7rem;
  font-family: monospace;
  background: #f3f4f6;
  padding: 0.1rem 0.35rem;
  border-radius: 0.25rem;
  color: #374151;
  width: fit-content;
}
.snapshot-qtd {
  font-size: .7rem;
  color: #6b7280;
}
.mov-obs {
  font-size: .75rem;
  color: #6b7280;
  font-style: italic;
  margin-top: 2px;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

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
  .date-group { width:100%; flex-wrap:wrap; }
  
  .card-header-flex { display:flex; justify-content:space-between; align-items:center; margin-bottom:.25rem; }
  .data-cel-mb { font-size:.65rem; font-weight:600; text-transform:uppercase; letter-spacing:.02em; }
  .produto-nome-mb { font-weight:700; color:#111827; font-size:.9rem; }
  .lote-num-mb { color:#6b7280; font-size:.75rem; margin-bottom:.4rem; }
  .card-meta { display:flex; gap:.75rem; align-items:center; flex-wrap:wrap; }
  .mov-obs-mb {
    font-size: .7rem;
    color: #6b7280;
    font-style: italic;
    margin-top: 2px;
    border-top: 1px dashed #e5e7eb;
    padding-top: 4px;
  }
  .responsible { font-size:.7rem; color:#9ca3af; font-weight:500; }
  .patient {
    font-size:.7rem;
    color:var(--azul-principal);
    font-weight:600;
    background:none;
    border:none;
    padding:0;
    cursor:pointer;
    font-family:inherit;
  }
  .card-right { display:flex; flex-direction:column; align-items:flex-end; justify-content:center; }
  .snapshot-mb {
    font-size: .68rem;
    color: #6b7280;
    background: #f9fafb;
    border-radius: 0.375rem;
    padding: 0.2rem 0.4rem;
    margin-top: 0.25rem;
    border: 1px solid #f3f4f6;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
