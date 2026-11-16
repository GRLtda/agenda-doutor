<script setup>
import { computed } from 'vue'
import { fmt } from '../format'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object })
const pp = computed(() => props.m.cnt(Number(props.data?.returnPct) || 0, 1300, 1400))
const n = computed(() => Number(props.data?.newPatients) || 0)
const fs = computed(() => (fmt(n.value).length > 5 ? 104 : 132))
</script>

<template>
  <div class="col" style="gap: 12px">
    <p :style="{ fontSize: '22px', lineHeight: 1.3, fontWeight: 500, ...m.F.a }">{{ tx.p }}</p>
    <div class="tnum" :style="{ fontSize: `${fs}px`, lineHeight: 0.92, fontWeight: 700, letterSpacing: '-0.05em', color: c.accent, ...m.F.b }">{{ fmt(m.cnt(n, 300, 1500)) }}</div>
    <p :style="{ fontSize: '24px', fontWeight: 600, ...m.F.c }">pacientes novos</p>
    <div class="card" :style="{ background: c.chip, boxShadow: `0 0 0 1px ${c.chipBorder}`, ...m.F.d0 }">
      <div class="ring">
        <svg width="112" height="112" viewBox="0 0 112 112" aria-hidden="true" style="transform: rotate(-90deg)">
          <circle cx="56" cy="56" r="48" fill="none" :stroke="c.ring" stroke-width="12" />
          <circle cx="56" cy="56" r="48" fill="none" :stroke="c.accent" stroke-width="12" stroke-linecap="round" pathLength="100" :stroke-dasharray="`${Math.max(0.01, pp)} 100`" />
        </svg>
        <div class="tnum pct">{{ pp }}%</div>
      </div>
      <div class="txt">
        <p style="font-size: 19px; font-weight: 600; line-height: 1.3">voltaram para mais uma visita</p>
        <p :style="{ fontSize: '15px', lineHeight: 1.4, color: c.muted }">{{ tx.c }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; }
.card { margin-top: 26px; display: flex; align-items: center; gap: 20px; padding: 18px; border-radius: 18px; }
.ring { position: relative; width: 112px; height: 112px; flex: none; }
.pct { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
.txt { display: flex; flex-direction: column; gap: 4px; }
</style>
