<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { CalendarDays, SearchX } from 'lucide-vue-next'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import AppPagination from '@/components/global/AppPagination.vue'
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import FinanceSummaryCard from '@/components/financeiro/FinanceSummaryCard.vue'
import { useFinanceiroStore } from '@/stores/financeiro'
import { formatFinancialDate, localDateForApi } from '@/utils/financialDate'

const financeiroStore = useFinanceiroStore()
const route = useRoute()
const router = useRouter()

const filters = reactive({
  startDate: '',
  endDate: '',
  page: 1,
  limit: 20,
})

const dateRange = ref([startOfMonthDate(), endOfMonthDate()])
const summaryCarouselIndex = ref(0)
const summaryCarouselDrag = createCarouselDragState()
let isUpdatingQuery = false

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
  return formatFinancialDate(value) || '-'
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

function startOfMonthDate() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function endOfMonthDate() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function formatDateDisplay(dateInput) {
  return formatFinancialDate(dateInput)
}

function formatDateForApi(dateInput) {
  return localDateForApi(dateInput)
}

function parseApiDate(value) {
  if (!value) return null
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function normalizeQueryValue(value) {
  return Array.isArray(value) ? value[0] : value
}

function queryStringValue(value, fallback = '') {
  return normalizeQueryValue(value) || fallback
}

function positiveNumberQuery(value, fallback) {
  const number = Number(normalizeQueryValue(value))
  return Number.isFinite(number) && number > 0 ? number : fallback
}

function queriesAreEqual(current, next) {
  const currentKeys = Object.keys(current).filter((key) => current[key] !== undefined)
  const nextKeys = Object.keys(next).filter((key) => next[key] !== undefined)
  if (currentKeys.length !== nextKeys.length) return false
  return nextKeys.every((key) => String(normalizeQueryValue(current[key]) ?? '') === String(next[key] ?? ''))
}

function applyQueryToFilters() {
  const query = route.query
  const startDate = queryStringValue(query.startDate, formatDateForApi(startOfMonthDate()))
  const endDate = queryStringValue(query.endDate, formatDateForApi(endOfMonthDate()))

  filters.startDate = startDate
  filters.endDate = endDate
  filters.page = positiveNumberQuery(query.page, 1)
  filters.limit = positiveNumberQuery(query.limit, 20)
  dateRange.value = [
    parseApiDate(startDate) || startOfMonthDate(),
    parseApiDate(endDate) || endOfMonthDate(),
  ]
}

function buildQueryFromFilters() {
  const query = {
    startDate: filters.startDate,
    endDate: filters.endDate,
  }

  if (filters.page > 1) query.page = String(filters.page)
  if (filters.limit !== 20) query.limit = String(filters.limit)

  return query
}

async function syncQueryFromFilters() {
  const query = buildQueryFromFilters()
  if (queriesAreEqual(route.query, query)) return

  isUpdatingQuery = true
  await router.replace({ query })
}

async function syncQueryAndLoad() {
  await syncQueryFromFilters()
  load()
}

function createCarouselDragState() {
  return {
    pointerId: null,
    startX: 0,
    currentX: 0,
    offset: 0,
    isDragging: false,
    hasChanged: false,
    suppressClick: false,
  }
}

function wrapIndex(current, total, direction) {
  if (total <= 0) return 0
  const next = current + direction
  return (next + total) % total
}

function activateCarouselCard(nextIndex) {
  const total = summaryCards.value.length
  if (total <= 0) return
  summaryCarouselIndex.value = ((nextIndex % total) + total) % total
}

function handleCarouselPointerDown(event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  summaryCarouselDrag.pointerId = event.pointerId
  summaryCarouselDrag.startX = event.clientX
  summaryCarouselDrag.currentX = event.clientX
  summaryCarouselDrag.offset = 0
  summaryCarouselDrag.isDragging = false
  summaryCarouselDrag.hasChanged = false
  summaryCarouselDrag.suppressClick = false

  if (event.currentTarget?.setPointerCapture) {
    event.currentTarget.setPointerCapture(event.pointerId)
  }
}

function handleCarouselPointerMove(event) {
  if (summaryCarouselDrag.pointerId !== event.pointerId) return
  summaryCarouselDrag.currentX = event.clientX
  const delta = summaryCarouselDrag.currentX - summaryCarouselDrag.startX
  summaryCarouselDrag.offset = delta
  if (Math.abs(delta) > 6) summaryCarouselDrag.isDragging = true

  if (!summaryCarouselDrag.hasChanged && Math.abs(delta) >= 42 && summaryCards.value.length > 1) {
    summaryCarouselIndex.value = delta < 0
      ? wrapIndex(summaryCarouselIndex.value, summaryCards.value.length, 1)
      : wrapIndex(summaryCarouselIndex.value, summaryCards.value.length, -1)
    summaryCarouselDrag.hasChanged = true
    summaryCarouselDrag.startX = event.clientX
    summaryCarouselDrag.currentX = event.clientX
    summaryCarouselDrag.offset = 0
  }
}

function handleCarouselPointerUp() {
  if (summaryCarouselDrag.pointerId === null) return
  const delta = summaryCarouselDrag.currentX - summaryCarouselDrag.startX
  const total = summaryCards.value.length

  if (!summaryCarouselDrag.hasChanged && Math.abs(delta) >= 42 && total > 1) {
    summaryCarouselIndex.value = delta < 0
      ? wrapIndex(summaryCarouselIndex.value, total, 1)
      : wrapIndex(summaryCarouselIndex.value, total, -1)
  }

  summaryCarouselDrag.pointerId = null
  summaryCarouselDrag.startX = 0
  summaryCarouselDrag.currentX = 0
  summaryCarouselDrag.offset = 0
  summaryCarouselDrag.hasChanged = false
  summaryCarouselDrag.suppressClick = true
  window.setTimeout(() => {
    summaryCarouselDrag.suppressClick = false
    summaryCarouselDrag.isDragging = false
  }, 0)
}

function handleCarouselPointerCancel() {
  summaryCarouselDrag.pointerId = null
  summaryCarouselDrag.startX = 0
  summaryCarouselDrag.currentX = 0
  summaryCarouselDrag.offset = 0
  summaryCarouselDrag.isDragging = false
  summaryCarouselDrag.hasChanged = false
  summaryCarouselDrag.suppressClick = false
}

function handleCarouselCardClick(index) {
  if (summaryCarouselDrag.suppressClick || summaryCarouselDrag.isDragging || summaryCards.value.length <= 1) return
  activateCarouselCard(index)
}

function getCarouselDistance(index, activeIndex, total) {
  if (total <= 0) return 0
  const raw = index - activeIndex
  const wrapped = ((raw % total) + total) % total
  return wrapped > total / 2 ? wrapped - total : wrapped
}

function getCarouselCardState(index, activeIndex, total) {
  const distance = getCarouselDistance(index, activeIndex, total)
  if (distance === 0) return 'is-active'
  if (Math.abs(distance) === 1) return 'is-neighbor'
  return 'is-far'
}

function getCarouselCardStyle(index, activeIndex, total, dragOffset = 0) {
  const distance = getCarouselDistance(index, activeIndex, total)
  const absDistance = Math.abs(distance)
  const isNeighbor = absDistance === 1
  const direction = distance === 0 ? 0 : Math.sign(distance)
  const dragShift = Math.max(-60, Math.min(60, dragOffset * 0.2))

  let translateX = `${dragShift}px`
  let scale = 1
  let opacity = 1
  let blur = '0px'
  let zIndex = 5

  if (distance !== 0 && isNeighbor) {
    translateX = `${direction * 56 + dragShift * 0.35}px`
    scale = 0.95
    opacity = 0.74
    blur = '1.8px'
    zIndex = 4 - absDistance
  } else if (distance !== 0) {
    translateX = `${direction * 82 + dragShift * 0.2}px`
    scale = 0.9
    opacity = 0.42
    blur = '4px'
    zIndex = 1
  }

  return {
    transform: `translateX(${translateX}) scale(${scale})`,
    opacity,
    filter: `blur(${blur})`,
    zIndex,
  }
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
  syncQueryAndLoad()
}

function onRangeChange(value) {
  if (!Array.isArray(value) || value.length < 2 || !value[0] || !value[1]) return
  dateRange.value = value
  filters.startDate = formatDateForApi(value[0])
  filters.endDate = formatDateForApi(value[1])
  applyFilters()
}

function changePage(page) {
  filters.page = page
  syncQueryAndLoad()
}

onMounted(() => {
  applyQueryToFilters()
  syncQueryAndLoad()
})

watch(() => route.query, () => {
  if (isUpdatingQuery) {
    isUpdatingQuery = false
    return
  }
  applyQueryToFilters()
  load()
})
</script>

<template>
  <div class="finance-page">
    <div class="page-header">
      <div class="page-copy">
        <h1 class="title">Caixa</h1>
        <p class="subtitle">Movimentações registradas por baixas de contas.</p>
      </div>
      <div class="header-actions">
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
      </div>
    </div>

    <div class="summary-grid desktop-grid">
      <FinanceSummaryCard
        v-for="card in summaryCards"
        :key="card.key"
        :label="card.label"
        :value="card.value"
        :subtext="card.subtext"
        :value-color="card.valueColor"
        :sparkline="card.sparkline"
        :sparkline-tone="card.sparklineTone"
        :loading="financeiroStore.loadingCaixa"
      />
    </div>

    <div
      class="carousel-shell mobile-carousel"
      @pointerdown="handleCarouselPointerDown"
      @pointermove="handleCarouselPointerMove"
      @pointerup="handleCarouselPointerUp"
      @pointercancel="handleCarouselPointerCancel"
    >
      <div class="carousel-stack">
        <FinanceSummaryCard
          v-for="(card, index) in summaryCards"
          :key="card.key"
          class="carousel-card"
          :class="getCarouselCardState(index, summaryCarouselIndex, summaryCards.length)"
          :style="getCarouselCardStyle(index, summaryCarouselIndex, summaryCards.length, summaryCarouselDrag.offset)"
          @click="handleCarouselCardClick(index)"
          :label="card.label"
          :value="card.value"
          :subtext="card.subtext"
          :value-color="card.valueColor"
          :sparkline="card.sparkline"
          :sparkline-tone="card.sparklineTone"
          :loading="financeiroStore.loadingCaixa"
        />
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

.header-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.6rem;
  flex: 0 0 auto;
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
  gap: 0.75rem;
}

