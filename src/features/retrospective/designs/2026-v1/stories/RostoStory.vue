<script setup>
import { computed } from 'vue'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object })

// Posição de cada região no desenho do rosto (viewBox 220x260). Regiões bilaterais têm 2 pontos.
const SPOTS = {
  testa: [[110, 64]], glabela: [[110, 104]], periocular: [[52, 128], [168, 128]], nariz: [[110, 150]],
  malar: [[66, 160], [154, 160]], labios: [[110, 196]], mandibula: [[62, 206], [158, 206]], mento: [[110, 226]],
  pescoco: [[110, 252]],
}
const SIZES = [[34, 20, 8, 28, 38], [18, 11, 5, 14, 22], [14, 8, 3.5, 11, 17]]
const TAGS = ['mais tratada', '2º lugar', '3º lugar']

const regions = computed(() => (Array.isArray(props.data?.regions) ? props.data.regions.slice(0, 3) : []))
const spots = computed(() => regions.value.map((r, i) => ({
  key: r.key, points: SPOTS[r.key] || [], size: SIZES[i], o: props.m.ease(700 + i * 250, 500).toFixed(2), begin: `${(i * 0.4).toFixed(1)}s`,
})))
const legend = computed(() => regions.value.map((r, i) => ({ n: i + 1, name: r.label, tag: TAGS[i], st: props.m.fx(1400 + i * 160) })))
const aria = computed(() => `Rosto com as regiões mais tratadas destacadas: ${regions.value.map((r) => r.label.toLowerCase()).join(', ')}`)
</script>

<template>
  <div class="col" style="gap: 14px">
    <p :style="{ fontSize: '22px', lineHeight: 1.3, fontWeight: 500, ...m.F.a }">{{ tx.p }}</p>
    <div :style="{ display: 'flex', justifyContent: 'center', ...m.F.b }">
      <svg role="img" :aria-label="aria" width="230" height="272" viewBox="0 0 220 260">
        <g fill="none" :stroke="c.face" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
          <path d="M110 16 C 54 16 34 66 36 118 C 38 176 70 232 110 242 C 150 232 182 176 184 118 C 186 66 166 16 110 16 Z" />
          <path d="M36 118 C 26 116 24 140 38 150" />
          <path d="M184 118 C 194 116 196 140 182 150" />
          <path d="M62 104 Q 80 94 98 102" />
          <path d="M122 102 Q 140 94 158 104" />
          <path d="M66 126 Q 80 134 94 126" />
          <path d="M126 126 Q 140 134 154 126" />
          <path d="M108 120 Q 106 150 98 162 Q 104 169 116 166" />
          <path d="M90 196 Q 110 186 130 196 Q 110 210 90 196 Z" />
          <path d="M84 236 L 84 258" />
          <path d="M136 236 L 136 258" />
        </g>
        <g v-for="s in spots" :key="s.key" :opacity="s.o">
          <template v-for="(p, j) in s.points" :key="j">
            <circle :cx="p[0]" :cy="p[1]" :r="s.size[0]" :fill="c.heat" opacity="0.16"><animate attributeName="r" :values="`${s.size[3]};${s.size[4]};${s.size[3]}`" dur="2.4s" :begin="s.begin" repeatCount="indefinite" /></circle>
            <circle :cx="p[0]" :cy="p[1]" :r="s.size[1]" :fill="c.heat" opacity="0.34" />
            <circle :cx="p[0]" :cy="p[1]" :r="s.size[2]" :fill="c.heat" opacity="0.95" />
          </template>
        </g>
      </svg>
    </div>
    <div class="legend">
      <div v-for="r in legend" :key="r.n" class="item" :style="{ background: c.chip, boxShadow: `0 0 0 1px ${c.chipBorder}`, ...r.st }">
        <span class="num" :style="{ background: c.heat, color: c.onAccent }">{{ r.n }}</span>
        <span class="name">{{ r.name }}</span>
        <span class="mono" :style="{ fontSize: '11px', color: c.muted }">{{ r.tag }}</span>
      </div>
    </div>
    <p :style="{ margin: '2px 0 0', fontSize: '17px', lineHeight: 1.45, color: c.muted, ...m.F.e }">{{ tx.c }}</p>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; }
.legend { display: flex; flex-direction: column; gap: 8px; }
.item { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 12px; }
.num { width: 26px; height: 26px; flex: none; border-radius: 999px; font-size: 13px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.name { flex: 1; font-size: 16px; font-weight: 600; }
</style>
