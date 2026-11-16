<script setup>
// Confete do resumo (SVG). Animado no story; estático e espalhado no cartão ou com movimento reduzido.
import { computed } from 'vue'

const props = defineProps({ H: { type: Number, default: 844 }, animated: { type: Boolean, default: true }, opacity: { type: [Number, String], default: 1 } })
const COLS = ['#FFFFFF', '#A9C4FF', '#FFFFFF', '#0A1230', '#D6E4FF', '#7FA6FF']
const items = computed(() => Array.from({ length: 40 }, (_, i) => {
  const w = 6 + (i % 3) * 2
  const h = 10 + (i % 4) * 2
  const drift = (i % 2 ? 1 : -1) * (8 + (i % 5) * 7)
  return {
    left: ((i * 53 + 17) % 380) - 10, w, h, rx: -w / 2, ry: -h / 2, color: COLS[i % COLS.length],
    vals: `20 -30; ${20 + drift} ${props.H + 30}`, dur: `${(3.4 + (i % 6) * 0.55).toFixed(2)}s`,
    begin: `-${((i * 0.41) % 4).toFixed(2)}s`, rdur: `${(1.2 + (i % 4) * 0.5).toFixed(1)}s`,
    staticY: ((i * 97 + 31) % (props.H - 40)) + 20, staticRot: (i * 47) % 360,
  }
}))
</script>

<template>
  <div aria-hidden="true" class="confetti" :style="{ opacity }">
    <svg v-for="(q, i) in items" :key="i" width="40" :height="H" :viewBox="`0 0 40 ${H}`" :style="{ left: `${q.left}px` }">
      <g v-if="animated">
        <animateTransform attributeName="transform" type="translate" :values="q.vals" :dur="q.dur" :begin="q.begin" repeatCount="indefinite" />
        <rect :x="q.rx" :y="q.ry" :width="q.w" :height="q.h" rx="1.5" :fill="q.color">
          <animateTransform attributeName="transform" type="rotate" values="0;360" :dur="q.rdur" repeatCount="indefinite" />
        </rect>
      </g>
      <g v-else :transform="`translate(20 ${q.staticY}) rotate(${q.staticRot})`">
        <rect :x="q.rx" :y="q.ry" :width="q.w" :height="q.h" rx="1.5" :fill="q.color" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.confetti { position: absolute; inset: 0; z-index: 1; pointer-events: none; overflow: hidden; }
.confetti svg { position: absolute; top: 0; overflow: visible; }
</style>
