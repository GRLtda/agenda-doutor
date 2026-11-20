<script setup>
/**
 * Anima a altura do conteúdo quando ele cresce ou encolhe (campo que aparece, requisito de senha,
 * mensagem de erro, quebra de linha ao redimensionar a janela). Evita o "pulo" do layout.
 * O contêiner externo recebe a altura medida do interno via ResizeObserver; respeita prefers-reduced-motion.
 */
import { ref, onMounted, onBeforeUnmount } from 'vue'

const outer = ref(null)
const inner = ref(null)
const ready = ref(false)
let observer = null

function sync() {
  if (outer.value && inner.value) outer.value.style.height = `${inner.value.offsetHeight}px`
}

onMounted(() => {
  sync()
  if (typeof ResizeObserver === 'undefined') return
  observer = new ResizeObserver(sync)
  observer.observe(inner.value)
  // Liga a transição só depois da primeira medida, para não animar a entrada.
  requestAnimationFrame(() => {
    ready.value = true
  })
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div ref="outer" class="smooth-height" :class="{ 'is-ready': ready }">
    <div ref="inner" class="smooth-height-inner"><slot /></div>
  </div>
</template>

<style scoped>
/* Folga de 6px para o anel de foco e as sombras dos campos não serem cortados. */
.smooth-height {
  box-sizing: content-box;
  margin: -6px;
  padding: 6px;
  overflow: hidden;
}
.smooth-height.is-ready {
  transition: height var(--ds-duration-slow, 320ms) var(--ds-ease-out, cubic-bezier(0.16, 1, 0.3, 1));
}
@media (prefers-reduced-motion: reduce) {
  .smooth-height.is-ready {
    transition: none;
  }
}
</style>
