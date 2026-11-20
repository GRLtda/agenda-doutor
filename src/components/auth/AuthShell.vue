<script setup>
/**
 * Casca única das telas de acesso (/login, /register, /r/:token, /e/:token).
 *
 * As duas telas ficam dentro da mesma casca: a foto, a citação e o layout permanecem e só o formulário troca
 * (crossfade + altura animada), então alternar entre "Entrar" e "Criar conta" é suave.
 *
 * - Desktop: formulário à esquerda (rola sozinho) e foto fixa à direita; a roda do mouse sobre a foto rola o formulário.
 * - Celular/iPhone (≤ 900px): foto no topo, atrás de uma folha branca que flutua por cima, com área segura do iOS.
 * - As fotos alternam sozinhas (sem autoplay com prefers-reduced-motion) e a citação acompanha a foto.
 */
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import SmoothHeight from '@/components/global/SmoothHeight.vue'
import { Quote } from 'lucide-vue-next'
import markUrl from '@/assets/logo_brand.svg'

const route = useRoute()

// As telas filhas avisam a casca de momentos de celebração (ex.: conta criada): o topo do formulário fica verde.
const celebrate = ref(false)
provide('authShell', { celebrate })

const slides = [
  {
    image: new URL('@/assets/clinic1.webp', import.meta.url).href,
    quote: 'Simplesmente todas as ferramentas que minha equipe e eu precisamos.',
    author: 'Karen Yue',
    role: 'Diretora de Tecnologia Clínica',
  },
  {
    image: new URL('@/assets/clinic2.webp', import.meta.url).href,
    quote: 'A melhor decisão para o crescimento da nossa rede de clínicas.',
    author: 'Dr. Ricardo Mendes',
    role: 'Diretor Geral',
  },
]
const SLIDE_INTERVAL_MS = 5000

const isRegister = computed(() => String(route.name || '').startsWith('register'))
const stageKey = computed(() => (isRegister.value ? 'register' : String(route.name || 'login')))

const index = ref(isRegister.value ? 1 : 0)
let timer = null

function startSlides() {
  stopSlides()
  if (typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => {
    if (!document.hidden) index.value = (index.value + 1) % slides.length
  }, SLIDE_INTERVAL_MS)
}
function stopSlides() {
  clearInterval(timer)
  timer = null
}

// Ao trocar de tela a foto acompanha (login → foto 1, cadastro → foto 2) e o rodízio recomeça.
watch(isRegister, (value) => {
  index.value = value ? 1 : 0
  startSlides()
})

onMounted(startSlides)
onBeforeUnmount(stopSlides)

// A foto não rola: a roda do mouse sobre ela rola o formulário.
const formPanel = ref(null)
function forwardWheel(event) {
  if (formPanel.value) formPanel.value.scrollTop += event.deltaY
}
</script>

<template>
  <div class="auth-shell">
    <div ref="formPanel" class="auth-form-panel">
      <div class="auth-glow is-panel" :class="{ 'is-on': celebrate }" aria-hidden="true" />
      <!-- Celular: foto no topo, por trás da folha do formulário -->
      <div class="auth-hero" aria-hidden="true">
        <img
          v-for="(slide, i) in slides"
          :key="slide.image"
          :src="slide.image"
          alt=""
          class="auth-slide-img"
          :class="{ 'is-active': index === i }"
        />
        <div class="auth-hero-tint" />
        <img :src="markUrl" alt="" class="auth-hero-mark" />
      </div>

      <main class="auth-sheet">
        <div class="auth-glow is-sheet" :class="{ 'is-on': celebrate }" aria-hidden="true" />
        <SmoothHeight class="auth-stage-wrap">
          <div class="auth-stage">
            <RouterView v-slot="{ Component }">
              <Transition name="auth-swap">
                <component :is="Component" :key="stageKey" />
              </Transition>
            </RouterView>
          </div>
        </SmoothHeight>
      </main>
    </div>

    <!-- Desktop: foto fixa -->
    <aside class="auth-image-panel" aria-label="Depoimento de clientes" @wheel.passive="forwardWheel">
      <div class="auth-image-card">
        <img
          v-for="(slide, i) in slides"
          :key="slide.image"
          :src="slide.image"
          :alt="i === index ? 'Consultório odontológico iluminado' : ''"
          class="auth-slide-img"
          :class="{ 'is-active': index === i }"
        />
        <div class="auth-image-tint" />
        <img :src="markUrl" alt="Agenda Doutor" class="auth-image-mark" />
        <div class="auth-quote">
          <span class="auth-quote-icon" aria-hidden="true"><Quote :size="18" /></span>
          <div class="auth-quote-stack">
            <figure v-for="(slide, i) in slides" :key="slide.quote" class="auth-quote-item" :class="{ 'is-active': index === i }" :aria-hidden="index !== i">
              <blockquote>“{{ slide.quote }}”</blockquote>
              <figcaption>
                <strong>{{ slide.author }}</strong>
                <span>{{ slide.role }}</span>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.auth-shell {
  display: flex;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  overflow: hidden; /* a página não rola: foto fixa, só o formulário tem scroll */
  background-color: #fff;
  background-image:
    radial-gradient(circle at 12% 8%, rgba(0, 87, 255, 0.1) 0, transparent 34%),
    radial-gradient(circle at 92% 92%, rgba(124, 58, 237, 0.06) 0, transparent 30%),
    linear-gradient(to right, rgba(229, 231, 235, 0.35) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(229, 231, 235, 0.35) 1px, transparent 1px);
  background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
  font-family: 'DM Sans', system-ui, sans-serif;
}

