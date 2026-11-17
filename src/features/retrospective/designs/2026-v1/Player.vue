<script setup>
// Player em tela cheia do design 2026-v1.
// Toque à direita avança, à esquerda volta, segurar pausa (E1), dica na 1ª vez (E2).
// Desktop: quadro 9:16 centralizado com setas e atalhos (E3). Mobile: tela cheia (E4).
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Story from './Story.vue'
import ShareCard from './card/ShareCard.vue'
import HintOverlay from './overlays/HintOverlay.vue'
import ShareSheet from './overlays/ShareSheet.vue'
import DownloadDialog from './overlays/DownloadDialog.vue'
import StoryToast from './overlays/StoryToast.vue'
import { THEMES, themeFor } from './theme'
import { fmt } from './format'
import { prefersReducedMotion } from './motion'
import { isSupportedKind } from './kinds'
import { CARD_FONTS, CARD_SIZE } from './fonts'
import brandMark from './brand.svg'
import { fetchRetrospectiveLogoDataUrl } from '../../api/retrospective.api'
import { renderCardPng, inlineImage, canShareFiles, isMobileDevice, shareFile, downloadBlob } from '../../composables/useShareCard'
import './tokens.css'

const props = defineProps({ retrospective: { type: Object, required: true } })
const emit = defineEmits(['close', 'shared'])

const DURATION = 6000
const HOLD_MS = 220
const HINT_KEY = 'agenda-doutor:retrospectiva:dica-vista'

const retro = computed(() => props.retrospective)
const stories = computed(() => (retro.value.stories || []).filter((s) => isSupportedKind(s.kind)))
const count = computed(() => stories.value.length)
const index = ref(0)
const ms = ref(0)
const current = computed(() => stories.value[index.value])
const theme = computed(() => themeFor(current.value?.kind, index.value))
const c = computed(() => THEMES[theme.value])
const animate = ref(!prefersReducedMotion())

// ---------- layout (desktop x mobile) ----------
const viewport = ref({ w: typeof window !== 'undefined' ? window.innerWidth : 390, h: typeof window !== 'undefined' ? window.innerHeight : 844 })
const isDesktop = computed(() => viewport.value.w >= 768)
const scale = computed(() => {
  const { w, h } = viewport.value
  return isDesktop.value ? Math.min(1, (h - 108) / 844) : Math.min(w / 390, h / 844)
})
const onResize = () => { viewport.value = { w: window.innerWidth, h: window.innerHeight } }

// ---------- estado de pausa ----------
const holding = ref(false)
const kbPaused = ref(false)
const hint = ref(false)
const overlay = ref(null) // 'sheet' | 'download' | null
const hidden = ref(false)
const paused = computed(() => holding.value || kbPaused.value || hint.value || !!overlay.value || hidden.value)

// ---------- relógio ----------
let raf = 0
let last = null
function tick(now) {
  if (last == null) last = now
  const dt = Math.min(64, now - last)
  last = now
  if (!paused.value && ms.value < DURATION) {
    ms.value = Math.min(DURATION, ms.value + dt)
    if (ms.value >= DURATION && index.value < count.value - 1) next()
  }
  raf = requestAnimationFrame(tick)
}

function go(i) {
  index.value = Math.max(0, Math.min(count.value - 1, i))
  ms.value = 0
}
function next() { if (index.value < count.value - 1) go(index.value + 1) }
function prev() { go(index.value - 1) }
function close() { emit('close') }

// ---------- toque: rápido navega, longo pausa ----------
let downAt = 0
let holdTimer = 0
function onDown() {
  downAt = performance.now()
  clearTimeout(holdTimer)
  holdTimer = setTimeout(() => { holding.value = true }, HOLD_MS)
}
function onUp(side) {
  clearTimeout(holdTimer)
  const wasHolding = holding.value
  holding.value = false
  if (!wasHolding && performance.now() - downAt < 500) (side < 0 ? prev : next)()
}
function onLeave() { clearTimeout(holdTimer); holding.value = false }
// Ativação por teclado nos botões de toque (Enter/Espaço geram click com detail 0).
function onTapKey(side, e) { if (e?.detail === 0) (side < 0 ? prev : next)() }

