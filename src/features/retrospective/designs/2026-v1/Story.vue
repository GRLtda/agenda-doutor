<script setup>
// Um story do design 2026-v1, em modo "story" (390x844, no app) ou "card" (390x694, imagem 9:16).
// O layout de cada kind fica em stories/. Os textos vêm de copy.ts pela variação da clínica.
import { computed } from 'vue'
import { THEMES } from './theme'
import { pickCopy } from './copy'
import { fmt, monthName } from './format'
import { motion, FINAL_MS, clamp01 } from './motion'
import ClinicMark from './ClinicMark.vue'
import Confetti from './Confetti.vue'
import Seal from './Seal.vue'
import AberturaStory from './stories/AberturaStory.vue'
import TotalStory from './stories/TotalStory.vue'
import MesStory from './stories/MesStory.vue'
import ProcedimentoStory from './stories/ProcedimentoStory.vue'
import FinanceiroStory from './stories/FinanceiroStory.vue'
import PacientesStory from './stories/PacientesStory.vue'
import RostoStory from './stories/RostoStory.vue'
import MensagensStory from './stories/MensagensStory.vue'
import ComparecimentoStory from './stories/ComparecimentoStory.vue'
import ResumoStory from './stories/ResumoStory.vue'

const LAYOUTS = {
  abertura: AberturaStory, total: TotalStory, 'total-leve': TotalStory, mes: MesStory,
  procedimento: ProcedimentoStory, 'proc-simples': ProcedimentoStory, financeiro: FinanceiroStory,
  pacientes: PacientesStory, rosto: RostoStory, mensagens: MensagensStory, comparecimento: ComparecimentoStory,
  resumo: ResumoStory,
}

const props = defineProps({
  story: { type: Object, required: true },
  theme: { type: String, default: 'dark' },
  mode: { type: String, default: 'story' }, // 'story' | 'card'
  clinicName: { type: String, default: '' },
  logoUrl: { type: String, default: null },
  year: { type: Number, required: true },
  copyVariant: { type: Number, default: 1 },
  inProgressMonth: { type: Number, default: null },
  index: { type: Number, default: 0 },
  count: { type: Number, default: 1 },
  /** Tempo decorrido no story (ms). Controla progresso e animações. */
  ms: { type: Number, default: FINAL_MS },
  /** false = mostra o quadro final (prefers-reduced-motion). */
  animate: { type: Boolean, default: true },
  duration: { type: Number, default: 6000 },
  dimUi: { type: Boolean, default: false },
  radius: { type: Number, default: null },
})
const emit = defineEmits(['close', 'share'])

const card = computed(() => props.mode === 'card')
const c = computed(() => THEMES[props.theme] || THEMES.dark)
const kind = computed(() => props.story.kind)
const W = computed(() => (card.value ? 490 : 334))
const H = computed(() => (card.value ? 694 : 844))
const animMs = computed(() => (card.value || !props.animate ? FINAL_MS : props.ms))
const m = computed(() => motion(animMs.value))
const Layout = computed(() => LAYOUTS[kind.value])
const uiO = computed(() => (props.dimUi ? 0.3 : 1))

const tx = computed(() => {
  const d = props.story.data || {}
  return pickCopy(kind.value, props.copyVariant, {
    n: d.total !== undefined ? fmt(d.total) : undefined,
    ano: props.year,
    proximoAno: props.year + 1,
    mes: monthName(d.bestMonth ?? d.championMonth),
    regiao1: Array.isArray(d.regions) && d.regions[0] ? d.regions[0].label.toLowerCase() : undefined,
  })
})

const bars = computed(() => Array.from({ length: props.count }, (_, i) => ({
  w: i < props.index ? 100 : i === props.index ? Math.round(clamp01(props.ms / props.duration) * 1000) / 10 : 0,
})))
const box = computed(() => (card.value ? { top: 132, h: 408, scale: 0.68 } : { top: 72, h: 600, scale: 1 }))
const isResumo = computed(() => kind.value === 'resumo')
const frameStyle = computed(() => ({
  width: '390px', height: `${H.value}px`, background: c.value.bg, color: c.value.text,
  borderRadius: `${props.radius ?? (card.value ? 0 : 28)}px`,
}))
</script>

