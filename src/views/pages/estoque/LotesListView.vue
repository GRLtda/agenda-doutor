<script setup>
import StockTableList from '@/components/estoque/StockTableList.vue'
// LotesListView.vue — Listagem de lotes com filtros e ações de descarte
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEstoqueStore } from '@/stores/estoque'
import { useToast } from 'vue-toastification'
import { Trash2, Eye, CircleCheck, Calendar } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import EstoqueBadgeStatus from '@/components/estoque/EstoqueBadgeStatus.vue'

const store = useEstoqueStore()
const router = useRouter()
const toast = useToast()

const status = ref('')
const vencendo = ref('')
const page = ref(1)
const listError = ref('')

const statusOptions = [
  { label: 'Todos os status', value: '' },
  { label: 'Ativos', value: 'ATIVO' },
  { label: 'Vencidos', value: 'VENCIDO' },
  { label: 'Zerados', value: 'ZERADO' },
  { label: 'Descartados', value: 'DESCARTADO' },
]

const vencendoOptions = [
  { label: 'Qualquer validade', value: '' },
  { label: 'Vencendo em 30 dias', value: '30' },
  { label: 'Vencendo em 60 dias', value: '60' },
  { label: 'Vencendo em 90 dias', value: '90' },
]

onMounted(() => carregar())

async function carregar() {
  const params = { page: page.value, limit: 25 }
  if (status.value) params.status = status.value
  if (vencendo.value) params.vencendoEmDias = vencendo.value
  listError.value = ''
  const result = await store.fetchLotes(params)
  if (!result.success) listError.value = result.error || 'Não foi possível carregar os registros.'
}

function limparFiltros() {
  status.value = ''
  vencendo.value = ''
  page.value = 1
  carregar()
}

async function descartar(loteId) {
  if (!confirm('Descartar este lote? O saldo restante será zerado.')) return
  const res = await store.descartarLote(loteId)
  if (res.success) toast.success('Lote descartado.')
  else toast.error(res.error)
}

function verProduto(produtoId) {
  router.push({ name: 'estoque-produto-detalhe', params: { id: produtoId } })
}

function formatarData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function diasAteVencer(iso) {
  if (!iso) return null
  const diff = Math.ceil((new Date(iso) - Date.now()) / (1000 * 60 * 60 * 24))
  return diff
}

const temFiltros = computed(() => status.value || vencendo.value)

function aplicarFiltros() { page.value = 1; carregar() }

function irParaPagina(p) { page.value = p; carregar() }
</script>

<template>
  <div class="lotes-page">
    <header class="page-header">
      <div>
        <h1 class="title">Lotes</h1>
        <p class="subtitle">Estoque físico por lote/validade (política FEFO).</p>
      </div>
    </header>

    <StockTableList :loading="store.loadingLotes" :error="listError" :empty="store.lotes.length === 0" empty-title="Nenhum lote encontrado" :empty-text="temFiltros ? 'Tente ajustar os filtros.' : 'Registre a primeira entrada de produto.'" :columns="8" :page="page" :meta="store.lotesMeta" :limit="25" @retry="carregar" @page-change="irParaPagina">
      <template #filters>
    <div class="filtros-bar">
      <div style="width: 220px">
        <StyledSelect
          v-model="status"
          :options="statusOptions"
          @update:modelValue="aplicarFiltros">
          <template #prefix><span class="select-prefix"><CircleCheck :size="14" />Status:</span></template>
        </StyledSelect>
      </div>

      <div style="width: 270px">
        <StyledSelect
          v-model="vencendo"
          :options="vencendoOptions"
          @update:modelValue="aplicarFiltros">
          <template #prefix><span class="select-prefix"><Calendar :size="14" />Validade:</span></template>
        </StyledSelect>
      </div>

      <AppButton variant="outline" class="clear-filters" :disabled="!temFiltros" @click="limparFiltros">Limpar</AppButton>
    </div>
      </template>
      <!-- Desktop -->
      <div class="desktop-only table-container">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Nº Lote</th>
              <th>Validade</th>
              <th>Saldo</th>
              <th>Fornecedor</th>
              <th>NF</th>
              <th>Status</th>
              <th class="actions-header">Ações</th>
            </tr>
          </thead>
          <tbody>

              <tr
                v-for="lote in store.lotes" :key="lote._id"
                class="lote-row"
                :class="{ 'row--vencido': lote.status === 'VENCIDO', 'row--alerta': diasAteVencer(lote.dataValidade) !== null && diasAteVencer(lote.dataValidade) <= 30 && lote.status === 'ATIVO' }"
              >
                <td>
                  <button class="btn-link" @click="verProduto(lote.produto?._id || lote.produtoId)">
                    {{ lote.produto?.nome || '—' }}
                  </button>
                </td>
                <td class="lote-num">{{ lote.numeroLote }}</td>
                <td :class="{ 'txt-red': lote.status === 'VENCIDO' }">
                  {{ formatarData(lote.dataValidade) }}
                  <span v-if="lote.status === 'ATIVO' && diasAteVencer(lote.dataValidade) !== null && diasAteVencer(lote.dataValidade) <= 30" class="dias-badge">
                    {{ diasAteVencer(lote.dataValidade) }}d
                  </span>
                </td>
                <td class="saldo-cel">{{ lote.saldoAtual }}</td>
                <td class="txt-gray">{{ lote.fornecedor || '—' }}</td>
                <td class="txt-gray">{{ lote.notaFiscal || '—' }}</td>
                <td><EstoqueBadgeStatus :status="lote.status" /></td>
                <td class="actions-cel">
                  <div class="actions-row">
                    <button class="btn-icon" @click="verProduto(lote.produto?._id || lote.produtoId)" title="Ver produto">
                      <Eye :size="15" />
                    </button>
                    <button v-if="lote.status === 'ATIVO'" class="btn-icon btn-icon--red" @click="descartar(lote._id)" title="Descartar">
                      <Trash2 :size="15" />
                    </button>
                  </div>
                </td>
              </tr>

          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="mobile-list">

          <div v-for="lote in store.lotes" :key="lote._id" class="lote-card">
            <div class="lote-card-body">
              <span class="nome">{{ lote.produto?.nome || '—' }}</span>
              <span class="lote-num">{{ lote.numeroLote }}</span>
              <div class="lote-card-row">
                <span class="txt-gray" style="font-size:.78rem">Validade: {{ formatarData(lote.dataValidade) }}</span>
                <EstoqueBadgeStatus :status="lote.status" />
              </div>
              <span class="saldo-cel">Saldo: {{ lote.saldoAtual }}</span>
            </div>
            <button v-if="lote.status === 'ATIVO'" class="btn-icon btn-icon--red" @click="descartar(lote._id)">
              <Trash2 :size="16" />
            </button>
          </div>

      </div>

    </StockTableList>
  </div>