/* ---------- Formulário ---------- */
.auth-form-panel {
  position: relative;
  flex: 1;
  display: flex;
  min-width: 0;
  /* Folga vertical proporcional à altura da tela: evita uma rolagem mínima quando o conteúdo quase cabe. */
  padding: clamp(1rem, 3.5vh, 2.5rem) 3.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
}
.auth-hero {
  display: none;
}
.auth-sheet {
  width: 100%;
  max-width: 500px;
  margin: auto; /* centraliza sem cortar o topo quando o conteúdo passa da altura */
}
.auth-stage {
  position: relative;
}
/* A tela que sai fica por cima da que entra (crossfade) em vez de empurrá-la. */
.auth-stage :deep(.auth-swap-leave-active) {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}
/* Troca de tela: só some e aparece (sem deslocamento); a altura é animada pelo SmoothHeight. */
.auth-swap-enter-active {
  transition: opacity 320ms var(--ds-ease, ease) 80ms;
}
.auth-swap-leave-active {
  transition: opacity 200ms var(--ds-ease, ease);
}
.auth-swap-enter-from,
.auth-swap-leave-to {
  opacity: 0;
}

/* Brilho verde do topo (conta criada): o azul de fundo cede lugar ao verde, sem barras. */
.auth-glow {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 340px;
  pointer-events: none;
  opacity: 0;
  background: radial-gradient(90% 100% at 50% 0%, rgba(16, 185, 129, 0.34) 0%, rgba(16, 185, 129, 0.12) 45%, transparent 75%);
  transition: opacity 900ms ease;
}
.auth-glow.is-on {
  opacity: 1;
}
.auth-glow.is-sheet {
  display: none;
}

/* ---------- Foto (desktop) ---------- */
.auth-image-panel {
  position: relative;
  flex: none;
  width: 50%;
  max-width: 800px;
  padding: 12px;
  box-sizing: border-box;
}
.auth-image-card {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 20px;
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.14);
}
.auth-slide-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 700ms ease;
}
.auth-slide-img.is-active {
  opacity: 1;
}
.auth-image-tint {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(8, 15, 36, 0.18) 0%, rgba(8, 15, 36, 0.1) 40%, rgba(8, 15, 36, 0.72) 100%);
}
.auth-image-mark {
  position: absolute;
  top: 40px;
  right: 40px;
  height: 34px;
  filter: brightness(0) invert(1);
}
.auth-quote {
  position: absolute;
  left: 36px;
  right: 36px;
  bottom: 36px;
  margin: 0;
  padding: 22px 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.28);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  color: #fff;
}
.auth-quote-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  margin-bottom: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.2);
}
.auth-quote-stack {
  display: grid;
}
.auth-quote-item {
  grid-area: 1 / 1;
  margin: 0;
  opacity: 0;
  transition: opacity 400ms ease;
}
.auth-quote-item.is-active {
  opacity: 1;
}
.auth-quote blockquote {
  margin: 0;
  font-size: 1.375rem;
  font-weight: 500;
  line-height: 1.35;
  letter-spacing: -0.01em;
}
.auth-quote figcaption {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 16px;
}
.auth-quote figcaption strong {
  font-size: 0.9375rem;
  font-weight: 600;
}
.auth-quote figcaption span {
  font-size: 0.8125rem;
  opacity: 0.85;
}

/* ---------- Celular / iPhone ---------- */
@media (max-width: 900px) {
  .auth-shell {
    display: block;
    height: auto;
    min-height: 100vh;
    min-height: 100dvh;
    overflow: visible;
  }
  .auth-image-panel {
    display: none;
  }
  .auth-glow.is-panel {
    display: none;
  }
  .auth-glow.is-sheet {
    display: block;
    height: 280px;
    border-radius: 28px 28px 0 0;
  }
  .auth-form-panel {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
    padding: 0;
    overflow: visible;
  }
  /* Foto por trás da folha: sem borda arredondada embaixo, a folha é que flutua por cima. */
  .auth-hero {
    position: relative;
    display: block;
    flex: none;
    height: calc(300px + env(safe-area-inset-top, 0px));
    overflow: hidden;
  }
  .auth-hero-tint {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(0, 40, 140, 0.62) 0%, rgba(8, 15, 36, 0.22) 48%, rgba(8, 15, 36, 0.5) 100%);
  }
  .auth-hero-mark {
    position: absolute;
    left: 20px;
    top: calc(22px + env(safe-area-inset-top, 0px));
    height: 28px;
    filter: brightness(0) invert(1);
  }
  .auth-sheet {
    position: relative;
    flex: 1;
    max-width: none;
    margin: -100px 0 0;
    padding: 44px 20px calc(28px + env(safe-area-inset-bottom, 0px));
    border-radius: 28px 28px 0 0;
    background: #fff;
    box-shadow: 0 -10px 30px rgba(15, 23, 42, 0.1);
  }
  .auth-sheet::before {
    content: '';
    position: absolute;
    top: 8px;
    left: 50%;
    width: 36px;
    height: 4px;
    margin-left: -18px;
    border-radius: 9999px;
    background: #e2e8f0;
  }
}
@media (max-width: 900px) and (min-width: 560px) {
  /* Tablet em pé: folha centralizada com largura confortável */
  .auth-sheet {
    padding-left: max(20px, calc((100% - 500px) / 2));
    padding-right: max(20px, calc((100% - 500px) / 2));
  }
}
@media (prefers-reduced-motion: reduce) {
  .auth-glow,
  .auth-slide-img,
  .auth-quote-item,
  .auth-swap-enter-active,
  .auth-swap-leave-active {
    transition: none;
  }
}
</style>
