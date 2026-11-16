<script setup>
// A2 (carregando) e A3 (erro), em tela cheia, no tema escuro.
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { THEMES } from './theme'
import { motion, prefersReducedMotion, FINAL_MS } from './motion'
import './tokens.css'

const props = defineProps({ state: { type: String, default: 'loading' } })
const emit = defineEmits(['retry', 'close'])
const c = THEMES.dark
const ms = ref(0)
const reduce = prefersReducedMotion()
let raf = 0
let start = 0
const loop = (now) => { if (!start) start = now; ms.value = now - start; raf = requestAnimationFrame(loop) }
onMounted(() => { if (!reduce) raf = requestAnimationFrame(loop); else ms.value = FINAL_MS })
onBeforeUnmount(() => cancelAnimationFrame(raf))

const steps = computed(() => {
  const m = motion(ms.value)
  return [['Atendimentos', 400], ['Procedimentos', 1100], ['Pacientes e retornos', 1800], ['Mensagens automáticas', 2500]]
    .map(([t, at]) => ({ t, style: m.fu(at - 300), done: ms.value > at + 500 && at < 2500 }))
})

const viewport = ref({ w: window.innerWidth, h: window.innerHeight })
const onResize = () => { viewport.value = { w: window.innerWidth, h: window.innerHeight } }
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => window.removeEventListener('resize', onResize))
const isDesktop = computed(() => viewport.value.w >= 768)
const scale = computed(() => (isDesktop.value ? Math.min(1, (viewport.value.h - 108) / 844) : Math.min(viewport.value.w / 390, viewport.value.h / 844)))
const isError = computed(() => props.state === 'error')
</script>

<template>
  <div class="rd26 screen" :style="{ background: isDesktop ? '#070C22' : c.bg }">
    <div class="stage" :style="{ width: `${390 * scale}px`, height: `${844 * scale}px`, borderRadius: isDesktop ? '16px' : '0' }">
      <div class="frame" :style="{ transform: `scale(${scale})`, background: c.bg, color: c.text }">
        <button type="button" class="close" aria-label="Fechar retrospectiva" @click="emit('close')"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
        <div v-if="!isError" class="body">
          <div class="spin">
            <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" fill="none" :stroke="c.ring" stroke-width="6" /><circle cx="60" cy="60" r="52" fill="none" :stroke="c.accent" stroke-width="6" stroke-linecap="round" pathLength="100" stroke-dasharray="24 76"><animateTransform v-if="!reduce" attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="1.1s" repeatCount="indefinite" /></circle></svg>
            <div class="cal" :style="{ color: c.accent }"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="M8 14h.01" /><path d="M12 14h.01" /><path d="M16 14h.01" /><path d="M8 18h.01" /><path d="M12 18h.01" /></svg></div>
          </div>
          <p role="status" class="title">Montando o seu ano…</p>
          <p class="sub" :style="{ color: c.muted }">Juntando atendimentos, procedimentos e muito capricho.</p>
          <div class="steps">
            <div v-for="st in steps" :key="st.t" class="step" :style="st.style">
              <span v-if="st.done" class="dot done" :style="{ background: c.accent, color: c.onAccent }"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></span>
              <span v-else class="dot" :style="{ border: `2px solid ${c.line2}` }"></span>
              <span>{{ st.t }}</span>
            </div>
          </div>
        </div>
        <div v-else class="body" role="alert">
          <div class="err-ico"><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m2 2 20 20" /><path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193" /><path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07" /></svg></div>
          <p class="title" style="margin-top: 12px; line-height: 1.15; max-width: 300px">Não conseguimos montar agora</p>
          <p class="sub" :style="{ color: c.muted, maxWidth: '290px', lineHeight: 1.5 }">Pode ter sido a conexão ou um soluço do nosso lado. Seus dados estão seguros.</p>
          <button type="button" class="retry" @click="emit('retry')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></svg>Tentar de novo</button>
          <button type="button" class="back" :style="{ color: c.muted }" @click="emit('close')">Voltar ao painel</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.screen { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; }
.stage { position: relative; overflow: hidden; flex: none; }
.frame { position: absolute; top: 0; left: 0; width: 390px; height: 844px; transform-origin: top left; }
.close { position: absolute; top: 22px; right: 6px; width: 44px; height: 44px; border: 0; padding: 0; background: transparent; color: inherit; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.body { position: absolute; top: 72px; left: 28px; width: 334px; height: 600px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 14px; }
.spin { position: relative; width: 120px; height: 120px; }
.cal { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
.title { margin: 10px 0 0; font-size: 28px; font-weight: 700; letter-spacing: -0.02em; }
.sub { font-size: 16px; line-height: 1.45; max-width: 270px; }
.steps { margin-top: 22px; width: 250px; display: flex; flex-direction: column; gap: 12px; text-align: left; }
.step { display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 500; }
.dot { width: 24px; height: 24px; flex: none; box-sizing: border-box; border-radius: 999px; display: flex; align-items: center; justify-content: center; }
.err-ico { width: 96px; height: 96px; border-radius: 999px; background: #FEF2F2; color: #DC2626; display: flex; align-items: center; justify-content: center; }
.retry { margin-top: 18px; height: 52px; width: 240px; border: 0; border-radius: 999px; background: #0057FF; color: #FFFFFF; font-size: 16px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; box-shadow: 0 8px 20px rgba(0, 87, 255, 0.28); }
.back { height: 44px; padding: 0 16px; border: 0; background: transparent; font-size: 15px; font-weight: 500; cursor: pointer; }
</style>
