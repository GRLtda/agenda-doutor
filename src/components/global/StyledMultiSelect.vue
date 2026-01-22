<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue'
import { ChevronDown, X, Check } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  label: String,
  options: { type: Array, required: true },
  required: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
  placeholder: { type: String, default: 'Selecione...' },
  searchable: { type: Boolean, default: true },
})
const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const searchQuery = ref('')
const selectButtonRef = ref(null)
const optionsListRef = ref(null)
const searchInputRef = ref(null)
const dropdownStyle = ref({})

const selectedItems = computed(() => {
  if (!props.modelValue || props.modelValue.length === 0) return []
  return props.options.filter((opt) => props.modelValue.includes(opt.value))
})

const displayText = computed(() => {
  if (selectedItems.value.length === 0) return props.placeholder
  if (selectedItems.value.length === 1) return selectedItems.value[0].label
  return `${selectedItems.value.length} selecionado(s)`
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter((opt) => 
    opt.label.toLowerCase().includes(query)
  )
})

async function updateDropdownPosition() {
  if (!isOpen.value || !selectButtonRef.value) return
  await nextTick()
  const rect = selectButtonRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const spaceBelow = viewportHeight - rect.bottom
  const dropdownHeight = 300 // max-height aproximado
  
  let top = rect.bottom + 4
  if (spaceBelow < dropdownHeight && rect.top > dropdownHeight) {
    top = rect.top - dropdownHeight - 4
  }
  
  dropdownStyle.value = {
    position: 'fixed',
    top: `${top}px`,
    left: `${rect.left}px`,
    width: `${rect.width}px`,
  }
}

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

watch(isOpen, (newValue) => {
  if (newValue) {
    updateDropdownPosition()
    window.addEventListener('scroll', updateDropdownPosition, true)
    window.addEventListener('resize', updateDropdownPosition)
    nextTick(() => {
      document.addEventListener('click', handleClickOutside)
      if (props.searchable && searchInputRef.value) {
        searchInputRef.value.focus()
      }
    })
  } else {
    window.removeEventListener('scroll', updateDropdownPosition, true)
    window.removeEventListener('resize', updateDropdownPosition)
    document.removeEventListener('click', handleClickOutside)
    searchQuery.value = ''
  }
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('scroll', updateDropdownPosition, true)
  window.removeEventListener('resize', updateDropdownPosition)
})

function toggleOption(option) {
  const currentValue = [...(props.modelValue || [])]
  const index = currentValue.indexOf(option.value)
  
  if (index > -1) {
    currentValue.splice(index, 1)
  } else {
    currentValue.push(option.value)
  }
  
  emit('update:modelValue', currentValue)
}

function isSelected(option) {
  return (props.modelValue || []).includes(option.value)
}

function removeItem(value, event) {
  event.stopPropagation()
  const currentValue = [...(props.modelValue || [])]
  const index = currentValue.indexOf(value)
  if (index > -1) {
    currentValue.splice(index, 1)
    emit('update:modelValue', currentValue)
  }
}

function clearAll(event) {
  event.stopPropagation()
  emit('update:modelValue', [])
}
</script>

