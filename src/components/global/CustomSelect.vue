<script setup>
import { ref, computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'

const props = defineProps({
  modelValue: [String, Number],
  options: { type: Array, required: true },
  emptyLabel: { type: String, default: 'Selecione' },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)

const selectedLabel = computed(() => {
  return props.modelValue || props.emptyLabel
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function selectOption(option) {
  emit('update:modelValue', option)
  isOpen.value = false
}
</script>

<template>
  <div class="custom-select" v-click-outside="() => (isOpen = false)">
    <button type="button" class="select-button" @click="toggleDropdown">
      <span>{{ selectedLabel }}</span>
      <ChevronDown :size="16" class="arrow-icon" :class="{ 'is-open': isOpen }" />
    </button>
    <Transition name="fade">
      <ul v-if="isOpen" class="options-list">
        <li
          v-for="option in options"
          :key="option"
          @click="selectOption(option)"
          class="option-item"
        >
          {{ option }}
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.custom-select {
  position: relative;
  width: 120px; /* Largura padrão */
}
.select-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 0.5rem 0.75rem;
  background-color: var(--branco);
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
}
.arrow-icon {
  color: #6b7281;
  transition: transform 0.2s ease;
}
.arrow-icon.is-open {
  transform: rotate(180deg);
}
.options-list {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  width: 100%;
  max-height: 200px;
  overflow-y: auto;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  z-index: 110; /* Aumentado para garantir que fique na frente de modais */
  padding: 0.5rem;
}
.option-item {
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  cursor: pointer;
}
.option-item:hover {
  background-color: #f3f4f6;
}

/* Animação de fade */
.fade-enter-active,
.fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
