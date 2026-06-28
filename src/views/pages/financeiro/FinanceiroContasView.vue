<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useToast } from 'vue-toastification'
import {
  AlertTriangle,
  ArrowDownCircle,
  Ban,
  CheckCircle2,
  CircleDashed,
  Clock3,
  CalendarDays,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  Users,
  X,
} from 'lucide-vue-next'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import AppButton from '@/components/global/AppButton.vue'
import AppPagination from '@/components/global/AppPagination.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import SearchableSelect from '@/components/global/SearchableSelect.vue'
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import AppDropdownActions from '@/components/global/AppDropdownActions.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import FinanceiroContaDrawer from '@/components/financeiro/FinanceiroContaDrawer.vue'
import FinanceiroBaixaDrawer from '@/components/financeiro/FinanceiroBaixaDrawer.vue'
import FinanceSummaryCard from '@/components/financeiro/FinanceSummaryCard.vue'
import { useFinanceiroStore } from '@/stores/financeiro'
import { usePatientsStore } from '@/stores/patients'

const props = defineProps({
  tipo: {
    type: String,
    required: true,
  },
})

const toast = useToast()
const financeiroStore = useFinanceiroStore()
const patientsStore = usePatientsStore()

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
const selectedPatientId = ref(null)
const patientSearchQuery = ref('')
const dateRange = ref([startOfMonthDate(), endOfMonthDate()])
let patientSearchTimeout = null
let accountSearchTimeout = null

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
  { label: 'Todos os status', value: '', icon: SlidersHorizontal },
  { label: 'Aberta', value: 'OPEN', icon: CircleDashed },
  { label: 'Parcial', value: 'PARTIAL', icon: Clock3 },
  { label: 'Paga', value: 'PAID', icon: CheckCircle2 },
  { label: 'Atrasada', value: 'OVERDUE', icon: AlertTriangle },
  { label: 'Cancelada', value: 'CANCELED', icon: Ban },
]

const patientOptions = computed(() => {
  const source =
    patientSearchQuery.value.trim().length > 0
      ? patientsStore.searchResults
      : patientsStore.allPatients.slice(0, 5)
  return (source || []).map((patient) => ({
    value: patient._id,
    label: patient.name,
    image: patient.profilePhotoUrl,
  }))
})

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

const summaryCards = computed(() => [
  {
    key: 'total',
    label: isReceivable.value ? 'Valor previsto' : 'Despesas previstas',
    value: money(summary.value.total),
    sparkline: buildSparkline(summary.value.total, [0.56, 0.62, 0.6, 0.72, 0.7, 0.82, 0.78, 0.92]),
    sparklineTone: isReceivable.value ? 'green' : 'red',
  },
  {
    key: 'open',
    label: 'Em aberto',
    value: money(summary.value.open),
    subtext: 'Saldo pendente',
    sparkline: buildSparkline(summary.value.open, [0.72, 0.7, 0.78, 0.76, 0.84, 0.82, 0.9, 0.88]),
    sparklineTone: isReceivable.value ? 'green' : 'red',
  },
  {
    key: 'overdue',
    label: isReceivable.value ? 'Recebimentos vencidos' : 'Pagamentos vencidos',
    value: money(summary.value.overdue),
    valueColor: 'red',
    sparkline: buildSparkline(summary.value.overdue, [0.38, 0.52, 0.46, 0.62, 0.58, 0.7, 0.66, 0.74]),
    sparklineTone: 'red',
  },
  {
    key: 'today',
    label: 'Vence hoje',
    value: money(summary.value.dueToday),
    subtext: 'Atenção do dia',
    sparkline: buildSparkline(summary.value.dueToday, [0.5, 0.55, 0.52, 0.6, 0.58, 0.66, 0.62, 0.7]),
    sparklineTone: 'slate',
  },
])

const statusConfigMap = {
  OPEN: { icon: CircleDashed, label: 'Aberta', className: 'status-pill--open' },
  PARTIAL: { icon: Clock3, label: 'Parcial', className: 'status-pill--partial' },
  PAID: { icon: CheckCircle2, label: 'Paga', className: 'status-pill--paid' },
  OVERDUE: { icon: AlertTriangle, label: 'Atrasada', className: 'status-pill--overdue' },
  CANCELED: { icon: Ban, label: 'Cancelada', className: 'status-pill--canceled' },
}

