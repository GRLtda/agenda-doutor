<script setup>
// LotesListView.vue — Listagem de lotes com filtros e ações de descarte
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useEstoqueStore } from '@/stores/estoque'
import { useToast } from 'vue-toastification'
import { Layers, Search, X, Plus, Trash2, Eye } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import EstoqueBadgeStatus from '@/components/estoque/EstoqueBadgeStatus.vue'

const store = useEstoqueStore()
const router = useRouter()
const toast = useToast()

const status = ref('')
const vencendo = ref('')
const page = ref(1)

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
  await store.fetchLotes(params)
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

function formatarMoeda(valor) {
  if (valor === null || valor === undefined) return '—'
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const temFiltros = computed(() => status.value || vencendo.value)
const totalPaginas = computed(() => store.lotesMeta?.totalPages || 1)

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

    <!-- Filtros -->
    <div class="filtros-bar">
      <div style="width: 180px">
        <StyledSelect
          v-model="status"
          :options="statusOptions"
          @update:modelValue="carregar()"
        />
      </div>

      <div style="width: 200px">
        <StyledSelect
          v-model="vencendo"
          :options="vencendoOptions"
          @update:modelValue="carregar()"
        />
      </div>

      <button v-if="temFiltros" class="btn-clear" @click="limparFiltros"><X :size="14" /> Limpar</button>
    </div>

    <!-- Tabela -->
    <div class="table-wrapper" :class="{ 'is-loading': store.loadingLotes && store.lotes.length > 0 }">
      <!-- Desktop -->
      <div class="desktop-only table-container">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Nº Lote</th>
              <th>Validade</th>
              <th>Saldo</th>
              <th>Custo unit.</th>
              <th>Custo entrada</th>
              <th>Fornecedor</th>
              <th>NF</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            <template v-if="store.loadingLotes && store.lotes.length === 0">
              <tr v-for="n in 7" :key="n" class="skeleton-row">
                <td v-for="c in 10" :key="c"><div class="skeleton" :style="`width:${30+c*5}%`"></div></td>
              </tr>
            </template>

            <template v-else-if="!store.loadingLotes && store.lotes.length === 0">
              <tr><td colspan="10" class="empty-cell">
                <div class="empty-state">
                  <div class="empty-icon"><Layers :size="28"/></div>
                  <h3>Nenhum lote encontrado</h3>
                  <p>{{ temFiltros ? 'Tente ajustar os filtros.' : 'Registre a primeira entrada de produto.' }}</p>
                </div>
              </td></tr>
            </template>

            <template v-else>
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
                <td class="txt-gray">{{ formatarMoeda(lote.custoUnitario) }}</td>
                <td class="txt-gray">{{ formatarMoeda(lote.custoTotalEntrada) }}</td>
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
            </template>
          </tbody>
        </table>
      </div>

      <!-- Mobile -->
      <div class="mobile-list">
        <template v-if="store.loadingLotes && store.lotes.length === 0">
          <div v-for="n in 5" :key="n" class="lote-card skeleton-card">
            <div class="skeleton" style="width:55%;height:.9rem;margin-bottom:.35rem"></div>
            <div class="skeleton" style="width:35%;height:.75rem"></div>
          </div>
        </template>
        <template v-else>
          <div v-for="lote in store.lotes" :key="lote._id" class="lote-card">
            <div class="lote-card-body">
              <span class="nome">{{ lote.produto?.nome || '—' }}</span>
              <span class="lote-num">{{ lote.numeroLote }}</span>
              <div class="lote-card-row">
                <span class="txt-gray" style="font-size:.78rem">Validade: {{ formatarData(lote.dataValidade) }}</span>
                <EstoqueBadgeStatus :status="lote.status" />
              </div>
              <span class="saldo-cel">Saldo: {{ lote.saldoAtual }}</span>
              <span class="txt-gray" style="font-size:.82rem">Custo unit.: {{ formatarMoeda(lote.custoUnitario) }}</span>
              <span class="txt-gray" style="font-size:.82rem">Entrada: {{ formatarMoeda(lote.custoTotalEntrada) }}</span>
            </div>
            <button v-if="lote.status === 'ATIVO'" class="btn-icon btn-icon--red" @click="descartar(lote._id)">
              <Trash2 :size="16" />
            </button>
          </div>
        </template>
      </div>

      <!-- Paginação -->
      <div v-if="totalPaginas > 1" class="paginacao">
        <button class="btn-pag" :disabled="page <= 1" @click="irParaPagina(page - 1)">← Anterior</button>
        <span class="pag-info">{{ page }} / {{ totalPaginas }}</span>
        <button class="btn-pag" :disabled="page >= totalPaginas" @click="irParaPagina(page + 1)">Próxima →</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.lotes-page { padding: 0; }
.page-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1.5rem; }
.title { font-size:2rem; font-weight:700; margin-bottom:.25rem; }
.subtitle { color:var(--cinza-texto); }

.filtros-bar { display:flex; gap:.75rem; flex-wrap:wrap; margin-bottom:1.5rem; }
.filter-select { padding:.6rem .875rem; border:1.5px solid #e5e7eb; border-radius:.75rem; font-size:.875rem; color:#374151; background:#fff; cursor:pointer; outline:none; }
.btn-clear { display:inline-flex; align-items:center; gap:.35rem; padding:.6rem .875rem; border:1.5px solid #e5e7eb; border-radius:.75rem; font-size:.85rem; font-weight:600; cursor:pointer; background:#fff; color:#6b7280; }
.btn-clear:hover { background:#fee2e2; border-color:#fca5a5; color:#dc2626; }

.table-wrapper { background:#fff; border:1px solid #e5e7eb; border-radius:1rem; overflow:hidden; position:relative; }
.table-wrapper.is-loading { opacity:.55; pointer-events:none; }
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

.skeleton { background:#e5e7eb; border-radius:.4rem; height:.9rem; animation:pulse 1.5s ease infinite; }
.skeleton-row td { padding:.5rem 1.25rem; }

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
</style>
