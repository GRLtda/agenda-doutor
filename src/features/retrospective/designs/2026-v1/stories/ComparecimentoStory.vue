<script setup>
import { computed } from 'vue'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object })
const cp = computed(() => props.m.cnt(Number(props.data?.pct) || 0, 300, 1700))
</script>

<template>
  <div class="col" style="gap: 12px">
    <p :style="{ fontSize: '22px', lineHeight: 1.3, fontWeight: 500, ...m.F.a }">{{ tx.p }}</p>
    <div class="gauge" :style="m.F.b">
      <svg width="240" height="240" viewBox="0 0 240 240" aria-hidden="true" style="transform: rotate(-90deg)">
        <circle cx="120" cy="120" r="106" fill="none" :stroke="c.ring" stroke-width="18" />
        <circle cx="120" cy="120" r="106" fill="none" :stroke="c.accent" stroke-width="18" stroke-linecap="round" pathLength="100" :stroke-dasharray="`${Math.max(0.01, cp)} 100`" />
      </svg>
      <div class="inner">
        <span class="tnum" :style="{ fontSize: '80px', fontWeight: 700, letterSpacing: '-0.05em', lineHeight: 1, color: c.accent }">{{ cp }}%</span>
        <span class="mono" :style="{ fontSize: '11px', letterSpacing: '0.1em', color: c.muted, marginTop: '8px' }">COMPARECIMENTO</span>
      </div>
    </div>
    <p :style="{ fontSize: '22px', fontWeight: 600, lineHeight: 1.3, maxWidth: '290px', ...m.F.c }">dos pacientes vieram às consultas marcadas.</p>
    <p :style="{ fontSize: '17px', lineHeight: 1.45, color: c.muted, ...m.F.d }">{{ tx.c }}</p>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; align-items: center; text-align: center; }
.gauge { position: relative; width: 240px; height: 240px; margin: 18px 0; }
.inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
</style>
