<script setup>
import { computed } from 'vue'
import { MONTHS, MONTH_INITIALS, fmt } from '../format'
import { clamp01 } from '../motion'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object, inProgressMonth: Number })

const monthly = computed(() => {
  const list = Array.isArray(props.data?.monthly) ? props.data.monthly.slice(0, 12) : []
  while (list.length < 12) list.push(0)
  return list.map((v) => Number(v) || 0)
})
const champIndex = computed(() => {
  const m = Number(props.data?.championMonth)
  if (m >= 1 && m <= 12) return m - 1
  const max = Math.max(...monthly.value)
  return monthly.value.indexOf(max)
})
const max = computed(() => Math.max(1, ...monthly.value))
const champValue = computed(() => Number(props.data?.championValue ?? monthly.value[champIndex.value]) || 0)
const progIndex = computed(() => (props.inProgressMonth >= 1 && props.inProgressMonth <= 12 ? props.inProgressMonth - 1 : -1))

// Barras crescem em cascata; o campeão aterrissa por último, pula e brilha.
const landing = 500 + 12 * 70 + 450
const bars = computed(() => {
  const { ms, ease } = props.m
  return monthly.value.map((v, i) => {
    const isC = i === champIndex.value
    const g = isC ? ease(landing, 600) : ease(500 + i * 70, 600)
    const after = ms - landing - 520
    const jy = isC ? -10 * Math.sin(Math.PI * clamp01(after / 380)) : 0
    const glow = isC ? clamp01(after / 400) : 0
    return {
      champ: isC,
      prog: i === progIndex.value,
      h: Math.max(4, Math.round((v / max.value) * 160 * g)),
      bg: isC ? props.c.barC : props.c.bar,
      jy: jy.toFixed(1), gl: Math.round(26 * glow), lo: glow.toFixed(2),
      o: ease(500 + i * 70, 600).toFixed(2),
      v: fmt(v), l: MONTH_INITIALS[i], lc: isC ? props.c.text : props.c.muted, lw: isC ? 600 : 400,
    }
  })
})

const note = computed(() => {
  if (progIndex.value >= 0) return `${MONTHS[progIndex.value]} · em andamento`
  const lastWithData = monthly.value.reduce((last, v, i) => (v > 0 ? i : last), -1)
  return lastWithData === champIndex.value ? 'O ano fechou no pico.' : ''
})
const aria = computed(() =>
  'Atendimentos por mês: '
  + monthly.value.map((v, i) => `${MONTHS[i]} ${i === progIndex.value ? 'em andamento' : v}`).join(', ')
  + `. Mês campeão: ${MONTHS[champIndex.value]}.`,
)
</script>

<template>
  <div class="col" style="gap: 10px">
    <p :style="{ fontSize: '22px', lineHeight: 1.3, fontWeight: 500, ...m.F.a }">{{ tx.p }}</p>
    <div :style="{ fontSize: '68px', lineHeight: 1, fontWeight: 700, letterSpacing: '-0.04em', color: c.accent, ...m.F.b }">{{ MONTHS[champIndex] }}</div>
    <p :style="{ fontSize: '20px', fontWeight: 600, ...m.F.c }"><span class="tnum">{{ fmt(m.cnt(champValue, 1600, 1100)) }}</span> atendimentos</p>
    <div role="img" :aria-label="aria" class="chart">
      <div v-for="(b, i) in bars" :key="i" class="slot">
        <div v-if="b.champ" class="mono chip" :style="{ background: c.accent, color: c.onAccent, opacity: b.lo }">{{ b.v }}</div>
        <div v-if="b.prog" class="prog" :style="{ border: `1.5px dashed ${c.line2}`, opacity: b.o }"></div>
        <div v-else class="bar" :style="{ height: `${b.h}px`, background: b.bg, transform: `translateY(${b.jy}px)`, boxShadow: `0 0 ${b.gl}px ${c.glow}` }"></div>
        <div class="mono lbl" :style="{ color: b.lc, fontWeight: b.lw }">{{ b.l }}</div>
      </div>
    </div>
    <p :style="{ margin: '8px 0 0', fontSize: '17px', lineHeight: 1.45, color: c.muted, ...m.F.d }">{{ tx.c }}</p>
    <p v-if="note" class="mono" :style="{ fontSize: '12px', color: c.muted, ...m.F.e }">{{ note }}</p>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; }
.chart { margin-top: 26px; height: 220px; display: flex; align-items: flex-end; gap: 6px; }
.slot { flex: 1; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 8px; }
.chip { font-size: 12px; font-weight: 500; padding: 3px 6px; border-radius: 6px; white-space: nowrap; }
.prog { width: 100%; height: 22px; box-sizing: border-box; border-radius: 6px; }
.bar { width: 100%; border-radius: 6px; }
.lbl { font-size: 11px; }
</style>