.summary-grid :deep(.summary-card) {
  min-height: 92px;
  padding: 0.85rem 1rem;
}

.desktop-grid {
  display: grid;
}

.mobile-carousel {
  display: none;
}

.carousel-shell {
  position: relative;
  min-width: 0;
  touch-action: pan-x;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
  overflow: hidden;
  contain: layout paint;
}

.carousel-shell::before,
.carousel-shell::after {
  content: '';
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 1.35rem;
  height: 1.35rem;
  color: rgba(100, 116, 139, 0.52);
  font-size: 1.25rem;
  font-weight: 400;
  line-height: 1;
  pointer-events: none;
  z-index: 6;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.82);
}

.carousel-shell::before {
  content: '‹';
  left: 0.1rem;
}

.carousel-shell::after {
  content: '›';
  right: 0.1rem;
}

.carousel-shell:active {
  cursor: grabbing;
}

.carousel-stack {
  position: relative;
  height: 132px;
  min-width: 0;
  overflow: hidden;
  padding-inline: 0;
}

.carousel-card {
  position: absolute;
  inset: 0.15rem 1.45rem 0.55rem;
  transition:
    transform 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1),
    filter 0.34s cubic-bezier(0.22, 1, 0.36, 1);
  transform-origin: center;
  will-change: transform, opacity, filter;
  cursor: pointer;
}

.carousel-card.is-active {
  z-index: 5;
  opacity: 1;
  transform: translateX(0) scale(1);
  filter: none;
}

.carousel-card.is-neighbor {
  opacity: 0.74;
  pointer-events: auto;
}

.carousel-card.is-far {
  z-index: 1;
  opacity: 0.38;
  filter: blur(4px) saturate(0.9);
  pointer-events: none;
}

.period-picker {
  flex: 0 0 auto;
  width: auto;
}

.period-picker :deep(.dp__main) {
  width: auto;
}

.period-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  min-height: 40px;
  width: auto;
  min-width: 246px;
  padding: 0 0.9rem;
  border: 1px solid #e5eaf1;
  border-radius: 0.75rem;
  background: #fff;
  color: #0f172a;
  text-align: left;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.025);
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

.table-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1 1 auto;
  height: min(100%, calc(100vh - 21.5rem));
  max-height: calc(100vh - 21.5rem);
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
    justify-content: stretch;
  }

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .desktop-grid {
    display: none !important;
  }

  .mobile-carousel {
    display: block;
    width: 100%;
    max-width: 100%;
    margin-inline: -0.15rem;
  }

  .period-picker,
  .period-trigger {
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

  .mobile-card-header .type-pill {
    max-width: 34%;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
