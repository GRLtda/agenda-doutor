<script setup>
import { ref, computed } from 'vue'
import { X, CreditCard, Banknote, Smartphone, Receipt, DollarSign, Plus, Trash2, Check, Stethoscope, Calendar, User } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'

const props = defineProps({
  procedures: {
    type: Array,
    required: true,
  },
  patientId: {
    type: String,
    required: true,
  },
  appointmentId: {
    type: String,
    required: true,
  },
  patientName: {
    type: String,
    required: true,
  },
  appointmentDate: {
    type: String,
    required: true,
  },
  appointmentTime: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close', 'confirm'])

const isLoading = ref(false)

// Payment methods options
const paymentMethodOptions = [
  { label: 'Dinheiro', value: 'DINHEIRO', icon: Banknote },
  { label: 'PIX', value: 'PIX', icon: Smartphone },
  { label: 'Cartão de Crédito', value: 'CARTAO_CREDITO', icon: CreditCard },
  { label: 'Cartão de Débito', value: 'CARTAO_DEBITO', icon: CreditCard },
  { label: 'Boleto', value: 'BOLETO', icon: Receipt },
]

// Payment methods state
const currentPayment = ref({
  method: 'DINHEIRO',
  amount: 0,
  installments: 1,
})

const confirmedPayments = ref([])

// Display value for formatted input
const displayAmount = ref('')

// Total amount from procedures
const totalAmount = computed(() => {
  return props.procedures.reduce((sum, proc) => sum + (proc.finalValue || 0), 0)
})

// Total paid
const totalPaid = computed(() => {
  return confirmedPayments.value.reduce((sum, pm) => sum + (pm.amount || 0), 0)
})

// Remaining amount
const remainingAmount = computed(() => {
  return totalAmount.value - totalPaid.value
})

// Validation
const isValid = computed(() => {
  // Allow checkout if total is zero
  if (totalAmount.value === 0 && totalPaid.value === 0) return true

  // Check if there are confirmed payments
  if (confirmedPayments.value.length === 0) return false
  
  // Check if all payment methods have amounts > 0
  const allHaveAmounts = confirmedPayments.value.every(pm => pm.amount > 0)
  
  // Check if total paid equals total amount (with 0.01 tolerance)
  const diff = Math.abs(totalPaid.value - totalAmount.value)
  const totalsMatch = diff <= 0.01
  
  return allHaveAmounts && totalsMatch
})

// Confirm current payment
// Confirm payment
const confirmPayment = () => {
  if (currentPayment.value.amount <= 0) return
  
  // Prevent overpayment
  const newTotal = totalPaid.value + currentPayment.value.amount
  if (newTotal > totalAmount.value) {
    // Adjust to remaining amount
    currentPayment.value.amount = remainingAmount.value
    displayAmount.value = formatValueForDisplay(remainingAmount.value)
    return
  }
  
  confirmedPayments.value.push({
    method: currentPayment.value.method,
    amount: currentPayment.value.amount,
    installments: currentPayment.value.installments,
  })
  
  // Reset form
  currentPayment.value = {
    method: 'DINHEIRO',
    amount: 0,
    installments: 1,
  }
  displayAmount.value = '0,00'
}

// Remove confirmed payment
const removeConfirmedPayment = (index) => {
  confirmedPayments.value.splice(index, 1)
}

// Auto-fill remaining amount
const fillRemainingAmount = () => {
  if (remainingAmount.value > 0) {
    currentPayment.value.amount = remainingAmount.value
    displayAmount.value = formatValueForDisplay(remainingAmount.value)
  }
}

// Get icon for payment method
const getPaymentIcon = (method) => {
  const option = paymentMethodOptions.find(opt => opt.value === method)
  return option?.icon || DollarSign
}

// Handle submit
const handleSubmit = async () => {
  if (!isValid.value) return

  isLoading.value = true
  
  try {
    emit('confirm', {
      patientId: props.patientId,
      appointmentId: props.appointmentId,
      paymentMethods: confirmedPayments.value.map(pm => ({
        method: pm.method,
        amount: pm.amount,
        installments: pm.method === 'CARTAO_CREDITO' ? pm.installments : 1,
      })),
    })
  } catch (error) {
    console.error('Erro ao processar checkout:', error)
  } finally {
    isLoading.value = false
  }
}

// Format currency for display
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Format value for input display (without R$)
function formatValueForDisplay(value) {
  if (!value && value !== 0) return ''
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

// Parse formatted value to number
function parseFormattedValue(formattedValue) {
  if (!formattedValue) return 0
  // Remove all dots (thousands separator)
  let cleaned = formattedValue.replace(/\./g, '')
  // Replace comma with dot (decimal separator)
  cleaned = cleaned.replace(',', '.')
  return parseFloat(cleaned) || 0
}

// Handle input change with real-time formatting
function handleAmountInput(event) {
  let input = event.target.value
  
  // Remove all non-numeric characters except comma
  input = input.replace(/[^\d,]/g, '')
  
  // Remove multiple commas, keep only the last one
  const parts = input.split(',')
  if (parts.length > 2) {
    input = parts.slice(0, -1).join('') + ',' + parts[parts.length - 1]
  }
  
  // Limit decimal places to 2
  if (input.includes(',')) {
    const [integer, decimal] = input.split(',')
    input = integer + ',' + (decimal || '').slice(0, 2)
  }
  
  // Parse to number
  const numericValue = parseFormattedValue(input)
  currentPayment.value.amount = numericValue
  
  // Format with thousands separator in real-time
  if (input && input !== ',') {
    const [integerPart, decimalPart] = input.split(',')
    
    // Add thousands separator to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    
    // Combine with decimal part
    if (decimalPart !== undefined) {
      displayAmount.value = formattedInteger + ',' + decimalPart
    } else {
      displayAmount.value = formattedInteger
    }
  } else {
    displayAmount.value = input
  }
}

// Handle input focus
function handleAmountFocus() {
  if (currentPayment.value.amount === 0) {
    displayAmount.value = ''
  }
}

// Handle input blur
function handleAmountBlur() {
  if (!displayAmount.value || currentPayment.value.amount === 0) {
    currentPayment.value.amount = 0
    displayAmount.value = '0,00'
  } else {
    displayAmount.value = formatValueForDisplay(currentPayment.value.amount)
  }
}

// Initialize display amount
displayAmount.value = '0,00'
</script>

<template>
  <SideDrawer @close="$emit('close')" size="lg">
    <template #header>
      <header class="drawer-header">
        <div class="header-texts">
          <h2 class="header-title">Finalizar Atendimento</h2>
          <p class="header-subtitle">Revise os procedimentos e selecione a forma de pagamento</p>
        </div>
      </header>
    </template>

    <template #default>
      <div class="drawer-body-content">
        <!-- Procedimentos -->
        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">Procedimentos Realizados</h3>
          </div>

          <div v-if="procedures.length > 0" class="procedures-list">
            <div v-for="(proc, index) in procedures" :key="index" class="procedure-item">
              <div class="proc-info">
                <span class="proc-name">{{ proc.name }}</span>
                <span class="proc-details">
                  {{ proc.quantity > 1 ? `${proc.quantity}x` : '' }}
                  <span v-if="proc.discountPercentage > 0" class="discount-badge">
                    -{{ proc.discountPercentage }}%
                  </span>
                </span>
              </div>
              <div class="proc-values">
                <span v-if="proc.originalValue > proc.finalValue" class="original-price">
                  {{ formatCurrency(proc.originalValue) }}
                </span>
                <span class="final-price">{{ formatCurrency(proc.finalValue) }}</span>
              </div>
            </div>
          </div>
          <div v-else class="empty-list">Nenhum procedimento neste atendimento.</div>
        </div>

        <!-- Totais dos procedimentos -->
        <div class="totals-section">
          <div class="total-row final">
            <span>Total dos Procedimentos:</span>
            <strong>{{ formatCurrency(totalAmount) }}</strong>
          </div>
        </div>

        <!-- Forma de Pagamento -->
        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">Forma de Pagamento</h3>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Método</label>
              <StyledSelect
                v-model="currentPayment.method"
                :options="paymentMethodOptions"
              />
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

          <div v-if="currentPayment.method === 'CARTAO_CREDITO'" class="form-row">
            <div class="form-group">
              <label class="form-label">Parcelas</label>
              <input
                v-model.number="currentPayment.installments"
                type="number"
                min="1"
                max="12"
                class="form-input"
              />
            </div>
            <div class="form-group values-preview">
              <div class="preview-row">
                <span>Parcela:</span>
                <strong>{{ formatCurrency(currentPayment.amount / currentPayment.installments) }}</strong>
              </div>
            </div>
          </div>

          <div class="add-procedure-actions">
            <AppButton
              v-if="remainingAmount > 0"
              @click="fillRemainingAmount"
              variant="default"
              size="sm"
            >
              <DollarSign :size="14" />
              Preencher {{ formatCurrency(remainingAmount) }}
            </AppButton>
            <AppButton
              @click="confirmPayment"
              variant="primary"
              size="sm"
              :disabled="currentPayment.amount <= 0"
            >
              <Plus :size="14" />
              Adicionar
            </AppButton>
          </div>
        </div>

        <!-- Pagamentos Adicionados -->
        <div class="form-section">
          <div class="section-header">
            <h3 class="section-title">Pagamentos</h3>
          </div>

          <div v-if="confirmedPayments.length > 0" class="procedures-list">
            <div v-for="(payment, index) in confirmedPayments" :key="index" class="procedure-item">
              <div class="proc-info">
                <span class="proc-name">
                  {{ paymentMethodOptions.find(opt => opt.value === payment.method)?.label }}
                </span>
                <span v-if="payment.method === 'CARTAO_CREDITO' && payment.installments > 1" class="proc-details">
                  {{ payment.installments }}x de {{ formatCurrency(payment.amount / payment.installments) }}
                </span>
              </div>
              <div class="proc-values">
                <span class="final-price">{{ formatCurrency(payment.amount) }}</span>
                <button @click="removeConfirmedPayment(index)" class="remove-btn">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
          <div v-else class="empty-list">Nenhum pagamento adicionado.</div>
        </div>

        <!-- Resumo Final -->
        <div class="totals-section sticky-footer">
          <div class="total-row">
            <span>Total Pago:</span>
            <span :class="{ 'text-green': totalPaid >= totalAmount }">{{ formatCurrency(totalPaid) }}</span>
          </div>
          <div class="total-row" :class="{ discount: remainingAmount > 0.01 }">
            <span>Restante:</span>
            <span>{{ formatCurrency(remainingAmount) }}</span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="drawer-footer space-between">
        <AppButton variant="default" @click="$emit('close')" :disabled="isLoading">
          Cancelar
        </AppButton>
        <AppButton
          variant="primary"
          @click="handleSubmit"
          :disabled="!isValid || isLoading"
          :loading="isLoading"
        >
          <Check :size="18" />
          Finalizar
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>
<style>
/* Header */
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.header-texts {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.header-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.header-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

/* Body Content */
.drawer-body-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Form Section */
.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
}

.badge {
  padding: 0.25rem 0.625rem;
  background: var(--azul-principal, #3b82f6);
  color: white;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

/* Form */
.form-row {
  display: flex;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  flex: 1;
}

.form-group.flex-2 {
  flex: 2;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #374151;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  transition: all 0.2s;
  width: 100%;
  color: #111827;
  background: #fff;
  height: 48px;
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
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6b7280;
  font-weight: 500;
}

.pl-10 {
  padding-left: 2.5rem;
}

/* Procedures List */
.procedures-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.procedure-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
}

.proc-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.proc-name {
  font-weight: 600;
  color: #111827;
  font-size: 0.9375rem;
}

.proc-details {
  font-size: 0.75rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.discount-badge {
  background: #fef2f2;
  color: #dc2626;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
}

.proc-values {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.original-price {
  font-size: 0.8125rem;
  color: #9ca3af;
  text-decoration: line-through;
}

.final-price {
  font-weight: 700;
  color: #111827;
  font-size: 0.9375rem;
}

.remove-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.375rem;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.remove-btn:hover {
  color: #dc2626;
  background: #fef2f2;
}

.empty-list {
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
  font-size: 0.875rem;
  background: #f9fafb;
  border-radius: 0.75rem;
  border: 1px #d1d5db;
}

/* Totals */
.totals-section {
  background: #fff;
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid #e5e7eb;
}

.totals-section.sticky-footer {
  position: sticky;
  bottom: 0;
  z-index: 10;
  background: #fff;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9375rem;
  color: #6b7280;
}

.total-row.discount {
  color: #dc2626;
}

.total-row.final {
  font-weight: 500;
  color: var(--azul-principal, #3b82f6);
  font-size: 1.125rem;
}

.text-green {
  color: #059669;
}

/* Actions */
.add-procedure-actions {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
}

.values-preview {
  background: #fff;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: #6b7280;
}

/* Footer */
.drawer-footer {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

.drawer-footer.space-between {
  justify-content: space-between;
}

/* Hide number spinners */
input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type=number] {
  -moz-appearance: textfield;
}
</style>
