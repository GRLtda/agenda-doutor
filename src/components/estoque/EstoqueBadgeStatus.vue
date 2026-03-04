<script setup>
// EstoqueBadgeStatus.vue — Badge colorido para status de lote
const props = defineProps({
  status: {
    type: String,
    required: false,
    default: null,
  },
})

const statusConfig = {
  ATIVO:      { label: 'Ativo',       class: 'badge--ativo' },
  VENCIDO:    { label: 'Vencido',     class: 'badge--vencido' },
  ZERADO:     { label: 'Zerado',      class: 'badge--zerado' },
  DESCARTADO: { label: 'Descartado', class: 'badge--descartado' },
}

const config = props.status ? (statusConfig[props.status] ?? { label: props.status, class: 'badge--default' }) : null
</script>

<template>
  <span v-if="config" class="badge" :class="config.class">{{ config.label }}</span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.badge--ativo {
  background-color: #dcfce7;
  color: #15803d;
}

.badge--vencido {
  background-color: #fee2e2;
  color: #b91c1c;
}

.badge--zerado {
  background-color: #f3f4f6;
  color: #6b7280;
}

.badge--descartado {
  background-color: #ffedd5;
  color: #c2410c;
}

.badge--default {
  background-color: #f3f4f6;
  color: #374151;
}
</style>
