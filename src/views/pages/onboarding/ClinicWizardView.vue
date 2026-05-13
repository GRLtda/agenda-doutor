<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthCard from '@/components/pages/autenticacao/AuthCard.vue'
import Stepper from '@/components/pages/onboarding/Stepper.vue'
import StepCreateClinic from '@/components/pages/onboarding/steps/StepCreateClinic.vue'
import StepWorkingHours from '@/components/pages/onboarding/steps/StepWorkingHours.vue'
import StepSubscription from '@/components/pages/onboarding/steps/StepSubscription.vue'
import ClinicLogo from '@/components/global/ClinicLogo.vue'
import {
  Building,
  Clock,
  CreditCard,
  CheckCircle,
  CalendarPlus,
  UserPlus,
  PartyPopper,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const currentStep = ref(1)
const subscriptionStatus = ref(null)
const isCheckingPayment = ref(false)

const activeSubscriptionStatuses = ['active', 'trialing', 'lifetime', 'past_due']

const steps = [
  { name: 'Dados da Clínica', subtitle: 'Informações principais', icon: Building },
  { name: 'Horário', subtitle: 'Funcionamento', icon: Clock },
  { name: 'Assinatura', subtitle: 'Pagamento seguro', icon: CreditCard },
  { name: 'Concluído', subtitle: 'Tudo pronto', icon: CheckCircle },
]

const clinic = computed(() => authStore.user?.clinic || null)
const isPaymentSuccessReturn = computed(() => route.query.payment === 'success')
const hasActiveSubscription = computed(() => {
  const status = subscriptionStatus.value || clinic.value?.subscriptionStatus
  if (activeSubscriptionStatuses.includes(status)) {
    return true
  }

  if (clinic.value?.isTrialAccount && clinic.value?.trialEndsAt) {
    return new Date(clinic.value.trialEndsAt) > new Date()
  }

  return false
})
const installationFeeCharged = computed(() => !!clinic.value?.installationFeeCharged)

function nextStep() {
  if (currentStep.value < steps.length) {
    currentStep.value++
  }
}

function previousStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

async function syncOnboardingStep() {
  isCheckingPayment.value = true
  try {
    const maxAttempts = route.query.payment === 'success' ? 4 : 1

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await authStore.fetchUser()
      subscriptionStatus.value = authStore.user?.clinic?.subscriptionStatus || null

      if (!authStore.user?.clinic || hasActiveSubscription.value || attempt === maxAttempts - 1) {
        break
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    if (!authStore.user?.clinic) {
      currentStep.value = 1
      return
    }

    if (hasActiveSubscription.value) {
      if (isPaymentSuccessReturn.value) {
        currentStep.value = 4
        return
      }

      router.replace('/')
      return
    }

    currentStep.value = isPaymentSuccessReturn.value ? 4 : 3
  } finally {
    isCheckingPayment.value = false
  }
}

function goToDashboard() {
  router.push('/')
}

const currentQuoteIndex = ref(0)
const quotes = [
  'Falta pouco para sua rotina automatizada',
  'Gestão simplificada e eficiente para sua clínica',
  'Tecnologia que transforma o seu dia a dia',
]

let quoteInterval

onMounted(() => {
  syncOnboardingStep()

  quoteInterval = setInterval(() => {
    currentQuoteIndex.value = (currentQuoteIndex.value + 1) % quotes.length
  }, 5000)
})

onUnmounted(() => {
  clearInterval(quoteInterval)
})

const imageUrl = new URL('@/assets/clinic2.webp', import.meta.url).href
</script>

<template>
  <AuthCard :image-url="imageUrl" panel-width="large" class="onboarding-auth-card">
    <template #image-content>
      <div class="brand-logo">
        <ClinicLogo size="120px" />
      </div>
      <div class="testimonial-overlay">
        <Transition name="fade" mode="out-in">
          <p :key="currentQuoteIndex" class="quote">"{{ quotes[currentQuoteIndex] }}"</p>
        </Transition>
      </div>
    </template>

    <template #title>
      <Stepper :steps="steps" :currentStep="currentStep" />
    </template>

    <div class="step-content-wrapper">
      <div v-if="isCheckingPayment" class="skeleton-state" aria-label="Carregando onboarding">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton-row">
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
        <div class="skeleton-bottom">
          <div class="skeleton skeleton-panel"></div>
          <div class="skeleton skeleton-panel small"></div>
        </div>
      </div>

      <Transition name="step-slide" mode="out-in">
        <div :key="currentStep" class="step-transition-frame">
          <div v-if="currentStep === 1 && !isCheckingPayment">
            <StepCreateClinic @success="nextStep" />
          </div>

          <div v-else-if="currentStep === 2 && !isCheckingPayment">
            <StepWorkingHours @success="nextStep" />
          </div>

          <div v-else-if="currentStep === 3 && !isCheckingPayment">
            <StepSubscription
              :installation-fee-charged="installationFeeCharged"
              @back="previousStep"
            />
          </div>

          <div v-else-if="currentStep === 4 && !isCheckingPayment" class="text-content">
            <div class="success-icon-wrapper">
              <PartyPopper :size="48" />
            </div>
            <h2>{{ isPaymentSuccessReturn ? 'Obrigado!' : 'Tudo pronto!' }}</h2>
            <p v-if="isPaymentSuccessReturn && !hasActiveSubscription">
              Recebemos seu retorno do pagamento e estamos finalizando a confirmação da assinatura.
              Em instantes sua clínica será liberada.
            </p>
            <p v-else-if="isPaymentSuccessReturn">
              Pagamento confirmado com sucesso. Sua clínica já está pronta para começar.
            </p>
            <p v-else>
              Sua clínica foi configurada com sucesso. Aqui estão algumas sugestões para começar a usar
              o sistema:
            </p>

            <ul v-if="!isPaymentSuccessReturn || hasActiveSubscription" class="next-steps-list">
              <li>
                <UserPlus :size="20" />
                <span>Cadastre seu primeiro paciente.</span>
              </li>
              <li>
                <CalendarPlus :size="20" />
                <span>Marque um atendimento na agenda.</span>
              </li>
            </ul>

            <button
              v-if="hasActiveSubscription"
              @click="goToDashboard"
              class="auth-button"
            >
              Ir para o Dashboard
            </button>
            <button v-else @click="syncOnboardingStep" class="auth-button">Verificar assinatura</button>
          </div>
        </div>
      </Transition>
    </div>
  </AuthCard>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.testimonial-overlay {
  margin-bottom: 2rem;
  min-height: 120px;
  display: flex;
  align-items: flex-end;
}

.quote {
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.3;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin: 0;
}

.step-content-wrapper {
  margin-top: 1rem;
  min-height: 520px;
  position: relative;
}

.step-transition-frame {
  width: 100%;
}

.step-slide-enter-active,
.step-slide-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.step-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.step-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.onboarding-auth-card :deep(.form-panel) {
  align-items: center;
  min-height: 100vh;
  overflow: hidden;
  padding: 1rem 1.5rem;
}

.onboarding-auth-card :deep(.form-content) {
  max-width: 760px;
  transform: translateY(-1vh);
}

.onboarding-auth-card :deep(.content-title) {
  margin-bottom: 0.85rem;
}

.skeleton-state {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.skeleton {
  animation: shimmer 1.25s ease-in-out infinite;
  background: linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 37%, #f3f4f6 63%);
  background-size: 400% 100%;
  border-radius: 8px;
}

.skeleton-title {
  height: 34px;
  width: 56%;
}

.skeleton-row,
.skeleton-bottom {
  display: grid;
  gap: 0.75rem;
}

.skeleton-row {
  grid-template-columns: repeat(3, 1fr);
}

.skeleton-bottom {
  grid-template-columns: 1fr 0.9fr;
}

.skeleton-card {
  height: 154px;
}

.skeleton-panel {
  height: 230px;
}

.skeleton-panel.small {
  height: 230px;
}

@keyframes shimmer {
  0% {
    background-position: 100% 0;
  }

  100% {
    background-position: 0 0;
  }
}

.text-content {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 72px;
  height: 72px;
  background-color: #eef2ff;
  color: var(--azul-principal);
  border-radius: 50%;
  margin-bottom: 1rem;
}

h2 {
  font-size: 1.6rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

p {
  color: var(--cinza-texto);
  line-height: 1.6;
  max-width: 450px;
  margin-bottom: 1.25rem;
}

.next-steps-list {
  list-style: none;
  padding: 0;
  margin-bottom: 1.25rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  color: #374151;
  font-weight: 500;
}

.next-steps-list li {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.next-steps-list li svg {
  color: var(--azul-principal);
}

.auth-button {
  display: inline-block;
  text-decoration: none;
  max-width: 300px;
  width: 100%;
  padding: 0.875rem;
  border-radius: 0.75rem;
  border: none;
  background-color: var(--azul-principal);
  color: var(--branco);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.auth-button:hover {
  background-color: var(--azul-escuro);
}
</style>
