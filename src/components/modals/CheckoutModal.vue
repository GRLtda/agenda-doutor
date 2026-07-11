<script setup>
import { ref, computed, watch } from 'vue'
import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Calendar,
  Check,
  CreditCard,
  ClipboardList,
  DollarSign,
  FileClock,
  Plus,
  Receipt,
  Smartphone,
  Trash2,
  WalletCards,
  X,
} from 'lucide-vue-next'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import Switch from '@/components/global/Switch.vue'

const props = defineProps({
  procedures: { type: Array, required: true },
  patientId: { type: String, required: true },
  appointmentId: { type: String, required: true },
  patientName: { type: String, required: true },
  appointmentDate: { type: String, required: true },
  appointmentTime: { type: String, required: true },
  isLoading: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm', 'schedule-return'])

const paidNow = ref(true)
const expectedPaymentMethod = ref('PIX')
const dueDate = ref(toDateInput(new Date()))
const useInstallments = ref(false)
const installmentCount = ref(2)
const confirmedPayments = ref([])
const displayAmount = ref('0,00')
const activeStep = ref(1)
const currentPayment = ref({
  method: 'DINHEIRO',
  amount: 0,
  installments: 1,
})

const paymentMethodOptions = [
  { label: 'Dinheiro', value: 'DINHEIRO', icon: Banknote },
  { label: 'PIX', value: 'PIX', icon: Smartphone },
  { label: 'Cartão de Crédito', value: 'CARTAO_CREDITO', icon: CreditCard },
  { label: 'Cartão de Débito', value: 'CARTAO_DEBITO', icon: CreditCard },
  { label: 'Boleto', value: 'BOLETO', icon: Receipt },
]

const totalAmount = computed(() =>
  props.procedures.reduce((sum, proc) => sum + Number(proc.finalValue || 0), 0)
)

const totalOriginalAmount = computed(() =>
  props.procedures.reduce((sum, proc) => sum + Number(proc.originalValue || proc.finalValue || 0), 0)
)

const totalDiscount = computed(() => Math.max(totalOriginalAmount.value - totalAmount.value, 0))

const totalCost = computed(() =>
  props.procedures.reduce((sum, proc) => {
    const costInCents = proc.totalCostCents ?? proc.procedureCostCents ?? proc.costCents
    if (costInCents !== undefined && costInCents !== null) {
      return sum + Number(costInCents || 0) / 100
    }
    return sum + Number(proc.totalCost || proc.cost || 0)
  }, 0)
)

const grossProfit = computed(() => Math.max(totalAmount.value - totalCost.value, 0))

const totalPaid = computed(() => {
  if (!paidNow.value) return 0
  return confirmedPayments.value.reduce((sum, pm) => sum + Number(pm.amount || 0), 0)
})

const remainingAmount = computed(() => Math.max(totalAmount.value - totalPaid.value, 0))
const hasPendingBalance = computed(() => remainingAmount.value > 0.01)
const currentPaymentMethodLabel = computed(() =>
  paymentMethodOptions.find(opt => opt.value === currentPayment.value.method)?.label || 'Pagamento'
)

const dueDatePickerModel = computed({
  get: () => parseLocalDate(dueDate.value),
  set: (value) => {
    dueDate.value = formatDateForApi(value)
  },
})

const checkoutSteps = computed(() => [
  {
    id: 1,
    label: 'Resumo',
    description: `${props.procedures.length} procedimento${props.procedures.length === 1 ? '' : 's'}`,
    icon: ClipboardList,
    tone: 'neutral',
  },
  {
    id: 2,
    label: 'Pagamento',
    description: formatCurrency(totalPaid.value),
    icon: WalletCards,
    tone: 'received',
  },
  {
    id: 3,
    label: 'Saldo',
    description: hasPendingBalance.value ? formatCurrency(remainingAmount.value) : 'Quitado',
    icon: FileClock,
    tone: hasPendingBalance.value ? 'pending' : 'received',
  },
])

const generatedInstallments = computed(() => {
  if (!useInstallments.value || !hasPendingBalance.value) return []

  const totalCents = Math.round(remainingAmount.value * 100)
  const count = Math.max(1, Math.min(24, Number(installmentCount.value || 1)))
  const baseCents = Math.floor(totalCents / count)
  let remainder = totalCents - baseCents * count
  const firstDueDate = dueDate.value ? new Date(`${dueDate.value}T12:00:00`) : new Date()

  return Array.from({ length: count }, (_, index) => {
    const amountCents = baseCents + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder -= 1

    const due = new Date(firstDueDate)
    due.setMonth(firstDueDate.getMonth() + index)

    return {
      amount: amountCents / 100,
      dueDate: toDateInput(due),
      expectedPaymentMethod: expectedPaymentMethod.value,
    }
  })
})

const isValid = computed(() => {
  if (totalAmount.value === 0) return true
  if (totalPaid.value - totalAmount.value > 0.01) return false

  const allPaymentsArePositive = confirmedPayments.value.every(pm => Number(pm.amount || 0) > 0)
  if (paidNow.value && confirmedPayments.value.length > 0 && !allPaymentsArePositive) return false

  if (!hasPendingBalance.value) return true
  if (!dueDate.value || !expectedPaymentMethod.value) return false
  if (useInstallments.value) return generatedInstallments.value.length > 0
  return true
})

function confirmPayment() {
  if (currentPayment.value.amount <= 0) return

  const newTotal = totalPaid.value + currentPayment.value.amount
  if (newTotal > totalAmount.value) {
    currentPayment.value.amount = remainingAmount.value
    displayAmount.value = formatValueForDisplay(remainingAmount.value)
    return
  }

  confirmedPayments.value.push({
    method: currentPayment.value.method,
    amount: currentPayment.value.amount,
    installments: currentPayment.value.installments,
  })

  currentPayment.value = {
    method: 'DINHEIRO',
    amount: 0,
    installments: 1,
  }
  displayAmount.value = '0,00'
}

function removeConfirmedPayment(index) {
  confirmedPayments.value.splice(index, 1)
}

function fillRemainingAmount() {
  if (remainingAmount.value > 0) {
    currentPayment.value.amount = remainingAmount.value
    displayAmount.value = formatValueForDisplay(remainingAmount.value)
  }
}

function fillHalfRemainingAmount() {
  if (remainingAmount.value > 0) {
    currentPayment.value.amount = remainingAmount.value / 2
    displayAmount.value = formatValueForDisplay(currentPayment.value.amount)
  }
}

function goToStep(step) {
  activeStep.value = Math.min(3, Math.max(1, step))
}

function nextStep() {
  goToStep(activeStep.value + 1)
}

function previousStep() {
  goToStep(activeStep.value - 1)
}

function handleSubmit() {
  if (!isValid.value || props.isLoading) return

  const paymentsNow = paidNow.value
    ? confirmedPayments.value.map(pm => ({
        method: pm.method,
        amount: pm.amount,
        installments: pm.method === 'CARTAO_CREDITO' ? pm.installments : 1,
      }))
    : []

  let mode = 'RECEIVE_LATER'
  if (useInstallments.value && hasPendingBalance.value) {
    mode = 'INSTALLMENTS'
  } else if (totalPaid.value >= totalAmount.value - 0.01) {
    mode = 'PAID_NOW'
  } else if (totalPaid.value > 0) {
    mode = 'PARTIAL'
  }

  emit('confirm', {
    patientId: props.patientId,
    appointmentId: props.appointmentId,
    paymentMethods: paymentsNow,
    paymentPlan: {
      mode,
      dueDate: dueDate.value,
      expectedPaymentMethod: expectedPaymentMethod.value,
      paymentsNow,
      installments: mode === 'INSTALLMENTS' ? generatedInstallments.value : [],
    },
  })
}

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0)
}

