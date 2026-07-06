<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    default: 'OPEN',
  },
})

const statusMap = {
  OPEN: { label: 'Aberta', className: 'badge--open' },
  PARTIAL: { label: 'Parcial', className: 'badge--partial' },
  PAID: { label: 'Paga', className: 'badge--paid' },
  OVERDUE: { label: 'Atrasada', className: 'badge--overdue' },
  CANCELED: { label: 'Cancelada', className: 'badge--canceled' },
}

const normalized = computed(() => statusMap[props.status] || statusMap.OPEN)
</script>

<template>
  <span class="finance-status-badge" :class="normalized.className">
    {{ normalized.label }}
  </span>
</template>

<style scoped>
.finance-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 0.55rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.badge--open {
  color: #2563eb;
  background: #dbeafe;
}

.badge--partial {
  color: #b45309;
  background: #fef3c7;
}

.badge--paid {
  color: #047857;
  background: #d1fae5;
}

.badge--overdue {
  color: #dc2626;
  background: #fee2e2;
}

.badge--canceled {
  color: #64748b;
  background: #f1f5f9;
}
</style>
