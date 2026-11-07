<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ArrowRight, CalendarDays, MessageCircle, UserPlus, Gift } from 'lucide-vue-next'
import confetti from 'canvas-confetti'
import ClinicLogo from '@/components/global/ClinicLogo.vue'

// Retorno do checkout (/onboarding/clinic?payment=success).
// Enquanto o webhook da Stripe não confirma, mostra a confirmação em andamento e
// consulta de novo sozinho; ao confirmar, celebra e sugere os primeiros passos.
// Documentação: docs/onboarding-assinatura-e-trial.md
const props = defineProps({
  confirmed: { type: Boolean, default: false },
  // { label, trialDays, startedAt, endsAt } quando o teste da campanha foi resgatado
  campaignTrial: { type: Object, default: null },
  trialing: { type: Boolean, default: false },
  userName: { type: String, default: '' },
})
const emit = defineEmits(['refresh', 'dashboard', 'navigate'])

const POLL_MS = 3000
const MAX_POLLS = 10
const polls = ref(0)
const pollingExhausted = computed(() => polls.value >= MAX_POLLS)
let pollTimer = 0

const isCampaign = computed(() => Boolean(props.campaignTrial))
const days = computed(() => props.campaignTrial?.trialDays || 0)
const offer = computed(() => (days.value === 30 ? '1 mês grátis' : `${days.value} dias grátis`))
const firstName = computed(() => (props.userName || '').trim().split(/\s+/)[0] || '')
const endsLabel = computed(() => (props.campaignTrial?.endsAt
  ? new Date(props.campaignTrial.endsAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })
  : ''))

const title = computed(() => {
  if (isCampaign.value) return `Seu ${offer.value} está ativo!`
  if (props.trialing) return 'Seu período grátis começou!'
  return 'Tudo pronto!'
})
// Com nome: 'Roberto, seu 1 mês grátis está ativo!'
const heading = computed(() => (firstName.value
  ? `${firstName.value}, ${title.value.charAt(0).toLowerCase()}${title.value.slice(1)}`
  : title.value))
const subtitle = computed(() => {
  if (isCampaign.value) {
    return endsLabel.value
      ? `Use o Agenda Doutor à vontade até ${endsLabel.value}. Nada foi cobrado hoje.`
      : 'Use o Agenda Doutor à vontade. Nada foi cobrado hoje.'
  }
  return 'Assinatura confirmada. Sua clínica já está liberada para começar.'
})

const actions = [
  { icon: CalendarDays, title: 'Monte sua agenda', text: 'Abra o calendário e marque a primeira consulta.', route: { name: 'calendario' } },
  { icon: UserPlus, title: 'Cadastre um paciente', text: 'Comece o histórico e o prontuário digital.', route: { name: 'novo-paciente' } },
  { icon: MessageCircle, title: 'Conecte o WhatsApp', text: 'Ative as confirmações automáticas de consulta.', route: { name: 'marketing-conexao' } },
]

const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

function celebrate() {
  if (reduceMotion()) return
  const colors = ['#0057ff', '#1b69ff', '#8fb4ff', '#22c55e', '#eab308']
  const burst = (originX, angle) => confetti({
    particleCount: 70,
    angle,
    spread: 65,
    startVelocity: 48,
    origin: { x: originX, y: 0.72 },
    colors,
    zIndex: 9999,
    disableForReducedMotion: true,
  })
  burst(0.1, 60)
  burst(0.9, 120)
  window.setTimeout(() => confetti({ particleCount: 90, spread: 100, origin: { y: 0.35 }, colors, zIndex: 9999, disableForReducedMotion: true }), 380)
}

function startPolling() {
  stopPolling()
  pollTimer = window.setInterval(() => {
    if (props.confirmed || pollingExhausted.value) return stopPolling()
    polls.value += 1
    emit('refresh')
  }, POLL_MS)
}

function stopPolling() {
  window.clearInterval(pollTimer)
  pollTimer = 0
}