function onKey(e) {
  if (overlay.value) return
  if (hint.value && ['Enter', ' ', 'ArrowRight', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); hintDone(); return }
  if (e.key === 'ArrowRight') { e.preventDefault(); next() }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
  else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); kbPaused.value = !kbPaused.value }
  else if (e.key === 'Escape') { e.preventDefault(); close() }
}
const onVisibility = () => { hidden.value = document.hidden }

function hintDone() {
  hint.value = false
  try { localStorage.setItem(HINT_KEY, '1') } catch { /* sem storage */ }
}

// ---------- compartilhar ----------
const toast = ref(null) // { type, title, subtitle }
let toastTimer = 0
function showToast(t) {
  toast.value = t
  clearTimeout(toastTimer)
  if (t.type === 'ok') toastTimer = setTimeout(() => { toast.value = null }, 2600)
}

const card = ref({ status: 'idle', blob: null, file: null, url: null, storyKey: null, logo: null })
const cardHost = ref(null)
const cardStory = ref(null)
const cardTheme = ref('dark')
const fileName = (key) => `retrospectiva-${retro.value.year}-${key}.png`

function resetCard() {
  if (card.value.url) URL.revokeObjectURL(card.value.url)
  card.value = { status: 'idle', blob: null, file: null, url: null, storyKey: null, logo: card.value.logo }
}

// Baixa o logo em segundo plano assim que o player abre, para o cartão do Instagram já ter o logo pronto no clique.
let logoPromise = null
const loadLogo = () => {
  logoPromise ||= (async () => {
    if (!retro.value.clinic?.logoUrl) return ''
    return (await fetchRetrospectiveLogoDataUrl()) || (await inlineImage(retro.value.clinic?.logoUrl)) || ''
  })().then((logo) => { card.value.logo = logo; return logo })
  return logoPromise
}
onMounted(() => { loadLogo() })

async function prepareCard() {
  const story = current.value
  resetCard()
  cardStory.value = story
  cardTheme.value = theme.value
  card.value.status = 'rendering'
  card.value.storyKey = story.key
  try {
    // Logo pela API (só aqui, ao gerar o cartão; o CloudFront não tem CORS). A URL do /me fica de reserva.
    if (card.value.logo === null) await loadLogo()
    await nextTick()
    const node = cardHost.value?.firstElementChild
    if (!node) throw new Error('Cartão não montado')
    const blob = await renderCardPng(node, { ...CARD_SIZE, fonts: CARD_FONTS })
    if (card.value.storyKey !== story.key) return
    card.value = { ...card.value, status: 'ready', blob, file: new File([blob], fileName(story.key), { type: 'image/png' }), url: URL.createObjectURL(blob) }
  } catch (error) {
    console.error('[Retrospectiva] Falha ao gerar o cartão', error)
    card.value.status = 'error'
    showToast({ type: 'error' })
  }
}

// Celular/tablet sempre recebe o menu do celular (D2), mesmo sem Web Share com arquivos
// (página em HTTP, Firefox, navegador interno de apps): ali o menu oferece só "Salvar imagem".
// O diálogo "poste pelo celular" (D3) fica só para computador.
const onMobile = computed(() => isMobileDevice() || !isDesktop.value)
const canShare = ref(false)
const shareOverlay = () => (onMobile.value ? 'sheet' : 'download')

function openShare() {
  toast.value = null
  canShare.value = canShareFiles()
  overlay.value = shareOverlay()
  prepareCard()
}
function closeOverlay() { overlay.value = null }

async function waitCard() {
  if (card.value.status === 'rendering') {
    await new Promise((resolve) => {
      const stop = watch(() => card.value.status, (s) => { if (s !== 'rendering') { stop(); resolve() } })
    })
  }
  return card.value.status === 'ready'
}

async function doShare() {
  if (!(await waitCard())) return
  try {
    if (!canShareFiles(card.value.file)) return doSave()
    const result = await shareFile(card.value.file, `Retrospectiva ${retro.value.year}`)
    if (result === 'shared') {
      overlay.value = null
      emit('shared', card.value.storyKey)
      showToast({ type: 'ok', title: 'Imagem pronta!', subtitle: 'Agora é só postar nos Stories.' })
    }
  } catch (error) {
    console.error('[Retrospectiva] Falha ao abrir o compartilhamento', error)
    // Alguns navegadores recusam compartilhar sem um toque recente: cai para salvar a imagem.
    doSave()
  }
}

