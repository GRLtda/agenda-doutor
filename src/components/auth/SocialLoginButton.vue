<script setup>
/**
 * Botão nativo de login com provedor externo (visual do sistema, não o botão padrão do Google).
 * Genérico: o provedor define só ícone e textos (providers.config.js).
 *
 * Contextos: login/cadastro (largura total, altura do AppButton `lg`) e `link` ("Conectar", compacto, altura `sm`).
 * Estados: padrão, hover, foco visível, pressionado, carregando (bloqueia clique duplo),
 * desabilitado e `degraded` (provedor instável).
 */
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'
import { getProviderConfig } from './providers.config'

const props = defineProps({
  provider: { type: String, required: true },
  // 'login' | 'signup' | 'link' → escolhe o texto padrão
  mode: { type: String, default: 'login' },
  label: { type: String, default: '' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  // 'available' | 'degraded' (vem de /oauth/providers)
  status: { type: String, default: 'available' },
  block: { type: Boolean, default: true },
})

const emit = defineEmits(['click'])

const config = computed(() => getProviderConfig(props.provider))
const text = computed(() => props.label || config.value.texts[props.mode] || config.value.texts.login)
const isDegraded = computed(() => props.status === 'degraded')
const isCompact = computed(() => props.mode === 'link')
const isBlocked = computed(() => props.disabled || props.loading || isDegraded.value)

function handleClick(event) {
  if (isBlocked.value) {
    event.preventDefault()
    return
  }
  emit('click', props.provider)
}
</script>

<template>
  <button
    type="button"
    class="social-login-button"
    :class="[
      `provider-${provider}`,
      { 'is-block': block, 'is-compact': isCompact, 'is-loading': loading, 'is-degraded': isDegraded },
    ]"
    :disabled="isBlocked"
    :aria-busy="loading ? 'true' : 'false'"
    :aria-label="loading ? 'Conectando' : text"
    :data-provider="provider"
    @click="handleClick"
  >
    <Loader2 v-if="loading" class="social-login-spinner" :size="isCompact ? 16 : 20" aria-hidden="true" />
    <!-- eslint-disable-next-line vue/no-v-html : SVG estático definido em providers.config.js -->
    <span v-else class="social-login-icon" aria-hidden="true" v-html="config.icon" />
    <span class="social-login-label">{{ loading ? 'Conectando...' : text }}</span>
  </button>
</template>

<style scoped>
/* Mesma altura e raio do AppButton: padrão `lg` (48px) e compacto `sm` (32px). */
.social-login-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* Espaço de proteção da marca Google: 10px entre o "G" e o texto, 12px nas laterais. */
  gap: 10px;
  height: var(--ds-control-height-lg);
  padding: 0 12px;
  border: 1px solid var(--ds-border-control);
  border-radius: var(--ds-radius-sm);
  background: var(--ds-surface);
  color: var(--ds-text);
  font: inherit;
  font-size: 1rem;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: var(--ds-shadow-xs);
  transition:
    background-color var(--ds-duration-base) var(--ds-ease),
    border-color var(--ds-duration-base) var(--ds-ease),
    box-shadow var(--ds-duration-base) var(--ds-ease),
    transform var(--ds-duration-fast) var(--ds-ease);
}
.social-login-button.is-block {
  display: flex;
  width: 100%;
}
.social-login-button.is-compact {
  height: var(--ds-control-height-sm);
  padding: 0 12px;
  font-size: var(--ds-font-base);
}
.social-login-button:hover:not(:disabled) {
  background: var(--ds-surface-subtle);
  border-color: var(--ds-border-control-hover);
  box-shadow: var(--ds-shadow-sm);
}
.social-login-button:active:not(:disabled) {
  background: var(--ds-surface-muted);
  box-shadow: none;
  transform: scale(0.99);
}
.social-login-button:focus-visible {
  outline: 2px solid var(--ds-border-focus);
  outline-offset: 2px;
}
.social-login-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  box-shadow: none;
}
/* Instável: contorno tracejado diferencia de "desabilitado" sem depender só da cor. */
.social-login-button.is-degraded:disabled {
  border-style: dashed;
  background: var(--ds-surface-muted);
}
.social-login-button.is-loading:disabled {
  cursor: progress;
  opacity: 1;
  color: var(--ds-text-muted);
  background: var(--ds-surface-subtle);
}
.social-login-icon {
  display: inline-flex;
  flex: none;
  width: 20px;
  height: 20px;
}
.social-login-icon :deep(svg) {
  width: 100%;
  height: 100%;
}
.social-login-button.is-compact .social-login-icon {
  width: 16px;
  height: 16px;
}
.social-login-spinner {
  flex: none;
  animation: social-spin 0.9s linear infinite;
}
@keyframes social-spin {
  to {
    transform: rotate(360deg);
  }
}

/* Toque mínimo de 44px no celular (botão compacto incluído). */
@media (max-width: 767px) {
  .social-login-button,
  .social-login-button.is-compact {
    min-height: 44px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .social-login-button {
    transition: none;
  }
  .social-login-button:active:not(:disabled) {
    transform: none;
  }
  .social-login-spinner {
    animation: none;
  }
}
</style>