function retry() {
  polls.value = 0
  emit('refresh')
  startPolling()
}

watch(() => props.confirmed, (ok) => {
  if (ok) {
    stopPolling()
    window.setTimeout(celebrate, 450)
  }
})

onMounted(() => {
  if (props.confirmed) window.setTimeout(celebrate, 450)
  else startPolling()
})

onBeforeUnmount(stopPolling)
</script>

<template>
  <main class="success-page">
    <div class="success-grid" aria-hidden="true"></div>

    <Transition name="swap" mode="out-in">
      <!-- Confirmando com a Stripe -->
      <section v-if="!confirmed" key="pending" class="pending" aria-live="polite">
        <ClinicLogo size="120px" />
        <div class="pending-orbit" aria-hidden="true"><span></span></div>
        <h1>Confirmando sua assinatura</h1>
        <ol class="pending-steps">
          <li class="is-done">Recebemos seu retorno do pagamento</li>
          <li class="is-active">Confirmando com a Stripe</li>
          <li>Liberando sua clínica</li>
        </ol>
        <p v-if="!pollingExhausted" class="muted">Isso costuma levar poucos segundos.</p>
        <template v-else>
          <p class="muted">Está demorando mais que o normal. Você pode verificar de novo.</p>
          <button type="button" class="btn-primary" @click="retry">Verificar novamente</button>
        </template>
      </section>

      <!-- Confirmado -->
      <section v-else key="done" class="done" aria-live="polite">
        <div class="check" aria-hidden="true">
          <span class="check-ring"></span>
          <svg viewBox="0 0 64 64">
            <circle class="check-circle" cx="32" cy="32" r="29" />
            <path class="check-mark" d="M19 33.5 28 42l17-19" />
          </svg>
        </div>

        <span class="kicker">
          <Gift v-if="isCampaign" :size="15" aria-hidden="true" />
          {{ isCampaign ? 'Benefício ativado' : 'Assinatura confirmada' }}
        </span>

        <h1 class="title">
          {{ heading }}
        </h1>
        <p class="subtitle">{{ subtitle }}</p>

        <div v-if="isCampaign" class="pass">
          <span class="pass-dot" aria-hidden="true"></span>
          <span>{{ campaignTrial.label || 'Campanha' }}</span>
          <b>{{ days }} dias grátis</b>
        </div>

        <h2 class="next-title">Aproveite agora</h2>
        <ul class="actions">
          <li v-for="(action, index) in actions" :key="action.title" :style="{ '--i': index }">
            <button type="button" class="action" @click="emit('navigate', action.route)">
              <span class="action-icon"><component :is="action.icon" :size="20" aria-hidden="true" /></span>
              <span class="action-copy">
                <strong>{{ action.title }}</strong>
                <small>{{ action.text }}</small>
              </span>
              <ArrowRight :size="18" class="action-arrow" aria-hidden="true" />
            </button>
          </li>
        </ul>

        <button type="button" class="btn-primary btn-dashboard" @click="emit('dashboard')">
          Ir para o painel
          <ArrowRight :size="18" aria-hidden="true" />
        </button>
      </section>
    </Transition>
  </main>
</template>