</template>

<style scoped>
.lotes-page { height: 100%; min-height: 0; min-width: 0; display: flex; flex-direction: column; }
.page-header { flex-shrink: 0; display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1rem; }
.title { font-size:2rem; font-weight:700; margin-bottom:.25rem; }
.subtitle { color:var(--cinza-texto); }

.filtros-bar { display:flex; gap:.75rem; flex-wrap:wrap; margin-bottom:1rem; }
.filter-select { padding:.6rem .875rem; border:1.5px solid #e5e7eb; border-radius:.75rem; font-size:.875rem; color:#374151; background:#fff; cursor:pointer; outline:none; }

.table-container { overflow-x:auto; }
table { width:100%; border-collapse:collapse; }
th, td { padding:.875rem 1.25rem; text-align:left; border-bottom:1px solid #e5e7eb; vertical-align:middle; font-size:.875rem; }
tbody tr:last-child td { border-bottom:none; }
th { background:#f9fafb; color:#6b7280; font-size:.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.04em; }

.lote-row { transition:background .1s; }
.lote-row:hover td { background:#f9fafb; }
.row--vencido td { background:#fff5f5; }
.row--alerta td { background:#fffbeb; }

.lote-num { font-weight:700; color:#111827; }
.saldo-cel { font-weight:700; color:#059669; }
.txt-gray { color:#9ca3af; }
.txt-red { color:#dc2626; font-weight:600; }

.dias-badge {
  display:inline-block; margin-left:.4rem;
  padding:.1rem .4rem; background:#fef9c3; color:#92400e;
  border-radius:.35rem; font-size:.7rem; font-weight:700;
}

.actions-row { display:flex; align-items:center; gap:.25rem; }
.btn-icon { background:none; border:none; cursor:pointer; padding:.35rem; border-radius:.4rem; color:#6b7280; display:flex; align-items:center; }
.btn-icon:hover { background:#f3f4f6; }
.btn-icon--red:hover { background:#fee2e2; color:#dc2626; }

.btn-link { background:none; border:none; cursor:pointer; color:var(--azul-principal); font-weight:600; font-size:.875rem; text-align:left; padding:0; }
.btn-link:hover { text-decoration:underline; }

.mobile-list { display:none; }
.lote-card { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid #f3f4f6; gap:.75rem; }
.lote-card:last-child { border:none; }
.lote-card-body { display:flex; flex-direction:column; gap:.25rem; flex:1; }
.lote-card-row { display:flex; align-items:center; gap:.5rem; flex-wrap:wrap; }
.nome { font-weight:700; color:#111827; font-size:.9rem; }

@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }

@media (max-width:768px) {
  .desktop-only { display:none; }
  .mobile-list { display:block; }
  .filtros-bar { flex-direction:column; }
}
.clear-filters { width: 88px; min-width: 88px; }
@media (max-width: 768px) { .title { font-size: 1.5rem; } .subtitle { font-size: .8125rem; } }
</style>