const statusConfig = (status) => statusConfigMap[status] || statusConfigMap.OPEN

function startOfMonthDate() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonthDate() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

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

function formatDateDisplay(dateInput) {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('pt-BR')
}

function formatDateForApi(dateInput) {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildSparkline(value, multipliers) {
  const base = Math.max(Math.abs(Number(value || 0)), 1)
  return multipliers.map((multiplier, index) => Math.round(base * multiplier + index))
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

function onRangeChange(value) {
  if (!Array.isArray(value) || value.length < 2 || !value[0] || !value[1]) return
  dateRange.value = value
  filters.dueStart = formatDateForApi(value[0])
  filters.dueEnd = formatDateForApi(value[1])
  applyFilters()
}

function handlePatientSearch(query) {
  patientSearchQuery.value = query || ''
  filters.search = query || ''
  selectedPatientId.value = null

  clearTimeout(accountSearchTimeout)
  accountSearchTimeout = setTimeout(() => {
    applyFilters()
  }, 360)

  if (!query) {
    selectedPatientId.value = null
    if (patientsStore.allPatients.length === 0 && !patientsStore.isLoading) {
      patientsStore.fetchAllPatients(1, 100)
    }
    return
  }

  clearTimeout(patientSearchTimeout)
  patientSearchTimeout = setTimeout(() => {
    patientsStore.searchPatients(query)
  }, 300)
}

function handleTextSearch() {
  clearTimeout(accountSearchTimeout)
  accountSearchTimeout = setTimeout(() => {
    applyFilters()
  }, 300)
}

function clearFilters() {
  filters.status = ''
  filters.search = ''
  selectedPatientId.value = null
  patientSearchQuery.value = ''
  dateRange.value = [startOfMonthDate(), endOfMonthDate()]
  filters.dueStart = formatDateForApi(dateRange.value[0])
  filters.dueEnd = formatDateForApi(dateRange.value[1])
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

watch(selectedPatientId, (patientId) => {
  if (!patientId) return
  const selected = patientOptions.value.find((option) => option.value === patientId)
  filters.search = selected?.label || ''
  patientSearchQuery.value = selected?.label || ''
  applyFilters()
})

onMounted(() => {
  financeiroStore.fetchCategorias({ active: 'true' })
  filters.dueStart = formatDateForApi(dateRange.value[0])
  filters.dueEnd = formatDateForApi(dateRange.value[1])
  if (isReceivable.value) {
    patientsStore.fetchAllPatients(1, 100)
  }
  load()
})
</script>

<template>
  <div class="finance-page">
    <div class="page-header">
      <div class="page-copy">
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
        v-for="card in summaryCards"
        :key="card.key"
        :label="card.label"
        :value="card.value"
        :subtext="card.subtext"
        :value-color="card.valueColor"
        :sparkline="card.sparkline"
        :sparkline-tone="card.sparklineTone"
      />
    </div>

    <div class="filtros-bar">
      <StyledSelect
        v-model="filters.status"
        class="status-filter"
        :options="statusOptions"
        placeholder="Todos os status"
        @update:model-value="applyFilters"
      >
        <template #prefix>
          <span class="select-prefix">
            <SlidersHorizontal :size="14" />
            Status:
          </span>
        </template>
      </StyledSelect>

      <SearchableSelect
        v-if="isReceivable"
        v-model="selectedPatientId"
        class="patient-filter"
        :options="patientOptions"
        :loading="patientsStore.isLoading"
        empty-label="Busque por paciente ou título"
        @search="handlePatientSearch"
      />
      <div v-else class="search-box">
        <Search :size="16" />
        <input
          v-model="filters.search"
          type="search"
          placeholder="Busque por fornecedor ou título"
          @input="handleTextSearch"
          @keydown.enter="applyFilters"
        />
      </div>

      <VueDatePicker
        class="period-picker"
        :model-value="dateRange"
        @update:model-value="onRangeChange"
        range
        multi-calendars
        :enable-time-picker="false"
        locale="pt-BR"
        format="dd/MM/yyyy"
        auto-apply
        teleport="body"
        :z-index="12000"
        :clearable="false"
      >
        <template #trigger>
          <button class="period-trigger" type="button" aria-label="Selecionar período">
            <CalendarDays :size="15" />
            <span class="period-trigger__text">
              <strong>{{ formatDateDisplay(dateRange[0]) || 'Início' }}</strong>
              <span>até</span>
              <strong>{{ formatDateDisplay(dateRange[1]) || 'Fim' }}</strong>
            </span>
          </button>
        </template>
      </VueDatePicker>

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
              <th>Vencimento</th>
              <th>{{ partyLabel }}</th>
              <th>Categoria</th>
              <th>Valor</th>
              <th>Saldo</th>
              <th>Status</th>
              <th class="actions-header">Ações</th>
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
                <td class="whitespace-nowrap table-date">{{ formatDate(conta.dueDate) }}</td>
                <td>
                  <div class="party-cell">
                    <strong>{{ conta.party?.name || '-' }}</strong>
                    <span>{{ conta.title }}</span>
                  </div>
                </td>
                <td class="whitespace-nowrap">{{ conta.categoryId?.name || 'Sem categoria' }}</td>
                <td class="whitespace-nowrap table-money">{{ money(conta.amountCents) }}</td>
                <td class="whitespace-nowrap table-money table-money--strong" :class="conta.remainingAmountCents > 0 ? (isReceivable ? 'text-emerald-600' : 'text-red-600') : 'text-slate-500'">{{ money(conta.remainingAmountCents) }}</td>
                <td>
                  <span class="status-pill" :class="statusConfig(conta.status).className">
                    <component :is="statusConfig(conta.status).icon" :size="13" />
                    {{ statusConfig(conta.status).label }}
                  </span>
                </td>
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
                <span class="status-pill" :class="statusConfig(conta.status).className">
                  <component :is="statusConfig(conta.status).icon" :size="13" />
                  {{ statusConfig(conta.status).label }}
                </span>
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
.finance-page {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-height: 0;
  height: calc(100vh - 7.5rem);
  overflow: hidden;
  color: #0f172a;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.page-copy {
  min-width: 260px;
}

.title {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: clamp(1.45rem, 1.3vw + 1rem, 2rem);
  font-weight: 650;
  line-height: 1.12;
  color: #0f172a;
  letter-spacing: 0;
}

.subtitle {
  margin: 0.35rem 0 0;
  color: #64748b;
  font-size: 0.92rem;
  font-weight: 400;
  max-width: 680px;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin-left: auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.75rem;
}

.summary-grid :deep(.summary-card) {
  min-height: 92px;
  padding: 0.85rem 1rem;
}

.filtros-bar {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: nowrap;
  padding: 0.7rem;
  background: #fff;
  border: 1px solid #e8edf4;
  border-radius: 0.85rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
}

.filtros-bar :deep(.form-group) {
  min-width: 0;
  margin: 0;
}

.search-box,
.period-trigger,
.btn-clear {
  min-height: 40px;
  border: 1px solid #e5eaf1;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
}

.status-filter {
  flex: 0 0 270px;
}

.status-filter :deep(.select-button) {
  min-height: 40px;
  border-color: #e5eaf1;
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
  font-size: 0.9rem;
}

.select-prefix {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 600;
  white-space: nowrap;
}

.select-prefix svg {
  color: #94a3b8;
}

.patient-filter {
  flex: 1 1 360px;
  min-width: 280px;
}

.patient-filter :deep(.form-label) {
  display: none;
}

.patient-filter :deep(.input-wrapper) {
  min-height: 40px;
  border-color: #e5eaf1;
  border-radius: 0.75rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
}

.patient-filter :deep(.input-wrapper:focus-within),
.patient-filter :deep(.input-wrapper.is-open) {
  border-color: #93c5fd;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.08);
}

.patient-filter :deep(.select-input) {
  font-family: var(--fonte-principal);
  font-size: 0.9rem;
}

.period-picker {
  flex: 0 0 auto;
  width: auto;
}

.period-picker :deep(.dp__main) {
  width: auto;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 280px;
  flex: 1;
  padding: 0 0.85rem;
  color: #94a3b8;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #0f172a;
  font-size: 0.9rem;
  font-family: var(--fonte-principal);
}

.period-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  width: auto;
  min-width: 246px;
  padding: 0 0.9rem;
  color: #0f172a;
  text-align: left;
  font-family: var(--fonte-principal);
  font-size: 0.86rem;
  font-weight: 500;
  cursor: pointer;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.period-trigger:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 20px rgba(15, 23, 42, 0.06);
  transform: translateY(-1px);
}

.period-trigger__text {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.42rem;
  min-width: 0;
  white-space: nowrap;
}

.period-trigger__text strong {
  font-weight: 600;
}

.period-trigger__text span {
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 500;
}

.btn-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0 0.85rem;
  color: #64748b;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.18s ease, color 0.18s ease;
}

.btn-clear:hover {
  border-color: #cbd5e1;
  color: #0f172a;
}

.table-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  height: min(100%, calc(100vh - 25.5rem));
  max-height: calc(100vh - 25.5rem);
  background-color: var(--branco);
  border: 1px solid #e8edf4;
  border-radius: 0.85rem;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025), 0 12px 28px rgba(15, 23, 42, 0.028);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.34rem;
  min-height: 24px;
  padding: 0 0.58rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.status-pill svg {
  flex-shrink: 0;
}

