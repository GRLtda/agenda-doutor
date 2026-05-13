<script setup>
import { computed, ref } from 'vue'
import { ArrowLeft, ArrowRight, Check, Users } from 'lucide-vue-next'
import { createCheckoutSession } from '@/api/subscriptions/subscriptions.service'
import ClinicLogo from '@/components/global/ClinicLogo.vue'

const props = defineProps({
  installationFeeCharged: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['back'])

const selectedPlan = ref('basic')
const loadingPlan = ref(null)
const errorMessage = ref(null)
const stripeLogo =
  'data:image/svg+xml,%3Csvg width=%2260%22 height=%2225%22 viewBox=%220 0 60 25%22 fill=%22none%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath fill=%22%23635BFF%22 d=%22M59.64 14.28c0-4.16-2.02-7.44-5.88-7.44-3.88 0-6.22 3.28-6.22 7.4 0 4.9 2.78 7.36 6.74 7.36 1.94 0 3.4-.44 4.5-1.06v-3.22c-1.1.56-2.36.9-3.96.9-1.58 0-2.98-.56-3.16-2.48h7.94c0-.22.04-1.08.04-1.46Zm-8.02-1.5c0-1.84 1.12-2.6 2.12-2.6.98 0 2.02.76 2.02 2.6h-4.14ZM41.24 6.84c-1.6 0-2.62.76-3.18 1.3l-.22-1.04h-3.56v18.18l4.04-.86.02-4.4c.58.42 1.44 1.02 2.86 1.02 2.9 0 5.54-2.34 5.54-7.5-.02-4.72-2.7-6.7-5.5-6.7Zm-.98 10.64c-.96 0-1.52-.34-1.92-.76l-.02-6.04c.42-.46 1-.78 1.94-.78 1.48 0 2.5 1.66 2.5 3.78 0 2.16-1 3.8-2.5 3.8ZM28.7 5.88l4.06-.88V1.72l-4.06.86v3.3Zm0 1.24h4.06v14.2H28.7V7.12Zm-4.36 1.2-.26-1.2h-3.5v14.2h4.04v-9.62c.96-1.26 2.58-1.02 3.08-.84V7.12c-.52-.2-2.38-.56-3.36 1.2ZM16.26 3.6l-3.94.84-.02 13c0 2.4 1.8 4.18 4.2 4.18 1.34 0 2.32-.24 2.86-.52v-3.28c-.52.2-3.1.9-3.1-1.44v-5.82h3.1V7.12h-3.1V3.6ZM4.1 11.24c0-.62.52-.86 1.38-.86 1.22 0 2.76.38 3.98 1.04V7.64c-1.34-.54-2.66-.76-3.98-.76-3.26 0-5.42 1.7-5.42 4.54 0 4.42 6.08 3.7 6.08 5.6 0 .74-.64.98-1.54.98-1.34 0-3.04-.54-4.4-1.28v3.84c1.5.64 3.02.92 4.4.92 3.34 0 5.64-1.66 5.64-4.54-.02-4.78-6.14-3.92-6.14-5.7Z%22/%3E%3C/svg%3E'

const plans = [
  {
    id: 'premium',
    doctors: 'Até 3 médicos',
    title: 'Equipe',
    price: 15900,
    displayPrice: 'R$159',
    description: 'Para clínicas em crescimento com mais profissionais e mais capacidade.',
    features: ['Até 3 profissionais', 'Histórico clínico centralizado', 'Controle de equipe', 'Melhor custo por médico'],
  },
  {
    id: 'basic',
    doctors: '1 médico',
    title: 'Essencial',
    price: 9990,
    displayPrice: 'R$99,90',
    description: 'Para clínicas enxutas começarem com agenda, pacientes e rotina organizada.',
    features: ['1 profissional atendendo', 'Agenda e cadastro de pacientes', 'Prontuários e anamnese', 'Suporte inicial'],
    highlight: true,
  },
  {
    id: 'enterprise',
    doctors: 'Até 5 médicos',
    title: 'Clínica',
    price: 19900,
    displayPrice: 'R$199',
    description: 'Para operações mais completas, com mais profissionais atendendo todos os dias.',
    features: ['Até 5 profissionais', 'Fluxo completo da clínica', 'Mais capacidade de agenda', 'Escala para a equipe'],
  },
]

const selectedPlanData = computed(() => plans.find((plan) => plan.id === selectedPlan.value) || plans[0])
const installationFeeAmount = 10000
const shouldChargeInstallation = computed(() => !props.installationFeeCharged)
const totalToday = computed(() => {
  return selectedPlanData.value.price + (shouldChargeInstallation.value ? installationFeeAmount : 0)
})

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100)
}

