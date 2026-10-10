<script setup>
import { useId } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { CalendarDays, X } from 'lucide-vue-next'

const props = defineProps({
  modelValue: { type: Array, default: null },
  label: { type: String, default: '' },
  clearable: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])
const errorId = useId()

function formatDate(date) {
  return date instanceof Date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('pt-BR')
    : ''
}

function updateRange(value) {
  if (!value) {
    if (props.clearable) emit('update:modelValue', null)
    return
  }
  if (value[0] && value[1]) emit('update:modelValue', value)
}
</script>

<template>
  <div class="app-date-range">
    <span v-if="label" class="range-label">{{ label }}</span>
    <div class="range-controls">
      <VueDatePicker
        :model-value="modelValue"
        :range="{ partialRange: false }"
        multi-calendars
        :enable-time-picker="false"
        locale="pt-BR"
        format="dd/MM/yyyy"
        auto-apply
        teleport="body"
        :z-index="12000"
        :clearable="false"
        :disabled="disabled"
        @update:model-value="updateRange"
      >
        <template #trigger>
          <button
            class="period-trigger"
            :class="{ 'has-error': error }"
            type="button"
            :disabled="disabled"
            :aria-label="label || 'Selecionar período'"
            :aria-invalid="!!error"
            :aria-describedby="error ? errorId : undefined"
          >
            <CalendarDays :size="15" />
            <span class="period-trigger__text">
              <strong>{{ formatDate(modelValue?.[0]) || 'Início' }}</strong>
              <span>até</span>
              <strong>{{ formatDate(modelValue?.[1]) || 'Fim' }}</strong>
            </span>
          </button>
        </template>
      </VueDatePicker>
      <button
        v-if="clearable && modelValue?.[0]"
        type="button"
        class="clear-period"
        aria-label="Limpar período"
        :disabled="disabled"
        @click="updateRange(null)"
      >
        <X :size="16" />
      </button>
    </div>
    <p v-if="error" :id="errorId" class="range-error">{{ error }}</p>
  </div>
</template>

<style scoped>
.app-date-range {
  min-width: 0;
}
.range-label {
  display: block;
  font-weight: 500;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
  color: #374151;
}
.range-controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}
.range-controls :deep(.dp__main) {
  width: auto;
}
.period-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.55rem;
  min-height: 40px;
  min-width: 246px;
  padding: 0 0.9rem;
  color: #0f172a;
  text-align: left;
  font-family: var(--fonte-principal);
  font-size: 0.86rem;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e5eaf1;
  border-radius: 0.75rem;
  background: #fff;
  box-shadow: 0 1px 2px rgb(15 23 42 / 2.5%);
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}
.period-trigger:hover {
  border-color: #cbd5e1;
  box-shadow: 0 8px 20px rgb(15 23 42 / 6%);
  transform: translateY(-1px);
}
.period-trigger:focus-visible,
.clear-period:focus-visible {
  outline: 2px solid var(--azul-principal);
  outline-offset: 2px;
}
.period-trigger:disabled,
.clear-period:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.period-trigger__text {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.42rem;
  min-width: 0;
  white-space: nowrap;
}
.period-trigger__text strong {
  font-weight: 600;
}
.period-trigger__text span {
  color: #94a3b8;
  font-size: 0.78rem;
  font-weight: 500;
}
.clear-period {
  border: none;
  background: transparent;
  color: #64748b;
  padding: 0.5rem;
  cursor: pointer;
  display: flex;
}
.period-trigger.has-error {
  border-color: #dc2626;
}
.range-error {
  color: #dc2626;
  font-size: 0.8rem;
  margin: 0.35rem 0 0;
}
@media (max-width: 640px) {
  .app-date-range,
  .range-controls :deep(.dp__main),
  .period-trigger {
    width: 100%;
    min-width: 0;
  }
  .period-trigger__text {
    width: 100%;
    justify-content: space-between;
  }
}
</style>
