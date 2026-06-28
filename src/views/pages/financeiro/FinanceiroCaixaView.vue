<script setup>
import { computed, onMounted, reactive } from 'vue'
import { CalendarDays, SearchX } from 'lucide-vue-next'
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

const summaryCards = computed(() => [
  {
    key: 'receipts',
    label: 'Recebimentos',
    value: money(totals.value.receipts),
    valueColor: 'green',
    sparkline: buildSparkline(totals.value.receipts, [0.56, 0.62, 0.6, 0.72, 0.7, 0.82, 0.78, 0.92]),
    sparklineTone: 'green',
  },
  {
    key: 'payments',
    label: 'Retiradas',
    value: money(totals.value.payments),
    valueColor: 'red',
    sparkline: buildSparkline(totals.value.payments, [0.78, 0.7, 0.74, 0.64, 0.68, 0.58, 0.62, 0.54]),
    sparklineTone: 'red',
  },
  {
    key: 'reversals',
    label: 'Estornos',
    value: money(totals.value.reversals),
    sparkline: buildSparkline(totals.value.reversals, [0.42, 0.46, 0.44, 0.5, 0.48, 0.54, 0.52, 0.58]),
    sparklineTone: 'slate',
  },
  {
    key: 'balance',
    label: 'Saldo da página',
    value: money(totals.value.receipts - totals.value.payments - totals.value.reversals),
    subtext: 'Resultado filtrado',
    sparkline: buildSparkline(totals.value.receipts - totals.value.payments - totals.value.reversals, [0.62, 0.68, 0.66, 0.76, 0.72, 0.82, 0.78, 0.88]),
    sparklineTone: 'green',
  },
])

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
    PAYMENT: 'Retirada',
    REVERSAL: 'Estorno',
  }
  return labels[type] || type
}

function methodLabel(method) {
  const labels = {
    DINHEIRO: 'Dinheiro',
    PIX: 'PIX',
    CARTAO_CREDITO: 'Cartão de crédito',
    CARTAO_DEBITO: 'Cartão de débito',
    BOLETO: 'Boleto',
    TRANSFERENCIA: 'Transferência',
    OUTRO: 'Outro',
  }
  return labels[method] || method || '-'
}

function buildSparkline(value, multipliers) {
  const base = Math.max(Math.abs(Number(value || 0)), 1)
  return multipliers.map((multiplier, index) => Math.round(base * multiplier + index))
}

