<script setup>
/**
 * Bolinha amarela de pendência de segurança (só sinalização, sem card/banner).
 * Recebe a lista de alertas do /me (`securityAlerts`); hoje só existe `no_password`.
 * Não depende só da cor: tem texto acessível (`aria-label`) e `title`.
 */
import { computed } from 'vue'

const props = defineProps({
  // [{ code: 'no_password' }]
  alerts: { type: Array, default: () => [] },
  // 'sm' (menu) | 'md' (avatar)
  size: { type: String, default: 'md' },
})

const ALERT_LABELS = {
  no_password: 'Defina uma senha para sua conta',
}

const labels = computed(() => props.alerts.map((alert) => ALERT_LABELS[alert.code]).filter(Boolean))
const label = computed(() => labels.value.join('. '))
</script>

<template>
  <span
    v-if="alerts.length"
    class="security-alert-dot"
    :class="`size-${size}`"
    role="img"
    :aria-label="label || 'Pendência de segurança'"
    :title="label || 'Pendência de segurança'"
  />
</template>

<style scoped>
/* Só sinalização: bolinha amarela com anel na cor da superfície (contraste em fundo claro e escuro). */
.security-alert-dot {
  display: inline-block;
  flex: none;
  vertical-align: middle;
  border-radius: var(--ds-radius-full);
  background: var(--ds-warning-solid);
  box-shadow: 0 0 0 2px var(--ds-surface);
}
.size-sm {
  width: 8px;
  height: 8px;
}
.size-md {
  width: 10px;
  height: 10px;
}
</style>
