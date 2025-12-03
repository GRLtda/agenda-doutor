<script setup>
import { ref, computed, onMounted } from 'vue'
import { X, Save, Stethoscope } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import { useProceduresStore } from '@/stores/procedures'

const props = defineProps({
  patientId: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close', 'save'])

const proceduresStore = useProceduresStore()

const selectedProcedureId = ref('')
const selectedAliasName = ref('')
const discountPercentage = ref(0)
const isLoading = ref(false)

// Carrega os procedimentos ao montar o modal
onMounted(async () => {
  if (proceduresStore.procedures.length === 0) {
    await proceduresStore.fetchProcedures()
  }
})

const procedures = computed(() => proceduresStore.procedures)

const selectedProcedure = computed(() => {
  return procedures.value.find((p) => p._id === selectedProcedureId.value)
})

const procedureAliases = computed(() => {
  return selectedProcedure.value?.aliases || []
})

const originalValue = computed(() => {
  if (!selectedProcedure.value) return 0
  if (selectedAliasName.value) {
    const alias = selectedProcedure.value.aliases.find((a) => a.name === selectedAliasName.value)
    return alias ? alias.price : selectedProcedure.value.baseValue
  }
  return selectedProcedure.value.baseValue
})

const finalValue = computed(() => {
  const value = originalValue.value
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
    procedureId: selectedProcedureId.value,
    aliasName: selectedAliasName.value || undefined,
    discountPercentage: discountPercentage.value,
  }

  emit('save', payload)
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header class="modal-header">
        <h3 class="modal-title">
          <Stethoscope :size="20" />
          Adicionar Procedimento
        </h3>
        <button class="close-btn" @click="$emit('close')">
          <X :size="20" />
        </button>
      </header>

      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Procedimento</label>
          <select v-model="selectedProcedureId" class="form-select" @change="selectedAliasName = ''">
            <option value="" disabled>Selecione um procedimento</option>
            <option v-for="proc in procedures" :key="proc._id" :value="proc._id">
              {{ proc.name }}
            </option>
          </select>
        </div>

        <div class="form-group" v-if="procedureAliases.length > 0">
          <label class="form-label">Variação (Opcional)</label>
          <select v-model="selectedAliasName" class="form-select">
            <option value="">Preço Base ({{ formatCurrency(selectedProcedure?.baseValue) }})</option>
            <option v-for="alias in procedureAliases" :key="alias.name" :value="alias.name">
              {{ alias.name }} ({{ formatCurrency(alias.price) }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Desconto (%)</label>
          <div class="input-wrapper">
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
        </div>

        <div class="values-summary" v-if="selectedProcedure">
          <div class="summary-row">
            <span>Valor Original:</span>
            <strong>{{ formatCurrency(originalValue) }}</strong>
          </div>
          <div class="summary-row discount" v-if="discountPercentage > 0">
            <span>Desconto ({{ discountPercentage }}%):</span>
            <strong>- {{ formatCurrency(originalValue - finalValue) }}</strong>
          </div>
          <div class="summary-row total">
            <span>Valor Final:</span>
            <strong>{{ formatCurrency(finalValue) }}</strong>
          </div>
        </div>
      </div>

      <footer class="modal-footer">
        <AppButton variant="secondary" @click="$emit('close')">Cancelar</AppButton>
        <AppButton
          variant="primary"
          @click="handleSubmit"
          :disabled="!selectedProcedureId"
        >
          <Save :size="16" />
          Salvar
        </AppButton>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background-color: var(--branco);
  border-radius: 1rem;
  width: 100%;
  max-width: 500px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.modal-header {
  padding: 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: var(--cinza-texto);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f3f4f6;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-select,
.form-input {
  padding: 0.625rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  width: 100%;
  background-color: var(--branco);
}

.form-select:focus,
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
  right: 0.75rem;
  color: var(--cinza-texto);
  pointer-events: none;
}

.values-summary {
  background-color: #f9fafb;
  border-radius: 0.5rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: #4b5563;
}

.summary-row.discount {
  color: #ef4444;
}

.summary-row.total {
  border-top: 1px solid #e5e7eb;
  padding-top: 0.5rem;
  margin-top: 0.25rem;
  font-size: 1rem;
  color: #111827;
}

.modal-footer {
  padding: 1.25rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