<style scoped>
.success-page {
  align-items: center;
  background: linear-gradient(180deg, #ffffff 0%, #f6f8fc 100%);
  display: flex;
  justify-content: center;
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
  padding: 2.5rem 1.25rem;
  position: relative;
}

.success-grid {
  background-image:
    linear-gradient(to right, rgba(148, 163, 184, 0.14) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(148, 163, 184, 0.14) 1px, transparent 1px);
  background-size: 40px 40px;
  inset: 0;
  mask-image: linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 25%, #000 75%, transparent 100%);
  pointer-events: none;
  position: absolute;
}

.pending,
.done {
  align-items: center;
  display: flex;
  flex-direction: column;
  max-width: 560px;
  position: relative;
  text-align: center;
  width: 100%;
}

/* ---------- Confirmando ---------- */
.pending h1 {
  color: var(--preto);
  font-size: 1.6rem;
  margin: 0.5rem 0 1.25rem;
}

.pending-orbit {
  animation: spin 1.1s linear infinite;
  border: 3px solid #e5e7eb;
  border-radius: 50%;
  border-top-color: var(--azul-principal);
  height: 40px;
  margin-top: 1.5rem;
  width: 40px;
}

.pending-steps {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  list-style: none;
  margin: 0 0 1rem;
  padding: 0;
  text-align: left;
}

.pending-steps li {
  align-items: center;
  color: #94a3b8;
  display: flex;
  font-size: 0.95rem;
  gap: 0.6rem;
}

.pending-steps li::before {
  border: 2px solid #cbd5e1;
  border-radius: 50%;
  content: '';
  flex-shrink: 0;
  height: 12px;
  width: 12px;
}

.pending-steps li.is-done { color: #16a34a; }
.pending-steps li.is-done::before { background: #16a34a; border-color: #16a34a; }
.pending-steps li.is-active { color: var(--preto); font-weight: 600; }
.pending-steps li.is-active::before { animation: pulse 1.2s ease-in-out infinite; border-color: var(--azul-principal); }

.muted { color: var(--cinza-texto); font-size: 0.9rem; margin: 0 0 1rem; }

/* ---------- Confirmado ---------- */
.check {
  animation: pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  height: 88px;
  margin-bottom: 1.25rem;
  position: relative;
  width: 88px;
}

.check svg { height: 100%; position: relative; width: 100%; }

.check-circle {
  animation: draw 0.6s ease-out 0.15s both;
  fill: var(--azul-principal);
  stroke: var(--azul-principal);
  stroke-dasharray: 190;
  stroke-width: 3;
}

.check-mark {
  animation: draw-mark 0.4s ease-out 0.55s both;
  fill: none;
  stroke: #ffffff;
  stroke-dasharray: 48;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 5;
}

.check-ring {
  animation: ring 1.4s ease-out 0.5s both;
  border: 2px solid rgba(0, 87, 255, 0.35);
  border-radius: 50%;
  inset: 0;
  position: absolute;
}

.kicker {
  align-items: center;
  animation: rise 0.5s ease 0.65s both;
  background: #eef4ff;
  border: 1px solid #d6e3ff;
  border-radius: 999px;
  color: var(--azul-principal);
  display: inline-flex;
  font-size: 0.78rem;
  font-weight: 700;
  gap: 0.35rem;
  letter-spacing: 0.04em;
  padding: 0.35rem 0.8rem;
  text-transform: uppercase;
}

.title {
  animation: rise 0.55s ease 0.75s both;
  color: var(--preto);
  font-size: clamp(1.8rem, 6vw, 2.6rem);
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0.9rem 0 0.6rem;
}

.subtitle {
  animation: rise 0.55s ease 0.85s both;
  color: var(--cinza-texto);
  font-size: 1.05rem;
  line-height: 1.5;
  margin: 0;
  max-width: 460px;
}

.pass {
  align-items: center;
  animation: rise 0.55s ease 0.95s both;
  background: linear-gradient(120deg, #0057ff 0%, #1b69ff 100%);
  border-radius: 14px;
  box-shadow: 0 16px 30px -18px rgba(0, 87, 255, 0.8);
  color: #ffffff;
  display: inline-flex;
  font-size: 0.9rem;
  gap: 0.6rem;
  margin-top: 1.25rem;
  padding: 0.6rem 1rem;
}

.pass b { background: rgba(255, 255, 255, 0.18); border-radius: 999px; font-size: 0.8rem; padding: 0.15rem 0.55rem; }
.pass-dot { animation: pulse 1.6s ease-in-out infinite; background: #ffffff; border-radius: 50%; height: 8px; width: 8px; }

.next-title {
  animation: rise 0.5s ease 1.05s both;
  color: #64748b;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  margin: 2rem 0 0.75rem;
  text-transform: uppercase;
}

.actions {
  display: grid;
  gap: 0.6rem;
  list-style: none;
  margin: 0;
  padding: 0;
  width: 100%;
}

.actions li {
  animation: slide-in 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  animation-delay: calc(1.15s + var(--i) * 0.1s);
}

.action {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  cursor: pointer;
  display: flex;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  text-align: left;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
  width: 100%;
}

.action:hover {
  border-color: #bfd3ff;
  box-shadow: 0 12px 26px -18px rgba(0, 87, 255, 0.6);
  transform: translateY(-1px);
}

.action:focus-visible { outline: 3px solid rgba(0, 87, 255, 0.25); outline-offset: 2px; }

.action-icon {
  align-items: center;
  background: #eef4ff;
  border-radius: 12px;
  color: var(--azul-principal);
  display: flex;
  flex-shrink: 0;
  height: 42px;
  justify-content: center;
  width: 42px;
}

.action-copy { display: flex; flex: 1; flex-direction: column; gap: 2px; }
.action-copy strong { color: var(--preto); font-size: 0.95rem; }
.action-copy small { color: var(--cinza-texto); font-size: 0.82rem; }
.action-arrow { color: #94a3b8; flex-shrink: 0; transition: transform 0.2s, color 0.2s; }
.action:hover .action-arrow { color: var(--azul-principal); transform: translateX(3px); }

.btn-primary {
  align-items: center;
  background: linear-gradient(180deg, #1b69ff 0%, #0057ff 100%);
  border: none;
  border-radius: 999px;
  box-shadow: 0 14px 28px -14px rgba(0, 87, 255, 0.75);
  color: #ffffff;
  cursor: pointer;
  display: inline-flex;
  font-size: 1rem;
  font-weight: 700;
  gap: 0.5rem;
  justify-content: center;
  min-height: 52px;
  padding: 0 1.75rem;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 18px 32px -14px rgba(0, 87, 255, 0.85); }
.btn-primary:active { transform: scale(0.98); }

.btn-dashboard {
  animation: rise 0.5s ease 1.5s both;
  margin-top: 1.5rem;
}

/* ---------- Transições ---------- */
.swap-enter-active, .swap-leave-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.swap-enter-from { opacity: 0; transform: translateY(14px) scale(0.98); }
.swap-leave-to { opacity: 0; transform: translateY(-10px); }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.35); opacity: 0.6; } }
@keyframes pop { from { opacity: 0; transform: scale(0.4); } to { opacity: 1; transform: scale(1); } }
@keyframes draw { from { stroke-dashoffset: 190; fill-opacity: 0; } 70% { fill-opacity: 0; } to { stroke-dashoffset: 0; fill-opacity: 1; } }
@keyframes draw-mark { from { stroke-dashoffset: 48; } to { stroke-dashoffset: 0; } }
@keyframes ring { from { opacity: 0.9; transform: scale(1); } to { opacity: 0; transform: scale(1.8); } }
@keyframes rise { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
@keyframes slide-in { from { opacity: 0; transform: translateY(16px) scale(0.98); } to { opacity: 1; transform: none; } }

@media (min-width: 640px) {
  .actions { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  /* Os três cards com a mesma altura: o item da grade estica e o botão ocupa tudo */
  .actions li { display: flex; }
  .action { align-items: flex-start; flex-direction: column; height: 100%; min-height: 150px; }
  .action-copy { flex: 0 0 auto; }
  .action-arrow { margin-top: auto; }
}

@media (prefers-reduced-motion: reduce) {
  .check, .check-circle, .check-mark, .check-ring, .kicker, .title, .subtitle, .pass, .pass-dot,
  .next-title, .actions li, .btn-dashboard, .pending-orbit, .pending-steps li::before { animation: none; }
  .check-circle { stroke-dashoffset: 0; }
  .check-mark { stroke-dashoffset: 0; }
  .swap-enter-active, .swap-leave-active { transition: none; }
}
</style>
