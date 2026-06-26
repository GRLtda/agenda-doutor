<template>
  <section class="summary-card" :class="themeClass">
    <div v-if="icon" class="kpi-icon" :class="iconBgClass">
      <component :is="icon" :size="20" />
    </div>
    <span>{{ label }}</span>
    <strong :class="valueClass">{{ value }}</strong>
    <small v-if="subtext">{{ subtext }}</small>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  subtext: { type: String, default: '' },
  theme: { type: String, default: 'default', validator: v => ['default', 'blue', 'red', 'green', 'amber'].includes(v) },
  icon: { type: [Object, Function], default: null },
  valueColor: { type: String, default: 'default', validator: v => ['default', 'green', 'red'].includes(v) }
})

const themeClass = computed(() => {
  return `theme-${props.theme}`
})

const iconBgClass = computed(() => {
  return `kpi-icon--${props.theme}`
})

const valueClass = computed(() => {
  if (props.valueColor === 'green') return 'txt-green'
  if (props.valueColor === 'red') return 'txt-red'
  return ''
})
</script>

<style scoped>
.summary-card {
  padding: 1rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  min-height: 112px;
}
.summary-card span {
  color: #64748b;
  font-size: 0.9rem;
  font-weight: 600;
}
.summary-card strong {
  margin-top: auto;
  color: #111827;
  font-size: 1.35rem;
  font-weight: 800;
}
.summary-card small {
  color: #94a3b8;
  font-size: 0.85rem;
  margin-top: auto;
}
.txt-green {
  color: #059669 !important;
}
.txt-red {
  color: #dc2626 !important;
}

.kpi-icon {
  width: 38px;
  height: 38px;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.25rem;
}
.kpi-icon--blue {
  color: #2563eb;
  background: #dbeafe;
}
.kpi-icon--red {
  color: #dc2626;
  background: #fee2e2;
}
.kpi-icon--green {
  color: #047857;
  background: #d1fae5;
}
.kpi-icon--amber {
  color: #b45309;
  background: #fef3c7;
}
.kpi-icon--default {
  display: none;
}
</style>
