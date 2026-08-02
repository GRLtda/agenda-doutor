<script setup>
import { nextTick, ref, watch } from 'vue'
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
const isSubmitting = ref(false)
const errors = ref({})
const personalDataStepRef = ref(null)

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

const step1FieldOrder = ['name', 'email', 'cpf', 'phone', 'countryCode', 'birthDate', 'gender', 'referralSource']

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function isValidEmail(value) {
  if (!value) return true
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim())
}

function isValidCpf(value) {
  const cpf = onlyDigits(value)
  if (!cpf) return true
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i)
  let digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== Number(cpf[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i)
  digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  return digit === Number(cpf[10])
}

function isValidPhone(value, countryCode) {
  const digits = onlyDigits(value)
  if (!digits) return false
  return onlyDigits(countryCode) === '55' ? digits.length >= 10 : digits.length >= 6
}

function getStep1Errors() {
  const nextErrors = {}
  const data = patientData.value

  if (!data.name?.trim()) {
    nextErrors.name = 'O nome do paciente é obrigatório.'
  }

  if (!onlyDigits(data.countryCode)) {
    nextErrors.countryCode = 'Informe o DDI do telefone.'
  }

  if (!isValidPhone(data.phone, data.countryCode)) {
    nextErrors.phone = 'Informe um telefone válido.'
  }

  if (!data.gender) {
    nextErrors.gender = 'Selecione o gênero.'
  }

  if (data.email && !isValidEmail(data.email)) {
    nextErrors.email = 'Informe um e-mail válido.'
  }

  if (data.cpf && !isValidCpf(data.cpf)) {
    nextErrors.cpf = 'Informe um CPF válido.'
  }

  if (data.birthDate && Number.isNaN(new Date(data.birthDate).getTime())) {
    nextErrors.birthDate = 'Informe uma data válida.'
  }

  return nextErrors
}

function getFirstInvalidField(nextErrors) {
  return step1FieldOrder.find((field) => nextErrors[field])
}

async function focusFirstInvalidField(nextErrors) {
  await nextTick()
  const firstInvalidField = getFirstInvalidField(nextErrors)
  if (!firstInvalidField) return

  const focusTarget = firstInvalidField === 'countryCode' ? 'phone' : firstInvalidField
  personalDataStepRef.value?.focusField(focusTarget)
}

async function validateStep1({ focus = false } = {}) {
  const nextErrors = getStep1Errors()
  errors.value = nextErrors
  const hasErrors = Object.keys(nextErrors).length > 0

  if (focus && hasErrors) {
    await focusFirstInvalidField(nextErrors)
  }

  return !hasErrors
}

async function nextStep() {
  if (currentStep.value === 1) {
    if (await validateStep1({ focus: true })) {
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
  if (isSubmitting.value) return
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
      const errorMessage = error || 'Erro ao cadastrar paciente.'
      toast.error(errorMessage)
    }
  } catch (e) {
    toast.error('Ocorreu um erro inesperado. Tente novamente.')
  } finally {
    isSubmitting.value = false
  }
}

watch(
  patientData,
  () => {
    if (currentStep.value !== 1 || Object.keys(errors.value).length === 0) return

    const nextErrors = getStep1Errors()
    const activeErroredFields = Object.keys(errors.value)
    errors.value = activeErroredFields.reduce((acc, field) => {
      if (nextErrors[field]) acc[field] = nextErrors[field]
      return acc
    }, {})
  },
  { deep: true }
)
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
            ref="personalDataStepRef"
            v-model="patientData"
            :errors="errors"
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
        Salvar Paciente
      </AppButton>
    </footer>
  </div>
</template>

<style scoped>
.create-patient-view {
  margin: 0 auto;
  max-width: 900px;
}
.page-header {
  margin-bottom: 2rem;
}
.header-main {
  align-items: center;
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}
.back-button {
  align-items: center;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  height: 40px;
  justify-content: center;
  transition: background-color 0.2s ease;
  width: 40px;
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
  background-color: #e5e7eb;
  height: 1px;
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
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}
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
@media (max-width: 768px) {
  .header-main {
    align-items: center;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .back-button {
    flex-shrink: 0;
    height: 36px;
    width: 36px;
  }
  .title {
    font-size: 1.5rem;
    line-height: 1.3;
  }
  .subtitle {
    font-size: 0.875rem;
    line-height: 1.4;
  }
  .separator {
    margin-bottom: 1.5rem;
  }
  .form-content {
    padding: 1.5rem 1rem;
  }
  .form-actions {
    flex-direction: column-reverse;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
}
</style>
