<script setup>
import { ref, watch } from 'vue'
import { X, Plus, Trash2 } from 'lucide-vue-next'
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
  baseValue: 0,
  aliases: [],
})

const newAlias = ref({
  name: '',
  price: 0,
})

// Preenche o formulário quando um procedimento é passado
watch(
  () => props.procedure,
  (newProcedure) => {
    if (newProcedure) {
      formData.value = {
        name: newProcedure.name || '',
        description: newProcedure.description || '',
        baseValue: newProcedure.baseValue || 0,
        aliases: newProcedure.aliases ? [...newProcedure.aliases] : [],
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
    baseValue: 0,
    aliases: [],
  }
  newAlias.value = {
    name: '',
    price: 0,
  }
}

function addAlias() {
  if (newAlias.value.name && newAlias.value.price > 0) {
    formData.value.aliases.push({ ...newAlias.value })
    newAlias.value = { name: '', price: 0 }
  }
}

function removeAlias(index) {
  formData.value.aliases.splice(index, 1)
}

function handleSubmit() {
  if (!formData.value.name || formData.value.baseValue <= 0) {
    return
  }
  emit('save', formData.value)
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
        <label for="baseValue" class="form-label">Valor Base *</label>
        <div class="input-with-prefix">
          <span class="input-prefix">R$</span>
          <input
            id="baseValue"
            v-model.number="formData.baseValue"
            type="number"
            step="0.01"
            min="0"
            class="form-input with-prefix"
            placeholder="0,00"
            required
          />
        </div>
      </div>

      <div class="form-section">
        <div class="section-header">
          <h3 class="section-title">Variações de Preço</h3>
          <p class="section-subtitle">
            Adicione variações do procedimento com preços diferentes (opcional)
          </p>
        </div>

        <div class="aliases-list" v-if="formData.aliases.length > 0">
          <div v-for="(alias, index) in formData.aliases" :key="index" class="alias-item">
            <div class="alias-info">
              <span class="alias-name">{{ alias.name }}</span>
              <span class="alias-price">{{ formatCurrency(alias.price) }}</span>
            </div>
            <button type="button" @click="removeAlias(index)" class="btn-remove">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>

        <div class="add-alias-form">
          <div class="alias-inputs">
            <input
              v-model="newAlias.name"
              type="text"
              class="form-input"
              placeholder="Nome da variação"
            />
            <div class="input-with-prefix">
              <span class="input-prefix">R$</span>
              <input
                v-model.number="newAlias.price"
                type="number"
                step="0.01"
                min="0"
                class="form-input with-prefix"
                placeholder="0,00"
              />
            </div>
          </div>
          <button
            type="button"
            @click="addAlias"
            class="btn-add-alias"
            :disabled="!newAlias.name || newAlias.price <= 0"
          >
            <Plus :size="16" />
            Adicionar
          </button>
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

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background-color: #f9fafb;
  border-radius: 0.75rem;
}

.section-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.section-subtitle {
  font-size: 0.875rem;
  color: var(--cinza-texto);
  margin: 0;
}

.aliases-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.alias-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
}

.alias-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.alias-name {
  font-weight: 600;
  color: #111827;
}

.alias-price {
  font-size: 0.875rem;
  color: #059669;
  font-weight: 600;
}

.btn-remove {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
  transition: background-color 0.2s ease;
}

.btn-remove:hover {
  background-color: #fee2e2;
}

.add-alias-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alias-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.btn-add-alias {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  border: 1px solid #d1d5db;
  background-color: var(--branco);
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-add-alias:hover:not(:disabled) {
  background-color: #f9fafb;
  border-color: var(--azul-principal);
  color: var(--azul-principal);
}

.btn-add-alias:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .alias-inputs {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column-reverse;
  }

  .form-actions button {
    width: 100%;
  }
}
</style>
