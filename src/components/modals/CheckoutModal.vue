<script setup>
import { ref, computed } from 'vue'
import { X, CreditCard, Banknote, Smartphone, Receipt, DollarSign, Plus, Trash2, Check, Stethoscope } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'

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
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-container">
      <!-- Header -->
      <div class="modal-header">
        <div class="header-content">
          <div class="header-icon">
            <Receipt :size="26" />
          </div>
          <div class="header-text">
            <h2 class="modal-title">Finalizar Atendimento</h2>
            <p class="modal-subtitle">Revise os procedimentos e selecione a forma de pagamento</p>
          </div>
        </div>
        <button @click="$emit('close')" class="close-btn">
          <X :size="22" />
        </button>
      </div>

      <!-- Body -->
      <div class="modal-body">
        <!-- Left Section: Appointment Summary & Procedures -->
        <div class="left-section">

          <!-- Procedures List -->
          <div class="section-block">
            <div class="section-header">
              <h3 class="section-title">Procedimentos Realizados</h3>
              <span class="badge">{{ procedures.length }} {{ procedures.length === 1 ? 'item' : 'itens' }}</span>
            </div>
            
            <div class="procedures-table">
              <div v-for="(proc, index) in procedures" :key="index" class="procedure-row">
                <div class="procedure-col-main">
                  <div class="procedure-icon-wrapper">
                    <Stethoscope :size="16" class="procedure-icon" />
                  </div>
                  <div class="procedure-info">
                    <span class="procedure-name">{{ proc.name }}</span>
                    <span v-if="proc.quantity > 1" class="procedure-quantity">
                      {{ proc.quantity }}x {{ proc.unitType === 'ML' ? 'mL' : 'un' }}
                    </span>
                  </div>
                </div>
                <div class="procedure-col-price">
                  <span v-if="proc.discountPercentage > 0" class="price-original">
                    {{ formatCurrency(proc.originalValue) }}
                  </span>
                  <span class="price-final">{{ formatCurrency(proc.finalValue) }}</span>
                  <span v-if="proc.discountPercentage > 0" class="discount-tag">
                    -{{ proc.discountPercentage }}%
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div class="procedures-total">
            <span class="total-label">Total dos Procedimentos</span>
            <span class="total-value">{{ formatCurrency(totalAmount) }}</span>
          </div>
        </div>

        <!-- Right Section: Payment -->
        <div class="right-section">
          <!-- Payment Form -->
          <div class="section-block">
            <h3 class="section-title">Formas de Pagamento</h3>
            
            <div class="payment-form-grid">
              <div class="form-row">
                <div class="form-col">
                  <label class="form-label">Método</label>
                  <div class="select-with-icon">
                    <component :is="getPaymentIcon(currentPayment.method)" :size="16" class="select-icon" />
                    <StyledSelect
                      v-model="currentPayment.method"
                      :options="paymentMethodOptions"
                      class="form-select"
                    />
                  </div>
                </div>
                
                <div class="form-col">
                  <label class="form-label">Valor</label>
                  <div class="input-group">
                    <span class="input-prefix">R$</span>
                    <input
                      v-model="displayAmount"
                      @input="handleAmountInput"
                      @focus="handleAmountFocus"
                      @blur="handleAmountBlur"
                      type="text"
                      class="form-input"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>

              <div v-if="currentPayment.method === 'CARTAO_CREDITO'" class="form-row">
                <div class="form-col">
                  <label class="form-label">Parcelas</label>
                  <input
                    v-model.number="currentPayment.installments"
                    type="number"
                    min="1"
                    max="12"
                    class="form-input"
                    placeholder="1"
                  />
                </div>
                <div class="form-col installments-info-col">
                  <span class="installments-calc">
                    {{ currentPayment.installments }}x de {{ formatCurrency(currentPayment.amount / currentPayment.installments) }}
                  </span>
                </div>
              </div>

              <div class="form-actions">
                <button
                  v-if="remainingAmount > 0"
                  @click="fillRemainingAmount()"
                  class="btn-secondary"
                >
                  <DollarSign :size="16" />
                  Preencher Restante
                </button>
                <button
                  @click="confirmPayment"
                  class="btn-primary"
                  :disabled="currentPayment.amount <= 0"
                >
                  <Check :size="16" />
                  Adicionar Pagamento
                </button>
              </div>
            </div>
          </div>

          <!-- Payment Summary -->
          <div class="section-block payment-summary-block">
            <h3 class="section-title">Resumo do Pagamento</h3>
            
            <div class="summary-grid">

              <div v-if="confirmedPayments.length > 0" class="confirmed-list">
                <div v-for="(payment, index) in confirmedPayments" :key="index" class="confirmed-item">
                  <div class="confirmed-info">
                    <component :is="getPaymentIcon(payment.method)" :size="16" class="confirmed-icon" />
                    <div class="confirmed-details">
                      <span class="confirmed-name">
                        {{ paymentMethodOptions.find(opt => opt.value === payment.method)?.label }}
                      </span>
                      <span v-if="payment.method === 'CARTAO_CREDITO' && payment.installments > 1" class="confirmed-installments">
                        {{ payment.installments }}x de {{ formatCurrency(payment.amount / payment.installments) }}
                      </span>
                    </div>
                  </div>
                  <div class="confirmed-actions">
                    <span class="confirmed-value">{{ formatCurrency(payment.amount) }}</span>
                    <button @click="removeConfirmedPayment(index)" class="btn-remove">
                      <Trash2 :size="14" />
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="empty-state">
                <span>Nenhum método adicionado</span>
              </div>

              <div class="summary-row summary-paid">
                <span class="summary-label">Total Pago</span>
                <span class="summary-value" :class="{ 'is-complete': totalPaid >= totalAmount }">
                  {{ formatCurrency(totalPaid) }}
                </span>
              </div>

              <div class="summary-row summary-remaining" :class="{ 'is-success': Math.abs(remainingAmount) <= 0.01, 'is-error': remainingAmount > 0.01 }">
                <span class="summary-label">RESTANTE</span>
                <span class="summary-value">{{ formatCurrency(remainingAmount) }}</span>
              </div>

            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="modal-footer">
        <div class="footer-info">
          <Check :size="16" class="footer-icon" />
          <span>Os dados serão salvos automaticamente</span>
        </div>
        <div class="footer-actions">
          <AppButton variant="default" @click="$emit('close')" class="btn-cancel" :disabled="isLoading">
            <X :size="18" />
            Cancelar
          </AppButton>
          <AppButton
            variant="primary"
            @click="handleSubmit"
            :disabled="!isValid || isLoading"
            :loading="isLoading"
            class="btn-confirm"
          >
            <Check :size="18" />
            Finalizar Atendimento
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Overlay & Container */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(147, 51, 234, 0.12) 100%),
              rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 0;
  animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-container {
  background-color: #f8f9fa;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Header */
.modal-header {
  padding: 1rem 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
  overflow: hidden;
  border-bottom: 1px solid #e2e8f0;
}

.modal-header::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.5) 100%);
  pointer-events: none;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  position: relative;
  z-index: 1;
}

