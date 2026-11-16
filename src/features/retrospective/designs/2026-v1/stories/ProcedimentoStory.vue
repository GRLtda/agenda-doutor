<script setup>
import { computed } from 'vue'
import { fmt } from '../format'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object, kind: String })
const items = computed(() => (Array.isArray(props.data?.items) ? props.data.items.filter((i) => i && i.name) : []))
const top = computed(() => items.value[0] || { name: '', count: 0 })
const simple = computed(() => props.kind === 'proc-simples' || items.value.length <= 1)
const fs = computed(() => (top.value.name.length > 20 ? 32 : top.value.name.length > 12 ? 52 : 64))
const rows = computed(() => {
  const { fx, cnt, ease } = props.m
  const base = Number(top.value.count) || 1
  return items.value.slice(1, 5).map((r, i) => ({
    rank: `0${i + 2}`, name: r.name, n: fmt(cnt(Number(r.count) || 0, 1400 + i * 180, 900)), st: fx(1300 + i * 180),
    w: (((Number(r.count) || 0) / base) * 100 * ease(1450 + i * 180, 700)).toFixed(1),
  }))
})
</script>

<template>
  <div class="col" style="gap: 10px">
    <p :style="{ fontSize: '22px', lineHeight: 1.3, fontWeight: 500, ...m.F.a }">{{ tx.p }}</p>
    <div class="mono badge" :style="{ background: c.soft, color: c.hi, ...m.F.b }">Nº 1 DO ANO</div>
    <div :style="{ fontSize: `${fs}px`, lineHeight: 1.04, fontWeight: 700, letterSpacing: '-0.035em', color: c.accent, overflowWrap: 'anywhere', ...m.F.b }">{{ top.name }}</div>
    <p :style="{ fontSize: '20px', fontWeight: 600, ...m.F.c }"><span class="tnum">{{ fmt(m.cnt(Number(top.count) || 0, 400, 1300)) }}</span> {{ Number(top.count) === 1 ? 'vez' : 'vezes' }} no ano</p>
    <template v-if="!simple">
      <p :style="{ fontSize: '16px', lineHeight: 1.4, color: c.muted, ...m.F.c2 }">{{ tx.c }}</p>
      <div class="list">
        <div v-for="r in rows" :key="r.rank" class="row" :style="{ background: c.chip, boxShadow: `0 0 0 1px ${c.chipBorder}`, ...r.st }">
          <div class="line">
            <span class="mono" :style="{ fontSize: '12px', color: c.muted }">{{ r.rank }}</span>
            <span class="name">{{ r.name }}</span>
            <span class="tnum n">{{ r.n }}</span>
          </div>
          <div class="track" :style="{ background: c.ring }"><div :style="{ width: `${r.w}%`, background: c.accent }"></div></div>
        </div>
      </div>
    </template>
    <p v-else :style="{ margin: '8px 0 0', fontSize: '17px', lineHeight: 1.45, color: c.muted, ...m.F.d }">{{ tx.c }}</p>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; }
.badge { align-self: flex-start; margin-top: 6px; font-size: 12px; letter-spacing: 0.08em; padding: 5px 10px; border-radius: 999px; }
.list { margin-top: 10px; display: flex; flex-direction: column; gap: 8px; }
.row { padding: 12px 14px; border-radius: 14px; display: flex; flex-direction: column; gap: 8px; }
.line { display: flex; align-items: baseline; gap: 10px; }
.name { flex: 1; min-width: 0; font-size: 16px; font-weight: 500; line-height: 1.3; overflow-wrap: anywhere; }
.n { font-size: 16px; font-weight: 600; }
.track { height: 4px; border-radius: 2px; }
.track > div { height: 100%; border-radius: 2px; }
</style>
