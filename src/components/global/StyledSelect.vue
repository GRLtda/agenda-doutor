<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue' // 1. Importar onUnmounted
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: [String, Number],
  label: String,
  options: { type: Array, required: true },
  required: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const selectButtonRef = ref(null)
const optionsListRef = ref(null) // 2. Criar ref para a lista de opções
const dropdownStyle = ref({})

const selectedLabel = computed(() => {
  if (!props.modelValue) return 'Selecione'
  const selectedOption = props.options.find((opt) => opt.value === props.modelValue)
  return selectedOption?.label || 'Selecione'
})

async function updateDropdownPosition() {
  if (!isOpen.value || !selectButtonRef.value) return
  await nextTick()
  const rect = selectButtonRef.value.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'absolute',
    top: `${rect.bottom + 4}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

// 3. Função para tratar o clique fora
const handleClickOutside = (event) => {
  if (
    selectButtonRef.value &&
    !selectButtonRef.value.contains(event.target) &&
    optionsListRef.value &&
    !optionsListRef.value.contains(event.target)
  ) {
    isOpen.value = false
  }
}

// 4. Atualizar o watch para adicionar e remover o listener de clique
watch(isOpen, (newValue) => {
  if (newValue) {
    updateDropdownPosition()
    window.addEventListener('scroll', updateDropdownPosition, true)
    window.addEventListener('resize', updateDropdownPosition)
    // Adiciona o listener de clique no próximo 'tick'
    nextTick(() => {
      document.addEventListener('click', handleClickOutside)
    })
  } else {
    // Remove os listeners
    window.removeEventListener('scroll', updateDropdownPosition, true)
    window.removeEventListener('resize', updateDropdownPosition)
    document.removeEventListener('click', handleClickOutside)
  }
})

// 5. Garantir a remoção do listener quando o componente for destruído
onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', updateDropdownPosition, true)
  window.removeEventListener('resize', updateDropdownPosition)
})

function selectOption(option) {
  emit('update:modelValue', option.value)
  isOpen.value = false
}
</script>

<template>
  <div class="form-group">
    <label v-if="label" class="form-label">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    <div class="styled-select">
      <button
        ref="selectButtonRef"
        type="button"
        class="select-button"
        :class="{ 'has-error': error }"
        @click="isOpen = !isOpen"
      >
        <span>{{ selectedLabel }}</span>
        <ChevronDown :size="16" class="arrow-icon" :class="{ 'is-open': isOpen }" />
      </button>

      <Teleport to="body">
        <Transition name="fade">
          <ul v-if="isOpen" ref="optionsListRef" class="options-list" :style="dropdownStyle">
            <li v-if="options.length === 0" class="no-options">
              <slot name="empty">
                Nenhum registro encontrado
              </slot>
            </li>
            <li
              v-else
              v-for="option in options"
              :key="option.value"
              @mousedown.prevent="selectOption(option)"
              class="option-item"
            >
              {{ option.label }}
            </li>
          </ul>
        </Transition>
      </Teleport>
    </div>
  </div>
</template>

<style scoped>
.form-group {
  text-align: left;
}
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
}
.required-asterisk {
  color: #ef4444;
  margin-left: 0.25rem;
}
.styled-select {
  position: relative;
  width: 100%;
}
.select-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  height: 48px;
  padding: 0 1rem;
  background-color: var(--branco);
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 1rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.select-button.has-error {
  border-color: #ef4444;
}
.select-button:focus,
.select-button:focus-visible {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
.arrow-icon {
  color: #6b7281;
  transition: transform 0.2s ease;
}
.arrow-icon.is-open {
  transform: rotate(180deg);
}
.options-list {
  /* ✨ A posição agora é calculada dinamicamente, mas mantemos o resto ✨ */
  position: absolute; /* Mudará para 'fixed' ou 'absolute' pelo JS */
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1); /* Sombra mais pronunciada */
  z-index: 5000;
  padding: 0.5rem;
  list-style: none;
  margin: 0;
}
.option-item {
  padding: 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
}
.option-item:hover {
  background-color: #f3f4f6;
}
.no-options {
  padding: 0.75rem;
  color: #6b7280;
  text-align: center;
  font-size: 0.875rem;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
