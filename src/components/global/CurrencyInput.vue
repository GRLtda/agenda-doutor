<script setup>
import { ref, watch, onMounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: Number,
    default: 0,
  },
  placeholder: {
    type: String,
    default: 'R$ 0,00',
  },
})

const emit = defineEmits(['update:modelValue'])

const inputRef = ref(null)
const displayValue = ref('')

const formatCurrency = (value) => {
  if (value === undefined || value === null) return ''
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

const parseCurrency = (value) => {
  return Number(value.replace(/[^0-9]/g, '')) / 100
}

const handleInput = (event) => {
  const value = event.target.value
  const numericValue = parseCurrency(value)
  emit('update:modelValue', numericValue)
  
  // Update display value to keep cursor position logic simple for now, 
  // or just let the watcher handle it (might jump cursor)
  // For a simple "money mask", we usually update the input value immediately
  // But let's try a smoother approach:
  // We only update the display value if it's different to avoid cursor jumps if possible,
  // but with currency formatting it's tricky.
  // Let's stick to the "update on input" for the mask effect.
  displayValue.value = formatCurrency(numericValue)
}

watch(
  () => props.modelValue,
  (newValue) => {
    displayValue.value = formatCurrency(newValue)
  },
  { immediate: true }
)
</script>

<template>
  <input
    ref="inputRef"
    type="text"
    class="currency-input"
    :value="displayValue"
    @input="handleInput"
    :placeholder="placeholder"
  />
</template>

<style scoped>
.currency-input {
  height: 48px;
  padding: 0 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 1rem;
  transition: all 0.2s ease;
  font-family: inherit;
  width: 100%;
  color: #111827;
  background-color: #fff;
}

.currency-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}

.currency-input::placeholder {
  color: #9ca3af;
}
</style>
