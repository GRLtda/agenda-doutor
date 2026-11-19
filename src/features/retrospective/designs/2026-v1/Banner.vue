<script setup>
// A1: banner no dashboard. Usa só o resumo do /auth/me (ano, nome e logo da clínica): os stories reais
// só são pedidos à API em "Ver agora". As telas ao lado são o design real dos stories, mas com DADOS
// FICTÍCIOS fixos (PREVIEW_STORIES), apenas para ilustrar; nunca refletem números da clínica.
import { computed } from 'vue'
import Story from './Story.vue'
import { themeFor } from './theme'
import './tokens.css'

const props = defineProps({ retrospective: { type: Object, required: true } })
const emit = defineEmits(['open', 'dismiss'])

const PREVIEW_STORIES = [
  { key: 'mes', kind: 'mes', variant: 'default', data: { monthly: [71, 84, 92, 98, 105, 110, 119, 127, 141, 168, 0, 0], championMonth: 10, championValue: 168 } },
  { key: 'total', kind: 'total', variant: 'default', data: { total: 1248 } },
]
const previews = PREVIEW_STORIES.map((story, i) => ({ story, index: i + 1, theme: themeFor(story.kind, i + 1) }))
const name = computed(() => props.retrospective.clinic?.name || 'sua clínica')
</script>

<template>
  <section class="rd26 banner" :aria-label="`Retrospectiva ${retrospective.year}`">
    <div class="glow-blob" aria-hidden="true"></div>
    <div class="copy">
      <span class="mono tag">{{ retrospective.viewed ? '' : 'NOVIDADE · ' }}RETROSPECTIVA {{ retrospective.year }}</span>
      <h2>Sua retrospectiva {{ retrospective.year }} chegou</h2>
      <p>O ano da {{ name }} em stories: atendimentos, o mês campeão, o procedimento queridinho e mais. Dá pra compartilhar no Instagram.</p>
      <div class="actions">
        <!-- Contorno branco com respiro em volta e um brilho que percorre o contorno. -->
        <span class="cta-ring">
          <button type="button" class="primary" @click="emit('open')">
            Ver agora
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
          </button>
        </span>
        <button type="button" class="ghost" @click="emit('dismiss')">Agora não</button>
      </div>
    </div>
    <div class="phones" aria-hidden="true">
      <div v-for="(p, k) in previews" :key="p.index" class="phone" :class="k === 0 ? 'back' : 'front'">
        <div class="mini">
          <Story :story="p.story" :theme="p.theme" :clinic-name="retrospective.clinic?.name || ''" :logo-url="retrospective.clinic?.logoUrl || null" :year="retrospective.year" :copy-variant="1" :in-progress-month="null" :index="p.index" :count="10" :ms="3000" :animate="false" :radius="28" />
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.banner { position: relative; min-height: 300px; border-radius: 18px; overflow: hidden; background: linear-gradient(120deg, #0A1230 0%, #0B1D5C 50%, #0057FF 120%); color: #FFFFFF; display: flex; align-items: center; padding: 28px 44px; box-sizing: border-box; box-shadow: 0 18px 40px rgba(0, 87, 255, 0.22); gap: 24px; }
.glow-blob { position: absolute; right: -80px; top: -120px; width: 420px; height: 420px; border-radius: 999px; background: rgba(27, 105, 255, 0.35); filter: blur(60px); }
.copy { position: relative; flex: 1; display: flex; flex-direction: column; gap: 14px; max-width: 520px; }
.tag { align-self: flex-start; font-size: 12px; letter-spacing: 0.12em; padding: 5px 10px; border-radius: 999px; background: rgba(255, 255, 255, 0.12); color: #CFE0FF; }
h2 { margin: 0; font-size: 40px; line-height: 1.08; font-weight: 700; letter-spacing: -0.03em; color: #FFFFFF; }
.copy p { font-size: 16px; line-height: 1.5; color: rgba(255, 255, 255, 0.82); }
.actions { display: flex; align-items: center; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
.primary { display: inline-flex; align-items: center; gap: 8px; height: 48px; padding: 0 24px; border-radius: 999px; border: 0; background: #FFFFFF; color: #0A1230; font-size: 15px; font-weight: 600; cursor: pointer; }
/* "Ver agora": anel com 5 px de respiro. O ::before é o contorno (branco translúcido com um trecho
   brilhante que gira); o ::after é a mesma faixa desfocada, fazendo o brilho vazar em volta. */
@property --rd26-cta-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.cta-ring { position: relative; display: inline-flex; padding: 5px; border-radius: 999px; isolation: isolate; }
.cta-ring::before,
.cta-ring::after {
  content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1.5px; pointer-events: none;
  background: conic-gradient(from var(--rd26-cta-angle), rgba(255, 255, 255, 0.4) 0deg, rgba(255, 255, 255, 0.4) 230deg, #CFE0FF 290deg, #FFFFFF 330deg, rgba(255, 255, 255, 0.4) 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: rd26-cta-spin 2.6s linear infinite;
}
.cta-ring::after { padding: 3px; filter: blur(5px); opacity: 0.8; z-index: -1; }
@keyframes rd26-cta-spin { to { --rd26-cta-angle: 360deg; } }
@media (prefers-reduced-motion: reduce) { .cta-ring::before, .cta-ring::after { animation: none; } }
/* Celular/toque: sem o brilho desfocado (filter + máscara vira um retângulo escuro em alguns navegadores móveis). */
@media (max-width: 900px), (hover: none) { .cta-ring::after { display: none; } }
/* Sem suporte a máscara com composição, o contorno viraria um bloco cheio: some em vez de aparecer errado. */
@supports not ((mask-composite: exclude) or (-webkit-mask-composite: xor)) { .cta-ring::before, .cta-ring::after { display: none; } }
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
