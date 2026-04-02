<script setup>
import { ref, watch } from 'vue';
import { ChevronDown, LoaderCircle } from 'lucide-vue-next';

const props = defineProps({
  modelValue: [String, Number, null],
  options: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  emptyLabel: { type: String, default: 'Selecione' },
  loading: { type: Boolean, default: false },
  required: { type: Boolean, default: false },
  error: { type: Boolean, default: false },
});

const emit = defineEmits(['update:modelValue', 'search']);

const isOpen = ref(false);
const searchQuery = ref('');
const selectedLabel = ref('');

watch(() => props.modelValue, (newVal) => {
  const selectedOption = props.options.find(opt => opt.value === newVal);
  selectedLabel.value = selectedOption ? selectedOption.label : '';
  if (selectedLabel.value) {
    searchQuery.value = selectedLabel.value;
  }
});

function openDropdown() {
  if (isOpen.value) return;
  isOpen.value = true;
  searchQuery.value = '';
  emit('search', '');
}

function selectOption(option) {
  emit('update:modelValue', option.value);
  selectedLabel.value = option.label;
  searchQuery.value = option.label;
  isOpen.value = false;
}

function handleSearch() {
    emit('search', searchQuery.value);
    isOpen.value = true;
}
</script>

<template>
  <div class="searchable-select" :class="{ 'has-error': error }">
    <label v-if="label || $slots.icon" class="form-label">
      <slot name="icon"></slot>
      {{ label }} <span v-if="required" class="required-asterisk">*</span>
    </label>
    <div class="select-container" v-click-outside="() => isOpen = false">
      <div class="input-wrapper" :class="{ 'is-open': isOpen }" @click="openDropdown">
        <input
          type="text"
          v-model="searchQuery"
          @focus="openDropdown"
          @input="handleSearch"
          @keydown.esc.prevent="isOpen = false"
          :placeholder="emptyLabel"
          class="select-input"
        />
        <LoaderCircle v-if="loading" :size="18" class="spinner" />
        <ChevronDown v-else :size="18" class="chevron-icon" :class="{ 'is-open': isOpen }" />
      </div>
      <Transition name="fade">
        <ul v-if="isOpen" class="options-list">
          <li v-if="options.length === 0 && !loading" class="no-options">Nenhum resultado encontrado.</li>
          <li
            v-for="option in options"
            :key="option.value"
            @click="selectOption(option)"
            class="option-item"
          >
            {{ option.label }}
          </li>
          <li v-if="$slots.footer" class="options-footer">
            <slot name="footer"></slot>
          </li>
        </ul>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
/* Estilos para o novo componente de busca */
.required-asterisk {
  color: #ef4444;
}
.searchable-select { width: 100%; }
.form-label { display: flex; align-items: center; gap: 0.25rem; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; color: #374151; }
.form-label :deep(svg) { color: var(--azul-principal); }
.select-container { position: relative; }
.input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-height: 44px;
  padding: 0 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  background-color: white;
  cursor: text;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.input-wrapper:hover,
.input-wrapper.is-open,
.input-wrapper:focus-within {
  border-color: #94a3b8;
}
.input-wrapper:focus-within {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 131, 246, 0.1);
}
.chevron-icon { color: #6b7280; }
.chevron-icon { transition: transform 0.2s; }
.chevron-icon.is-open { transform: rotate(180deg); }
.select-input {
  border: none;
  outline: none;
  width: 100%;
  min-width: 0;
  font-size: 0.95rem;
  line-height: 1.2;
  color: #111827;
  background: transparent;
}
.select-input::placeholder {
  color: #94a3b8;
}
.spinner { animation: spin 1s linear infinite; color: var(--azul-principal); }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.options-list {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 10px 24px rgba(15, 23, 42, 0.12);
  max-height: 240px;
  overflow-y: auto;
  z-index: 10;
  list-style: none;
  padding: 0.375rem;
}
.option-item { padding: 0.75rem 0.875rem; border-radius: 0.5rem; cursor: pointer; }
.option-item:hover { background-color: #f3f4f6; }
.no-options { padding: 0.75rem; color: #6b7280; }
.options-footer {
  margin-top: 0.25rem;
  padding-top: 0.5rem;
  border-top: 1px solid #e5e7eb;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
