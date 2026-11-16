<script setup>
import { computed } from 'vue'
import { fmt, monthName } from '../format'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object, name: String, year: Number })

const LABELS = { at: 'ATENDIMENTOS', mes: 'MÊS CAMPEÃO', ret: 'VOLTARAM', proc: 'PROCEDIMENTO Nº 1', msg: 'MENSAGENS QUE ENVIAMOS POR VOCÊ' }

const items = computed(() => {
  const { cnt, fu } = props.m
  const raw = (Array.isArray(props.data?.items) ? props.data.items : []).filter((it) => LABELS[it?.key]).slice(0, 5)
  const list = raw.map((it, i) => {
    const base = { key: it.key, label: LABELS[it.key], st: fu(500 + i * 150), wide: false }
    if (it.key === 'at') return { ...base, value: fmt(cnt(Number(it.value) || 0, 600, 1200)), color: '#0057FF', fs: 30 }
    if (it.key === 'mes') return { ...base, value: monthName(Number(it.value)) || String(it.value || ''), color: '#0F172A', fs: 26 }
    if (it.key === 'ret') return { ...base, value: `${cnt(Number(it.value) || 0, 900, 1100)}%`, color: '#0057FF', fs: 30 }
    if (it.key === 'proc') {
      const v = String(it.value || '')
      return { ...base, value: v, color: '#0F172A', fs: v.length > 16 ? 20 : 26, wide: v.length > 16 }
    }
    return { ...base, value: fmt(cnt(Number(it.value) || 0, 1000, 1200)), color: '#0057FF', fs: 30, wide: true }
  })
  // Grade de 2 colunas: "msg" e nomes longos ocupam a linha toda; um item sozinho na linha também.
  const narrow = list.filter((it) => !it.wide)
  if (narrow.length % 2 === 1) narrow[narrow.length - 1].wide = true
  return list
})
</script>

<template>
  <div class="col">
    <div class="mono" :style="{ fontSize: '12px', letterSpacing: '0.16em', color: c.muted, ...m.F.a }">RETROSPECTIVA {{ year }}</div>
    <div :style="{ fontSize: '56px', fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1, ...m.F.a2 }">{{ tx.p }}</div>
    <p :style="{ fontSize: '17px', lineHeight: 1.35, color: c.muted, maxWidth: '300px', ...m.F.a2 }">{{ name }}</p>
    <div class="grid" :style="m.F.b">
      <div v-for="it in items" :key="it.key" class="cell" :style="{ gridColumn: it.wide ? 'span 2' : 'span 1', ...it.st }">
        <span class="mono lbl">{{ it.label }}</span>
        <span class="tnum val" :style="{ fontSize: `${it.fs}px`, color: it.color }">{{ it.value }}</span>
      </div>
    </div>
    <p :style="{ margin: '10px 0 0', fontSize: '20px', fontWeight: 600, lineHeight: 1.35, maxWidth: '290px', ...m.F.d }">{{ tx.c }}</p>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 12px; }
.grid { margin-top: 12px; width: 100%; box-sizing: border-box; padding: 20px; border-radius: 18px; background: #FFFFFF; color: #0F172A; box-shadow: 0 16px 44px rgba(10, 18, 48, 0.28); display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 16px; text-align: left; }
.cell { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.lbl { font-size: 11px; letter-spacing: 0.06em; color: #475569; }
.val { font-weight: 700; letter-spacing: -0.025em; line-height: 1.1; overflow-wrap: anywhere; }
</style>
