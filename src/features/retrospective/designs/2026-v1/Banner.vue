<script setup>
// A1: banner no dashboard com prévia de dois stories.
import { computed } from 'vue'
import Story from './Story.vue'
import { themeFor } from './theme'
import { isSupportedKind } from './kinds'
import './tokens.css'

const props = defineProps({ retrospective: { type: Object, required: true } })
const emit = defineEmits(['open', 'dismiss'])

// Prévia: preferimos "mes" e "total" (como no design); senão, os primeiros stories com dados.
const previews = computed(() => {
  const list = (props.retrospective.stories || [])
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => isSupportedKind(s.kind) && s.kind !== 'abertura')
  const pick = (k) => list.find(({ s }) => s.kind === k)
  const chosen = [pick('mes') || list[1], pick('total') || pick('total-leve') || list[0]].filter(Boolean)
  const unique = chosen.filter((item, idx) => chosen.findIndex((x) => x.i === item.i) === idx)
  return unique.map(({ s, i }) => ({ story: s, theme: themeFor(s.kind, i), index: i }))
})
const count = computed(() => (props.retrospective.stories || []).length)
const name = computed(() => props.retrospective.clinic?.name || 'sua clínica')
</script>

<template>
  <section class="rd26 banner" :aria-label="`Retrospectiva ${retrospective.year}`">
    <div class="blur" aria-hidden="true"></div>
    <div class="copy">
      <span class="mono tag">{{ retrospective.viewed ? '' : 'NOVIDADE · ' }}RETROSPECTIVA {{ retrospective.year }}</span>
      <h2>Sua retrospectiva {{ retrospective.year }} chegou</h2>
      <p>O ano da {{ name }} em stories: atendimentos, o mês campeão, o procedimento queridinho e mais. Dá pra compartilhar no Instagram.</p>
      <div class="actions">
        <button type="button" class="primary" @click="emit('open')">
          Ver agora
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
        </button>
        <button type="button" class="ghost" @click="emit('dismiss')">Agora não</button>
      </div>
    </div>
    <div class="phones" aria-hidden="true">
      <div v-for="(p, k) in previews" :key="p.index" class="phone" :class="k === 0 && previews.length > 1 ? 'back' : 'front'">
        <div class="mini">
          <Story :story="p.story" :theme="p.theme" :clinic-name="retrospective.clinic?.name || ''" :logo-url="retrospective.clinic?.logoUrl || null" :year="retrospective.year" :copy-variant="retrospective.copyVariant" :in-progress-month="retrospective.inProgressMonth" :index="p.index" :count="count" :ms="3000" :animate="false" :radius="28" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.banner { position: relative; min-height: 300px; border-radius: 18px; overflow: hidden; background: linear-gradient(120deg, #0A1230 0%, #0B1D5C 50%, #0057FF 120%); color: #FFFFFF; display: flex; align-items: center; padding: 28px 44px; box-sizing: border-box; box-shadow: 0 18px 40px rgba(0, 87, 255, 0.22); gap: 24px; }
.blur { position: absolute; right: -80px; top: -120px; width: 420px; height: 420px; border-radius: 999px; background: rgba(27, 105, 255, 0.35); filter: blur(60px); }
.copy { position: relative; flex: 1; display: flex; flex-direction: column; gap: 14px; max-width: 520px; }
.tag { align-self: flex-start; font-size: 12px; letter-spacing: 0.12em; padding: 5px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); color: #CFE0FF; }
h2 { margin: 0; font-size: 40px; line-height: 1.08; font-weight: 700; letter-spacing: -0.03em; color: #FFFFFF; }
.copy p { font-size: 16px; line-height: 1.5; color: rgba(255, 255, 255, 0.82); }
.actions { display: flex; align-items: center; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
.primary { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 24px; border-radius: 999px; border: 0; background: #FFFFFF; color: #0A1230; font-size: 15px; font-weight: 600; cursor: pointer; box-shadow: 0 8px 22px rgba(0, 0, 0, 0.25); }
.ghost { height: 48px; padding: 0 16px; border: 0; background: transparent; color: rgba(255, 255, 255, 0.85); font-size: 14px; font-weight: 500; cursor: pointer; }
.phones { position: relative; width: 300px; height: 244px; flex: none; align-self: flex-start; margin: -6px 0 -28px; }
.phone { position: absolute; width: 148px; height: 320px; border-radius: 11px; overflow: hidden; }
.phone.back { left: 20px; top: 36px; transform: rotate(-8deg); opacity: 0.85; }
.phone.front { left: 120px; top: 22px; transform: rotate(4deg); box-shadow: 0 24px 50px rgba(0, 0, 0, 0.35); }
.mini { width: 390px; height: 844px; transform: scale(0.38); transform-origin: top left; pointer-events: none; }
@media (max-width: 900px) {
  .banner { padding: 24px; min-height: 0; }
  .phones { display: none; }
  h2 { font-size: 30px; }
}
</style>
