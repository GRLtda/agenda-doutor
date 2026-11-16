<script setup>
import { computed } from 'vue'
import { fmt } from '../format'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object })
const count = computed(() => Number(props.data?.count) || 0)
const hours = computed(() => Number(props.data?.hoursSaved) || 0)
const fs = computed(() => (fmt(count.value).length > 6 ? 96 : 120))
</script>

<template>
  <div class="col" style="gap: 12px">
    <p :style="{ fontSize: '22px', lineHeight: 1.3, fontWeight: 500, ...m.F.a }">{{ tx.p }}</p>
    <div :style="{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', ...m.F.b }">
      <span class="ico" :style="{ background: c.accent, color: c.onAccent }"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg></span>
      <span class="mono" :style="{ fontSize: '12px', letterSpacing: '0.08em', color: c.muted }">WHATSAPP</span>
    </div>
    <div class="tnum" :style="{ fontSize: `${fs}px`, lineHeight: 0.92, fontWeight: 700, letterSpacing: '-0.05em', color: c.accent, whiteSpace: 'nowrap', ...m.F.b }">{{ fmt(m.cnt(count, 300, 1500)) }}</div>
    <p :style="{ fontSize: '22px', fontWeight: 600, lineHeight: 1.3, ...m.F.c }">mensagens automáticas enviadas</p>
    <p :style="{ fontSize: '16px', lineHeight: 1.45, color: c.muted, ...m.F.c2 }">{{ tx.c }}</p>
    <div v-if="hours > 0" class="card" :style="{ background: c.chip, boxShadow: `0 0 0 1px ${c.chipBorder}`, ...m.F.d0 }">
      <span class="clock" :style="{ background: c.soft, color: c.hi }"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg></span>
      <div style="display: flex; flex-direction: column; gap: 2px">
        <div style="font-size: 28px; font-weight: 700; letter-spacing: -0.02em">cerca de <span class="tnum">{{ fmt(m.cnt(hours, 1300, 1000)) }}</span> {{ hours === 1 ? 'hora' : 'horas' }}</div>
        <div :style="{ fontSize: '15px', lineHeight: 1.4, color: c.muted }">{{ tx.x }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; }
.ico { width: 40px; height: 40px; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.card { margin-top: 18px; display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 18px; }
.clock { width: 52px; height: 52px; flex: none; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
</style>