function movementValueClass(type) {
  if (type === 'RECEIPT') return 'text-emerald-600'
  if (type === 'PAYMENT') return 'text-red-600'
  return 'text-slate-500'
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
      <div class="page-copy">
        <h1 class="title">Caixa</h1>
        <p class="subtitle">Movimentações registradas por baixas de contas.</p>
      </div>
      <AppButton to="/financeiro" variant="outline" size="sm">Resumo</AppButton>
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
              <th>Data</th>
              <th>Tipo</th>
              <th>Conta</th>
              <th>Parte</th>
              <th>Forma</th>
              <th>Valor</th>
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
                <td class="whitespace-nowrap table-date">{{ formatDate(item.settledAt) }}</td>
                <td class="whitespace-nowrap"><span class="type-pill" :class="`type-pill--${item.type?.toLowerCase()}`">{{ typeLabel(item.type) }}</span></td>
                <td class="account-cell"><strong>{{ item.accountId?.title || '-' }}</strong></td>
                <td>{{ item.accountId?.party?.name || '-' }}</td>
                <td class="whitespace-nowrap">{{ methodLabel(item.method) }}</td>
                <td class="whitespace-nowrap table-money" :class="movementValueClass(item.type)">
                  {{ money(item.amountCents) }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="mobile-list" v-auto-animate>
        <template v-if="financeiroStore.loadingCaixa && financeiroStore.movimentosCaixa.length === 0">
          <div v-for="n in 3" :key="`skel-mob-${n}`" class="mobile-card skeleton-card">
            <AppSkeleton width="60%" style="margin-bottom: 8px;" />
            <AppSkeleton width="40%" />
          </div>
        </template>
        <template v-else-if="financeiroStore.movimentosCaixa.length > 0">
          <article v-for="item in financeiroStore.movimentosCaixa" :key="item._id" class="mobile-card">
            <div class="mobile-card-header">
              <div>
                <strong>{{ item.accountId?.title || 'Lançamento' }}</strong>
                <span>{{ item.accountId?.party?.name || 'Sem parte vinculada' }}</span>
              </div>
              <span class="type-pill" :class="`type-pill--${item.type?.toLowerCase()}`">{{ typeLabel(item.type) }}</span>
            </div>
            <div class="mobile-card-grid">
              <span>Data <strong>{{ formatDate(item.settledAt) }}</strong></span>
              <span>Forma <strong>{{ methodLabel(item.method) }}</strong></span>
              <span>Valor <strong :class="movementValueClass(item.type)">{{ money(item.amountCents) }}</strong></span>
            </div>
          </article>
        </template>
        <div v-if="!financeiroStore.loadingCaixa && financeiroStore.movimentosCaixa.length === 0">
          <AppEmptyState
            title="Nenhuma movimentação"
            text="Não há registros que correspondam aos filtros atuais."
            :icon="SearchX"
          />
        </div>
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
.finance-page {
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
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
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.9rem;
}

.filtros-bar {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
  padding: 0.7rem;
  background: #fff;
  border: 1px solid #e8edf4;
  border-radius: 0.85rem;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
}

.input-with-icon {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 40px;
  padding: 0 0.85rem;
  border: 1px solid #e5eaf1;
  border-radius: 0.75rem;
  background: #fff;
  color: #94a3b8;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
}

.input-with-icon input {
  border: 0;
  outline: 0;
  color: #0f172a;
  background: transparent;
  font-family: var(--fonte-principal);
  font-size: 0.88rem;
}

.table-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 0;
  max-height: min(640px, calc(100vh - 300px));
  background-color: var(--branco);
  border: 1px solid #e8edf4;
  border-radius: 0.85rem;
  overflow: hidden;
  position: relative;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025), 0 12px 28px rgba(15, 23, 42, 0.028);
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
  padding: 0.9rem 1.1rem;
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

.account-cell strong {
  color: #0f172a;
  font-weight: 650;
}

.table-date,
.table-money {
  font-variant-numeric: tabular-nums;
}

.table-date {
  color: #475569;
}

.table-money {
  font-weight: 700;
}

.type-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.75rem;
  padding: 0 0.58rem;
  border-radius: 999px;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.type-pill--receipt {
  background: #ecfdf5;
  color: #059669;
}

.type-pill--payment {
  background: #fef2f2;
  color: #dc2626;
}

.type-pill--reversal {
  background: #f1f5f9;
  color: #475569;
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
  align-items: flex-start;
  gap: 0.8rem;
  min-width: 0;
}

.mobile-card-header div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.mobile-card-header strong {
  min-width: 0;
  color: #0f172a;
  font-size: 0.94rem;
  font-weight: 650;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mobile-card-header span:not(.type-pill) {
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

.skeleton-row {
  pointer-events: none;
}

.skeleton-row:hover td {
  background-color: var(--branco) !important;
}

.whitespace-nowrap { white-space: nowrap; }
.font-medium { font-weight: 500; }
.text-emerald-600 { color: #059669 !important; }
.text-red-600 { color: #dc2626 !important; }
.text-slate-500 { color: #64748b !important; }

@media (max-width: 1100px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .page-header {
    flex-direction: column;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .filtros-bar {
    align-items: stretch;
    flex-direction: column;
  }

  .input-with-icon {
    width: 100%;
  }

  .table-wrapper {
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

  .mobile-card-header .type-pill {
    max-width: 34%;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