async function handleSubscribe(planId = selectedPlan.value) {
  selectedPlan.value = planId
  errorMessage.value = null
  loadingPlan.value = planId

  try {
    const response = await createCheckoutSession({
      plan: planId,
      context: 'onboarding',
    })

    const url = response.data?.url
    if (!url) {
      errorMessage.value = 'Não foi possível abrir o checkout. Tente novamente.'
      return
    }

    window.location.href = url
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message || 'Não foi possível iniciar o pagamento. Tente novamente.'
  } finally {
    loadingPlan.value = null
  }
}
</script>

<template>
  <main class="pricing-page">
    <header class="pricing-topbar">
      <div class="brand">
        <ClinicLogo size="132px" />
      </div>
      <button class="back-button" type="button" @click="emit('back')">
        <ArrowLeft :size="16" />
        <span>Voltar</span>
      </button>
    </header>

    <section class="pricing-shell">
      <div class="pricing-heading">
        <h1>Escolha o plano da sua clínica</h1>
        <p>
          Selecione a capacidade de atendimento ideal. Você será direcionado para o checkout seguro
          da Stripe.
        </p>
      </div>

      <div class="plans-grid">
        <article
          v-for="plan in plans"
          :key="plan.id"
          class="plan-card"
          :class="{ selected: selectedPlan === plan.id, highlighted: plan.highlight }"
          @click="selectedPlan = plan.id"
        >
          <div class="plan-card-top">
            <div class="plan-icon">
              <Users :size="18" />
            </div>
            <span v-if="plan.highlight" class="plan-tag">Mais escolhido</span>
          </div>

          <div class="plan-copy">
            <span class="plan-doctors">{{ plan.doctors }}</span>
            <h2>{{ plan.title }}</h2>
            <p>{{ plan.description }}</p>
          </div>

          <div class="plan-price">
            <strong>{{ plan.displayPrice }}</strong>
            <span>/mês</span>
          </div>

          <button class="plan-button" type="button" @click.stop="handleSubscribe(plan.id)">
            <span>{{ loadingPlan === plan.id ? 'Abrindo checkout...' : 'Escolher plano' }}</span>
            <ArrowRight :size="17" />
          </button>

          <ul class="features-list">
            <li v-for="feature in plan.features" :key="feature">
              <Check :size="15" />
              <span>{{ feature }}</span>
            </li>
          </ul>
        </article>
      </div>

      <section class="checkout-summary" aria-label="Resumo de cobrança">
        <div>
          <span>Plano selecionado</span>
          <strong>{{ selectedPlanData.doctors }} · {{ selectedPlanData.displayPrice }}/mês</strong>
        </div>
        <div v-if="shouldChargeInstallation">
          <span>Taxa de instalação</span>
          <strong>{{ formatCurrency(installationFeeAmount) }}</strong>
        </div>
        <div v-else>
          <span>Taxa de instalação</span>
          <strong class="success-text">Isenta</strong>
        </div>
        <div>
          <span>Total hoje</span>
          <strong>{{ formatCurrency(totalToday) }}</strong>
        </div>
      </section>

      <p class="purchase-note">
        Ao continuar, você concorda com as diretrizes de compra e cobrança mensal.
      </p>

      <div class="stripe-box" aria-label="Pagamento seguro via Stripe">
        <span>Pagamento protegido por</span>
        <img :src="stripeLogo" alt="Stripe" />
      </div>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    </section>
  </main>
</template>

<style scoped>
.pricing-page {
  background: #ffffff;
  background-image:
    radial-gradient(circle at 50% 0%, rgba(37, 99, 235, 0.08), transparent 30%),
    linear-gradient(to right, rgba(229, 231, 235, 0.35) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(229, 231, 235, 0.35) 1px, transparent 1px);
  background-size: 100% 100%, 40px 40px, 40px 40px;
  color: var(--preto);
  min-height: 100vh;
  padding: 1.25rem clamp(1rem, 3vw, 2rem) 2rem;
}

.pricing-topbar {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin: 0 auto;
  max-width: 1120px;
}

.brand {
  align-items: center;
  display: flex;
}

.back-button {
  align-items: center;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  color: #4b5563;
  cursor: pointer;
  display: flex;
  font-size: 0.84rem;
  font-weight: 700;
  gap: 0.4rem;
  padding: 0.55rem 0.85rem;
}

.pricing-shell {
  margin: 2rem auto 0;
  max-width: 1120px;
}

.pricing-heading {
  margin: 0 auto 1.8rem;
  max-width: 650px;
  text-align: center;
}

.pricing-heading h1 {
  color: #111827;
  font-size: clamp(2rem, 4vw, 3.15rem);
  letter-spacing: 0;
  line-height: 1;
  margin: 0 0 0.85rem;
}

.pricing-heading p {
  color: #6b7280;
  font-size: 1rem;
  line-height: 1.55;
  margin: 0;
}

