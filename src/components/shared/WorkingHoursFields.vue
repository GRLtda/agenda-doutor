<script setup>
import StyledSelect from '@/components/global/StyledSelect.vue'
import Switch from '@/components/global/Switch.vue'
import { workingTimeOptions } from '@/utils/workingHours'

const props = defineProps({ modelValue: { type: Array, required: true } })
const emit = defineEmits(['update:modelValue'])

function updateDay(index, field, value) {
  emit(
    'update:modelValue',
    props.modelValue.map((day, dayIndex) =>
      dayIndex === index ? { ...day, [field]: value } : day,
    ),
  )
}
</script>

<template>
  <div class="days-grid">
    <div
      v-for="(day, index) in modelValue"
      :key="day.day"
      class="day-card"
      :class="{ closed: !day.isOpen }"
    >
      <div class="day-header">
        <Switch
          :model-value="day.isOpen"
          :label="day.day"
          @update:model-value="updateDay(index, 'isOpen', $event)"
        />
      </div>
      <div v-if="day.isOpen" class="time-inputs">
        <StyledSelect
          :model-value="day.startTime"
          label="Abre"
          :options="workingTimeOptions"
          @update:model-value="updateDay(index, 'startTime', $event)"
        />
        <StyledSelect
          :model-value="day.endTime"
          label="Fecha"
          :options="workingTimeOptions"
          @update:model-value="updateDay(index, 'endTime', $event)"
        />
      </div>
      <div v-else class="closed-text">Fechado</div>
    </div>
  </div>
</template>

<style scoped>
.days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}
.day-card {
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  background: white;
  min-width: 0;
}
.day-card.closed {
  background: #f9fafb;
}
.day-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  font-weight: 500;
}
.time-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}
.time-inputs :deep(.form-group) {
  min-width: 0;
  margin-bottom: 0;
}
.closed-text {
  color: #6b7280;
  padding: 1rem 0;
  text-align: center;
}
@media (max-width: 480px) {
  .days-grid {
    grid-template-columns: 1fr;
  }
}
</style>
