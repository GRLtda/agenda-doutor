<script setup>
import { computed, onMounted, reactive } from 'vue'
import { CalendarDays, Calendar, Activity, Tag, User, Wallet, DollarSign, SearchX } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import AppPagination from '@/components/global/AppPagination.vue'
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import FinanceSummaryCard from '@/components/financeiro/FinanceSummaryCard.vue'
import { useFinanceiroStore } from '@/stores/financeiro'

const financeiroStore = useFinanceiroStore()

const filters = reactive({
  startDate: '',
  endDate: '',
  page: 1,
  limit: 20,
})

const totals = computed(() => {
  return financeiroStore.movimentosCaixa.reduce((acc, item) => {
    if (item.type === 'RECEIPT') acc.receipts += Number(item.amountCents || 0)
    if (item.type === 'PAYMENT') acc.payments += Number(item.amountCents || 0)
    if (item.type === 'REVERSAL') acc.reversals += Number(item.amountCents || 0)
    return acc
  }, { receipts: 0, payments: 0, reversals: 0 })
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
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function typeLabel(type) {
  const labels = {
    RECEIPT: 'Recebimento',
    PAYMENT: 'Pagamento',
    REVERSAL: 'Estorno',
  }
  return labels[type] || type
}

function methodLabel(method) {
  const labels = {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    CARTAO_CREDITO: 'Cartao de credito',
    CARTAO_DEBITO: 'Cartao de debito',
    BOLETO: 'Boleto',
    TRANSFERENCIA: 'Transferencia',
    OUTRO: 'Outro',
  }
  return labels[method] || method || '-'
}

function load() {
  const params = {
    page: String(filters.page),
    limit: String(filters.limit),
  }
  if (filters.startDate) params.startDate = filters.startDate
  if (filters.endDate) params.endDate = filters.endDate
  financeiroStore.fetchCaixa(params)
}

function applyFilters() {
  filters.page = 1
  load()
}

function changePage(page) {
  filters.page = page
  load()
}

onMounted(load)
</script>

<template>
  <div class="finance-page">
    <div class="page-header">
      <div>
        <h1 class="title">Caixa</h1>
        <p class="subtitle">Movimentacoes registradas por baixas de contas.</p>
      </div>
      <AppButton to="/financeiro" variant="outline" size="sm">Resumo</AppButton>
    </div>

    <div class="summary-grid">
      <FinanceSummaryCard
        label="Recebimentos"
        :value="money(totals.receipts)"
        value-color="green"
      />
      <FinanceSummaryCard
        label="Pagamentos"
        :value="money(totals.payments)"
        value-color="red"
      />
      <FinanceSummaryCard
        label="Estornos"
        :value="money(totals.reversals)"
      />
      <FinanceSummaryCard
        label="Saldo da página"
        :value="money(totals.receipts - totals.payments - totals.reversals)"
      />
    </div>

    <div class="filtros-bar">
      <div class="input-with-icon">
        <CalendarDays :size="16" />
        <input v-model="filters.startDate" type="date" @change="applyFilters" />
      </div>
      <div class="input-with-icon">
        <CalendarDays :size="16" />
        <input v-model="filters.endDate" type="date" @change="applyFilters" />
      </div>
    </div>

    <div class="table-wrapper" :class="{ 'is-loading': financeiroStore.loadingCaixa && financeiroStore.movimentosCaixa.length > 0 }">
      <div class="table-container desktop-only">
        <table>
          <thead>
            <tr>
              <th>
                <div class="th-content">
                  <Calendar :size="14" />
                  <span>Data</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <Activity :size="14" />
                  <span>Tipo</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <Tag :size="14" />
                  <span>Conta</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <User :size="14" />
                  <span>Parte</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <Wallet :size="14" />
                  <span>Forma</span>
                </div>
              </th>
              <th>
                <div class="th-content">
                  <DollarSign :size="14" />
                  <span>Valor</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <template v-if="financeiroStore.loadingCaixa && financeiroStore.movimentosCaixa.length === 0">
              <tr v-for="n in 5" :key="`skel-${n}`" class="skeleton-row">
                <td><AppSkeleton width="80%" /></td>
                <td><AppSkeleton width="70%" /></td>
                <td><AppSkeleton width="90%" /></td>
                <td><AppSkeleton width="85%" /></td>
                <td><AppSkeleton width="60%" /></td>
                <td><AppSkeleton width="50%" /></td>
              </tr>
            </template>
            <template v-else-if="!financeiroStore.loadingCaixa && financeiroStore.movimentosCaixa.length === 0">
              <tr>
                <td colspan="6" style="padding: 0; border: 0;">
                  <AppEmptyState
                    title="Nenhuma movimentação"
                    text="Não há registros que correspondam aos filtros atuais."
                    :icon="SearchX"
                  />
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="item in financeiroStore.movimentosCaixa" :key="item._id" class="table-row">
                <td class="whitespace-nowrap">{{ formatDate(item.settledAt) }}</td>
                <td class="whitespace-nowrap">{{ typeLabel(item.type) }}</td>
                <td><strong>{{ item.accountId?.title || '-' }}</strong></td>
                <td>{{ item.accountId?.party?.name || '-' }}</td>
                <td class="whitespace-nowrap">{{ methodLabel(item.method) }}</td>
                <td class="whitespace-nowrap font-medium" :class="item.type === 'RECEIPT' ? 'text-emerald-600' : 'text-red-600'">
                  {{ money(item.amountCents) }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <AppPagination
      v-if="financeiroStore.caixaMeta.total > 0"
      :current-page="financeiroStore.caixaMeta.page"
      :total-pages="financeiroStore.caixaMeta.totalPages"
      :total-items="financeiroStore.caixaMeta.total"
      :limit="financeiroStore.caixaMeta.limit"
      @page-change="changePage"
    />
  </div>
</template>

<style scoped>
.finance-page { display:flex; flex-direction:column; gap:1.5rem; }
.page-header { display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; }
.title { margin:0; font-family:var(--fonte-titulo); font-size:1.75rem; font-weight:700; color:var(--preto); }
.subtitle { margin:.35rem 0 0; color:#64748b; font-size:.95rem; }
.summary-grid { display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:1rem; }
.filtros-bar { display:flex; gap:.75rem; flex-wrap:wrap; }
.input-with-icon { display:flex; align-items:center; gap:.5rem; min-height:40px; padding:0 .75rem; border:1px solid #e5e7eb; border-radius:.5rem; background:#fff; color:#64748b; }
.input-with-icon input { border:0; outline:0; color:#111827; background:transparent; font-size:.9rem; }
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
.table-row {
  transition: background-color 0.2s ease;
}
.table-row:hover td {
  background-color: #f9fafb;
}

td strong { color:#111827; font-weight: 500; }

.skeleton-row { pointer-events: none; }
.skeleton-row:hover td { background-color: var(--branco) !important; }

.whitespace-nowrap { white-space: nowrap; }
.font-medium { font-weight: 500; }
.text-emerald-600 { color: #059669; font-weight: 600; }
.text-red-600 { color: #dc2626; font-weight: 600; }
@media (max-width: 1100px) {
  .summary-grid { grid-template-columns:repeat(2, minmax(0,1fr)); }
}
@media (max-width: 640px) {
  .summary-grid { grid-template-columns:1fr; }
  .input-with-icon { width:100%; }
}
</style>
