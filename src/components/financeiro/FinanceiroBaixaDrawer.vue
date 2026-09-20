<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { Banknote, CalendarDays, CheckCircle2, CreditCard, StickyNote, X } from 'lucide-vue-next'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import { localDateForApi } from '@/utils/financialDate'

const props = defineProps({
  conta: {
    type: Object,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'save'])

const form = reactive({
  amount: '',
  method: 'PIX',
  settledAt: localDateForApi(),
  notes: '',
})
const attemptedSubmit = ref(false)

const paymentOptions = [
  { label: 'Dinheiro', value: 'DINHEIRO' },
  { label: 'PIX', value: 'PIX' },
  { label: 'Cartao de credito', value: 'CARTAO_CREDITO' },
  { label: 'Cartao de debito', value: 'CARTAO_DEBITO' },
  { label: 'Boleto', value: 'BOLETO' },
  { label: 'Transferencia', value: 'TRANSFERENCIA' },
  { label: 'Outro', value: 'OUTRO' },
]

const actionLabel = computed(() =>
  props.conta.type === 'RECEIVABLE' ? 'Registrar recebimento' : 'Registrar pagamento'
)

const amountLabel = computed(() =>
  props.conta.type === 'RECEIVABLE' ? 'Valor recebido' : 'Valor pago'
)

const settledLabel = computed(() =>
  props.conta.type === 'RECEIVABLE' ? 'Recebimento' : 'Pagamento'
)

const remainingCents = computed(() => {
  if (props.conta.status === 'PAID' || props.conta.status === 'CANCELED') return 0

  const rawRemaining = Number(props.conta.remainingAmountCents || 0)
  if (rawRemaining > 0) return rawRemaining

  const amount = Number(props.conta.amountCents || 0)
  const paid = Number(props.conta.paidAmountCents || 0)
  return Math.max(amount - paid, 0)
})

const amountCents = computed(() => Number(props.conta.amountCents || 0))
const paidCents = computed(() => Number(props.conta.paidAmountCents || 0))
const typedAmountCents = computed(() => Math.min(reaisToCents(form.amount), remainingCents.value))
const projectedPaidCents = computed(() => Math.min(amountCents.value, paidCents.value + typedAmountCents.value))
const progressPercent = computed(() => {
  if (amountCents.value <= 0) return 0
  return Math.min(100, Math.round((projectedPaidCents.value / amountCents.value) * 100))
})

const amountError = computed(() => {
  if (!attemptedSubmit.value) return ''
  const amount = reaisToCents(form.amount)
  if (amount <= 0) return 'Informe um valor maior que zero.'
  if (amount > remainingCents.value) return `O valor maximo e ${money(remainingCents.value)}.`
  return ''
})

function centsToReais(value) {
  return (Number(value || 0) / 100).toFixed(2)
}

function money(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value || 0) / 100)
}

function reaisToCents(value) {
  const raw = String(value || '').trim()
  if (!raw) return 0
  const normalized = raw.includes(',')
    ? raw.replace(/\./g, '').replace(',', '.')
    : raw
  const numeric = Number(normalized)
  return Number.isFinite(numeric) ? Math.round(numeric * 100) : 0
}

function sanitizeCurrencyInput(value) {
  let sanitized = String(value || '').replace(/[^\d.,]/g, '').replace(/,/g, '.')
  const firstDot = sanitized.indexOf('.')

  if (firstDot !== -1) {
    sanitized = `${sanitized.slice(0, firstDot + 1)}${sanitized.slice(firstDot + 1).replace(/\./g, '')}`
  }

  const [integerPart, decimalPart] = sanitized.split('.')
  const cleanInteger = integerPart.replace(/^0+(?=\d)/, '') || (sanitized.startsWith('.') ? '0' : '')

  if (decimalPart !== undefined) {
    return `${cleanInteger}.${decimalPart.slice(0, 2)}`
  }

  return cleanInteger
}

function resetForm() {
  attemptedSubmit.value = false
  form.amount = centsToReais(remainingCents.value)
  form.method = props.conta.expectedPaymentMethod || 'PIX'
  form.settledAt = localDateForApi()
  form.notes = ''
}

function normalizeAmountLimit(event) {
  const sanitized = sanitizeCurrencyInput(event?.target?.value || form.amount)
  if (sanitized !== form.amount) {
    form.amount = sanitized
  }

  const amount = reaisToCents(sanitized)
  if (amount <= 0) return
  if (amount > remainingCents.value) {
    form.amount = centsToReais(remainingCents.value)
  }
}

function submit() {
  attemptedSubmit.value = true
  normalizeAmountLimit()
  const amountCents = reaisToCents(form.amount)
  if (amountError.value || !form.method || !form.settledAt) return
  emit('save', {
    amountCents,
    method: form.method,
    settledAt: form.settledAt,
    notes: form.notes?.trim() || undefined,
  })
}

watch(() => props.conta, resetForm, { immediate: true })
</script>

