<script setup>
import { computed } from 'vue'
import { fmt } from '../format'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object, W: Number })
const total = computed(() => Number(props.data?.total || 0))
const finalStr = computed(() => fmt(total.value))
// Tamanho do número cabe na largura útil, como no design.
const fs = computed(() => {
  const digits = finalStr.value.replace(/\D/g, '').length
  const dots = finalStr.value.length - digits
  return Math.round(Math.min(170, (props.W - 6) / (digits * 0.6 + dots * 0.26)))
})
</script>

<template>
  <div class="col" style="gap: 14px">
    <p :style="{ fontSize: '22px', lineHeight: 1.3, fontWeight: 500, ...m.F.a }">{{ tx.p }}</p>
    <div class="tnum" :style="{ fontSize: `${fs}px`, lineHeight: 0.92, fontWeight: 700, letterSpacing: '-0.045em', color: c.accent, whiteSpace: 'nowrap', ...m.F.b }">{{ fmt(m.cnt(total, 300, 1500)) }}</div>
    <p :style="{ fontSize: '24px', fontWeight: 600, letterSpacing: '-0.01em', ...m.F.c }">atendimentos realizados</p>
    <p :style="{ fontSize: '17px', lineHeight: 1.45, color: c.muted, maxWidth: '300px', ...m.F.d }">{{ tx.c }}</p>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; }
</style>