function formatValueForDisplay(value) {
  if (!value && value !== 0) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

function parseFormattedValue(formattedValue) {
  if (!formattedValue) return 0
  return parseFloat(formattedValue.replace(/\./g, '').replace(',', '.')) || 0
}

function handleAmountInput(event) {
  let input = event.target.value.replace(/[^\d,]/g, '')
  const parts = input.split(',')
  if (parts.length > 2) {
    input = parts.slice(0, -1).join('') + ',' + parts[parts.length - 1]
  }

  if (input.includes(',')) {
    const [integer, decimal] = input.split(',')
    input = integer + ',' + (decimal || '').slice(0, 2)
  }

  currentPayment.value.amount = parseFormattedValue(input)

  if (!input || input === ',') {
    displayAmount.value = input
    return
  }

  const [integerPart, decimalPart] = input.split(',')
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  displayAmount.value = decimalPart !== undefined ? `${formattedInteger},${decimalPart}` : formattedInteger
}

function handleAmountFocus() {
  if (currentPayment.value.amount === 0) displayAmount.value = ''
}

function handleAmountBlur() {
  if (!displayAmount.value || currentPayment.value.amount === 0) {
    currentPayment.value.amount = 0
    displayAmount.value = '0,00'
    return
  }

  displayAmount.value = formatValueForDisplay(currentPayment.value.amount)
}

function toDateInput(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value) {
  if (!value) return null
  const [year, month, day] = String(value).split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function formatDateForApi(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return toDateInput(date)
}

watch(paidNow, (value) => {
  if (!value) {
    confirmedPayments.value = []
    currentPayment.value.amount = 0
    displayAmount.value = '0,00'
  }
})

watch(hasPendingBalance, (value) => {
  if (!value) useInstallments.value = false
})
</script>

<template>
  <SideDrawer @close="$emit('close')" size="xl">
    <template #header>
      <header class="drawer-header">
        <div class="header-texts">
          <h2 class="header-title">Finalizar</h2>
          <p class="header-subtitle">{{ patientName }} - {{ appointmentDate }} às {{ appointmentTime }}</p>
        </div>

        <div class="header-total">
          <span>Total</span>
          <strong>{{ formatCurrency(totalAmount) }}</strong>
        </div>

        <button type="button" class="header-close-btn" aria-label="Fechar" @click="$emit('close')">
          <X :size="20" />
        </button>
      </header>
    </template>

    <template #default>
      <div class="drawer-body-content">
        <nav class="checkout-stepper" aria-label="Etapas do checkout">
          <button
            v-for="step in checkoutSteps"
            :key="step.id"
            type="button"
            class="step-button"
            :class="[`step-${step.tone}`, { active: activeStep === step.id, done: activeStep > step.id }]"
            @click="goToStep(step.id)"
          >
            <span class="step-icon">
              <Check v-if="activeStep > step.id" :size="16" />
              <component v-else :is="step.icon" :size="16" />
            </span>
            <span class="step-copy">
              <strong>{{ step.label }}</strong>
              <small>{{ step.description }}</small>
            </span>
          </button>
        </nav>

        <section v-if="activeStep === 1" class="step-panel">
          <div class="panel-heading">
            <div>
              <h3 class="section-title">Resumo do atendimento</h3>
              <p class="section-subtitle">Confira os itens antes de receber.</p>
            </div>
          </div>

          <div v-if="procedures.length > 0" class="item-list">
            <div v-for="(proc, index) in procedures" :key="index" class="line-item">
              <div class="item-info">
                <span class="item-title">{{ proc.name }}</span>
                <span class="item-meta">
                  {{ proc.quantity > 1 ? `${proc.quantity}x` : '' }}
                  <span v-if="proc.discountPercentage > 0" class="discount-badge">
                    -{{ proc.discountPercentage }}%
                  </span>
                </span>
              </div>
              <div class="item-values">
                <span v-if="proc.originalValue > proc.finalValue" class="original-price">
                  {{ formatCurrency(proc.originalValue) }}
                </span>
                <span class="final-price">{{ formatCurrency(proc.finalValue) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-list">Nenhum procedimento neste atendimento.</div>

          <div class="totals-grid">
            <div v-if="totalDiscount > 0" class="metric-card">
              <span>Desconto</span>
              <strong class="text-red">-{{ formatCurrency(totalDiscount) }}</strong>
            </div>
            <div v-if="totalCost > 0" class="metric-card">
              <span>Custo estimado</span>
              <strong>{{ formatCurrency(totalCost) }}</strong>
            </div>
            <div v-if="totalCost > 0" class="metric-card">
              <span>Lucro estimado</span>
              <strong class="text-green">{{ formatCurrency(grossProfit) }}</strong>
            </div>
          </div>
        </section>

        <section v-if="activeStep === 2" class="step-panel">
          <div class="panel-heading">
            <div>
              <h3 class="section-title">Recebimento agora</h3>
              <p class="section-subtitle">Registre uma ou mais formas de pagamento.</p>
            </div>
            <div class="payment-toggle">
              <Switch v-model="paidNow" label="Receber agora" />
            </div>
          </div>

          <div class="payment-status">
            <div class="money-card received">
              <span class="money-card-label">
                <Check :size="15" />
                Total recebido
              </span>
              <strong class="text-green">{{ formatCurrency(totalPaid) }}</strong>
            </div>
            <div class="money-card pending">
              <span class="money-card-label">
                <FileClock :size="15" />
                Falta receber
              </span>
              <strong :class="{ 'text-red': hasPendingBalance }">{{ formatCurrency(remainingAmount) }}</strong>
            </div>
          </div>

          <div v-if="paidNow" class="payment-layout">
            <div class="payment-card">
              <div class="payment-card-header">
                <div>
                  <span>Novo pagamento</span>
                  <strong>{{ currentPaymentMethodLabel }}</strong>
                </div>
                <AppButton v-if="remainingAmount > 0" @click="fillRemainingAmount" variant="default" size="sm">
                  <DollarSign :size="14" />
                  Saldo total
                </AppButton>
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Forma de pagamento</label>
                  <StyledSelect v-model="currentPayment.method" :options="paymentMethodOptions" />
                </div>
                <div class="form-group amount-group">
                  <label class="form-label">Valor recebido</label>
                  <div class="input-wrapper amount-input-wrapper">
                    <span class="prefix">R$</span>
                    <input
                      v-model="displayAmount"
                      @input="handleAmountInput"
                      @focus="handleAmountFocus"
                      @blur="handleAmountBlur"
                      type="text"
                      class="form-input pl-10 amount-input"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <div class="quick-actions">
                <button v-if="remainingAmount > 0" type="button" @click="fillRemainingAmount">
                  Receber {{ formatCurrency(remainingAmount) }}
                </button>
                <button v-if="remainingAmount > 0" type="button" @click="fillHalfRemainingAmount">
                  Metade {{ formatCurrency(remainingAmount / 2) }}
                </button>
              </div>

              <div v-if="currentPayment.method === 'CARTAO_CREDITO'" class="credit-installments">
                <div class="form-group">
                  <label class="form-label">Parcelas no cartão</label>
                  <input v-model.number="currentPayment.installments" type="number" min="1" max="12" class="form-input" />
                </div>
                <div class="preview-box">
                  <span>Valor por parcela</span>
                  <strong>{{ formatCurrency(currentPayment.amount / currentPayment.installments) }}</strong>
                </div>
              </div>

              <AppButton @click="confirmPayment" variant="primary" class="add-payment-btn" :disabled="currentPayment.amount <= 0">
                <Plus :size="16" />
                Adicionar pagamento
              </AppButton>
            </div>

            <div class="received-card">
              <div class="received-header">
                <div>
                  <span>Pagamentos recebidos</span>
                  <strong>{{ confirmedPayments.length }} lançado{{ confirmedPayments.length === 1 ? '' : 's' }}</strong>
                </div>
              </div>

              <div v-if="confirmedPayments.length > 0" class="received-list">
                <div v-for="(payment, index) in confirmedPayments" :key="index" class="received-item">
                  <div class="item-info">
                    <span class="item-title">{{ paymentMethodOptions.find(opt => opt.value === payment.method)?.label }}</span>
                    <span v-if="payment.method === 'CARTAO_CREDITO' && payment.installments > 1" class="item-meta">
                      {{ payment.installments }}x de {{ formatCurrency(payment.amount / payment.installments) }}
                    </span>
                  </div>
                  <div class="item-values">
                    <span class="final-price money-received">{{ formatCurrency(payment.amount) }}</span>
                    <button @click="removeConfirmedPayment(index)" class="remove-btn" type="button">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>
              </div>
              <div v-else class="empty-list compact">Nenhum pagamento adicionado.</div>
            </div>
          </div>

          <div v-else class="empty-state-panel">
            <WalletCards :size="22" />
            <strong>Nenhum valor será recebido agora</strong>
            <span>O total do atendimento vai para saldo pendente.</span>
          </div>
        </section>

        <section v-if="activeStep === 3" class="step-panel">
          <div class="panel-heading">
            <div>
              <h3 class="section-title">Saldo pendente</h3>
              <p class="section-subtitle">Defina como o restante será cobrado.</p>
            </div>
          </div>

          <div v-if="hasPendingBalance" class="pending-box">
            <div class="pending-box-header">
              <div>
                <span>Saldo em A receber</span>
                <strong>{{ formatCurrency(remainingAmount) }}</strong>
              </div>
              <FileClock :size="20" />
            </div>

            <div class="pending-form">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Forma prevista</label>
                  <StyledSelect v-model="expectedPaymentMethod" :options="paymentMethodOptions" />
                </div>
                <div class="form-group">
                  <label class="form-label">Vencimento</label>
                  <VueDatePicker
                    :model-value="dueDatePickerModel"
                    @update:model-value="dueDatePickerModel = $event"
                    class="date-picker-field"
                    :enable-time-picker="false"
                    locale="pt-BR"
                    format="dd/MM/yyyy"
                    placeholder="dd/mm/aaaa"
                    auto-apply
                    teleport="body"
                    :z-index="12000"
                    :clearable="false"
                  />
                </div>
              </div>

              <div class="installments-toggle">
                <Switch v-model="useInstallments" label="Parcelar saldo pendente" />
              </div>

              <div v-if="useInstallments" class="installments-panel">
                <div class="form-group installments-count">
                  <label class="form-label">Quantidade de parcelas</label>
                  <input v-model.number="installmentCount" type="number" min="1" max="24" class="form-input" />
                </div>

                <div class="received-list">
                  <div v-for="(installment, index) in generatedInstallments" :key="index" class="received-item">
                    <div class="item-info">
                      <span class="item-title">Parcela {{ index + 1 }}/{{ generatedInstallments.length }}</span>
                      <span class="item-meta">
                        Vence em {{ new Date(`${installment.dueDate}T12:00:00`).toLocaleDateString('pt-BR') }}
                      </span>
                    </div>
                    <div class="item-values">
                      <span class="final-price">{{ formatCurrency(installment.amount) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="empty-state-panel success">
            <Check :size="22" />
            <strong>Atendimento quitado</strong>
            <span>Não há saldo para lançar em A receber.</span>
          </div>

          <div class="settlement-summary">
            <div class="money-card total">
              <span class="money-card-label">
                <DollarSign :size="15" />
                Total
              </span>
              <strong>{{ formatCurrency(totalAmount) }}</strong>
            </div>
            <div class="money-card received">
              <span class="money-card-label">
                <Check :size="15" />
                Recebido agora
              </span>
              <strong class="text-green">{{ formatCurrency(totalPaid) }}</strong>
            </div>
            <div class="money-card pending">
              <span class="money-card-label">
                <FileClock :size="15" />
                Pendente
              </span>
              <strong :class="{ 'text-red': hasPendingBalance }">{{ formatCurrency(remainingAmount) }}</strong>
            </div>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <div class="drawer-footer">
        <div class="footer-actions-right">
          <AppButton v-if="activeStep > 1" variant="default" class="footer-btn-back" @click="previousStep" :disabled="isLoading">
            <ArrowLeft :size="18" />
            <span class="footer-btn-label">Voltar</span>
          </AppButton>
          <AppButton variant="default" class="footer-btn-return" @click="emit('schedule-return')" :disabled="isLoading">
            <Calendar :size="18" />
            <span class="footer-btn-label">Agendar retorno</span>
          </AppButton>
          <AppButton v-if="activeStep < 3" variant="primary" class="footer-btn-next" @click="nextStep" :disabled="isLoading">
            <span class="footer-btn-label">Continuar</span>
            <ArrowRight :size="18" />
          </AppButton>
          <AppButton v-else variant="primary" class="footer-btn-finish" @click="handleSubmit" :disabled="!isValid || isLoading" :loading="isLoading">
            <Check :size="18" />
            <span class="footer-btn-label">Finalizar</span>
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
}

.header-texts,
.drawer-body-content,
.form-section,
.item-info {
  display: flex;
  flex-direction: column;
}

.header-texts {
  gap: 0.25rem;
}

.header-title {
  margin: 0;
  color: #111827;
  font-size: 1.125rem;
  font-weight: 700;
}

.header-subtitle {
  margin: 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.drawer-body-content {
  gap: 1.25rem;
}

.form-section {
  gap: 0.75rem;
}

.section-title {
  margin: 0;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 700;
}

.item-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.line-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #f9fafb;
}

.item-info {
  min-width: 0;
  gap: 0.125rem;
}

.item-title {
  color: #111827;
  font-size: 0.9375rem;
  font-weight: 700;
}

.item-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.75rem;
}

.item-values {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  white-space: nowrap;
}

.original-price {
  color: #9ca3af;
  font-size: 0.8125rem;
  text-decoration: line-through;
}

.final-price {
  color: #111827;
  font-size: 0.9375rem;
  font-weight: 800;
}

.discount-badge {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  background: #fef2f2;
  color: #dc2626;
  font-size: 0.6875rem;
  font-weight: 700;
}

.totals-section,
.pending-box {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #fff;
}

.total-row,
.balance-status,
.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  color: #6b7280;
  font-size: 0.9375rem;
}

.total-row.final {
  color: var(--azul-principal, #3b82f6);
  font-size: 1.075rem;
  font-weight: 700;
}

.text-green {
  color: #059669;
}

.text-red,
.total-row.discount {
  color: #dc2626;
}

.checkbox-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  color: #374151;
  font-size: 0.9rem;
  font-weight: 600;
}

.checkbox-row input {
  width: 16px;
  height: 16px;
  accent-color: var(--azul-principal, #3b82f6);
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.form-label {
  color: #374151;
  font-size: 0.8125rem;
  font-weight: 700;
}

.form-input {
  width: 100%;
  height: 48px;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background: #fff;
  color: #111827;
  font-size: 0.9375rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--azul-principal, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-wrapper {
  position: relative;
}

.prefix {
  position: absolute;
  top: 50%;
  left: 1rem;
  transform: translateY(-50%);
  color: #6b7280;
  font-weight: 600;
}

.pl-10 {
  padding-left: 2.5rem;
}

.actions-row {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.values-preview {
  justify-content: center;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.remove-btn {
  padding: 0.375rem;
  border: 0;
  border-radius: 0.375rem;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
}

.remove-btn:hover {
  background: #fef2f2;
  color: #dc2626;
}

.empty-list {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #f9fafb;
  color: #9ca3af;
  font-size: 0.875rem;
  text-align: center;
}

.installments-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

.footer-actions-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.footer-actions-right > * {
  flex: 1 1 0;
  min-width: 0;
}

.footer-btn-return {
  min-width: 11rem;
}

.footer-btn-label {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

input[type='number']::-webkit-inner-spin-button,
input[type='number']::-webkit-outer-spin-button {
  margin: 0;
  appearance: none;
}

input[type='number'] {
  appearance: textfield;
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
  }
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-bottom-color: #e5e7eb;
  background: #fff;
}

.header-close-btn {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #64748b;
  cursor: pointer;
  transition: 0.16s ease;
}

.header-close-btn:hover {
  background: #f8fafc;
  color: #111827;
}

.header-title {
  font-size: 1.25rem;
}

.header-total {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.125rem;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.header-total strong {
  color: var(--azul-principal, #2563eb);
  font-size: 1.125rem;
  text-transform: none;
}

.drawer-body-content {
  gap: 1rem;
  padding-bottom: 1rem;
}

.checkout-stepper {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  padding: 0.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #f8fafc;
}

.step-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  min-height: 54px;
  padding: 0.55rem 0.75rem;
  border: 1px solid transparent;
  border-radius: 0.625rem;
  background: transparent;
  color: #64748b;
  text-align: left;
  cursor: pointer;
  transition: 0.18s ease;
}

.step-button.active {
  border-color: #bfdbfe;
  background: #fff;
  color: #111827;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.step-button.done {
  color: #047857;
}

.step-button.step-received.done .step-icon,
.step-button.step-received.active .step-icon {
  background: #dcfce7;
  color: #047857;
}

.step-button.step-pending.active .step-icon {
  background: #ffedd5;
  color: #c2410c;
}

.step-button.step-pending.done .step-icon {
  background: #d1fae5;
  color: #047857;
}

.step-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: #e2e8f0;
  color: #475569;
}

.step-button.active .step-icon {
  background: var(--azul-principal, #2563eb);
  color: #fff;
}

.step-button.done .step-icon {
  background: #d1fae5;
  color: #047857;
}

.step-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 0.125rem;
}

.step-copy strong {
  font-size: 0.8125rem;
  font-weight: 800;
  line-height: 1.15;
}

.step-copy small {
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.2;
}

.step-received .step-copy small {
  color: #047857;
}

.step-pending .step-copy small {
  color: #c2410c;
}

.step-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-heading,
.payment-card-header,
.received-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.section-title {
  color: #111827;
  font-size: 1rem;
}

.section-subtitle {
  margin: 0.25rem 0 0;
  color: #64748b;
  font-size: 0.875rem;
}

.line-item {
  background: #fff;
}

.totals-grid,
.payment-status,
.settlement-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.settlement-summary {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.metric-card,
.payment-status > div,
.settlement-summary > div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
  padding: 0.875rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
  background: #fff;
  color: #64748b;
  font-size: 0.8125rem;
  font-weight: 700;
}

.metric-card strong,
.payment-status strong,
.settlement-summary strong {
  color: #111827;
  font-size: 1rem;
  font-weight: 800;
}

.money-card.received {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.money-card.pending {
  border-color: #fed7aa;
  background: #fff7ed;
}

.money-card.total {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.money-card-label {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  min-width: 0;
}

.money-card.received .money-card-label,
.money-received {
  color: #047857;
}

.money-card.pending .money-card-label {
  color: #c2410c;
}

.money-card.total .money-card-label {
  color: var(--azul-principal, #2563eb);
}

.metric-card.total {
  border-color: #bfdbfe;
  background: #eff6ff;
}

.metric-card.total strong {
  color: var(--azul-principal, #3b82f6);
}

.payment-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(300px, 0.9fr);
  gap: 1rem;
}

.payment-card,
.received-card,
.empty-state-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #fff;
}

.payment-card {
  min-width: 0;
}

.payment-card-header span,
.received-header span {
  display: block;
  color: #64748b;
  font-size: 0.8125rem;
  font-weight: 700;
}

.payment-card-header strong,
.received-header strong {
  color: #111827;
  font-size: 1rem;
  font-weight: 800;
}

.payment-toggle,
.installments-toggle {
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #fff;
  color: #374151;
  font-weight: 700;
}

.installments-toggle {
  border-radius: 0.625rem;
  background: #f8fafc;
}

.payment-toggle :deep(.switch-wrapper),
.installments-toggle :deep(.switch-wrapper) {
  width: 42px;
  height: 24px;
}

.payment-toggle :deep(.switch-toggle)::before,
.installments-toggle :deep(.switch-toggle)::before {
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
}

.payment-toggle :deep(.switch-input:checked + .switch-toggle::before),
.installments-toggle :deep(.switch-input:checked + .switch-toggle::before) {
  transform: translateX(18px);
}

.payment-toggle :deep(.switch-label),
.installments-toggle :deep(.switch-label) {
  padding-top: 2px;
  font-weight: 800;
}

.form-grid,
.credit-installments {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.pending-form .form-grid,
.credit-installments {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.pending-form .form-grid {
  align-items: end;
}

.pending-form :deep(.form-group) {
  margin-bottom: 0;
}

.pending-box {
  border-color: #fed7aa;
  background: #fffaf5;
}

.pending-box-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.875rem 1rem;
  border: 1px solid #fed7aa;
  border-radius: 0.625rem;
  background: #fff7ed;
  color: #c2410c;
}

.pending-box-header div {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.pending-box-header span {
  color: #9a3412;
  font-size: 0.8125rem;
  font-weight: 800;
}

.pending-box-header strong {
  color: #111827;
  font-size: 1.125rem;
  font-weight: 900;
}

.amount-input-wrapper,
.amount-group,
.input-wrapper {
  min-width: 0;
}

.amount-input-wrapper .form-input {
  width: 100%;
  max-width: 100%;
}

.date-picker-field :deep(.dp__main),
.date-picker-field :deep(.dp__input_wrap) {
  width: 100%;
}

.date-picker-field :deep(.dp__input) {
  min-height: 48px;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  color: #111827;
  font-family: inherit;
  font-size: 0.9375rem;
  padding-top: 0;
  padding-bottom: 0;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.date-picker-field :deep(.dp__input:hover) {
  border-color: #9ca3af;
}

.date-picker-field :deep(.dp__input_focus) {
  border-color: var(--azul-principal, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.date-picker-field :deep(.dp__input_icon) {
  color: #111827;
}

.amount-input {
  color: #111827;
  font-size: 1.125rem;
  font-weight: 800;
}

.quick-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.quick-actions button {
  min-height: 36px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  background: #f8fafc;
  color: #334155;
  font-size: 0.8125rem;
  font-weight: 800;
  cursor: pointer;
}

.quick-actions button:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: var(--azul-principal, #2563eb);
}

.preview-box {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: #f8fafc;
  color: #64748b;
  font-size: 0.8125rem;
  font-weight: 700;
}

.preview-box strong {
  color: #111827;
  font-size: 0.9375rem;
}

.add-payment-btn {
  width: 100%;
}

.received-list,
.pending-form {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.installments-panel .received-list {
  max-height: 280px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.received-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.625rem;
  background: #f8fafc;
}

.empty-list.compact {
  padding: 1.25rem 1rem;
}

.empty-state-panel {
  align-items: center;
  justify-content: center;
  min-height: 220px;
  color: #64748b;
  text-align: center;
}

.empty-state-panel svg {
  color: var(--azul-principal, #2563eb);
}

.empty-state-panel strong {
  color: #111827;
}

.empty-state-panel.success {
  min-height: 180px;
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.empty-state-panel.success svg,
.empty-state-panel.success strong {
  color: #047857;
}

.installments-count {
  width: 100%;
  max-width: none;
}

.header-close-btn {
  display: none;
}

@media (max-width: 820px) {
  .payment-layout {
    grid-template-columns: 1fr;
  }

}

@media (max-width: 640px) {
  .panel-heading {
    flex-direction: column;
    align-items: stretch;
  }

  .header-close-btn {
    display: flex;
  }

  .drawer-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.75rem;
  }

  .header-total {
    display: none;
  }

  .totals-grid,
  .payment-status,
  .settlement-summary,
  .form-grid,
  .credit-installments {
    grid-template-columns: 1fr;
  }

  .checkout-stepper {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    scrollbar-width: none;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    -webkit-overflow-scrolling: touch;
  }

  .checkout-stepper::-webkit-scrollbar {
    display: none;
  }


  .step-button {
    flex: 0 0 180px;
    min-height: 56px;
    scroll-snap-align: start;
  }

  .footer-actions-right {
    flex-direction: row;
    gap: 0.5rem;
  }

  .footer-actions-right > * {
    width: auto;
    min-width: 0;
  }

  .footer-btn-return {
    flex: 1.35 1 0;
  }

  .footer-btn-label {
    font-size: 0.8125rem;
  }
}
</style>
