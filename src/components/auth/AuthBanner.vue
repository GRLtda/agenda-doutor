<script setup>
/**
 * Aviso das telas de acesso (erro, atenção, informação e sucesso). Sempre com ícone e texto.
 * Erro usa role="alert"; os demais, role="status". A ação opcional (botão/link) vai no slot `action`.
 */
import { computed } from 'vue'
import { AlertCircle, CheckCircle2, Info, TriangleAlert } from 'lucide-vue-next'

const props = defineProps({
  // 'error' | 'warning' | 'info' | 'success'
  tone: { type: String, default: 'info' },
  title: { type: String, default: '' },
  // Ícone lucide opcional (substitui o padrão do tom)
  icon: { type: [Object, Function], default: null },
})

const defaultIcons = { error: AlertCircle, warning: TriangleAlert, info: Info, success: CheckCircle2 }
const iconComponent = computed(() => props.icon || defaultIcons[props.tone] || Info)
</script>

<template>
  <div class="auth-banner" :class="`is-${tone}`" :role="tone === 'error' ? 'alert' : 'status'">
    <component :is="iconComponent" :size="18" class="auth-banner-icon" aria-hidden="true" />
    <div class="auth-banner-body">
      <p>
        <strong v-if="title">{{ title }}</strong>
        <slot />
      </p>
      <div v-if="$slots.action" class="auth-banner-action"><slot name="action" /></div>
    </div>
  </div>
</template>

<style scoped>
.auth-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
  padding: 0.75rem 0.875rem;
  border: 1px solid;
  border-radius: 12px;
  font-size: 0.875rem;
  line-height: 1.45;
  text-align: left;
}
.auth-banner-icon {
  flex: none;
  margin-top: 1px;
}
.auth-banner-body {
  flex: 1;
  min-width: 0;
}
.auth-banner p {
  margin: 0;
}
.auth-banner strong {
  margin-right: 0.25rem;
  font-weight: 600;
}
.auth-banner-action {
  margin-top: 0.5rem;
}
.is-error { background: var(--ds-danger-bg, #fef2f2); border-color: var(--ds-danger-border, #fecaca); color: var(--ds-danger-text, #b91c1c); }
.is-warning { background: var(--ds-warning-bg, #fffbeb); border-color: var(--ds-warning-border, #fde68a); color: var(--ds-warning-text, #92400e); }
.is-success { background: var(--ds-success-bg, #ecfdf5); border-color: var(--ds-success-border, #a7f3d0); color: var(--ds-success-text, #047857); }
.is-info { background: #eff6ff; border-color: #dbeafe; color: #1d4ed8; }
</style>
