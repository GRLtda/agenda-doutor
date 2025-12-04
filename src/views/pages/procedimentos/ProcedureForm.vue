<script setup>
import { computed, nextTick } from 'vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import CurrencyInput from '@/components/global/CurrencyInput.vue'

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
    default: () => ({
      name: '',
      description: '',
      baseValue: 0,
      pricingType: 'FIXED',
    }),
  },
})

const emit = defineEmits(['update:modelValue'])

const formData = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const pricingOptions = [
  { value: 'FIXED', label: 'Preço Fixo' },
  { value: 'UNIT', label: 'Por Unidade' },
  { value: 'ML', label: 'Por mL' },
]

const resizeTextarea = (event) => {
  const element = event.target
  element.style.height = 'auto'
  element.style.height = element.scrollHeight + 'px'
}
</script>

<template>
  <div class="procedure-form">
    <!-- Dados do Procedimento -->
    <section class="form-section">
      <h3 class="section-title">Dados do Procedimento</h3>
      <div class="section-card">
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
            @input="resizeTextarea"
          ></textarea>
        </div>
      </div>
    </section>

    <!-- Precificação -->
    <section class="form-section">
      <h3 class="section-title">Precificação</h3>
      <div class="section-card">
        <div class="form-group">
          <label class="form-label">Configuração de Preço</label>
          <div class="price-row">
            <div class="price-col type-col">
              <label class="sub-label">Tipo de Cobrança</label>
              <StyledSelect
                v-model="formData.pricingType"
                :options="pricingOptions"
              />
            </div>
            
            <div class="price-col value-col">
              <label class="sub-label">Valor Base</label>
              <CurrencyInput
                v-model="formData.baseValue"
                placeholder="R$ 0,00"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.procedure-form {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.section-card {
  background-color: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.25rem;
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
  font-weight: 600;
  color: #374151;
}

.sub-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  margin-bottom: 0.25rem;
  display: block;
}

.form-input,
.form-textarea,
.form-select {
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
  width: 100%;
  color: #111827;
  background-color: #fff;
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: #9ca3af;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-textarea {
  resize: none;
  min-height: 80px;
}

.price-row {
  display: flex;
  gap: 1rem;
}

.price-col {
  display: flex;
  flex-direction: column;
}

.type-col {
  flex: 1;
}

.value-col {
  flex: 1;
}

@media (max-width: 640px) {
  .price-row {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
