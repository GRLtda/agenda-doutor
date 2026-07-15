<script setup>
import { computed, onMounted, ref } from 'vue'
import { useToast } from 'vue-toastification'
import {
  AlertTriangle,
  ArrowDownCircle,
  Banknote,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileSignature,
  FileText,
  ReceiptText,
  RotateCcw,
  StickyNote,
  Tag,
  User,
  Wallet,
} from 'lucide-vue-next'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppButton from '@/components/global/AppButton.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import FinanceiroStatusBadge from '@/components/financeiro/FinanceiroStatusBadge.vue'
import { useFinanceiroStore } from '@/stores/financeiro'

const props = defineProps({
  contaId: {
    type: String,
    required: true,
  },
  tipo: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['close', 'baixa'])

const toast = useToast()
const financeiroStore = useFinanceiroStore()

const loadingEstornoId = ref(null)

const conta = computed(() => financeiroStore.contaAtual)
const baixas = computed(() => financeiroStore.baixas || [])
const loading = computed(() => financeiroStore.loadingContas && !conta.value)

const isReceivable = computed(() => (conta.value?.type || props.tipo) === 'RECEIVABLE')
const partyLabel = computed(() => (isReceivable.value ? 'Paciente / Convênio' : 'Fornecedor'))

const amountCents = computed(() => Number(conta.value?.amountCents || 0))
const paidAmountCents = computed(() => Number(conta.value?.paidAmountCents || 0))
const remainingAmountCents = computed(() => calculateRemainingCents(conta.value))
const progressPercent = computed(() => {
  if (amountCents.value <= 0) return 0
  return Math.min(100, Math.round((paidAmountCents.value / amountCents.value) * 100))
})
const isFullyPaid = computed(() => conta.value?.status === 'PAID' && remainingAmountCents.value <= 0 && amountCents.value > 0)
const canRegisterBaixa = computed(() => remainingAmountCents.value > 0 && conta.value?.status !== 'CANCELED')
const contaWithEffectiveBalance = computed(() => {
  if (!conta.value) return null
  return {
    ...conta.value,
    remainingAmountCents: remainingAmountCents.value,
  }
})

const settlementVerb = computed(() => (isReceivable.value ? 'Recebido' : 'Pago'))
const registerVerb = computed(() => (isReceivable.value ? 'Registrar recebimento' : 'Registrar pagamento'))

const paymentMethodMap = {
  DINHEIRO: { label: 'Dinheiro', icon: Banknote },
  PIX: { label: 'PIX', icon: Banknote },
  CARTAO_CREDITO: { label: 'Cartão de crédito', icon: CreditCard },
  CARTAO_DEBITO: { label: 'Cartão de débito', icon: CreditCard },
  BOLETO: { label: 'Boleto', icon: FileText },
  TRANSFERENCIA: { label: 'Transferência', icon: Banknote },
  OUTRO: { label: 'Outro', icon: Wallet },
}

function methodMeta(code) {
  return paymentMethodMap[code] || paymentMethodMap.OUTRO
}

function money(cents) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(cents || 0) / 100)
}

function calculateRemainingCents(contaItem) {
  if (!contaItem || contaItem.status === 'PAID' || contaItem.status === 'CANCELED') return 0

  const rawRemaining = Number(contaItem.remainingAmountCents || 0)
  if (rawRemaining > 0) return rawRemaining

  const amount = Number(contaItem.amountCents || 0)
  const paid = Number(contaItem.paidAmountCents || 0)
  return Math.max(amount - paid, 0)
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date)
}

function formatFinancialDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatPercent(value) {
  return `${Math.max(0, Math.min(100, Number(value || 0))).toFixed(0)}%`
}

function isOverdue(contaItem) {
  if (!contaItem || contaItem.status === 'PAID' || contaItem.status === 'CANCELED') return false
  if (remainingAmountCents.value <= 0) return false
  const due = contaItem.dueDate ? new Date(contaItem.dueDate) : null
  if (!due) return false
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return due.toISOString().slice(0, 10) < todayKey
}

