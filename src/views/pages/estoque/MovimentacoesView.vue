<script setup>
import StockTableList from '@/components/estoque/StockTableList.vue'
import { localDateForApi } from '@/utils/financialDate'
import AppDateRangePicker from '@/components/global/AppDateRangePicker.vue'
// MovimentacoesView.vue — Livro-Razão de movimentações (imutável)
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEstoqueStore } from '@/stores/estoque'
import { BookOpen } from 'lucide-vue-next'
import EstoqueMovimentacaoTipo from '@/components/estoque/EstoqueMovimentacaoTipo.vue'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

const store = useEstoqueStore()
const router = useRouter()

const tipo = ref('')
const dateRange = ref(null)
const dataInicio = computed(() => dateRange.value?.[0] ? localDateForApi(dateRange.value[0]) : '')
const dataFim = computed(() => dateRange.value?.[1] ? localDateForApi(dateRange.value[1]) : '')

function updatePeriod(value) {
  dateRange.value = value
  page.value = 1
  carregar()
}
const page = ref(1)
const listError = ref('')

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
  if (dataInicio.value) params.dataInicio = dataInicio.value
  if (dataFim.value)    params.dataFim   = dataFim.value
  listError.value = ''
  const result = await store.fetchMovimentacoes(params)
  if (!result.success) listError.value = result.error || 'Não foi possível carregar os registros.'
}

function limpar() {
  tipo.value = ''
  dateRange.value = null
  page.value = 1
  carregar()
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}

const temFiltros = computed(() => tipo.value || dataInicio.value || dataFim.value)
function aplicarFiltros() { page.value = 1; carregar() }

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
        <p class="subtitle">Todas as entradas e saídas de estoque.</p>
      </div>
    </header>

    <StockTableList :loading="store.loadingMovimentacoes" :error="listError" :empty="store.movimentacoes.length === 0" empty-title="Nenhuma movimentação encontrada" :empty-text="temFiltros ? 'Tente ajustar os filtros.' : 'As movimentações aparecerão aqui após entradas, saídas e baixas.'" :columns="7" :page="page" :meta="store.movimentacoesMeta" :limit="25" @retry="carregar" @page-change="irParaPagina">
      <template #filters>
    <div class="filtros-bar">
      <div style="width: 220px">
        <StyledSelect
          v-model="tipo"
          :options="tipoOptions"
          @update:modelValue="aplicarFiltros">
          <template #prefix><span class="select-prefix"><BookOpen :size="14" />Tipo:</span></template>
        </StyledSelect>
      </div>

      <AppDateRangePicker :model-value="dateRange" clearable @update:model-value="updatePeriod" />

      <AppButton variant="outline" class="clear-filters" :disabled="!temFiltros" @click="limpar">Limpar</AppButton>
    </div>
      </template>
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
              <th>Consumo</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>

              <tr v-for="mov in store.movimentacoes" :key="mov._id" class="mov-row">
                <td><EstoqueMovimentacaoTipo :tipo="mov.tipo" /></td>
                <!-- Produto + Lote consolidados numa coluna -->
                <td><div class="produto-lote-cell">
                  <span class="produto-nome">{{ mov.produto?.nome || mov.produtoId || '—' }}</span>
                  <span class="lote-num">{{ mov.lote?.numeroLote || (mov.loteId && typeof mov.loteId === 'string' ? mov.loteId.slice(-6) : '—') }}</span>
                </div></td>
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

          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="mobile-list">

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

      </div>

    </StockTableList>

    <!-- Nota legenda -->
    <p class="legenda">Registros não podem ser editados ou excluídos.</p>
  </div>
</template>

<style scoped>
.mov-page { height: 100%; min-height: 0; min-width: 0; display: flex; flex-direction: column; }
.page-header { flex-shrink: 0; margin-bottom:1rem; }
.title { font-size: 2rem; font-weight: 700; margin-bottom: .25rem; }
.subtitle { color: var(--cinza-texto); }

.filtros-bar { display:flex; gap:.75rem; flex-wrap:wrap; margin-bottom:1rem; align-items:center; }
.filter-select {
  padding:.6rem .875rem; border:1.5px solid #e5e7eb; border-radius:.75rem;
  font-size:.875rem; color:#374151; background:#fff; cursor:pointer; outline:none;
}

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

.legenda { margin-top: 1rem; font-size:.8rem; color:#9ca3af; text-align:center; }

.mobile-list { display:none; }
.mov-card { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid #f3f4f6; gap:.75rem; }
.mov-card:last-child { border:none; }
.mov-card-body { display:flex; flex-direction:column; gap:.25rem; flex:1; }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

@media (max-width:768px) {
  .desktop-only { display:none; }
  .mobile-list { display:block; }
  .filtros-bar { flex-direction:column; }

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
.clear-filters { width: 88px; min-width: 88px; }
@media (max-width: 768px) { .title { font-size: 1.5rem; } .subtitle { font-size: .8125rem; } }
</style>
