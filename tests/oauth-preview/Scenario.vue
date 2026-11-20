<script setup>
// Entrega o cenário do cartão aos módulos substituídos da prévia e executa cliques automáticos
// (estados que dependem de interação).
import { onMounted, ref } from 'vue'
import { provideScenario } from './scenario'

const props = defineProps({
  value: { type: Object, default: () => ({}) },
  // seletores clicados em sequência depois de montar (ex.: abrir a confirmação e confirmar)
  steps: { type: Array, default: () => [] },
})
provideScenario(props.value)
const root = ref(null)
onMounted(async () => {
  for (const step of props.steps) {
    await new Promise((resolve) => setTimeout(resolve, 350))
    if (typeof step === 'string') {
      root.value?.querySelector(step)?.click()
    } else {
      // { fill: seletor, value }: digita no campo
      const input = root.value?.querySelector(step.fill)
      if (input) {
        input.value = step.value
        input.dispatchEvent(new Event('input', { bubbles: true }))
      }
    }
  }
})
</script>

<template>
  <div ref="root" class="scenario"><slot /></div>
</template>