.header-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.header-icon:hover {
  transform: scale(1.05) rotate(5deg);
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  letter-spacing: -0.02em;
}

.modal-subtitle {
  font-size: 0.75rem;
  color: #64748b;
  margin: 0;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.close-btn {
  background: rgba(100, 116, 139, 0.1);
  border: none;
  cursor: pointer;
  color: #64748b;
  padding: 0.375rem;
  border-radius: 0.5rem;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.close-btn:hover {
  background: rgba(100, 116, 139, 0.15);
  color: #1e293b;
  transform: scale(1.1) rotate(90deg);
}

/* Body */
.modal-body {
  padding: 0;
  overflow-y: auto;
  flex: 1;
  background-color: #ffffff;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
}

/* Sections */
.left-section,
.right-section {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.left-section {
  background: linear-gradient(to bottom, #f9fafb 0%, #f3f4f6 100%);
  border-right: 1px solid #e5e7eb;
}

.right-section {
  background: #ffffff;
}

/* Section Blocks */
.section-block {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  overflow: visible;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 0.75rem;
  font-weight: 700;
  color: #1f2937;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
}

.badge {
  padding: 0.25rem 0.625rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  border-radius: 9999px;
  font-size: 0.625rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
  letter-spacing: 0.02em;
}

/* Procedures Table */
.procedures-table {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.procedure-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border-left: 3px solid transparent;
  border-radius: 0 0.375rem 0.375rem 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.procedure-row:hover {
  border-left-color: #3b82f6;
  background: linear-gradient(to right, #eff6ff, white);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
  transform: translateX(4px);
}

.procedure-col-main {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.procedure-icon-wrapper {
  width: 30px;
  height: 30px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.procedure-row:hover .procedure-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.procedure-icon {
  color: white;
}

.procedure-info {
  display: flex;
  flex-direction: column;
  gap: 0.188rem;
}

.procedure-name {
  font-size: 0.813rem;
  font-weight: 600;
  color: #111827;
  letter-spacing: -0.01em;
}

.procedure-quantity {
  font-size: 0.688rem;
  color: #6b7280;
  font-weight: 500;
}

.procedure-col-price {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.price-original {
  font-size: 0.75rem;
  color: #9ca3af;
  text-decoration: line-through;
  font-weight: 500;
}

.price-final {
  font-size: 0.938rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}

.discount-tag {
  padding: 0.188rem 0.5rem;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  border-radius: 0.375rem;
  font-size: 0.688rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
  letter-spacing: 0.02em;
}

.procedures-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.125rem;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  margin-top: 0.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  position: relative;
  overflow: hidden;
}

.procedures-total::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, transparent 0%, rgba(255, 255, 255, 0.1) 100%);
  pointer-events: none;
}

.total-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  position: relative;
  z-index: 1;
}

.total-value {
  font-size: 1.375rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Payment Form Grid */
.payment-form-grid {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.25rem;
}

.form-col {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.form-col.installments-info-col {
  display: flex;
  align-items: flex-end;
  padding-bottom: 0.75rem;
}

.form-label {
  font-size: 0.688rem;
  font-weight: 700;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.select-with-icon {
  position: relative;
  display: flex;
  align-items: center;
}

.select-icon {
  position: absolute;
  left: 1rem;
  color: #3b82f6;
  pointer-events: none;
  z-index: 2;
}

.form-select {
  width: 100%;
  padding-left: 3rem !important;
  position: relative;
  z-index: 1;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 1.125rem;
  font-size: 0.938rem;
  font-weight: 600;
  color: #6b7280;
  pointer-events: none;
}

.form-input {
  width: 100%;
  padding: 0.75rem 1rem;
  padding-left: 2.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 1rem;
  color: #111827;
  background: white;
  transition: all 0.2s ease;
  font-weight: 500;
  height: 48px;
  font-family: inherit;
}

.form-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.installments-calc {
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
}

.form-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.75rem;
}

.btn-secondary,
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.125rem;
  border-radius: 0.5rem;
  font-size: 0.813rem;
  font-weight: 700;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  border: none;
  letter-spacing: 0.01em;
}

.btn-secondary {
  background: white;
  border: 2px solid #3b82f6;
  color: #3b82f6;
  flex: 1;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.btn-secondary:hover {
  background: #3b82f6;
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(59, 130, 246, 0.3);
}

.btn-primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: white;
  flex: 2;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4);
}

.btn-primary:disabled {
  background: #d1d5db;
  color: #9ca3af;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Payment Summary Block */
.payment-summary-block {
  background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
  padding: 1.25rem;
  border-radius: 0.5rem;
}

.summary-grid {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.summary-row:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.summary-row.summary-total {
  background: linear-gradient(to right, #eff6ff, white);
  border-left: 3px solid #3b82f6;
  padding: 0.875rem 1.125rem;
}

.summary-row.summary-paid {
  background: white;
  border-left: 3px solid #d1d5db;
}

.summary-row.summary-remaining {
  background: white;
  border-left: 3px solid #d1d5db;
  padding: 0.875rem 1.125rem;
}

.summary-row.summary-remaining.is-success {
  background: linear-gradient(to right, #d1fae5, white);
  border-left-color: #10b981;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
}

.summary-row.summary-remaining.is-error {
  background: linear-gradient(to right, #fee2e2, white);
  border-left-color: #ef4444;
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.15);
}

.summary-label {
  font-size: 0.688rem;
  font-weight: 700;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.summary-value {
  font-size: 0.938rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.02em;
}

.summary-row.summary-total .summary-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: #3b82f6;
}

.summary-row.summary-remaining .summary-value {
  font-size: 1.375rem;
  font-weight: 800;
}

.summary-value.is-complete {
  color: #10b981;
}

/* Confirmed Payments List */
.confirmed-list {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.confirmed-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.125rem;
  background: white;
  border-left: 3px solid #3b82f6;
  border-radius: 0 0.5rem 0.5rem 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.confirmed-item:hover {
  background: linear-gradient(to right, #eff6ff, white);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.12);
  transform: translateX(4px);
}

.confirmed-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.confirmed-icon {
  color: #3b82f6;
  flex-shrink: 0;
}

.confirmed-details {
  display: flex;
  flex-direction: column;
  gap: 0.188rem;
}

.confirmed-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.confirmed-installments {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 500;
}

.confirmed-actions {
  display: flex;
  align-items: center;
  gap: 0.875rem;
}

.confirmed-value {
  font-size: 1rem;
  font-weight: 700;
  color: #111827;
  letter-spacing: -0.01em;
}

.btn-remove {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #ef4444;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  opacity: 0.6;
}

.btn-remove:hover {
  background: #fee2e2;
  opacity: 1;
  transform: scale(1.15);
}

/* Empty State */
.empty-state {
  padding: 2rem 1.5rem;
  text-align: center;
  background: white;
  border: 2px dashed #d1d5db;
  border-radius: 0.625rem;
  color: #9ca3af;
  font-size: 0.875rem;
  font-weight: 500;
}

/* Footer */
.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  box-shadow: 0 -4px 8px -2px rgba(0, 0, 0, 0.05);
}

.modal-footer .procedures-total {
  margin: 0;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
}

.footer-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
  font-size: 0.75rem;
  font-weight: 500;
}

.footer-icon {
  color: #10b981;
}

.footer-actions {
  display: flex;
  gap: 1rem;
}

.btn-cancel,
.btn-confirm {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  padding: 0.625rem 1.25rem;
  font-size: 0.813rem;
  letter-spacing: 0.01em;
}

/* Responsive */
@media (max-width: 1200px) {
  .modal-body {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .modal-header {
    padding: 1.25rem 1.5rem;
  }

  .left-section,
  .right-section {
    padding: 1.5rem;
  }

  .modal-body {
    grid-template-columns: 1fr;
  }

  .modal-footer {
    padding: 1.25rem 1.5rem;
    flex-direction: column;
    gap: 1rem;
  }

  .footer-info {
    order: 2;
  }

  .footer-actions {
    order: 1;
    width: 100%;
    flex-direction: column-reverse;
  }

  .btn-cancel,
  .btn-confirm {
    width: 100%;
    justify-content: center;
  }
}
</style>