.status-pill--open {
  color: #2563eb;
  background: #dbeafe;
}

.status-pill--partial {
  color: #b45309;
  background: #fef3c7;
}

.status-pill--paid {
  color: #047857;
  background: #d1fae5;
}

.status-pill--overdue {
  color: #dc2626;
  background: #fee2e2;
}

.status-pill--canceled {
  color: #64748b;
  background: #f1f5f9;
}

.table-wrapper.is-loading {
  opacity: 0.62;
  pointer-events: none;
}

.table-container {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 0.72rem 1.1rem;
  text-align: left;
  border-bottom: 1px solid #edf2f7;
  vertical-align: middle;
  white-space: nowrap;
  font-size: 0.88rem;
}

tbody tr:last-child td {
  border-bottom: none;
}

tbody tr:hover td {
  background: #fbfdff;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: #fbfcfe;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 650;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

th.actions-header {
  width: 88px;
  text-align: right;
}

.table-date {
  color: #475569;
  font-variant-numeric: tabular-nums;
}

.table-money {
  color: #0f172a;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.table-money--strong {
  font-weight: 700;
}

.party-cell {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 200px;
  white-space: normal;
}

.party-cell strong {
  color: #0f172a;
  font-size: 0.93rem;
  font-weight: 650;
  line-height: 1.2;
}

.party-cell span {
  color: #64748b;
  font-size: 0.84rem;
}

.actions-cell {
  text-align: right;
}

.desktop-only {
  display: block;
}

.mobile-list {
  display: none;
}

.mobile-card {
  border: 1px solid #e8edf4;
  border-radius: 0.85rem;
  padding: 0.9rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  background-color: var(--branco);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.02);
}

