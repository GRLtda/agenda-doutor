<script setup>
// "Dashboard" falso com o banner real e, em ?view=cards, os cartões de compartilhar + exportação PNG.
import { onMounted, ref } from 'vue'
import RetrospectiveBanner from '@/features/retrospective/components/RetrospectiveBanner.vue'
import RetrospectiveShortcut from '@/features/retrospective/components/RetrospectiveShortcut.vue'
import RetrospectiveOverlay from '@/features/retrospective/components/RetrospectiveOverlay.vue'
import { useRetrospectiveOpener } from '@/features/retrospective/composables/useRetrospectiveOpener'
import ShareCard from '@/features/retrospective/designs/2026-v1/card/ShareCard.vue'
import { themeFor } from '@/features/retrospective/designs/2026-v1/theme'
import { CARD_FONTS, CARD_SIZE } from '@/features/retrospective/designs/2026-v1/fonts'
import { renderCardPng } from '@/features/retrospective/composables/useShareCard'
import { fullRetrospective, reducedRetrospective } from '../fixtures/retrospective'

const params = new URLSearchParams(location.search)
const view = params.get('view') || 'banner'
const retro = params.get('seq') === 'reduced' ? reducedRetrospective() : fullRetrospective()
const cards = ref([])
const pngs = ref([])
const opener = useRetrospectiveOpener()

onMounted(async () => {
  if (view !== 'cards') return
  await new Promise((r) => setTimeout(r, 300))
  const out = []
  for (const el of cards.value) {
    const blob = await renderCardPng(el.$el, { ...CARD_SIZE, fonts: CARD_FONTS })
    const bitmap = await createImageBitmap(blob)
    out.push({ url: URL.createObjectURL(blob), w: bitmap.width, h: bitmap.height })
  }
  pngs.value = out
  window.__retroPngs = out
})
</script>

<template>
  <main v-if="view !== 'cards'" style="max-width: 1100px; margin: 0 auto; padding: 28px 24px">
    <div style="display: flex; align-items: center; justify-content: space-between"><h1 style="margin: 0 0 4px; font-size: 24px">Início</h1><RetrospectiveShortcut /></div>
    <p style="margin: 0 0 24px; color: #64748B">Prévia local do dashboard.</p>
    <RetrospectiveBanner />
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px">
      <div v-for="n in 4" :key="n" style="height: 80px; border-radius: 12px; background: #FFFFFF; border: 1px solid #E2E8F0"></div>
    </div>
    <RetrospectiveOverlay :open="opener.isOpen.value" @close="opener.close" />
  </main>
  <main v-else style="display: flex; flex-wrap: wrap; gap: 24px; padding: 24px">
    <div v-for="(s, i) in retro.stories" :key="s.key" style="display: flex; flex-direction: column; gap: 8px">
      <ShareCard ref="cards" :story="s" :theme="themeFor(s.kind, i)" :clinic-name="retro.clinic.name" :year="retro.year" :copy-variant="retro.copyVariant" :in-progress-month="retro.inProgressMonth" />
      <img v-if="pngs[i]" :src="pngs[i].url" :alt="s.key" style="width: 390px; height: 694px; outline: 1px solid #CBD5E1" />
      <code v-if="pngs[i]">{{ s.key }} · {{ pngs[i].w }}×{{ pngs[i].h }}</code>
    </div>
  </main>
</template>