function historyTimestamp(baixa) {
  const value = baixa?.createdAt || baixa?.updatedAt || baixa?.settledAt
  const timestamp = value ? new Date(value).getTime() : 0
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function chronBaixas() {
  return baixas.value.slice().sort((a, b) => historyTimestamp(a) - historyTimestamp(b))
}

async function recarregar() {
  if (!props.contaId) return
  await financeiroStore.fetchConta(props.contaId)
}

async function confirmarEstorno(baixa) {
  if (!baixa?._id) return
  const ok = window.confirm(
    `Confirma o estorno de ${money(baixa.amountCents)} (${methodMeta(baixa.method).label}) registrado em ${formatDate(baixa.settledAt)}?`
  )
  if (!ok) return
  loadingEstornoId.value = baixa._id
  const result = await financeiroStore.estornarBaixa(baixa._id, {
    notes: 'Estorno registrado pelo resumo da conta.',
  })
  loadingEstornoId.value = null
  if (!result.success) {
    toast.error(result.error)
    return
  }
  toast.success('Baixa estornada com sucesso.')
  await recarregar()
}

onMounted(() => {
  recarregar()
})
</script>

<template>
  <SideDrawer size="lg" @close="$emit('close')">
    <template #header>
      <div class="drawer-header">
        <div class="header-content">
          <h2 class="drawer-title">
            <div class="header-icon">
              <FileSignature :size="22" />
            </div>
            <span class="drawer-title__text">Resumo da conta</span>
          </h2>
          <p class="drawer-description">
            {{ isReceivable ? 'Detalhes do recebimento e histórico de baixas.' : 'Detalhes do pagamento e histórico de baixas.' }}
          </p>
        </div>
        <button type="button" class="close-btn-header" @click="$emit('close')">✕</button>
      </div>
    </template>

    <div class="resumo-body">
      <template v-if="loading">
        <AppSkeleton height="96px" border-radius="0.85rem" />
        <AppSkeleton height="160px" border-radius="0.85rem" />
        <AppSkeleton height="220px" border-radius="0.85rem" />
      </template>

      <template v-else-if="conta">
        <!-- Bloco de Status / Quitada totalmente -->
        <section class="card status-hero" :class="isFullyPaid ? 'status-hero--paid' : isOverdue(conta) ? 'status-hero--overdue' : 'status-hero--open'">
          <div class="status-hero__top">
            <component
              :is="isFullyPaid ? CheckCircle2 : isOverdue(conta) ? AlertTriangle : Clock3"
              :size="22"
              class="status-hero__icon"
            />
            <div class="status-hero__title">
              <strong>{{ conta.title }}</strong>
              <span>{{ partyLabel }}: {{ conta.party?.name || '-' }}</span>
            </div>
            <FinanceiroStatusBadge :status="conta.status" />
          </div>

          <div v-if="isFullyPaid" class="paid-banner">
            <CheckCircle2 :size="16" />
            <span>Conta quitada totalmente em {{ formatDate(baixas[baixas.length - 1]?.settledAt) }}.</span>
          </div>
          <div v-else-if="isOverdue(conta)" class="paid-banner paid-banner--overdue">
            <AlertTriangle :size="16" />
            <span>Conta em atraso desde {{ formatFinancialDate(conta.dueDate) }}.</span>
          </div>
          <div v-else class="paid-banner paid-banner--neutral">
            <Clock3 :size="16" />
            <span>Saldo pendente de {{ money(remainingAmountCents) }}.</span>
          </div>

          <div class="progress-track">
            <div class="progress-fill" :style="{ width: formatPercent(progressPercent) }"></div>
          </div>
          <div class="status-hero__percent">
            <span>{{ formatPercent(progressPercent) }} quitado</span>
            <span>{{ money(paidAmountCents) }} de {{ money(amountCents) }}</span>
          </div>
        </section>

        <!-- Bloco de Valores -->
        <section class="card values-grid">
          <div class="value-item">
            <span class="value-label">Valor total</span>
            <strong class="value-amount">{{ money(amountCents) }}</strong>
          </div>
          <div class="value-item value-item--paid">
            <span class="value-label">{{ settlementVerb }}</span>
            <strong class="value-amount">{{ money(paidAmountCents) }}</strong>
          </div>
          <div class="value-item value-item--remaining">
            <span class="value-label">Saldo pendente</span>
            <strong class="value-amount" :class="{ 'text-muted': remainingAmountCents <= 0 }">{{ money(remainingAmountCents) }}</strong>
          </div>
        </section>

        <!-- Bloco de Detalhes -->
        <section class="card detail-block">
          <h3 class="block-title">Detalhes</h3>
          <ul class="detail-list">
            <li>
              <span class="detail-key"><CalendarDays :size="14" /> Vencimento</span>
              <span class="detail-value">{{ formatFinancialDate(conta.dueDate) }}</span>
            </li>
            <li>
              <span class="detail-key"><Calendar :size="14" /> Competência</span>
              <span class="detail-value">{{ formatFinancialDate(conta.competenceDate) }}</span>
            </li>
            <li>
              <span class="detail-key"><Tag :size="14" /> Categoria</span>
              <span class="detail-value">{{ conta.categoryId?.name || 'Sem categoria' }}</span>
            </li>
            <li>
              <span class="detail-key"><User :size="14" /> {{ partyLabel }}</span>
              <span class="detail-value">
                <div>{{ conta.party?.name || '-' }}</div>
                <div v-if="conta.party?.document || conta.party?.phone" class="sub-line">
                  <span v-if="conta.party?.document">Doc: {{ conta.party.document }}</span>
                  <span v-if="conta.party?.phone">Tel: {{ conta.party.phone }}</span>
                </div>
              </span>
            </li>
            <li>
              <span class="detail-key"><CreditCard :size="14" /> Forma prevista</span>
              <span class="detail-value">{{ conta.expectedPaymentMethod ? methodMeta(conta.expectedPaymentMethod).label : 'Não informado' }}</span>
            </li>
            <li v-if="conta.installments">
              <span class="detail-key"><ReceiptText :size="14" /> Parcelas</span>
              <span class="detail-value">{{ conta.installments.current }} / {{ conta.installments.total }}</span>
            </li>
            <li v-if="conta.notes">
              <span class="detail-key"><StickyNote :size="14" /> Observações</span>
              <span class="detail-value detail-value--notes">{{ conta.notes }}</span>
            </li>
          </ul>
        </section>

        <!-- Histórico de baixas -->
        <section class="card history-block">
          <div class="block-header">
            <h3 class="block-title">Histórico de {{ isReceivable ? 'recebimentos' : 'pagamentos' }}</h3>
            <span class="block-count">{{ baixas.length }} registro(s)</span>
          </div>

          <div v-if="baixas.length === 0" class="empty-history">
            <Clock3 :size="22" />
            <p>Nenhuma baixa registrada para esta conta.</p>
          </div>

          <ol v-else class="timeline">
            <li v-for="baixa in chronBaixas()" :key="baixa._id" class="timeline-item" :class="{ 'timeline-item--reversal': baixa.type === 'REVERSAL' }">
              <div class="timeline-dot" :class="{ 'timeline-dot--reversal': baixa.type === 'REVERSAL' }">
                <component :is="baixa.type === 'REVERSAL' ? RotateCcw : ArrowDownCircle" :size="14" />
              </div>
              <div class="timeline-content">
                <div class="timeline-content__top">
                  <strong class="timeline-amount">
                    {{ baixa.type === 'REVERSAL' ? '−' : '' }}{{ money(baixa.amountCents) }}
                  </strong>
                  <span class="timeline-method">
                    <component :is="methodMeta(baixa.method).icon" :size="13" />
                    {{ methodMeta(baixa.method).label }}
                  </span>
                </div>
                <div class="timeline-content__meta">
                  <span class="meta-date">{{ formatDateTime(baixa.settledAt) }}</span>
                  <span v-if="baixa.type === 'REVERSAL'" class="meta-tag meta-tag--reversal">Estorno</span>
                </div>
                <p v-if="baixa.notes" class="timeline-notes">{{ baixa.notes }}</p>
                <button
                  v-if="baixa.type !== 'REVERSAL'"
                  type="button"
                  class="timeline-action"
                  :disabled="loadingEstornoId === baixa._id"
                  @click.stop="confirmarEstorno(baixa)"
                >
                  <RotateCcw :size="13" />
                  {{ loadingEstornoId === baixa._id ? 'Estornando...' : 'Estornar' }}
                </button>
              </div>
            </li>
          </ol>
        </section>
      </template>

      <div v-else class="error-state">
        <AlertTriangle :size="22" />
        <p>Não foi possível carregar esta conta.</p>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')">Fechar</AppButton>
        <div class="footer-actions">
          <AppButton v-if="canRegisterBaixa" variant="primary" @click="$emit('baixa', contaWithEffectiveBalance)">
            <ArrowDownCircle :size="16" />
            {{ registerVerb }}
          </AppButton>
        </div>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.drawer-title {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-family: var(--fonte-titulo);
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
}

.drawer-title__text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
}

