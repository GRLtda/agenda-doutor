<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import { 
  Plus, Search, X, Calendar, User, Tag, 
  DollarSign, Activity, SlidersHorizontal, 
  Pencil, Trash2, ArrowDownCircle, Users 
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import AppPagination from '@/components/global/AppPagination.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import AppDropdownActions from '@/components/global/AppDropdownActions.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import FinanceiroStatusBadge from '@/components/financeiro/FinanceiroStatusBadge.vue'
import FinanceiroContaDrawer from '@/components/financeiro/FinanceiroContaDrawer.vue'
import FinanceiroBaixaDrawer from '@/components/financeiro/FinanceiroBaixaDrawer.vue'
import FinanceSummaryCard from '@/components/financeiro/FinanceSummaryCard.vue'
import { useFinanceiroStore } from '@/stores/financeiro'

const props = defineProps({
  tipo: {
    type: String,
    required: true,
  },
})

const toast = useToast()
const financeiroStore = useFinanceiroStore()

const filters = reactive({
  status: '',
  search: '',
  dueStart: '',
  dueEnd: '',
  page: 1,
  limit: 20,
  sort: 'dueDate',
})

const showContaDrawer = ref(false)
const showBaixaDrawer = ref(false)
const editingConta = ref(null)
const selectedConta = ref(null)

const isReceivable = computed(() => props.tipo === 'RECEIVABLE')
const pageTitle = computed(() => isReceivable.value ? 'Contas a receber' : 'Contas a pagar')
const pageSubtitle = computed(() => isReceivable.value
  ? 'Controle pagamentos de pacientes, convenios e receitas manuais.'
  : 'Controle fornecedores, despesas e vencimentos da clinica.'
)
const addLabel = computed(() => isReceivable.value ? 'Nova conta' : 'Nova despesa')
const partyLabel = computed(() => isReceivable.value ? 'Paciente/Convenio' : 'Fornecedor')
const drawerCategorias = computed(() => isReceivable.value
  ? financeiroStore.categoriasReceita
  : financeiroStore.categoriasDespesa
)

const statusOptions = [
  { label: 'Todos os status', value: '' },
  { label: 'Aberta', value: 'OPEN' },
  { label: 'Parcial', value: 'PARTIAL' },
  { label: 'Paga', value: 'PAID' },
  { label: 'Atrasada', value: 'OVERDUE' },
  { label: 'Cancelada', value: 'CANCELED' },
]

const summary = computed(() => {
  const total = financeiroStore.contas.reduce((sum, item) => sum + Number(item.amountCents || 0), 0)
  const open = financeiroStore.contas.reduce((sum, item) => sum + Number(item.remainingAmountCents || 0), 0)
  const overdue = financeiroStore.contas
    .filter((item) => item.status === 'OVERDUE')
    .reduce((sum, item) => sum + Number(item.remainingAmountCents || 0), 0)
  const today = new Date().toISOString().slice(0, 10)
  const dueToday = financeiroStore.contas
    .filter((item) => dateOnly(item.dueDate) === today && Number(item.remainingAmountCents || 0) > 0)
    .reduce((sum, item) => sum + Number(item.remainingAmountCents || 0), 0)
  return { total, open, overdue, dueToday }
})

function money(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(cents || 0) / 100)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

function dateOnly(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toISOString().slice(0, 10)
}

function load() {
  const params = {
    type: props.tipo,
    page: String(filters.page),
    limit: String(filters.limit),
    sort: filters.sort,
  }
  if (filters.status) params.status = filters.status
  if (filters.search) params.search = filters.search
  if (filters.dueStart) params.dueStart = filters.dueStart
  if (filters.dueEnd) params.dueEnd = filters.dueEnd
  financeiroStore.fetchContas(params)
}

function applyFilters() {
  filters.page = 1
  load()
}

function clearFilters() {
  filters.status = ''
  filters.search = ''
  filters.dueStart = ''
  filters.dueEnd = ''
  applyFilters()
}

function openCreate() {
  editingConta.value = null
  showContaDrawer.value = true
}

function openEdit(conta) {
  editingConta.value = conta
  showContaDrawer.value = true
}

function openBaixa(conta) {
  selectedConta.value = conta
  showBaixaDrawer.value = true
}

async function saveConta(payload) {
  const result = editingConta.value
    ? await financeiroStore.updateConta(editingConta.value._id, payload)
    : await financeiroStore.createConta(payload)
  if (!result.success) {
    toast.error(result.error)
    return
  }
  toast.success(editingConta.value ? 'Conta atualizada.' : 'Conta criada.')
  showContaDrawer.value = false
  editingConta.value = null
  load()
}

async function saveBaixa(payload) {
  if (!selectedConta.value?._id) return
  const result = await financeiroStore.registrarBaixa(selectedConta.value._id, payload)
  if (!result.success) {
    toast.error(result.error)
    return
  }
  toast.success(isReceivable.value ? 'Recebimento registrado.' : 'Pagamento registrado.')
  showBaixaDrawer.value = false
  selectedConta.value = null
  load()
}

async function removeConta(conta) {
  if (!window.confirm('Deseja cancelar esta conta?')) return
  const result = await financeiroStore.deleteConta(conta._id)
  if (!result.success) {
    toast.error(result.error)
    return
  }
  toast.success('Conta cancelada.')
  load()
}

function changePage(page) {
  filters.page = page
  load()
}

watch(() => props.tipo, () => {
  filters.page = 1
  clearFilters()
  financeiroStore.fetchCategorias({ active: 'true' })
})

onMounted(() => {
  financeiroStore.fetchCategorias({ active: 'true' })
  load()
})
</script>

<template>
  <div class="finance-page">
    <div class="page-header">
      <div>
        <h1 class="title">{{ pageTitle }}</h1>
        <p class="subtitle">{{ pageSubtitle }}</p>
      </div>
      <div class="header-actions">
        <AppButton to="/financeiro" variant="outline" size="sm">Resumo</AppButton>
        <AppButton variant="primary" size="sm" @click="openCreate">
          <Plus :size="16" />
          {{ addLabel }}
        </AppButton>
      </div>
    </div>

    <div class="summary-grid">
      <FinanceSummaryCard
        :label="isReceivable ? 'Total a receber' : 'Total a pagar'"
        :value="money(summary.total)"
      />
      <FinanceSummaryCard
        label="Em aberto"
        :value="money(summary.open)"
      />
      <FinanceSummaryCard
        :label="isReceivable ? 'Atrasado' : 'Vencido'"
        :value="money(summary.overdue)"
        value-color="red"
      />
      <FinanceSummaryCard
        label="Vence hoje"
        :value="money(summary.dueToday)"
      />
    </div>

    <div class="filtros-bar">
      <StyledSelect
        v-model="filters.status"
        :options="statusOptions"
        placeholder="Todos os status"
        @update:model-value="applyFilters"
      />
      <div class="search-box">
        <Search :size="16" />
        <input
          v-model="filters.search"
          type="search"
          :placeholder="isReceivable ? 'Busque por paciente ou titulo' : 'Busque por fornecedor ou titulo'"
          @keydown.enter="applyFilters"
        />
      </div>
      <input v-model="filters.dueStart" class="date-filter" type="date" @change="applyFilters" />
      <input v-model="filters.dueEnd" class="date-filter" type="date" @change="applyFilters" />
      <button class="btn-clear" type="button" @click="clearFilters">
        <X :size="16" />
        Limpar
      </button>
    </div>

    <div class="table-wrapper" :class="{ 'is-loading': financeiroStore.loadingContas && financeiroStore.contas.length > 0 }">
      <div class="table-container desktop-only">
        <table>
          <thead>
            <tr>
              <th>
                <div class="th-content">
                  <Calendar :size="14" />
                  <span>Vencimento</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <User :size="14" />
                  <span>{{ partyLabel }}</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <Tag :size="14" />
                  <span>Categoria</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <DollarSign :size="14" />
                  <span>Valor</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <DollarSign :size="14" />
                  <span>Saldo</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <Activity :size="14" />
                  <span>Status</span>
                </div>
              </th>
              <th class="actions-header">
                <div class="th-content">
                  <SlidersHorizontal :size="14" />
                  <span>Ações</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="financeiroStore.loadingContas && financeiroStore.contas.length === 0">
              <tr v-for="n in 5" :key="`skel-${n}`" class="skeleton-row">
                <td><AppSkeleton width="80%" /></td>
                <td>
                  <AppSkeleton width="90%" height="1rem" style="margin-bottom: 4px;" />
                  <AppSkeleton width="60%" height="10px" />
                </td>
                <td><AppSkeleton width="70%" /></td>
                <td><AppSkeleton width="50%" /></td>
                <td><AppSkeleton width="50%" /></td>
                <td><AppSkeleton width="80%" height="24px" border-radius="12px" /></td>
                <td class="actions-cell"><AppSkeleton width="36px" height="36px" border-radius="50%" class="ml-auto" /></td>
              </tr>
            </template>
            <template v-else-if="!financeiroStore.loadingContas && financeiroStore.contas.length === 0">
              <tr>
                <td colspan="7" class="p-0 border-0">
                  <AppEmptyState
                    title="Nenhuma conta encontrada"
                    text="Não há registros que correspondam aos filtros atuais."
                    :icon="Users"
                  />
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="conta in financeiroStore.contas" :key="conta._id" class="table-row">
                <td class="whitespace-nowrap">{{ formatDate(conta.dueDate) }}</td>
                <td>
                  <div class="party-cell">
                    <strong>{{ conta.party?.name || '-' }}</strong>
                    <span>{{ conta.title }}</span>
                  </div>
                </td>
                <td class="whitespace-nowrap">{{ conta.categoryId?.name || 'Sem categoria' }}</td>
                <td class="whitespace-nowrap font-medium">{{ money(conta.amountCents) }}</td>
                <td class="whitespace-nowrap font-semibold" :class="conta.remainingAmountCents > 0 ? (isReceivable ? 'text-emerald-600' : 'text-red-600') : 'text-slate-500'">{{ money(conta.remainingAmountCents) }}</td>
                <td><FinanceiroStatusBadge :status="conta.status" /></td>
                <td class="actions-cell" @click.stop>
                  <AppDropdownActions>
                    <template #default="{ close }">
                      <button
                        v-if="conta.remainingAmountCents > 0 && conta.status !== 'CANCELED'"
                        @click.stop="openBaixa(conta); close()"
                        class="dropdown-item"
                      >
                        <ArrowDownCircle :size="14" /> Baixar
                      </button>
                      <button @click.stop="openEdit(conta); close()" class="dropdown-item">
                        <Pencil :size="14" /> Editar
                      </button>
                      <button
                        v-if="conta.paidAmountCents <= 0 && conta.status !== 'CANCELED'"
                        @click.stop="removeConta(conta); close()"
                        class="dropdown-item delete"
                      >
                        <Trash2 :size="14" /> Excluir
                      </button>
                    </template>
                  </AppDropdownActions>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="mobile-list" v-auto-animate>
        <template v-if="financeiroStore.loadingContas && financeiroStore.contas.length === 0">
           <div v-for="n in 3" :key="`skel-mob-${n}`" class="mobile-card skeleton-card">
              <AppSkeleton width="60%" style="margin-bottom: 8px;" />
              <AppSkeleton width="40%" />
           </div>
        </template>
        <template v-else-if="financeiroStore.contas.length > 0">
          <article v-for="conta in financeiroStore.contas" :key="conta._id" class="mobile-card">
            <div class="mobile-card-header">
              <div>
                <strong>{{ conta.party?.name || '-' }}</strong>
                <span>{{ conta.title }}</span>
              </div>
              <div class="flex items-center gap-2">
                <FinanceiroStatusBadge :status="conta.status" />
                <AppDropdownActions>
                  <template #default="{ close }">
                    <button v-if="conta.remainingAmountCents > 0 && conta.status !== 'CANCELED'" @click.stop="openBaixa(conta); close()" class="dropdown-item">
                      <ArrowDownCircle :size="14" /> Baixar
                    </button>
                    <button @click.stop="openEdit(conta); close()" class="dropdown-item">
                      <Pencil :size="14" /> Editar
                    </button>
                    <button v-if="conta.paidAmountCents <= 0 && conta.status !== 'CANCELED'" @click.stop="removeConta(conta); close()" class="dropdown-item delete">
                      <Trash2 :size="14" /> Excluir
                    </button>
                  </template>
                </AppDropdownActions>
              </div>
            </div>
            <div class="mobile-card-grid">
              <span>Vencimento <strong>{{ formatDate(conta.dueDate) }}</strong></span>
              <span>Valor <strong>{{ money(conta.amountCents) }}</strong></span>
              <span>Saldo <strong :class="conta.remainingAmountCents > 0 ? (isReceivable ? 'text-emerald-600' : 'text-red-600') : 'text-slate-500'">{{ money(conta.remainingAmountCents) }}</strong></span>
              <span>Categoria <strong>{{ conta.categoryId?.name || 'Sem categoria' }}</strong></span>
            </div>
          </article>
        </template>
        <div v-if="!financeiroStore.loadingContas && financeiroStore.contas.length === 0">
           <AppEmptyState
             title="Nenhuma conta encontrada"
             text="Não há registros que correspondam aos filtros atuais."
             :icon="Users"
           />
        </div>
      </div>
    </div>

    <AppPagination
      v-if="financeiroStore.contasMeta.total > 0"
      :current-page="financeiroStore.contasMeta.page"
      :total-pages="financeiroStore.contasMeta.totalPages"
      :total-items="financeiroStore.contasMeta.total"
      :limit="financeiroStore.contasMeta.limit"
      @page-change="changePage"
    />

    <FinanceiroContaDrawer
      v-if="showContaDrawer"
      :tipo="tipo"
      :conta="editingConta"
      :categorias="drawerCategorias"
      :loading="financeiroStore.loadingAcao"
      @close="showContaDrawer = false"
      @save="saveConta"
    />

    <FinanceiroBaixaDrawer
      v-if="showBaixaDrawer && selectedConta"
      :conta="selectedConta"
      :loading="financeiroStore.loadingAcao"
      @close="showBaixaDrawer = false"
      @save="saveBaixa"
    />
  </div>
</template>

<style scoped>
.finance-page { display:flex; flex-direction:column; gap:1.5rem; }
.page-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; }
.title { margin:0; font-family:var(--fonte-titulo); font-size:1.75rem; font-weight:700; color:var(--preto); }
.subtitle { margin:.35rem 0 0; color:#64748b; font-size:.95rem; max-width:680px; }
.header-actions { display:flex; gap:.75rem; flex-wrap:wrap; }
.summary-grid { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:1rem; }
.filtros-bar { display:flex; gap:.75rem; flex-wrap:wrap; align-items:flex-end; }
.filtros-bar :deep(.form-group) { min-width:180px; }
.search-box { display:flex; align-items:center; gap:.5rem; min-height:44px; min-width:280px; flex:1; padding:0 .85rem; border:1px solid #e5e7eb; border-radius:.5rem; background:#fff; color:#64748b; }
.search-box input { width:100%; border:0; outline:0; background:transparent; color:#111827; font-size:.95rem; }
.date-filter { min-height:44px; padding:0 .85rem; border:1px solid #e5e7eb; border-radius:.5rem; background:#fff; color:#111827; outline:0; }
.btn-clear { display:inline-flex; align-items:center; justify-content:center; gap:.4rem; min-height:44px; padding:0 .85rem; border:1px solid #e5e7eb; border-radius:.5rem; background:#fff; color:#64748b; font-weight:600; cursor:pointer; }
.table-wrapper {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
  position: relative;
}
.table-wrapper.is-loading {
  opacity: 0.5;
  pointer-events: none;
}
.table-container {
  overflow-x: auto;
  min-height: 40vh;
}
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
th.actions-header {
  width: 100px;
}
th.actions-header .th-content {
  justify-content: flex-end;
}
.table-row {
  transition: background-color 0.2s ease;
}
.table-row:hover td {
  background-color: #f9fafb;
}

.party-cell { display:flex; flex-direction:column; gap:.2rem; white-space: normal; min-width: 200px; }
.party-cell strong { color:#111827; font-size: 0.95rem; font-weight: 600; }
.party-cell span { color:#64748b; font-size:.85rem; }

/* Actions Menu */
.actions-cell {
  text-align: right;
}

/* Desktop Only & Mobile List */
.desktop-only { display: block; }
.mobile-list { display: none; }
.mobile-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background-color: var(--branco);
  overflow: visible;
}
.mobile-card-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}
.mobile-card-header div { display: flex; flex-direction: column; gap: 0.25rem; }
.mobile-card-header strong { color: #111827; font-size: 0.95rem; font-weight: 600; }
.mobile-card-header span { color: #64748b; font-size: 0.86rem; }
.mobile-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.mobile-card-grid span { display: flex; flex-direction: column; color: #64748b; font-size: 0.8rem; gap: 0.2rem; }
.mobile-card-grid strong { font-size: 0.9rem; font-weight: 600; }

.whitespace-nowrap { white-space: nowrap; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.text-emerald-600 { color: #059669; }
.text-red-600 { color: #dc2626; }
.text-slate-500 { color: #64748b; }
.ml-auto { margin-left: auto; }
.p-0 { padding: 0 !important; }
.border-0 { border: 0 !important; }

@media (max-width: 1100px) {
  .summary-grid { grid-template-columns:repeat(2, minmax(0,1fr)); }
}
@media (max-width: 768px) {
  .table-wrapper { border: none; background-color: transparent; border-radius: 0; overflow: visible; }
  .table-container { display:none; }
  .mobile-list { display:flex; flex-direction:column; gap: 0.75rem; overflow: visible; }
  .summary-grid { grid-template-columns:1fr; }
  .search-box, .date-filter, .filtros-bar :deep(.form-group), .btn-clear { width:100%; min-width:0; }
}
</style>
