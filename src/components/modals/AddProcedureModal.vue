<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { X, Save, Stethoscope, Check } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import { useProceduresStore } from '@/stores/procedures'

const props = defineProps({
  appointmentId: {
    type: String,
    required: true,
  },
  isLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['close', 'save'])

const proceduresStore = useProceduresStore()

const selectedProcedureId = ref('')
const discountPercentage = ref(0)
const discountValue = ref(0)
const discountMode = ref('percentage') // 'percentage' | 'fixed'

// Carrega os procedimentos ao montar o modal
onMounted(async () => {
  if (proceduresStore.procedures.length === 0) {
    await proceduresStore.fetchProcedures()
  }
})

const procedures = computed(() => proceduresStore.procedures)

const procedureOptions = computed(() => {
  return procedures.value.map((proc) => ({
    label: proc.name,
    value: proc._id,
  }))
})

const selectedProcedure = computed(() => {
  return procedures.value.find((p) => p._id === selectedProcedureId.value)
})

const quantity = ref(1)

// Watcher para limitar o desconto a 100%
watch(discountPercentage, (newValue) => {
  if (newValue > 100) {
    discountPercentage.value = 100
  } else if (newValue < 0) {
    discountPercentage.value = 0
  }
})

// Reset discount values when mode changes
watch(discountMode, () => {
  discountPercentage.value = 0
  discountValue.value = 0
})

const originalValue = computed(() => {
  if (!selectedProcedure.value) return 0

  const price = selectedProcedure.value.baseValue || selectedProcedure.value.pricePerUnit || 0

  if (selectedProcedure.value.pricingType === 'UNIT' || selectedProcedure.value.pricingType === 'ML') {
    return price * quantity.value
  }

  return price
})

const finalValue = computed(() => {
  const value = originalValue.value
  
  if (discountMode.value === 'fixed') {
     return Math.max(0, value - discountValue.value)
  }
  
  if (discountPercentage.value > 0) {
    return value * (1 - discountPercentage.value / 100)
  }
  return value
})

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function handleSubmit() {
  if (!selectedProcedureId.value) return

  const payload = {
    appointmentId: props.appointmentId,
    procedureId: selectedProcedureId.value,
    discountPercentage: discountMode.value === 'percentage' ? discountPercentage.value : 0,
    discountValue: discountMode.value === 'fixed' ? discountValue.value : 0,
    quantity: quantity.value,
  }

  emit('save', payload)
}

function handleProcedureChange() {
  quantity.value = 1
}
</script>

<template>
  <SideDrawer @close="$emit('close')">
    <template #header>
      <div class="drawer-header">
        <h2 class="drawer-title">
          <Stethoscope :size="20" />
          Adicionar Procedimento
        </h2>
        <button @click="$emit('close')" class="close-btn-header">
          <X :size="24" />
        </button>
      </div>
    </template>

    <div class="drawer-body-content">
      <div class="form-group">
        <label class="form-label">Procedimento</label>
        <StyledSelect
          v-model="selectedProcedureId"
          :options="procedureOptions"
          @update:modelValue="handleProcedureChange"
        />
      </div>

      <div class="form-row">
        <div class="form-group" v-if="selectedProcedure?.pricingType === 'UNIT' || selectedProcedure?.pricingType === 'ML'">
          <label class="form-label">
            Quantidade ({{ selectedProcedure.pricingType === 'UNIT' ? 'Uni' : 'mL' }})
          </label>
          <input
            v-model.number="quantity"
            type="number"
            min="0.1"
            step="0.1"
            class="form-input"
            placeholder="0"
          />
        </div>

        <div class="form-group">
          <div class="label-row">
             <label class="form-label">Desconto</label>
             <button class="toggle-mode-btn" @click="discountMode = discountMode === 'percentage' ? 'fixed' : 'percentage'">
                {{ discountMode === 'percentage' ? 'Mudar para R$' : 'Mudar para %' }}
             </button>
          </div>
          
          <div class="input-wrapper" v-if="discountMode === 'percentage'">
            <input
              v-model.number="discountPercentage"
              type="number"
              min="0"
              max="100"
              class="form-input"
              placeholder="0"
            />
            <span class="suffix">%</span>
          </div>
          
          <div class="input-wrapper" v-else>
             <span class="prefix">R$</span>
             <input
              v-model.number="discountValue"
              type="number"
              min="0"
              step="0.01"
              class="form-input pl-10"
              placeholder="0,00"
            />
          </div>
        </div>
      </div>

      <div class="values-summary" v-if="selectedProcedure">
        <div class="summary-row">
          <span>Valor Original:</span>
          <strong>{{ formatCurrency(originalValue) }}</strong>
        </div>
        <div class="summary-row discount" v-if="originalValue > finalValue">
          <span v-if="discountMode === 'percentage'">Desconto ({{ discountPercentage }}%):</span>
          <span v-else>Desconto:</span>
          <strong>- {{ formatCurrency(originalValue - finalValue) }}</strong>
        </div>
        <div class="summary-row total">
          <span>Valor Final:</span>
          <strong>{{ formatCurrency(finalValue) }}</strong>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')" class="btn-cancel">
          <X :size="18" />
          Cancelar
        </AppButton>
        <AppButton
          variant="primary"
          @click="handleSubmit"
          :disabled="!selectedProcedureId || isLoading"
          :loading="isLoading"
          class="btn-save"
        >
          <Check :size="18" />
          Salvar
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
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.375rem;
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn-header:hover {
  color: #111827;
}

.drawer-body-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.form-row .form-group {
  flex: 1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
}

.form-input {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
  width: 100%;
  color: #111827;
  background-color: #fff;
  height: 48px;
}

.form-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.suffix {
  position: absolute;
  right: 1rem;
  color: #6b7280;
  pointer-events: none;
  font-weight: 500;
}

.values-summary {
  background-color: #f9fafb;
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: auto;
  border: 1px solid #f3f4f6;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.95rem;
  color: #4b5563;
}

.summary-row.discount {
  color: #ef4444;
}

.summary-row.total {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.75rem;
  margin-top: 0.25rem;
  font-size: 1.125rem;
  color: #111827;
  font-weight: 600;
}

.drawer-footer {
  padding: 1.5rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  border-top: 1px solid #f3f4f6;
}

.close-btn-header {
  display: none;
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

.prefix {
  position: absolute;
  left: 1rem;
  color: #6b7280;
  pointer-events: none;
  font-weight: 500;
}

.pl-10 {
  padding-left: 2.5rem;
}
</style>