<template>
  <div class="form-group">
    <label v-if="label" class="form-label">
      {{ label }}
      <span v-if="required" class="required-asterisk">*</span>
    </label>
    <div class="styled-multi-select">
      <button
        ref="selectButtonRef"
        type="button"
        class="select-button"
        :class="{ 'has-error': error, 'has-value': selectedItems.length > 0 }"
        @click="isOpen = !isOpen"
      >
        <div class="selected-display">
          <!-- Pills para itens selecionados (max 2, depois mostra contador) -->
          <template v-if="selectedItems.length > 0 && selectedItems.length <= 2">
            <span 
              v-for="item in selectedItems" 
              :key="item.value" 
              class="selected-pill"
              @click.stop="removeItem(item.value, $event)"
            >
              {{ item.label }}
              <X :size="14" class="remove-icon" />
            </span>
          </template>
          <template v-else-if="selectedItems.length > 2">
            <span class="selected-pill">
              {{ selectedItems[0].label }}
              <X :size="14" class="remove-icon" @click.stop="removeItem(selectedItems[0].value, $event)" />
            </span>
            <span class="count-badge">+{{ selectedItems.length - 1 }}</span>
          </template>
          <span v-else class="placeholder-text">{{ placeholder }}</span>
        </div>
        <div class="button-actions">
          <X v-if="selectedItems.length > 0" :size="16" class="clear-icon" @click="clearAll" />
          <ChevronDown :size="16" class="arrow-icon" :class="{ 'is-open': isOpen }" />
        </div>
      </button>

      <Teleport to="body">
        <Transition name="fade">
          <div v-if="isOpen" ref="optionsListRef" class="options-dropdown" :style="dropdownStyle">
            <!-- Search input -->
            <div v-if="searchable" class="search-container">
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                class="search-input"
                placeholder="Buscar..."
                @click.stop
              />
            </div>
            
            <!-- Options list -->
            <ul class="options-list">
              <li
                v-for="option in filteredOptions"
                :key="option.value"
                @mousedown.prevent="toggleOption(option)"
                class="option-item"
                :class="{ 'is-selected': isSelected(option) }"
              >
                <span class="option-checkbox">
                  <Check v-if="isSelected(option)" :size="14" />
                </span>
                {{ option.label }}
              </li>
              <li v-if="filteredOptions.length === 0" class="no-results">
                Nenhum resultado encontrado
              </li>
            </ul>
          </div>
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
.styled-multi-select {
  position: relative;
  width: 100%;
}
.select-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  min-height: 40px;
  padding: 0.5rem 0.75rem;
  background-color: var(--branco);
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  gap: 0.5rem;
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
.selected-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  flex: 1;
  align-items: center;
}
.placeholder-text {
  color: #9ca3af;
}
.selected-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background-color: #e0e7ff;
  color: #4338ca;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s;
}
.selected-pill:hover {
  background-color: #c7d2fe;
}
.remove-icon {
  opacity: 0.7;
  flex-shrink: 0;
}
.remove-icon:hover {
  opacity: 1;
}
.count-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  background-color: #f3f4f6;
  color: #4b5563;
  border-radius: 0.375rem;
  font-size: 0.75rem;
  font-weight: 500;
}
.button-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
}
.clear-icon {
  color: #9ca3af;
  cursor: pointer;
  padding: 0.125rem;
  border-radius: 0.25rem;
  transition: color 0.15s, background-color 0.15s;
}
.clear-icon:hover {
  color: #ef4444;
  background-color: #fef2f2;
}
.arrow-icon {
  color: #6b7281;
  transition: transform 0.2s ease;
}
.arrow-icon.is-open {
  transform: rotate(180deg);
}
.options-dropdown {
  position: absolute;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  z-index: 5000;
  overflow: hidden;
}
.search-container {
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  outline: none;
  transition: border-color 0.15s;
}
.search-input:focus {
  border-color: var(--azul-principal);
}
.options-list {
  max-height: 220px;
  overflow-y: auto;
  padding: 0.5rem;
  list-style: none;
  margin: 0;
}
.option-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  cursor: pointer;
  font-weight: 500;
  font-size: 0.875rem;
  transition: background-color 0.15s;
}
.option-item:hover {
  background-color: #f3f4f6;
}
.option-item.is-selected {
  background-color: #eef2ff;
  color: #4338ca;
}
.option-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 0.25rem;
  flex-shrink: 0;
  transition: all 0.15s;
}
.option-item.is-selected .option-checkbox {
  background-color: #4f46e5;
  border-color: #4f46e5;
  color: white;
}
.no-results {
  padding: 1rem;
  text-align: center;
  color: #9ca3af;
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
