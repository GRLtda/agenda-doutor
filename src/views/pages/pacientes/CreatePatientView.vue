<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePatientsStore } from '@/stores/patients'
import { useToast } from 'vue-toastification'
import Stepper from '@/components/pages/onboarding/Stepper.vue'
import StepPersonalData from '@/components/pages/pacientes/steps/StepPersonalData.vue'
import StepAddressData from '@/components/pages/pacientes/steps/StepAddressData.vue'
import AppButton from '@/components/global/AppButton.vue'
import { User, Map, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const patientsStore = usePatientsStore()
const toast = useToast()

const currentStep = ref(1)
const transitionName = ref('slide-next')
const isSubmitting = ref(false) // ✨ 1. Adiciona estado para controlar o envio
const errors = ref({}) // ✨ Novo: Estado para erros de validação

const steps = [
  { name: 'Dados Pessoais', subtitle: 'Principais', icon: User },
  { name: 'Endereço', subtitle: 'Opcional', icon: Map },
]

const patientData = ref({
  name: '',
  nickname: '',
  birthDate: '',
  cpf: '',
  phone: '',
  countryCode: '55',
  gender: 'Feminino',
  referralSource: '',
  email: '',
  address: {
    cep: '',
    street: '',
    number: '',
    district: '',
    city: '',
    state: '',
    complement: '',
  },
})

function validateStep1() {
  errors.value = {}
  if (!patientData.value.name.trim()) {
    errors.value.name = 'O nome do paciente é obrigatório.'
    return false
  }
  return true
}

function nextStep() {
  // ✨ Validação adicionada aqui
  if (currentStep.value === 1) {
    if (validateStep1()) {
      transitionName.value = 'slide-next'
      currentStep.value++
    }
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    transitionName.value = 'slide-prev'
    currentStep.value--
  }
}

async function submitForm() {
  if (isSubmitting.value) return // ✨ 2. Impede cliques múltiplos
  isSubmitting.value = true

  try {
    const payload = JSON.parse(JSON.stringify(patientData.value))

    if (payload.cpf) {
      payload.cpf = payload.cpf.replace(/\D/g, '')
    }
    if (payload.phone) {
      payload.phone = payload.phone.replace(/\D/g, '')
    }
    if (payload.countryCode) {
      payload.countryCode = payload.countryCode.replace(/\D/g, '')
    }

    const { success, error } = await patientsStore.createPatient(payload)

    if (success) {
      toast.success('Paciente cadastrado com sucesso!')
      router.push('/pacientes')
    } else {
      // E usamos a variável 'error' para exibir a mensagem específica.
      const errorMessage = error || 'Erro ao cadastrar paciente.'
      toast.error(errorMessage)
    }
  } catch (e) {
    toast.error('Ocorreu um erro inesperado. Tente novamente.')
  } finally {
    isSubmitting.value = false // ✨ 3. Reativa o botão no final
  }
}
</script>

<template>
  <div class="create-patient-view">
    <header class="page-header">
      <div class="header-main">
        <button @click="router.go(-1)" class="back-button">
          <ArrowLeft :size="20" />
        </button>
        <div>
          <h1 class="title">Adicionar Novo Paciente</h1>
          <p class="subtitle">
            Preencha os dados abaixo para cadastrar um novo paciente no sistema.
          </p>
        </div>
      </div>
      <Stepper :steps="steps" :currentStep="currentStep" />
    </header>

    <div class="separator"></div>

    <div class="form-content" v-auto-animate>
      <Transition :name="transitionName" mode="out-in">
        <div :key="currentStep">
          <StepPersonalData
            v-if="currentStep === 1"
            v-model="patientData"
            :error-message="errors.name"
          />
          <StepAddressData v-if="currentStep === 2" v-model="patientData.address" />
        </div>
      </Transition>
    </div>

    <footer class="form-actions">
      <AppButton v-if="currentStep > 1" @click="prevStep" type="button" variant="secondary">
        Voltar
      </AppButton>
      <AppButton v-if="currentStep < steps.length" @click="nextStep" type="button" variant="primary">
        Avançar
      </AppButton>
      <AppButton
        v-if="currentStep === steps.length"
        @click="submitForm"
        type="button"
        variant="primary"
        :loading="isSubmitting"
      >
        <!-- ✨ 4. Altera o texto e desabilita o botão -->
        Salvar Paciente
      </AppButton>
    </footer>
  </div>
</template>

<style scoped>
/* Estilos permanecem os mesmos */
.create-patient-view {
  max-width: 900px;
  margin: 0 auto;
}
.page-header {
  margin-bottom: 2rem;
}
.header-main {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
}
.back-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  background-color: var(--branco);
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.back-button:hover {
  background-color: #f9fafb;
}
.title {
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0;
}
.subtitle {
  color: var(--cinza-texto);
  margin-top: 0.25rem;
}
.separator {
  height: 1px;
  background-color: #e5e7eb;
  margin-bottom: 2rem;
}
.form-content {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 2rem;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
}
/* .slide-next-enter-active, .slide-next-leave-active, .slide-prev-enter-active, .slide-prev-leave-active { transition: all 0.3s ease-in-out; } */
.slide-next-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-next-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-prev-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}
.slide-prev-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* 📱 INÍCIO DAS MUDANÇAS PARA RESPONSIVO 📱 */
@media (max-width: 768px) {
  .header-main {
    gap: 1rem; /* ✨ Aumentei o espaçamento */
    margin-bottom: 1.5rem;
    align-items: center; /* ✨ CORRIGIDO: Voltando para 'center' */
  }
  .back-button {
    width: 36px;
    height: 36px;
    flex-shrink: 0;
  }
  .title {
    font-size: 1.5rem; /* Título menor */
    line-height: 1.3;
  }
  .subtitle {
    font-size: 0.875rem; /* Subtítulo menor */
    line-height: 1.4;
  }

  .separator {
    margin-bottom: 1.5rem;
  }

  .form-content {
    padding: 1.5rem 1rem; /* Reduz o padding do card */
  }

  .form-actions {
    flex-direction: column-reverse; /* Empilha os botões */
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
}
</style>
