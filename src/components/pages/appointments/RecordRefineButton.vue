<script setup>
import { computed } from 'vue'
import { Sparkles } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'

// Botão "Refinar com IA" com a aurora azul da Lia: discreta ao passar o mouse ou focar,
// e mais rápida enquanto a Lia trabalha. Fica fixo na barra do editor.
const props = defineProps({ loading: Boolean, disabled: Boolean })
defineEmits(['click'])

const label = computed(() => (props.loading ? 'Lia está refinando…' : 'Refinar com IA'))
const hint = 'A Lia corrige a escrita e organiza o texto em títulos e listas, sem mexer em números, doses ou dados clínicos. Você revisa antes de aceitar.'
</script>

<template>
  <span class="refine-aura" :class="{ 'is-loading': loading, 'is-disabled': disabled && !loading }">
    <span class="aura-halo" aria-hidden="true"></span>
    <span class="aura-ring" aria-hidden="true"></span>
    <AppButton
      class="refine-button"
      variant="outline"
      size="sm"
      :disabled="disabled || loading"
      :aria-busy="loading"
      :aria-label="label"
      :title="hint"
      @click="$emit('click')"
    >
      <Sparkles :size="16" aria-hidden="true" />
      <!-- No celular só o ícone aparece; o texto continua disponível para leitores de tela -->
      <span class="refine-label">{{ label }}</span>
    </AppButton>
  </span>
</template>

<style scoped>
.refine-aura { position: relative; display: inline-flex; isolation: isolate; border-radius: 0.6rem; }
.refine-button { position: relative; z-index: 1; gap: 0.4rem; background: #fff; }

.aura-ring,
.aura-halo {
  position: absolute;
  pointer-events: none;
  opacity: 0;
  background: linear-gradient(90deg, #0057ff, #38bdf8, #8fbaff, #0057ff, #38bdf8, #8fbaff, #0057ff);
  background-size: 200% 100%;
  animation: refine-slide 5s linear infinite;
  transition: opacity 0.4s ease;
}
.aura-ring { inset: -2px; border-radius: calc(0.6rem + 2px); }
.aura-halo { inset: 4px -10px -6px -10px; border-radius: 1rem; filter: blur(14px); }

.refine-aura:not(.is-disabled):hover .aura-ring,
.refine-aura:not(.is-disabled):focus-within .aura-ring { opacity: 1; }
.refine-aura:not(.is-disabled):hover .aura-halo,
.refine-aura:not(.is-disabled):focus-within .aura-halo { opacity: 0.45; }

.refine-aura.is-loading .aura-ring { opacity: 1; animation-duration: 1.3s; }
.refine-aura.is-loading .aura-halo { opacity: 0.9; animation-duration: 1.3s; }

/* Celular: botão quadrado só com o ícone */
@media (max-width: 640px) {
  .refine-button { width: 40px; height: 40px; padding: 0; justify-content: center; }
  .refine-label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
}

@keyframes refine-slide {
  from { background-position: 0% 0; }
  to { background-position: 100% 0; }
}

@media (prefers-reduced-motion: reduce) {
  .aura-ring,
  .aura-halo { animation: none; }
}
</style>