<template>
  <div class="rd26 frame" :style="frameStyle" :data-kind="kind">
    <Confetti v-if="isResumo" :H="H" :animated="!card && animate" :opacity="card ? 1 : clamp01(animMs / 400).toFixed(2)" />

    <template v-if="!card">
      <div class="progress" :style="{ opacity: uiO }" aria-hidden="true">
        <div v-for="(b, i) in bars" :key="i" class="pb" :style="{ background: c.pb }"><div :style="{ width: `${b.w}%`, background: c.pbf }"></div></div>
      </div>
      <div class="header" :style="{ opacity: uiO }">
        <ClinicMark :name="clinicName" :logo-url="logoUrl" :size="32" :border="c.logoBorder" />
        <div class="hname">{{ clinicName }}</div>
        <button type="button" class="close" aria-label="Fechar retrospectiva" :style="{ color: c.text }" @click="emit('close')">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
      </div>
    </template>
    <div v-else-if="kind !== 'abertura'" class="card-header">
      <ClinicMark :name="clinicName" :logo-url="logoUrl" :size="30" :border="c.logoBorder" />
      <div class="hname">{{ clinicName }}</div>
    </div>

    <div class="box" :style="{ top: `${box.top}px`, height: `${box.h}px` }">
      <div class="inner" :style="{ width: `${W}px`, transform: box.scale !== 1 ? `scale(${box.scale})` : undefined }">
        <component
          :is="Layout"
          v-if="Layout"
          :data="story.data || {}"
          :tx="tx"
          :m="m"
          :c="c"
          :W="W"
          :kind="kind"
          :name="clinicName"
          :logo-url="logoUrl"
          :year="year"
          :in-progress-month="inProgressMonth"
        />
      </div>
    </div>

    <template v-if="!card">
      <button type="button" class="share" :style="{ height: `${isResumo ? 60 : 52}px`, fontSize: `${isResumo ? 17 : 16}px`, background: c.btnBg, color: c.btnFg, boxShadow: c.btnShadow, opacity: uiO }" @click="emit('share')">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
        Compartilhar no Instagram
      </button>
      <div class="footer" :style="{ opacity: uiO }">
        <Seal :theme="theme" />
        <span class="mono" :style="{ fontSize: '11px', color: c.seal }">Retrospectiva {{ year }}</span>
      </div>
    </template>
    <div v-else class="card-seal" :style="{ color: c.seal }">
      <Seal :theme="theme" />
      <span class="mono" style="font-size: 11px">Retrospectiva {{ year }}</span>
    </div>
  </div>
</template>

<style scoped>
.frame { position: relative; box-sizing: border-box; overflow: hidden; }
.progress { position: absolute; top: 10px; left: 12px; right: 12px; z-index: 7; display: flex; gap: 4px; }
.pb { flex: 1; height: 3px; border-radius: 2px; overflow: hidden; }
.pb > div { height: 100%; }
.header { position: absolute; top: 22px; left: 16px; right: 6px; height: 44px; z-index: 7; display: flex; align-items: center; gap: 10px; }
.hname { flex: 1; min-width: 0; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.close { width: 44px; height: 44px; flex: none; border: 0; padding: 0; background: transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.card-header { position: absolute; top: 92px; left: 28px; right: 28px; z-index: 3; display: flex; align-items: center; justify-content: center; gap: 10px; }
.card-header .hname { flex: 0 1 auto; }
.box { position: absolute; left: 28px; width: 334px; z-index: 2; }
.inner { box-sizing: border-box; height: 600px; display: flex; flex-direction: column; justify-content: center; transform-origin: top left; }
.share { position: absolute; left: 28px; right: 28px; bottom: 56px; z-index: 6; border: 0; border-radius: 999px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 10px; cursor: pointer; }
.footer { position: absolute; left: 28px; right: 28px; bottom: 16px; z-index: 6; display: flex; align-items: center; justify-content: space-between; }
.card-seal { position: absolute; left: 28px; right: 28px; top: 538px; z-index: 3; display: flex; align-items: center; justify-content: center; gap: 12px; }
</style>