async function doSave() {
  if (!(await waitCard())) return
  downloadBlob(card.value.blob, card.value.file.name)
  const desktop = overlay.value === 'download'
  overlay.value = null
  emit('shared', card.value.storyKey)
  showToast(desktop
    ? { type: 'ok', title: 'Imagem baixada!', subtitle: 'Agora é só postar pelo celular.' }
    : { type: 'ok', title: 'Imagem pronta!', subtitle: 'Salva no seu aparelho. Já pode postar.' })
}

function retryCard() {
  toast.value = null
  canShare.value = canShareFiles()
  overlay.value = overlay.value || shareOverlay()
  prepareCard()
}

const sheetThumb = computed(() => {
  const s = current.value
  const d = s?.data || {}
  if (s?.kind === 'total' || s?.kind === 'total-leve') return fmt(d.total)
  if (s?.kind === 'comparecimento') return `${d.pct}%`
  if (s?.kind === 'pacientes') return fmt(d.newPatients)
  if (s?.kind === 'financeiro') return `+${d.pct}%`
  return 'AD'
})

// ---------- ciclo de vida ----------
onMounted(() => {
  try { hint.value = !localStorage.getItem(HINT_KEY) } catch { hint.value = false }
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisibility)
  document.documentElement.style.overflow = 'hidden'
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  clearTimeout(holdTimer)
  clearTimeout(toastTimer)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisibility)
  document.documentElement.style.overflow = ''
  resetCard()
})
watch(index, () => { kbPaused.value = false })

defineExpose({ next, prev, go, index, ms, openShare, card, overlay })
</script>

<template>
  <div class="rd26 player" :class="isDesktop ? 'desktop' : 'mobile'" :style="!isDesktop ? { background: c.bg } : undefined" role="region" :aria-label="`Retrospectiva ${retrospective.year}`">
    <template v-if="isDesktop">
      <div class="glow" aria-hidden="true" :style="{ background: c.bg }"></div>
      <div class="dim" aria-hidden="true"></div>
      <div class="brand mono"><img :src="brandMark" alt="Agenda Doutor" /> Retrospectiva {{ retrospective.year }}</div>
      <button type="button" class="dclose" aria-label="Fechar retrospectiva" @click="close"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
    </template>

    <div class="stage" :style="{ width: `${390 * scale}px`, height: `${844 * scale}px`, borderRadius: isDesktop ? '16px' : '0' }">
      <div class="holder" :style="{ transform: `scale(${scale})` }">
        <Story
          v-if="current"
          :key="index"
          :story="current"
          :theme="theme"
          :clinic-name="retrospective.clinic?.name || ''"
          :logo-url="retrospective.clinic?.logoUrl || null"
          :year="retrospective.year"
          :copy-variant="retrospective.copyVariant"
          :in-progress-month="retrospective.inProgressMonth"
          :index="index"
          :count="count"
          :ms="ms"
          :duration="DURATION"
          :animate="animate"
          :dim-ui="holding || kbPaused"
          :radius="0"
          :share-in-header="isDesktop"
          @close="close"
          @share="openShare"
        />

        <template v-if="!hint && !overlay">
          <button type="button" class="tap left" aria-label="Story anterior" @pointerdown="onDown" @pointerup="onUp(-1)" @pointerleave="onLeave" @pointercancel="onLeave" @click="onTapKey(-1, $event)" @contextmenu.prevent></button>
          <button type="button" class="tap right" aria-label="Próximo story" @pointerdown="onDown" @pointerup="onUp(1)" @pointerleave="onLeave" @pointercancel="onLeave" @click="onTapKey(1, $event)" @contextmenu.prevent></button>
        </template>

        <div v-if="holding || kbPaused" class="paused" aria-live="polite">
          <span><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>Pausado</span>
        </div>

        <HintOverlay v-if="hint" @done="hintDone" />

        <ShareSheet
          v-if="overlay === 'sheet'"
          :thumb-bg="c.bg"
          :thumb-color="c.accent"
          :thumb-text="sheetThumb"
          :preview-url="card.url"
          :busy="card.status === 'rendering'"
          :can-share="canShare"
          @share="doShare"
          @save="doSave"
          @cancel="closeOverlay"
        />

        <StoryToast v-if="toast" :type="toast.type" :title="toast.title" :subtitle="toast.subtitle" @retry="retryCard" />
      </div>
    </div>

    <template v-if="isDesktop">
      <button type="button" class="arrow prev" aria-label="Story anterior" :disabled="index === 0" :style="{ marginLeft: `-${390 * scale / 2 + 80}px` }" @click="prev"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg></button>
      <button type="button" class="arrow next" aria-label="Próximo story" :disabled="index === count - 1" :style="{ marginLeft: `${390 * scale / 2 + 28}px` }" @click="next"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg></button>
      <div class="keys mono" aria-hidden="true"><span>← → navegam</span><span>Espaço pausa</span><span>Esc fecha</span></div>
    </template>

    <DownloadDialog v-if="overlay === 'download'" :preview-url="card.url" :busy="card.status === 'rendering'" @download="doSave" @close="closeOverlay">
      <template #preview>
        <div class="live-preview">
          <ShareCard v-if="cardStory" :story="cardStory" :theme="cardTheme" :clinic-name="retrospective.clinic?.name || ''" :logo-url="card.logo || null" :year="retrospective.year" :copy-variant="retrospective.copyVariant" :in-progress-month="retrospective.inProgressMonth" />
        </div>
      </template>
    </DownloadDialog>

    <!-- Cartão fora da tela, usado para gerar o PNG 1080x1920. -->
    <div v-if="overlay && cardStory" ref="cardHost" class="offscreen" aria-hidden="true">
      <ShareCard :story="cardStory" :theme="cardTheme" :clinic-name="retrospective.clinic?.name || ''" :logo-url="card.logo || null" :year="retrospective.year" :copy-variant="retrospective.copyVariant" :in-progress-month="retrospective.inProgressMonth" />
    </div>
  </div>
