<script setup>
import { computed, ref } from 'vue'
import { Check, ArrowLeft, ArrowRight, Users } from 'lucide-vue-next'
import { createCheckoutSession } from '@/api/subscriptions/subscriptions.service'

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
    id: 'basic',
    doctors: '1 médico',
    title: 'Essencial',
    price: 9990,
    displayPrice: 'R$99,90',
    description: 'Para iniciar a operação da clínica com agenda e pacientes organizados.',
  },
  {
    id: 'premium',
    doctors: 'Até 3 médicos',
    title: 'Equipe',
    price: 15900,
    displayPrice: 'R$159',
    description: 'Para clínicas em crescimento com mais profissionais atendendo.',
    highlight: true,
  },
  {
    id: 'enterprise',
    doctors: 'Até 5 médicos',
    title: 'Clínica',
    price: 19900,
    displayPrice: 'R$199',
    description: 'Para uma operação mais completa com maior capacidade de atendimento.',
  },
]

const benefits = [
  'Agenda online e cadastro de pacientes',
  'Prontuários, anamnese e histórico centralizados',
  'Controle da equipe médica por faixa contratada',
  'Suporte para configurar a rotina inicial',
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

async function handleSubscribe() {
  errorMessage.value = null
  loadingPlan.value = selectedPlan.value

  try {
    const response = await createCheckoutSession({
      plan: selectedPlan.value,
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
  <section class="subscription-step">
    <div class="subscription-header">
      <div>
        <h2>Escolha a capacidade da sua clínica</h2>
        <p>Selecione a faixa que combina com a quantidade de médicos da sua operação.</p>
      </div>
      <button class="back-button" type="button" @click="emit('back')">
        <ArrowLeft :size="16" />
        <span>Voltar</span>
      </button>
    </div>

    <div class="plans-grid">
      <button
        v-for="plan in plans"
        :key="plan.id"
        type="button"
        class="plan-card"
        :class="{ selected: selectedPlan === plan.id, highlighted: plan.highlight }"
        @click="selectedPlan = plan.id"
      >
        <span v-if="plan.highlight" class="plan-tag">Mais escolhido</span>
        <span class="plan-doctors"><Users :size="15" /> {{ plan.doctors }}</span>
        <strong>{{ plan.title }}</strong>
        <span class="plan-price">{{ plan.displayPrice }}<small>/mês</small></span>
        <span class="plan-description">{{ plan.description }}</span>
      </button>
    </div>

    <div class="checkout-grid">
      <div class="benefits-panel">
        <h3>Incluído no plano</h3>
        <ul>
          <li v-for="benefit in benefits" :key="benefit">
            <Check :size="16" />
            <span>{{ benefit }}</span>
          </li>
        </ul>
      </div>

      <div class="summary-panel">
        <div class="summary-row">
          <span>{{ selectedPlanData.doctors }}</span>
          <strong>{{ selectedPlanData.displayPrice }}/mês</strong>
        </div>
        <div v-if="shouldChargeInstallation" class="summary-row">
          <span>Taxa de instalação</span>
          <strong>{{ formatCurrency(installationFeeAmount) }}</strong>
        </div>
        <div v-else class="summary-row muted">
          <span>Taxa de instalação</span>
          <strong>Isenta</strong>
        </div>
        <div class="summary-total">
          <span>Total hoje</span>
          <strong>{{ formatCurrency(totalToday) }}</strong>
        </div>

        <button class="auth-button" type="button" @click="handleSubscribe" :disabled="!!loadingPlan">
          <span>{{ loadingPlan ? 'Abrindo checkout...' : 'Assinar e continuar' }}</span>
          <ArrowRight :size="18" />
        </button>

        <div class="stripe-box" aria-label="Pagamento seguro via Stripe">
          <span>Pagamento protegido por</span>
          <img :src="stripeLogo" alt="Stripe" />
        </div>
      </div>
    </div>

    <p class="purchase-note">
      Ao continuar, você concorda com as diretrizes de compra e cobrança mensal.
    </p>

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
  </section>
</template>

<style scoped>
.subscription-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.subscription-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

h2 {
  color: var(--preto);
  font-size: 1.35rem;
  line-height: 1.2;
  margin: 0 0 0.3rem;
}

.subscription-header p {
  color: var(--cinza-texto);
  font-size: 0.86rem;
  line-height: 1.4;
  margin: 0;
}

.back-button {
  align-items: center;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #4b5563;
  cursor: pointer;
  display: flex;
  flex-shrink: 0;
  font-size: 0.82rem;
  font-weight: 700;
  gap: 0.4rem;
  padding: 0.5rem 0.7rem;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;
}

.back-button:hover {
  border-color: var(--azul-principal);
  color: var(--azul-principal);
}

.plans-grid {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.plan-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-height: 154px;
  padding: 0.85rem;
  position: relative;
  text-align: left;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    transform 0.2s ease;
}

.plan-card:hover,
.plan-card.selected {
  border-color: var(--azul-principal);
  background: #f8fbff;
  transform: translateY(-1px);
}

.plan-card.highlighted {
  background: #f8fbff;
}

.plan-tag {
  background: var(--azul-principal);
  border-radius: 999px;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.22rem 0.5rem;
  position: absolute;
  right: 0.65rem;
  top: 0.65rem;
}

.plan-doctors {
  align-items: center;
  color: #4b5563;
  display: flex;
  font-size: 0.78rem;
  font-weight: 700;
  gap: 0.3rem;
  min-height: 20px;
}

.plan-card strong {
  color: var(--preto);
  font-size: 1rem;
}

.plan-price {
  color: var(--azul-principal);
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1;
}

.plan-price small {
  color: var(--cinza-texto);
  font-size: 0.75rem;
  font-weight: 600;
  margin-left: 0.15rem;
}

.plan-description {
  color: var(--cinza-texto);
  font-size: 0.78rem;
  line-height: 1.35;
}

.checkout-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr 0.9fr;
}

.benefits-panel,
.summary-panel {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

h3 {
  color: var(--preto);
  font-size: 0.95rem;
  margin: 0 0 0.75rem;
}

ul {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

li {
  align-items: center;
  color: #374151;
  display: flex;
  font-size: 0.86rem;
  gap: 0.5rem;
}

li svg {
  color: #16a34a;
  flex-shrink: 0;
}

.summary-panel {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.summary-row,
.summary-total {
  align-items: center;
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.summary-row {
  color: #4b5563;
  font-size: 0.86rem;
}

.summary-row strong {
  color: var(--preto);
}

.summary-row.muted strong {
  color: #16a34a;
}

.summary-total {
  border-top: 1px solid #e5e7eb;
  color: var(--preto);
  font-weight: 700;
  margin-top: 0.2rem;
  padding-top: 0.8rem;
}

.summary-total strong {
  color: var(--azul-principal);
  font-size: 1.25rem;
}

.stripe-box {
  align-items: center;
  color: rgba(75, 85, 99, 0.56);
  display: flex;
  font-size: 0.72rem;
  gap: 0.3rem;
  justify-content: center;
  line-height: 1;
  padding-top: 0.1rem;
}

.purchase-note {
  color: rgba(75, 85, 99, 0.66);
  font-size: 0.72rem;
  line-height: 1.35;
  margin: -0.15rem 0 0;
  text-align: center;
}

.stripe-box img {
  height: 15px;
  opacity: 0.72;
  width: auto;
}

.auth-button {
  align-items: center;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  display: flex;
  font-size: 1rem;
  font-weight: 800;
  gap: 0.55rem;
  justify-content: space-between;
  min-height: 48px;
  padding: 0.85rem 1rem 0.85rem 1.15rem;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
  width: 100%;
}

.auth-button {
  background-color: var(--azul-principal);
  color: var(--branco);
}

.auth-button:hover {
  background-color: var(--azul-escuro);
  transform: translateY(-1px);
}

.auth-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.error-message {
  color: #ef4444;
  font-size: 0.86rem;
  margin: 0;
  text-align: center;
}

@media (max-width: 900px) {
  .subscription-header {
    flex-direction: column;
  }

  .checkout-grid,
  .plans-grid {
    grid-template-columns: 1fr;
  }
}
</style>
