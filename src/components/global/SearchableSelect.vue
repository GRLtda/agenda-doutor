<script setup>
import { ref, watch } from 'vue';
import { ChevronDown, Search, LoaderCircle } from 'lucide-vue-next';

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

function toggleDropdown() {
  isOpen.value = !isOpen.value;
  if(isOpen.value) {
    searchQuery.value = '';
    emit('search', '');
  }
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
      <div class="input-wrapper" @click="toggleDropdown">
        <Search :size="18" class="search-icon" />
        <input
          type="text"
          v-model="searchQuery"
          @input="handleSearch"
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
.input-wrapper { display: flex; align-items: center; height: 42px; gap: 0.75rem; padding: 0.75rem; border: 1px solid #d1d5db; border-radius: 0.75rem; background-color: white; cursor: pointer; }
.search-icon, .chevron-icon { color: #6b7280; }
.chevron-icon { transition: transform 0.2s; }
.chevron-icon.is-open { transform: rotate(180deg); }
.select-input { border: none; outline: none; width: 100%; font-size: 1rem; background: transparent; }
.spinner { animation: spin 1s linear infinite; color: var(--azul-principal); }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.options-list { position: absolute; top: calc(100% + 0.5rem); left: 0; right: 0; background: white; border: 1px solid #e5e7eb; border-radius: 0.5rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-height: 200px; overflow-y: auto; z-index: 10; list-style: none; padding: 0.5rem; }
.option-item { padding: 0.75rem; border-radius: 0.375rem; cursor: pointer; }
.option-item:hover { background-color: #f3f4f6; }
.no-options { padding: 0.75rem; color: #6b7280; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