.mobile-card-header {
  display: flex;
  justify-content: space-between;
  gap: 0.8rem;
  align-items: flex-start;
}

.mobile-card-header div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.mobile-card-header strong {
  color: #0f172a;
  font-size: 0.94rem;
  font-weight: 650;
  line-height: 1.2;
}

.mobile-card-header span {
  color: #64748b;
  font-size: 0.84rem;
}

.mobile-card-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.7rem;
}

.mobile-card-grid span {
  display: flex;
  flex-direction: column;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 700;
  gap: 0.18rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.mobile-card-grid strong {
  color: #0f172a;
  font-size: 0.9rem;
  font-weight: 650;
  text-transform: none;
  letter-spacing: 0;
}

.whitespace-nowrap { white-space: nowrap; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.text-emerald-600 { color: #059669 !important; }
.text-red-600 { color: #dc2626 !important; }
.text-slate-500 { color: #64748b !important; }
.ml-auto { margin-left: auto; }
.p-0 { padding: 0 !important; }
.border-0 { border: 0 !important; }

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .finance-page {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

  .page-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-start;
    margin-left: 0;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .filtros-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .search-box,
  .patient-filter,
  .period-trigger,
  .period-picker,
  .status-filter,
  .filtros-bar :deep(.form-group),
  .btn-clear {
    width: 100%;
    min-width: 0;
    flex: 0 0 auto;
  }

  .period-picker :deep(.dp__main) {
    width: 100%;
  }

  .period-trigger__text {
    width: 100%;
    justify-content: space-between;
  }

  .table-wrapper {
    height: auto;
    max-height: 520px;
  }

  .table-container {
    display: none;
  }

  .mobile-list {
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: column;
    gap: 0.75rem;
    overflow: auto;
    padding: 0.75rem;
  }
}
</style>
