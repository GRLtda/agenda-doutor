<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import {
  X,
  Save,
  Receipt,
  Plus,
  Trash2,
  CreditCard,
  FileText,
  Calendar,
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import FormInput from '@/components/global/FormInput.vue'
import { useProceduresStore } from '@/stores/procedures'
import { useBudgetsStore } from '@/stores/budgets'
import { useToast } from 'vue-toastification'

const props = defineProps({
  patientId: {
    type: String,
    required: true,
  },
  budget: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'saved'])

const proceduresStore = useProceduresStore()
const budgetsStore = useBudgetsStore()
const toast = useToast()

const isLoading = ref(false)

// Form State
const budgetName = ref('')
const selectedProcedures = ref([])
const paymentMethods = ref([])
const observations = ref('')
const validUntil = ref('')

// New Procedure Form
const showAddProcedure = ref(false)
const newProcedureId = ref('')
const newProcedureQuantity = ref(1)
const newProcedureDiscountMode = ref('percentage')
const newProcedureDiscountPercentage = ref(0)
const newProcedureDiscountValue = ref(0)

// Payment Method Options
const paymentMethodOptions = [
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'PIX', label: 'PIX' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'BOLETO', label: 'Boleto' },
]

// Load procedures on mount
onMounted(async () => {
  if (proceduresStore.procedures.length === 0) {
    await proceduresStore.fetchProcedures()
  }

  // If editing, populate form
  if (props.budget) {
    budgetName.value = props.budget.name || ''
    selectedProcedures.value = (props.budget.procedures || []).map(p => ({ ...p }))
    paymentMethods.value = (props.budget.paymentMethods || []).map(pm => ({ ...pm }))
    observations.value = props.budget.observations || ''
    validUntil.value = props.budget.validUntil ? props.budget.validUntil.split('T')[0] : ''
  }
})

const procedures = computed(() => proceduresStore.procedures)

const procedureOptions = computed(() => {
  return procedures.value.map((proc) => ({
    label: `${proc.name} - ${formatCurrency(proc.baseValue || proc.pricePerUnit || 0)}`,
    value: proc._id,
  }))
})

const selectedProcedureData = computed(() => {
  return procedures.value.find((p) => p._id === newProcedureId.value)
})

const newProcedureOriginalValue = computed(() => {
  if (!selectedProcedureData.value) return 0
  const price = selectedProcedureData.value.baseValue || selectedProcedureData.value.pricePerUnit || 0
  if (selectedProcedureData.value.pricingType === 'UNIT' || selectedProcedureData.value.pricingType === 'ML') {
    return price * newProcedureQuantity.value
  }
  return price
})

const newProcedureFinalValue = computed(() => {
  const value = newProcedureOriginalValue.value
  if (newProcedureDiscountMode.value === 'fixed') {
    return Math.max(0, value - newProcedureDiscountValue.value)
  }
  if (newProcedureDiscountPercentage.value > 0) {
    return value * (1 - newProcedureDiscountPercentage.value / 100)
  }
  return value
})

// Totals
const totalOriginal = computed(() => {
  return selectedProcedures.value.reduce((sum, p) => sum + (p.originalValue || 0), 0)
})

const totalFinal = computed(() => {
  return selectedProcedures.value.reduce((sum, p) => sum + (p.finalValue || 0), 0)
})

const totalDiscount = computed(() => {
  return totalOriginal.value - totalFinal.value
})

// Helpers
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

// Add procedure to list
function handleAddProcedure() {
  if (!newProcedureId.value || !selectedProcedureData.value) return

  selectedProcedures.value.push({
    procedureId: newProcedureId.value,
    name: selectedProcedureData.value.name,
    originalValue: newProcedureOriginalValue.value,
    discountPercentage: newProcedureDiscountMode.value === 'percentage' ? newProcedureDiscountPercentage.value : 0,
    discountValue: newProcedureDiscountMode.value === 'fixed' ? newProcedureDiscountValue.value : 0,
    finalValue: newProcedureFinalValue.value,
    quantity: newProcedureQuantity.value,
    unitType: selectedProcedureData.value.pricingType || 'FIXED',
  })

  // Reset form
  newProcedureId.value = ''
  newProcedureQuantity.value = 1
  newProcedureDiscountMode.value = 'percentage'
  newProcedureDiscountPercentage.value = 0
  newProcedureDiscountValue.value = 0
  showAddProcedure.value = false
}

function removeProcedure(index) {
  selectedProcedures.value.splice(index, 1)
}

// Payment Methods
function addPaymentMethod() {
  paymentMethods.value.push({
    method: 'PIX',
    installments: 1,
    description: '',
  })
}

function removePaymentMethod(index) {
  paymentMethods.value.splice(index, 1)
}