.plans-grid {
  align-items: stretch;
  animation: plansReveal 0.48s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.plan-card {
  --card-offset: 0px;
  animation: cardRise 0.52s cubic-bezier(0.2, 0.8, 0.2, 1) both;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e5e7eb;
  border-radius: 18px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  min-height: 430px;
  padding: 1.1rem;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.plan-card:nth-child(2) {
  animation-delay: 0.08s;
}

.plan-card:nth-child(3) {
  animation-delay: 0.16s;
}

.plan-card:hover,
.plan-card.selected {
  border-color: var(--azul-principal);
  transform: translateY(calc(var(--card-offset) - 2px));
}

.plan-card.highlighted {
  --card-offset: -10px;
  background: #0f172a;
  border-color: #0f172a;
  color: #ffffff;
  transform: translateY(var(--card-offset));
}

.plan-card.highlighted.selected,
.plan-card.highlighted:hover {
  border-color: #2563eb;
}

.plan-card-top {
  align-items: center;
  display: flex;
  justify-content: space-between;
  min-height: 36px;
}

.plan-icon {
  align-items: center;
  background: #eef2ff;
  border-radius: 999px;
  color: var(--azul-principal);
  display: flex;
  height: 36px;
  justify-content: center;
  width: 36px;
}

.highlighted .plan-icon {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.plan-tag {
  background: #2563eb;
  border-radius: 999px;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.28rem 0.62rem;
}

.plan-copy {
  margin-top: 1rem;
}

.plan-doctors {
  color: #6b7280;
  font-size: 0.85rem;
  font-weight: 800;
}

.highlighted .plan-doctors,
.highlighted .plan-copy p,
.highlighted .plan-price span {
  color: rgba(255, 255, 255, 0.72);
}

.plan-copy h2 {
  font-size: 1.3rem;
  margin: 0.35rem 0;
}

.plan-copy p {
  color: #6b7280;
  font-size: 0.9rem;
  line-height: 1.45;
  margin: 0;
  min-height: 58px;
}

.plan-price {
  align-items: baseline;
  display: flex;
  gap: 0.25rem;
  margin: 1.2rem 0 1rem;
}

.plan-price strong {
  color: var(--azul-principal);
  font-size: 2rem;
  line-height: 1;
}

.highlighted .plan-price strong {
  color: #ffffff;
}

.plan-price span {
  color: #6b7280;
  font-size: 0.9rem;
  font-weight: 700;
}

.plan-button {
  align-items: center;
  background: var(--azul-principal);
  border: none;
  border-radius: 12px;
  color: #ffffff;
  cursor: pointer;
  display: flex;
  font-size: 0.95rem;
  font-weight: 800;
  justify-content: space-between;
  min-height: 46px;
  padding: 0.85rem 0.95rem;
  width: 100%;
}

.highlighted .plan-button {
  background: #ffffff;
  color: #0f172a;
}

.features-list {
  border-top: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  list-style: none;
  margin: 1rem 0 0;
  padding: 1rem 0 0;
}

.highlighted .features-list {
  border-color: rgba(255, 255, 255, 0.16);
}

.features-list li {
  align-items: center;
  color: #374151;
  display: flex;
  font-size: 0.88rem;
  gap: 0.5rem;
}

.highlighted .features-list li {
  color: rgba(255, 255, 255, 0.82);
}

.features-list svg {
  color: #16a34a;
  flex-shrink: 0;
}

.checkout-summary {
  align-items: center;
  animation: summaryReveal 0.44s ease 0.22s both;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1.3fr 1fr 1fr;
  margin: 1.1rem auto 0;
  max-width: 860px;
  padding: 0.9rem 1rem;
}

@keyframes plansReveal {
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes cardRise {
  from {
    opacity: 0;
    transform: translateY(18px) scale(0.98);
  }

  to {
    opacity: 1;
    transform: translateY(var(--card-offset)) scale(1);
  }
}

@keyframes summaryReveal {
  from {
    opacity: 0;
    transform: translateY(10px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.checkout-summary div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.checkout-summary span {
  color: #6b7280;
  font-size: 0.78rem;
  font-weight: 700;
}

.checkout-summary strong {
  color: #111827;
  font-size: 0.95rem;
}

.success-text {
  color: #16a34a !important;
}

.purchase-note,
.stripe-box {
  color: rgba(75, 85, 99, 0.66);
  font-size: 0.76rem;
  text-align: center;
}

.purchase-note {
  margin: 0.9rem 0 0;
}

.stripe-box {
  align-items: center;
  display: flex;
  gap: 0.35rem;
  justify-content: center;
  margin-top: 0.45rem;
}

.stripe-box img {
  height: 15px;
  opacity: 0.72;
  width: auto;
}

.error-message {
  color: #ef4444;
  font-size: 0.88rem;
  margin: 0.9rem 0 0;
  text-align: center;
}

@media (max-width: 900px) {
  .pricing-page {
    padding-bottom: 2.5rem;
  }

  .plans-grid,
  .checkout-summary {
    grid-template-columns: 1fr;
  }

  .plan-card.highlighted {
    transform: none;
  }
}
</style>