</template>

<style scoped>
.player { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; overflow: hidden; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
/* Computador: sem fundo próprio; o azul-escuro translúcido vem da camada (RetrospectiveOverlay). */
.player.desktop { background: transparent; color: #FFFFFF; }
.glow { position: absolute; left: 50%; top: -60px; width: 620px; height: calc(100% + 120px); margin-left: -310px; border-radius: 80px; filter: blur(90px); opacity: 0.35; }
.dim { position: absolute; inset: 0; background: rgba(5, 9, 26, 0.12); }
.brand { position: absolute; top: 18px; left: 32px; display: flex; align-items: center; gap: 14px; font-size: 12px; color: rgba(255, 255, 255, 0.8); }
.brand img { height: 34px; width: auto; display: block; }
.dclose { position: absolute; top: 16px; right: 24px; width: 48px; height: 48px; border-radius: 999px; border: 0; background: rgba(255, 255, 255, 0.1); color: #FFFFFF; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 2; }
.stage { position: relative; overflow: hidden; flex: none; }
.desktop .stage { box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5); }
.holder { position: absolute; top: 0; left: 0; width: 390px; height: 844px; transform-origin: top left; }
.tap { position: absolute; top: 66px; bottom: 124px; z-index: 5; border: 0; padding: 0; background: transparent; cursor: pointer; touch-action: none; -webkit-tap-highlight-color: transparent; }
.tap.left { left: 0; width: 35%; }
.tap.right { left: 35%; right: 0; }
.tap:focus-visible { outline: 3px solid #9DBEFF; outline-offset: -3px; }
.paused { position: absolute; top: 74px; left: 0; right: 0; z-index: 8; display: flex; justify-content: center; pointer-events: none; }
.paused span { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; background: rgba(10, 18, 48, 0.78); color: #FFFFFF; font-size: 13px; font-weight: 600; }
.arrow { position: absolute; left: 50%; top: 50%; margin-top: -26px; width: 52px; height: 52px; border-radius: 999px; border: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.arrow.prev { background: rgba(255, 255, 255, 0.14); color: #FFFFFF; }
.arrow.next { background: #FFFFFF; color: #0A1230; box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3); }
.arrow:disabled { opacity: 0.35; cursor: default; }
.keys { position: absolute; left: 0; right: 0; bottom: 18px; display: flex; justify-content: center; gap: 18px; font-size: 12px; color: rgba(255, 255, 255, 0.72); }
.live-preview { width: 390px; height: 694px; transform: scale(0.6513); transform-origin: top left; }
.offscreen { position: fixed; left: -10000px; top: 0; width: 390px; height: 694px; pointer-events: none; }
</style>
