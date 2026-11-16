<script setup>
// Só percentual e índices relativos (o backend nunca envia valores em R$).
import { computed } from 'vue'
import { MONTHS, MONTH_SHORT } from '../format'
import { clamp01 } from '../motion'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object, W: Number })

const pct = computed(() => Math.max(0, Number(props.data?.pct) || 0))
const best = computed(() => Number(props.data?.bestMonth) || 0)
// Pontos = meses com índice (do primeiro ao último com dado). Meses sem dado no meio são pulados.
const points = computed(() => {
  const idx = Array.isArray(props.data?.monthlyIndex) ? props.data.monthlyIndex : []
  return idx.map((r, i) => ({ month: i + 1, r })).filter((p) => typeof p.r === 'number' && Number.isFinite(p.r))
})
const scale = computed(() => {
  const values = points.value.map((p) => p.r)
  const lo = Math.min(0.6, ...values.map((v) => v - 0.1))
  const hi = Math.max(1.5, ...values.map((v) => v + 0.1))
  return { lo, hi }
})
const yOf = (r) => 160 - ((r - scale.value.lo) / (scale.value.hi - scale.value.lo)) * 140
const coords = computed(() => {
  const n = points.value.length
  return points.value.map((p, i) => ({ ...p, x: n > 1 ? 10 + (i * (props.W - 20)) / (n - 1) : props.W / 2, y: yOf(p.r) }))
})
const line = computed(() => coords.value.map((q, i) => `${i ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' '))
const area = computed(() => {
  const list = coords.value
  if (!list.length) return ''
  return `${line.value} L ${list[list.length - 1].x.toFixed(1)} 170 L ${list[0].x.toFixed(1)} 170 Z`
})
const peak = computed(() => coords.value.find((q) => q.month === best.value) || coords.value.reduce((a, b) => (b.r > (a?.r ?? -1) ? b : a), null))
const fp = computed(() => props.m.ease(700, 1400))
const dotO = computed(() => clamp01((props.m.ms - 1900) / 300).toFixed(2))
const avgY = computed(() => yOf(1))
const aria = computed(() => {
  if (!coords.value.length) return 'Linha do faturamento relativo.'
  const first = MONTHS[coords.value[0].month - 1].toLowerCase()
  const last = MONTHS[coords.value[coords.value.length - 1].month - 1].toLowerCase()
  return `Linha do faturamento relativo de ${first} a ${last}, com pico em ${MONTHS[best.value - 1]?.toLowerCase() || ''}, ${pct.value}% acima da média`
})
</script>

<template>
  <div class="col" style="gap: 10px">
    <p :style="{ fontSize: '22px', lineHeight: 1.3, fontWeight: 500, ...m.F.a }">{{ tx.p }}</p>
    <div class="big" :style="{ color: c.accent, ...m.F.b }">
      <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 7-7 7 7" /><path d="M12 19V5" /></svg>
      <span class="tnum">{{ m.cnt(pct, 400, 1400) }}%</span>
    </div>
    <p :style="{ fontSize: '24px', fontWeight: 600, ...m.F.c }">acima da média do ano</p>
    <svg role="img" :aria-label="aria" :width="W" height="170" :viewBox="`0 0 ${W} 170`" style="margin-top: 22px; overflow: visible">
      <line x1="0" :x2="W" :y1="avgY.toFixed(1)" :y2="avgY.toFixed(1)" :stroke="c.muted" stroke-width="1.5" stroke-dasharray="4 6" />
      <text x="0" :y="(avgY - 8).toFixed(1)" font-family="DM Mono, monospace" font-size="11" :fill="c.muted">média do ano</text>
      <path :d="area" :fill="c.soft" :opacity="(fp * 0.9).toFixed(2)" />
      <path :d="line" fill="none" :stroke="c.accent" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" pathLength="1" stroke-dasharray="1 1" :stroke-dashoffset="(1 - fp).toFixed(3)" />
      <g v-if="peak" :opacity="dotO">
        <circle :cx="peak.x" :cy="peak.y" r="14" :fill="c.accent" opacity="0.22"><animate attributeName="r" values="9;18;9" dur="1.8s" repeatCount="indefinite" /></circle>
        <circle :cx="peak.x" :cy="peak.y" r="6" :fill="c.accent" />
        <text :x="peak.x" :y="peak.y - 20" text-anchor="middle" font-family="DM Mono, monospace" font-size="12" :fill="c.text">{{ MONTH_SHORT[peak.month - 1] }}</text>
      </g>
    </svg>
    <p :style="{ margin: '4px 0 0', fontSize: '17px', lineHeight: 1.45, color: c.muted, ...m.F.e }">{{ tx.c }}</p>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; }
.big { display: flex; align-items: center; gap: 6px; }
.big span { font-size: 136px; line-height: 0.9; font-weight: 700; letter-spacing: -0.05em; }
</style>