// Submit
async function handleSubmit() {
  if (!budgetName.value.trim()) {
    toast.warning('Digite um nome para o orçamento.')
    return
  }
  if (selectedProcedures.value.length === 0) {
    toast.warning('Adicione pelo menos um procedimento.')
    return
  }

  isLoading.value = true

  const budgetData = {
    patientId: props.patientId,
    name: budgetName.value,
    procedures: selectedProcedures.value,
    paymentMethods: paymentMethods.value.filter(pm => pm.method),
    observations: observations.value,
    validUntil: validUntil.value || null,
  }

  let result
  if (props.budget?._id) {
    result = await budgetsStore.updateBudget(props.budget._id, budgetData)
  } else {
    result = await budgetsStore.createBudget(budgetData)
  }

  isLoading.value = false

  if (result.success) {
    toast.success(props.budget ? 'Orçamento atualizado!' : 'Orçamento criado!')
    emit('saved', result.data)
    emit('close')
  } else {
    toast.error(result.error || 'Erro ao salvar orçamento.')
  }
}

// Watchers
watch(newProcedureDiscountPercentage, (val) => {
  if (val > 100) newProcedureDiscountPercentage.value = 100
  if (val < 0) newProcedureDiscountPercentage.value = 0
})

watch(newProcedureDiscountMode, () => {
  newProcedureDiscountPercentage.value = 0
  newProcedureDiscountValue.value = 0
})
</script>

<template>
  <SideDrawer @close="$emit('close')" size="large">
    <template #header>
      <div class="drawer-header">
        <h2 class="drawer-title">
          <Receipt :size="20" />
          {{ budget ? 'Editar Orçamento' : 'Novo Orçamento' }}
        </h2>
        <button @click="$emit('close')" class="close-btn-header">
          <X :size="24" />
        </button>
      </div>
    </template>

    <div class="drawer-body-content">
      <!-- Budget Name -->
      <div class="form-section">
        <FormInput
          v-model="budgetName"
          label="Nome do Orçamento"
          placeholder="Ex: Tratamento Facial Completo"
          required
        />
      </div>

      <!-- Procedures List -->
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">Procedimentos</h3>
          <AppButton
            variant="ghost"
            size="sm"
            @click="showAddProcedure = true"
            v-if="!showAddProcedure"
          >
            <Plus :size="16" />
            Adicionar
          </AppButton>
        </div>

        <!-- Add Procedure Form -->
        <div v-if="showAddProcedure" class="add-procedure-form">
          <div class="form-row">
            <div class="form-group flex-2">
              <label class="form-label">Procedimento</label>
              <StyledSelect
                v-model="newProcedureId"
                :options="procedureOptions"
                placeholder="Selecione..."
              />
            </div>
            <div
              class="form-group"
              v-if="selectedProcedureData?.pricingType === 'UNIT' || selectedProcedureData?.pricingType === 'ML'"
            >
              <label class="form-label">Qtd</label>
              <input
                v-model.number="newProcedureQuantity"
                type="number"
                min="0.1"
                step="0.1"
                class="form-input"
              />
            </div>
          </div>

          <div class="form-row" v-if="newProcedureId">
            <div class="form-group">
              <div class="label-row">
                <label class="form-label">Desconto</label>
                <button
                  class="toggle-mode-btn"
                  @click="newProcedureDiscountMode = newProcedureDiscountMode === 'percentage' ? 'fixed' : 'percentage'"
                >
                  {{ newProcedureDiscountMode === 'percentage' ? 'Usar R$' : 'Usar %' }}
                </button>
              </div>
              <div class="input-wrapper">
                <span class="prefix" v-if="newProcedureDiscountMode === 'fixed'">R$</span>
                <input
                  v-if="newProcedureDiscountMode === 'percentage'"
                  v-model.number="newProcedureDiscountPercentage"
                  type="number"
                  min="0"
                  max="100"
                  class="form-input"
                  placeholder="0"
                />
                <input
                  v-else
                  v-model.number="newProcedureDiscountValue"
                  type="number"
                  min="0"
                  step="0.01"
                  class="form-input pl-10"
                  placeholder="0,00"
                />
                <span class="suffix" v-if="newProcedureDiscountMode === 'percentage'">%</span>
              </div>
            </div>

            <div class="form-group values-preview">
              <div class="preview-row">
                <span>Original:</span>
                <strong>{{ formatCurrency(newProcedureOriginalValue) }}</strong>
              </div>
              <div class="preview-row final">
                <span>Final:</span>
                <strong>{{ formatCurrency(newProcedureFinalValue) }}</strong>
              </div>
            </div>
          </div>

          <div class="add-procedure-actions">
            <AppButton variant="default" size="sm" @click="showAddProcedure = false">
              Cancelar
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              @click="handleAddProcedure"
              :disabled="!newProcedureId"
            >
              Adicionar
            </AppButton>
          </div>
        </div>

        <!-- Procedures List -->
        <div v-if="selectedProcedures.length > 0" class="procedures-list">
          <div
            v-for="(proc, index) in selectedProcedures"
            :key="index"
            class="procedure-item"
          >
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
              <button @click="removeProcedure(index)" class="remove-btn">
                <Trash2 :size="14" />
              </button>
            </div>
          </div>
        </div>

        <div v-else-if="!showAddProcedure" class="empty-list">
          Nenhum procedimento adicionado.
        </div>
      </div>

      <!-- Totals -->
      <div v-if="selectedProcedures.length > 0" class="totals-section">
        <div class="total-row">
          <span>Subtotal:</span>
          <span>{{ formatCurrency(totalOriginal) }}</span>
        </div>
        <div v-if="totalDiscount > 0" class="total-row discount">
          <span>Desconto:</span>
          <span>-{{ formatCurrency(totalDiscount) }}</span>
        </div>
        <div class="total-row final">
          <span>Total:</span>
          <strong>{{ formatCurrency(totalFinal) }}</strong>
        </div>
      </div>

      <!-- Payment Methods -->
      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">
            <CreditCard :size="16" />
            Formas de Pagamento
          </h3>
          <AppButton variant="ghost" size="sm" @click="addPaymentMethod">
            <Plus :size="16" />
            Adicionar
          </AppButton>
        </div>

        <div v-if="paymentMethods.length > 0" class="payment-methods-list">
          <div
            v-for="(pm, index) in paymentMethods"
            :key="index"
            class="payment-method-item"
          >
            <StyledSelect
              v-model="pm.method"
              :options="paymentMethodOptions"
              class="flex-1"
            />
            <input
              v-if="pm.method === 'CARTAO_CREDITO'"
              v-model.number="pm.installments"
              type="number"
              min="1"
              max="12"
              class="form-input installments-input"
              placeholder="Parcelas"
            />
            <button @click="removePaymentMethod(index)" class="remove-btn">
              <Trash2 :size="14" />
            </button>
          </div>
        </div>
        <div v-else class="empty-list">
          Nenhuma forma de pagamento definida.
        </div>
      </div>

      <!-- Validity -->
      <div class="form-section">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">
              <Calendar :size="14" />
              Validade do Orçamento
            </label>
            <input
              v-model="validUntil"
              type="date"
              class="form-input"
            />
          </div>
        </div>
      </div>

      <!-- Observations -->
      <div class="form-section">
        <label class="form-label">
          <FileText :size="14" />
          Observações
        </label>
        <textarea
          v-model="observations"
          class="form-textarea"
          placeholder="Informações adicionais sobre o orçamento..."
          rows="3"
        ></textarea>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')">
          <X :size="18" />
          Cancelar
        </AppButton>
        <AppButton
          variant="primary"
          @click="handleSubmit"
          :loading="isLoading"
          :disabled="isLoading"
        >
          <Save :size="18" />
          {{ budget ? 'Salvar Alterações' : 'Criar Orçamento' }}
        </AppButton>
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
}

