<script setup>
import { ref, computed, watch } from 'vue'
import { CreditCard, Banknote, Smartphone, Receipt, DollarSign, Plus, Trash2, Check, Calendar } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'

const props = defineProps({
  procedures: { type: Array, required: true },
  patientId: { type: String, required: true },
  appointmentId: { type: String, required: true },
  patientName: { type: String, required: true },
  appointmentDate: { type: String, required: true },
  appointmentTime: { type: String, required: true },
})

const emit = defineEmits(['close', 'confirm', 'schedule-return'])

const isLoading = ref(false)
const paidNow = ref(true)
const launchReceivable = ref(true)
const expectedPaymentMethod = ref('PIX')
const dueDate = ref(toDateInput(new Date()))
const useInstallments = ref(false)
const installmentCount = ref(2)
const confirmedPayments = ref([])
const displayAmount = ref('0,00')
const currentPayment = ref({
  method: 'DINHEIRO',
  amount: 0,
  installments: 1,
})

const paymentMethodOptions = [
  { label: 'Dinheiro', value: 'DINHEIRO', icon: Banknote },
  { label: 'PIX', value: 'PIX', icon: Smartphone },
  { label: 'Cartao de Credito', value: 'CARTAO_CREDITO', icon: CreditCard },
  { label: 'Cartao de Debito', value: 'CARTAO_DEBITO', icon: CreditCard },
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
  if (!launchReceivable.value) return false
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

async function handleSubmit() {
  if (!isValid.value) return

  isLoading.value = true
  try {
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
  } finally {
    isLoading.value = false
  }
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

watch(paidNow, (value) => {
  if (!value) {
    confirmedPayments.value = []
    currentPayment.value.amount = 0
    displayAmount.value = '0,00'
  }
})

watch(hasPendingBalance, (value) => {
  launchReceivable.value = value
  if (!value) useInstallments.value = false
})
</script>

<template>
  <SideDrawer @close="$emit('close')" size="lg">
    <template #header>
      <header class="drawer-header">
        <div class="header-texts">
          <h2 class="header-title">Finalizar atendimento</h2>
          <p class="header-subtitle">Fechamento financeiro do atendimento</p>
        </div>
      </header>
    </template>

    <template #default>
      <div class="drawer-body-content">
        <section class="form-section">
          <div class="section-header">
            <h3 class="section-title">Procedimentos realizados</h3>
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
        </section>

        <section class="totals-section">
          <div v-if="totalDiscount > 0" class="total-row">
            <span>Desconto</span>
            <span class="text-red">-{{ formatCurrency(totalDiscount) }}</span>
          </div>
          <div v-if="totalCost > 0" class="total-row">
            <span>Custo estimado</span>
            <span>{{ formatCurrency(totalCost) }}</span>
          </div>
          <div v-if="totalCost > 0" class="total-row">
            <span>Lucro estimado</span>
            <span class="text-green">{{ formatCurrency(grossProfit) }}</span>
          </div>
          <div class="total-row final">
            <span>Total do atendimento</span>
            <strong>{{ formatCurrency(totalAmount) }}</strong>
          </div>
        </section>

        <section class="form-section">
          <div class="section-header">
            <h3 class="section-title">Pago agora</h3>
          </div>

          <label class="checkbox-row">
            <input v-model="paidNow" type="checkbox" />
            <span>Paciente pagou agora</span>
          </label>

          <div v-if="paidNow" class="form-row">
            <div class="form-group">
              <label class="form-label">Metodo</label>
              <StyledSelect v-model="currentPayment.method" :options="paymentMethodOptions" />
            </div>
            <div class="form-group">
              <label class="form-label">Valor</label>
              <div class="input-wrapper">
                <span class="prefix">R$</span>
                <input
                  v-model="displayAmount"
                  @input="handleAmountInput"
                  @focus="handleAmountFocus"
                  @blur="handleAmountBlur"
                  type="text"
                  class="form-input pl-10"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div v-if="paidNow && currentPayment.method === 'CARTAO_CREDITO'" class="form-row">
            <div class="form-group">
              <label class="form-label">Parcelas no cartao</label>
              <input v-model.number="currentPayment.installments" type="number" min="1" max="12" class="form-input" />
            </div>
            <div class="form-group values-preview">
              <div class="preview-row">
                <span>Parcela</span>
                <strong>{{ formatCurrency(currentPayment.amount / currentPayment.installments) }}</strong>
              </div>
            </div>
          </div>

          <div v-if="paidNow" class="actions-row">
            <AppButton v-if="remainingAmount > 0" @click="fillRemainingAmount" variant="default" size="sm">
              <DollarSign :size="14" />
              Preencher {{ formatCurrency(remainingAmount) }}
            </AppButton>
            <AppButton @click="confirmPayment" variant="primary" size="sm" :disabled="currentPayment.amount <= 0">
              <Plus :size="14" />
              Adicionar
            </AppButton>
          </div>
        </section>

        <section v-if="paidNow" class="form-section">
          <div class="section-header">
            <h3 class="section-title">Pagamentos recebidos agora</h3>
          </div>

          <div v-if="confirmedPayments.length > 0" class="item-list">
            <div v-for="(payment, index) in confirmedPayments" :key="index" class="line-item">
              <div class="item-info">
                <span class="item-title">{{ paymentMethodOptions.find(opt => opt.value === payment.method)?.label }}</span>
                <span v-if="payment.method === 'CARTAO_CREDITO' && payment.installments > 1" class="item-meta">
                  {{ payment.installments }}x de {{ formatCurrency(payment.amount / payment.installments) }}
                </span>
              </div>
              <div class="item-values">
                <span class="final-price">{{ formatCurrency(payment.amount) }}</span>
                <button @click="removeConfirmedPayment(index)" class="remove-btn">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-list">Nenhum pagamento adicionado.</div>
        </section>

        <section v-if="hasPendingBalance" class="form-section">
          <div class="section-header">
            <h3 class="section-title">Saldo em A receber</h3>
          </div>

          <label class="checkbox-row">
            <input v-model="launchReceivable" type="checkbox" />
            <span>Lancar saldo em A receber</span>
          </label>

          <div v-if="launchReceivable" class="pending-box">
            <div class="balance-status">
              <span>Valor pendente</span>
              <strong>{{ formatCurrency(remainingAmount) }}</strong>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Forma prevista</label>
                <StyledSelect v-model="expectedPaymentMethod" :options="paymentMethodOptions" />
              </div>
              <div class="form-group">
                <label class="form-label">Vencimento</label>
                <input v-model="dueDate" type="date" class="form-input" />
              </div>
            </div>

            <label class="checkbox-row">
              <input v-model="useInstallments" type="checkbox" />
              <span>Parcelar saldo pendente</span>
            </label>

            <div v-if="useInstallments" class="installments-panel">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Quantidade de parcelas</label>
                  <input v-model.number="installmentCount" type="number" min="1" max="24" class="form-input" />
                </div>
              </div>

              <div class="item-list">
                <div v-for="(installment, index) in generatedInstallments" :key="index" class="line-item">
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
        </section>

        <section class="totals-section sticky-footer">
          <div class="total-row">
            <span>Pago agora</span>
            <span :class="{ 'text-green': totalPaid >= totalAmount }">{{ formatCurrency(totalPaid) }}</span>
          </div>
          <div class="total-row" :class="{ discount: remainingAmount > 0.01 }">
            <span>Pendente</span>
            <span>{{ formatCurrency(remainingAmount) }}</span>
          </div>
          <div class="total-row">
            <span>Status financeiro</span>
            <strong v-if="!hasPendingBalance">Pago</strong>
            <strong v-else-if="totalPaid > 0">Parcial</strong>
            <strong v-else>Aberto</strong>
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" class="footer-btn-cancel" @click="$emit('close')" :disabled="isLoading">
          <span class="footer-btn-label">Cancelar</span>
        </AppButton>
        <div class="footer-actions-right">
          <AppButton variant="default" class="footer-btn-return" @click="emit('schedule-return')" :disabled="isLoading">
            <Calendar :size="18" />
            <span class="footer-btn-label">Agendar retorno</span>
          </AppButton>
          <AppButton variant="primary" class="footer-btn-finish" @click="handleSubmit" :disabled="!isValid || isLoading" :loading="isLoading">
            <Check :size="18" />
            <span class="footer-btn-label">Finalizar atendimento</span>
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
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

.footer-actions-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
  .form-row,
  .drawer-footer,
  .footer-actions-right {
    flex-direction: column;
  }

  .footer-btn-cancel,
  .footer-btn-return,
  .footer-btn-finish {
    width: 100%;
  }
}
</style>
