<script setup>
// EstoqueMovimentacaoTipo.vue — Badge para tipo de movimentação
const props = defineProps({
  tipo: {
    type: String,
    required: false,
    default: null,
  },
})

const tipoConfig = {
  ENTRADA:               { label: 'Entrada',        icon: '↑', class: 'tipo--entrada' },
  SAIDA_USO:             { label: 'Saída — Uso',    icon: '↓', class: 'tipo--saida-uso' },
  SAIDA_ADMINISTRATIVA:  { label: 'Saída — Adm.',   icon: '↓', class: 'tipo--saida-adm' },
  COMPENSACAO:           { label: 'Compensação',    icon: '↔', class: 'tipo--compensacao' },
}

const config = props.tipo ? (tipoConfig[props.tipo] ?? { label: props.tipo, icon: '·', class: 'tipo--default' }) : null
</script>

<template>
  <span v-if="config" class="tipo-badge" :class="config.class">
    <span class="tipo-icon">{{ config.icon }}</span>
    {{ config.label }}
  </span>
</template>

<style scoped>
.tipo-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.65rem;
  border-radius: 0.4rem;
  font-size: 0.72rem;
  font-weight: 600;
  white-space: nowrap;
}

.tipo-icon {
  font-size: 0.9rem;
  line-height: 1;
}

.tipo--entrada {
  background-color: #dcfce7;
  color: #15803d;
}

.tipo--saida-uso {
  background-color: #ede9fe;
  color: #6d28d9;
}

.tipo--saida-adm {
  background-color: #ffedd5;
  color: #c2410c;
}

.tipo--compensacao {
  background-color: #e0f2fe;
  color: #0369a1;
}

.tipo--default {
  background-color: #f3f4f6;
  color: #374151;
}
</style>