.drawer-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn-header {
  display: none;
}

.drawer-body-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  padding-bottom: 1rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

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
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toggle-mode-btn {
  background: none;
  border: none;
  font-size: 0.75rem;
  color: var(--azul-principal, #3b82f6);
  cursor: pointer;
  font-weight: 500;
  padding: 0;
}

.toggle-mode-btn:hover {
  text-decoration: underline;
}

.form-input,
.form-textarea {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 0.9375rem;
  transition: all 0.2s ease;
  font-family: inherit;
  width: 100%;
  color: #111827;
  background-color: #fff;
}

.form-input {
  height: 44px;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--azul-principal, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.prefix {
  position: absolute;
  left: 1rem;
  color: #6b7280;
  pointer-events: none;
  font-weight: 500;
}

.suffix {
  position: absolute;
  right: 1rem;
  color: #6b7280;
  pointer-events: none;
  font-weight: 500;
}

.pl-10 {
  padding-left: 2.5rem;
}

.add-procedure-form {
  background: #f9fafb;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  border: 1px solid #e5e7eb;
}

.values-preview {
  background: #fff;
  padding: 0.75rem;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
  gap: 0.25rem;
}

.preview-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: #6b7280;
}

.preview-row.final {
  color: #111827;
  font-weight: 600;
}

.add-procedure-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

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
  display: flex;
  align-items: center;
  justify-content: center;
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
  border: 1px dashed #d1d5db;
}

.totals-section {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 0.75rem;
  padding: 1rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  border: 1px solid #bae6fd;
}

.total-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9375rem;
  color: #374151;
}

.total-row.discount {
  color: #dc2626;
}

.total-row.final {
  border-top: 1px solid #7dd3fc;
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  font-size: 1.125rem;
}

.total-row.final strong {
  color: #0284c7;
}

.payment-methods-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.payment-method-item {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.payment-method-item .flex-1 {
  flex: 1;
}

.installments-input {
  width: 80px;
  flex: none;
}

.drawer-footer {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
}
</style>