.drawer-description {
  margin: 0 0 0 2rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.close-btn-header {
  display: none;
}

.resumo-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  padding: 1.1rem 1.25rem;
  border: 1px solid #e8edf4;
  border-radius: 0.85rem;
  background: #fff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
}

/* Hero / Status */
.status-hero {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.status-hero--open {
  border-color: #dbeafe;
  background: linear-gradient(180deg, #f5f9ff 0%, #ffffff 100%);
}

.status-hero--paid {
  border-color: #bbf7d0;
  background: linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%);
}

.status-hero--overdue {
  border-color: #fecaca;
  background: linear-gradient(180deg, #fef2f2 0%, #ffffff 100%);
}

.status-hero__top {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-hero__icon {
  color: #475569;
}

.status-hero--paid .status-hero__icon {
  color: #047857;
}

.status-hero--overdue .status-hero__icon {
  color: #dc2626;
}

.status-hero__title {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.status-hero__title strong {
  font-size: 1rem;
  font-weight: 700;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-hero__title span {
  color: #64748b;
  font-size: 0.84rem;
}

.paid-banner {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: #047857;
  background: #dcfce7;
  align-self: flex-start;
}

.paid-banner--overdue {
  color: #b91c1c;
  background: #fee2e2;
}

.paid-banner--neutral {
  color: #1d4ed8;
  background: #dbeafe;
}

.progress-track {
  width: 100%;
  height: 8px;
  background: #eef2f7;
  border-radius: 999px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
  transition: width 0.4s ease;
}

.status-hero--overdue .progress-fill {
  background: linear-gradient(90deg, #f97316 0%, #ef4444 100%);
}

.status-hero--open .progress-fill {
  background: linear-gradient(90deg, #60a5fa 0%, #2563eb 100%);
}

.status-hero__percent {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: #64748b;
  font-weight: 600;
}

/* Valores */
.values-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
}

.value-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.85rem;
  border-radius: 0.7rem;
  background: #f8fafc;
  border: 1px solid #eef2f7;
}

.value-item--paid {
  background: #f0fdf4;
  border-color: #dcfce7;
}

.value-item--remaining {
  background: #fff7ed;
  border-color: #fed7aa;
}

.value-label {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #94a3b8;
}

.value-amount {
  font-size: 1.05rem;
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.value-item--paid .value-amount {
  color: #047857;
}

.value-item--remaining .value-amount {
  color: #c2410c;
}

.text-muted {
  color: #64748b !important;
}

/* Detalhes */
.block-title {
  margin: 0 0 0.85rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: #0f172a;
}

.detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.detail-list li {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.9rem;
}

.detail-key {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  color: #64748b;
  font-weight: 600;
  min-width: 160px;
}

.detail-value {
  color: #0f172a;
  font-weight: 600;
  text-align: right;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.detail-value--notes {
  font-weight: 400;
  color: #475569;
  max-width: 320px;
  white-space: pre-wrap;
}

.sub-line {
  display: flex;
  gap: 0.6rem;
  font-weight: 400;
  font-size: 0.82rem;
  color: #94a3b8;
}

/* Histórico */
.block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.85rem;
}

.block-count {
  font-size: 0.78rem;
  color: #64748b;
  font-weight: 600;
}

.empty-history {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem 1rem;
  color: #94a3b8;
  text-align: center;
}

.empty-history p {
  margin: 0;
  font-size: 0.9rem;
}

.timeline {
  list-style: none;
  margin: 0;
  padding: 0 0 0 0.4rem;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 11px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: #e8edf4;
}

.timeline-item {
  position: relative;
  padding-left: 2.2rem;
}

.timeline-dot {
  position: absolute;
  left: 0;
  top: 2px;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: #22c55e;
  z-index: 1;
}

.timeline-dot--reversal {
  background: #ef4444;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.65rem 0.85rem;
  border: 1px solid #e8edf4;
  border-radius: 0.7rem;
  background: #f8fafc;
}

.timeline-item--reversal .timeline-content {
  background: #fef2f2;
  border-color: #fecaca;
}

.timeline-content__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.timeline-amount {
  font-weight: 700;
  color: #0f172a;
  font-variant-numeric: tabular-nums;
}

.timeline-item--reversal .timeline-amount {
  color: #b91c1c;
}

.timeline-method {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.82rem;
  color: #475569;
  font-weight: 600;
}

.timeline-content__meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.78rem;
  color: #94a3b8;
}

.meta-tag {
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.meta-tag--reversal {
  color: #b91c1c;
  background: #fee2e2;
}

.timeline-notes {
  margin: 0;
  font-size: 0.84rem;
  color: #475569;
  white-space: pre-wrap;
}

.timeline-action {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.timeline-action:hover:not(:disabled) {
  color: #b91c1c;
  border-color: #fecaca;
  background: #fef2f2;
}

.timeline-action:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #94a3b8;
  gap: 0.5rem;
}

/* Footer */
.drawer-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

.footer-actions {
  display: flex;
  gap: 0.6rem;
}

@media (max-width: 768px) {
  .drawer-header {
    padding: 1.15rem 1rem;
  }

  .drawer-description {
    margin-left: 0;
  }

  .close-btn-header {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: #6b7280;
    padding: 0.45rem;
    cursor: pointer;
  }

  .values-grid {
    grid-template-columns: 1fr;
  }

  .detail-list li {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.2rem;
  }

  .detail-value {
    text-align: left;
  }

  .drawer-footer {
    flex-direction: column-reverse;
    padding: 1rem;
  }

  .footer-actions {
    width: 100%;
    justify-content: stretch;
  }

  .footer-actions :deep(.app-button) {
    flex: 1;
  }
}
</style>
