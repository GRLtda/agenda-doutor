<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AuthCard from '@/components/pages/autenticacao/AuthCard.vue'
import Stepper from '@/components/pages/onboarding/Stepper.vue'
import StepCreateClinic from '@/components/pages/onboarding/steps/StepCreateClinic.vue'
import StepWorkingHours from '@/components/pages/onboarding/steps/StepWorkingHours.vue'
import ClinicLogo from '@/components/global/ClinicLogo.vue' // Import Logo
import { Building, Clock, CheckCircle, CalendarPlus, UserPlus, PartyPopper } from 'lucide-vue-next'

const router = useRouter()
const currentStep = ref(1)

const steps = [
  { name: 'Dados da Clínica', subtitle: 'Informações principais', icon: Building },
  { name: 'Horário', subtitle: 'Funcionamento', icon: Clock },
  { name: 'Concluído', subtitle: 'Tudo pronto!', icon: CheckCircle },
]

function nextStep() {
  if (currentStep.value < steps.length) {
    currentStep.value++
  }
}

// --- ROTATING TEXT LOGIC ---
const currentQuoteIndex = ref(0)
const quotes = [
  "Falta pouco para sua rotina automatizada",
  "Gestão simplificada e eficiente para sua clínica",
  "Tecnologia que transforma o seu dia a dia"
]

let quoteInterval

onMounted(() => {
  quoteInterval = setInterval(() => {
    currentQuoteIndex.value = (currentQuoteIndex.value + 1) % quotes.length
  }, 5000)
})

onUnmounted(() => {
  clearInterval(quoteInterval)
})
</script>

<template>
  <AuthCard
    image-url="https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1168&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
    panel-width="large"
  >
    <template #image-content>
      <div class="brand-logo">
        <ClinicLogo size="120px" />
      </div>
      <div class="testimonial-overlay">
        <Transition name="fade" mode="out-in">
          <p :key="currentQuoteIndex" class="quote">
            “{{ quotes[currentQuoteIndex] }}”
          </p>
        </Transition>
      </div>
    </template>

    <template #title>
      <Stepper :steps="steps" :currentStep="currentStep" />
    </template>

    <div class="step-content-wrapper">
      <div v-if="currentStep === 1">
        <StepCreateClinic @success="nextStep" />
      </div>

      <div v-if="currentStep === 2">
        <StepWorkingHours @success="nextStep" />
      </div>

      <div v-if="currentStep === 3" class="text-content">
        <div class="success-icon-wrapper">
          <PartyPopper :size="48" />
        </div>
        <h2>Tudo pronto!</h2>
        <p>
          Sua clínica foi configurada com sucesso. Aqui estão algumas sugestões para começar a usar
          o sistema:
        </p>

        <ul class="next-steps-list">
          <li>
            <UserPlus :size="20" />
            <span>Cadastre seu primeiro paciente.</span>
          </li>
          <li>
            <CalendarPlus :size="20" />
            <span>Marque um atendimento na agenda.</span>
          </li>
        </ul>

        <button @click="router.push('/')" class="auth-button">Ir para o Dashboard</button>
      </div>
    </div>
  </AuthCard>
</template>

<style scoped>
/* --- TRANSITIONS --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* --- OVERLAY STYLES --- */
.brand-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.5rem;
  font-weight: 700;
}

.testimonial-overlay {
  margin-bottom: 2rem;
  min-height: 120px; /* Prevent jumping */
  display: flex;
  align-items: flex-end; /* Align bottom */
}

.quote {
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1.3;
  color: white; /* Ensure text is white on image */
  text-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin: 0;
}

.step-content-wrapper {
  margin-top: 2rem;
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
  width: 80px;
  height: 80px;
  background-color: #eef2ff; /* Azul bem claro */
  color: var(--azul-principal);
  border-radius: 50%;
  margin-bottom: 1.5rem;
}
h2 {
  font-size: 1.75rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
p {
  color: var(--cinza-texto);
  line-height: 1.6;
  max-width: 450px;
  margin-bottom: 2rem;
}
.next-steps-list {
  list-style: none;
  padding: 0;
  margin-bottom: 2rem;
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
