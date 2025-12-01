<script setup>
import { computed } from 'vue'
import { Loader2 } from 'lucide-vue-next'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'primary', 'secondary', 'dangerous', 'warning'].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg'].includes(value),
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  to: {
    type: [String, Object],
    default: null,
  },
  type: {
    type: String,
    default: 'button',
  },
})

const isLink = computed(() => !!props.to)
const componentType = computed(() => (isLink.value ? 'router-link' : 'button'))

const classes = computed(() => {
  return [
    'app-button',
    `variant-${props.variant}`,
    `size-${props.size}`,
    { 'is-loading': props.loading },
    { 'is-disabled': props.disabled },
  ]
})
</script>

<template>
  <component
    :is="componentType"
    :to="to"
    :type="!isLink ? type : undefined"
    :disabled="disabled || loading"
    :class="classes"
    v-bind="$attrs"
  >
    <Loader2 v-if="loading" class="spinner" :size="size === 'sm' ? 14 : 18" />
    <span :class="['button-content', { 'invisible': loading }]">
      <slot />
    </span>
  </component>
</template>

<style scoped>
.app-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none;
  position: relative;
  white-space: nowrap;
}

.button-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.app-button:focus-visible {
  outline: 2px solid var(--azul-principal);
  outline-offset: 2px;
}

.app-button.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.invisible {
  visibility: hidden;
}

.spinner {
  animation: spin 1s linear infinite;
  position: absolute;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Sizes */
.size-sm {
  height: 32px;
  padding: 0 0.75rem;
  font-size: 0.875rem;
}

.size-md {
  height: 38px;
  padding: 0 1.25rem;
  font-size: 0.95rem;
}

.size-lg {
  height: 48px;
  padding: 0 1.5rem;
  font-size: 1rem;
}

/* Variants */

/* Default */
.variant-default {
  background-color: #f3f4f6; /* cinza-claro */
  color: #374151;
  border-color: #e5e7eb;
}
.variant-default:hover:not(.is-disabled) {
  background-color: #e5e7eb;
  color: #111827;
}
.variant-default:active:not(.is-disabled) {
  background-color: #d1d5db;
}

/* Primary */
.variant-primary {
  background: linear-gradient(180deg, #5b8bf7 0%, var(--azul-principal) 100%);
  color: var(--branco);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 0 0 1px rgba(59, 130, 246, 0.1), inset 0 1px 0 0 rgba(255, 255, 255, 0.1);
}
.variant-primary:hover:not(.is-disabled) {
  background: linear-gradient(180deg, #6ba0f9 0%, #468bf7 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.variant-primary:active:not(.is-disabled) {
  transform: translateY(0);
}

/* Secondary */
.variant-secondary {
  background-color: #10b981; /* Emerald 500 */
  color: var(--branco);
}
.variant-secondary:hover:not(.is-disabled) {
  background-color: #059669; /* Emerald 600 */
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.variant-secondary:active:not(.is-disabled) {
  transform: translateY(0);
}

/* Dangerous */
.variant-dangerous {
  background-color: #ef4444; /* Red 500 */
  color: var(--branco);
}
.variant-dangerous:hover:not(.is-disabled) {
  background-color: #dc2626; /* Red 600 */
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.variant-dangerous:active:not(.is-disabled) {
  transform: translateY(0);
}

/* Warning */
.variant-warning {
  background-color: #f59e0b; /* Amber 500 */
  color: var(--branco);
}
.variant-warning:hover:not(.is-disabled) {
  background-color: #d97706; /* Amber 600 */
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.variant-warning:active:not(.is-disabled) {
  transform: translateY(0);
}
</style>
