<script setup>
import { computed } from 'vue'
import ClinicMark from '../ClinicMark.vue'

const props = defineProps({ data: Object, tx: Object, m: Object, c: Object, W: Number, name: String, logoUrl: String, year: Number })
const fs = computed(() => (props.name.length > 32 ? 28 : props.name.length > 16 ? 34 : 46))
</script>

<template>
  <div class="col center" style="gap: 18px">
    <ClinicMark :name="name" :logo-url="logoUrl" :size="124" :border="c.logoBorder" shadow="0 18px 50px rgba(0, 87, 255, 0.35)" :style="m.F.a" />
    <div class="mono" :style="{ fontSize: '13px', letterSpacing: '0.16em', color: c.hi, ...m.F.b }">RETROSPECTIVA {{ year }}</div>
    <div :style="{ fontSize: `${fs}px`, lineHeight: 1.06, fontWeight: 700, letterSpacing: '-0.035em', maxWidth: '100%', overflowWrap: 'anywhere', ...m.F.c }">{{ name }}</div>
    <p :style="{ fontSize: '18px', lineHeight: 1.45, color: c.muted, maxWidth: '280px', ...m.fu(560) }">{{ tx.p }}</p>
  </div>
</template>

<style scoped>
.col { display: flex; flex-direction: column; }
.center { align-items: center; text-align: center; }
</style>