<template>
  <SideDrawer size="md" @close="$emit('close')">
    <template #header>
      <div class="drawer-header">
        <div class="header-copy">
          <span class="eyebrow">{{ settledLabel }}</span>
          <h2>{{ actionLabel }}</h2>
          <p>{{ conta.title }}</p>
        </div>
        <button type="button" class="mobile-close-btn" @click="$emit('close')">
          <X :size="20" />
        </button>
      </div>
    </template>

    <form class="finance-form" @submit.prevent="submit">
      <section class="payment-hero">
        <div class="payment-hero__top">
          <div class="payment-icon">
            <Banknote :size="24" />
          </div>
          <div>
            <span>Saldo em aberto</span>
            <strong>{{ money(remainingCents) }}</strong>
          </div>
        </div>

        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${progressPercent}%` }"></div>
        </div>

        <div class="payment-hero__meta">
          <span>{{ progressPercent }}% quitado</span>
          <span>{{ money(projectedPaidCents) }} de {{ money(amountCents) }}</span>
        </div>
      </section>

      <div class="form-grid">
        <div class="form-group">
          <label>
            <Banknote :size="14" />
            {{ amountLabel }}
          </label>
          <div class="amount-input-wrapper" :class="{ 'has-error': amountError }">
            <span>R$</span>
            <input
              v-model="form.amount"
              type="text"
              inputmode="decimal"
              autocomplete="off"
              required
              @input="normalizeAmountLimit"
            />
          </div>
          <span v-if="amountError" class="field-error">{{ amountError }}</span>
        </div>

        <StyledSelect
          v-model="form.method"
          class="baixa-select"
          label="Forma"
          :options="paymentOptions"
          placeholder="Selecione"
        >
          <template #label-prefix>
            <CreditCard :size="14" />
          </template>
          <template #prefix>
            <CreditCard :size="15" />
          </template>
        </StyledSelect>
      </div>

      <div class="form-group">
        <label>
          <CalendarDays :size="14" />
          Data
        </label>
        <input v-model="form.settledAt" type="date" required />
      </div>

      <div class="form-group">
        <label>
          <StickyNote :size="14" />
          Observações
        </label>
        <textarea v-model="form.notes" rows="4" placeholder="Informacoes internas"></textarea>
      </div>
    </form>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')">Fechar</AppButton>
        <AppButton variant="primary" :loading="loading" @click="submit">
          <CheckCircle2 :size="16" />
          {{ actionLabel }}
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
  border-bottom: 1px solid #eef2f7;
  background: #ffffff;
  overflow: hidden;
  position: relative;
}

.header-copy,
.mobile-close-btn {
  position: relative;
  z-index: 1;
}

.eyebrow {
  color: #047857;
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: 0.2rem;
  text-transform: uppercase;
}

.drawer-header h2 {
  margin: 0;
  font-family: var(--fonte-titulo);
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--preto);
}

.drawer-header p {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

.finance-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.payment-hero {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem;
  border: 1px solid #bbf7d0;
  border-radius: 0.9rem;
  animation: success-card-on 1.45s ease-out both;
  background:
    radial-gradient(90% 90% at 16% 0%, rgba(187, 247, 208, 0.82) 0%, rgba(240, 253, 244, 0.55) 48%, transparent 82%),
    #ffffff;
  box-shadow: 0 10px 26px rgba(34, 197, 94, 0.08);
}

.payment-hero__top {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.payment-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 0.8rem;
  color: #047857;
  background: #dcfce7;
  box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.16);
}

.payment-hero span {
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 650;
}

.payment-hero strong {
  display: block;
  margin-top: 0.08rem;
  color: #111827;
  font-size: 1.42rem;
  font-weight: 750;
  font-variant-numeric: tabular-nums;
}

.progress-track {
  width: 100%;
  height: 8px;
  overflow: hidden;
  border-radius: 999px;
  background: #e8f5ee;
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  transition: width 0.35s ease;
}

.payment-hero__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.payment-hero__meta span {
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
  align-items: end;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.baixa-select :deep(.form-label) {
  display: flex;
  align-items: center;
  min-height: 1.25rem;
  margin-bottom: 0.5rem;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
}

.baixa-select :deep(.select-button) {
  min-height: 44px;
}

.amount-input-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  background: #fff;
  padding: 0 0.85rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.amount-input-wrapper:focus-within {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.amount-input-wrapper.has-error {
  border-color: #ef4444;
}

.amount-input-wrapper.has-error:focus-within {
  border-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
}

.amount-input-wrapper span {
  color: #6b7280;
  flex-shrink: 0;
  font-size: 0.84rem;
  font-weight: 600;
  margin-right: 0.5rem;
}

.amount-input-wrapper input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: #111827;
  font-size: 0.95rem;
  min-height: 42px;
  outline: none;
  padding: 0;
}

.field-error {
  color: #dc2626;
  font-size: 0.78rem;
  font-weight: 600;
  margin-top: -0.18rem;
}

.form-group > input,
.form-group > textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  background: #fff;
  color: #111827;
  font-size: 0.95rem;
  min-height: 44px;
  padding: 0 0.85rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group > textarea {
  padding: 0.75rem 0.85rem;
  resize: none;
}

.form-group > input:focus,
.form-group > textarea:focus {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12);
}

.drawer-footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
  width: 100%;
}

@keyframes success-card-on {
  0% { filter: saturate(0.75); opacity: 0.72; }
  55% { filter: saturate(1.18); opacity: 1; }
  100% { filter: saturate(1); opacity: 1; }
}

@media (max-width: 520px) {
  .form-grid,
  .drawer-footer {
    grid-template-columns: 1fr;
  }

  .payment-hero__meta {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
