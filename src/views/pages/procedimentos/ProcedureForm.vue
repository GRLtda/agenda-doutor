<script setup>
import { ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'

const props = defineProps({
  procedure: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['save', 'cancel'])

const formData = ref({
  name: '',
  description: '',
  price: 0,
  pricingType: 'FIXED',
})

// Preenche o formulário quando um procedimento é passado
watch(
  () => props.procedure,
  (newProcedure) => {
    if (newProcedure) {
      formData.value = {
        name: newProcedure.name || '',
        description: newProcedure.description || '',
        pricingType: newProcedure.pricingType || 'FIXED',
        price: newProcedure.baseValue || newProcedure.pricePerUnit || 0,
      }
    } else {
      resetForm()
    }
  },
  { immediate: true }
)

function resetForm() {
  formData.value = {
    name: '',
    description: '',
    price: 0,
    pricingType: 'FIXED',
  }
}

function handleSubmit() {
  if (!formData.value.name) return
  if (formData.value.price <= 0) return

  const payload = {
    name: formData.value.name,
    description: formData.value.description,
    pricingType: formData.value.pricingType,
    baseValue: formData.value.price,
    pricePerUnit: 0,
  }

  emit('save', payload)
}

function handleCancel() {
  emit('cancel')
}

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}
</script>

<template>
  <div class="procedure-form">
    <div class="form-header">
      <h2 class="form-title">{{ procedure ? 'Editar Procedimento' : 'Novo Procedimento' }}</h2>
      <button @click="handleCancel" class="btn-close">
        <X :size="20" />
      </button>
    </div>

    <form @submit.prevent="handleSubmit" class="form-body">
      <div class="form-group">
        <label for="name" class="form-label">Nome do Procedimento *</label>
        <input
          id="name"
          v-model="formData.name"
          type="text"
          class="form-input"
          placeholder="Ex: Consulta, Limpeza, etc."
          required
        />
      </div>

      <div class="form-group">
        <label for="description" class="form-label">Descrição</label>
        <textarea
          id="description"
          v-model="formData.description"
          class="form-textarea"
          placeholder="Descrição opcional do procedimento"
          rows="3"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Preço</label>
        <div class="price-input-group">
          <select v-model="formData.pricingType" class="form-select pricing-type-select">
            <option value="FIXED">Preço Fixo</option>
            <option value="UNIT">Por Unidade</option>
            <option value="ML">Por mL</option>
          </select>
          <div class="input-with-prefix">
            <span class="input-prefix">R$</span>
            <input
              v-model.number="formData.price"
              type="number"
              step="0.01"
              min="0"
              class="form-input with-prefix"
              placeholder="0,00"
              required
            />
          </div>
        </div>
      </div>

      <div class="form-actions">
        <AppButton type="button" variant="secondary" @click="handleCancel">Cancelar</AppButton>
        <AppButton type="submit" variant="primary">
          {{ procedure ? 'Salvar Alterações' : 'Criar Procedimento' }}
        </AppButton>
      </div>
    </form>
  </div>
</template>

<style scoped>
.procedure-form {
  display: flex;
  flex-direction: column;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.form-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.btn-close {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cinza-texto);
  transition: background-color 0.2s ease;
}

.btn-close:hover {
  background-color: #f3f4f6;
}

.form-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
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

.form-input,
.form-textarea {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  font-family: inherit;
}

.form-input:focus,
.form-textarea:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.input-with-prefix {
  position: relative;
  display: flex;
  align-items: center;
}

.input-prefix {
  position: absolute;
  left: 0.75rem;
  color: var(--cinza-texto);
  font-weight: 500;
  pointer-events: none;
}

.form-input.with-prefix {
  padding-left: 2.5rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
    width: 100%;
  }
}

.price-input-group {
  display: flex;
  gap: 1rem;
}

.pricing-type-select {
  width: 150px;
  flex-shrink: 0;
}

.input-with-prefix {
  flex: 1;
}
</style>
