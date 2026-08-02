<script setup>
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import PhoneInputWithDDI from '@/components/global/PhoneInputWithDDI.vue'
import { ref, onMounted } from 'vue'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import { Calendar } from 'lucide-vue-next'

const patientData = defineModel()
defineProps({
  errors: { type: Object, default: () => ({}) },
})

const showDDINotification = ref(false)
const fieldRefs = {
  name: ref(null),
  nickname: ref(null),
  email: ref(null),
  cpf: ref(null),
  phone: ref(null),
  birthDate: ref(null),
  gender: ref(null),
  referralSource: ref(null),
}

function formatSimpleDate(dateString) {
  if (!dateString) return ''
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

onMounted(() => {
  const expirationDate = new Date('2026-01-19')
  const now = new Date()

  if (now > expirationDate) return

  const hasSeen = localStorage.getItem('hasSeenDDIFeature')
  if (!hasSeen) {
    showDDINotification.value = true
  }
})

const closeNotification = () => {
  showDDINotification.value = false
  localStorage.setItem('hasSeenDDIFeature', 'true')
}

const genderOptions = [
  { value: 'Masculino', label: 'Masculino' },
  { value: 'Feminino', label: 'Feminino' },
  { value: 'Outro', label: 'Outro' },
]

const referralSourceOptions = [
  { value: 'Facebook', label: 'Facebook' },
  { value: 'Instagram', label: 'Instagram' },
  { value: 'Indicação de amigo', label: 'Indicação de amigo' },
  { value: 'Google', label: 'Google' },
  { value: 'Outros', label: 'Outros' },
]

function focusField(fieldName) {
  const field = fieldRefs[fieldName]?.value
  if (!field) return

  if (typeof field.focus === 'function') {
    field.focus()
    return
  }

  field.inputRef?.focus()
}

defineExpose({ focusField })
</script>

<template>
  <div class="step-content grid-2-cols">
    <FormInput
      :ref="fieldRefs.name"
      v-model="patientData.name"
      label="Nome Completo"
      placeholder="Nome do paciente"
      required
      :error="errors.name"
    />
    <FormInput
      :ref="fieldRefs.nickname"
      v-model="patientData.nickname"
      label="Apelido"
      placeholder="Como o paciente prefere ser chamado"
    />
    <FormInput
      :ref="fieldRefs.email"
      v-model="patientData.email"
      label="E-mail"
      placeholder="email@exemplo.com"
      type="email"
      :error="errors.email"
    />
    <FormInput
      :ref="fieldRefs.cpf"
      v-model="patientData.cpf"
      label="CPF"
      placeholder="000.000.000-00"
      cpf-mask
      :error="errors.cpf"
    />
    <div class="phone-input-wrapper">
      <PhoneInputWithDDI
        :ref="fieldRefs.phone"
        v-model="patientData.phone"
        v-model:countryCode="patientData.countryCode"
        label="Telefone"
        required
        :error="errors.phone || errors.countryCode"
      />

      <transition name="fade-slide">
        <div v-if="showDDINotification" class="ddi-notification-card">
          <button class="close-btn" @click="closeNotification">
            &times;
          </button>

          <div class="card-badge">
            Novo na v1.9
          </div>

          <h3 class="card-title">Conecte-se com o mundo</h3>

          <p class="card-description">
            Agora você pode cadastrar pacientes internacionais. Selecione o país clicando na bandeira ao lado.
          </p>

          <div class="card-footer">
            Detectamos automaticamente o país pelo DDI.
          </div>

          <div class="arrow-down"></div>
        </div>
      </transition>
    </div>

    <div class="form-group">
      <label class="form-label">Data de Nascimento</label>
      <VueDatePicker
        v-model="patientData.birthDate"
        locale="pt-BR"
        format="dd/MM/yyyy"
        auto-apply
        :enable-time-picker="false"
        :teleport="true"
        placeholder="dd/mm/aaaa"
        model-type="yyyy-MM-dd"
        :clearable="false"
      >
        <template #trigger>
          <button
            :ref="fieldRefs.birthDate"
            type="button"
            class="custom-date-trigger"
            :class="{ 'has-error': !!errors.birthDate }"
          >
            <span v-if="patientData.birthDate">{{ formatSimpleDate(patientData.birthDate) }}</span>
            <span v-else class="placeholder-text">dd/mm/aaaa</span>
            <Calendar :size="16" class="icon-slate" />
          </button>
        </template>
      </VueDatePicker>
      <Transition name="fade-error">
        <span v-if="errors.birthDate" class="error-message">{{ errors.birthDate }}</span>
      </Transition>
    </div>

    <StyledSelect
      :ref="fieldRefs.gender"
      v-model="patientData.gender"
      label="Gênero"
      :options="genderOptions"
      required
      :error="errors.gender"
    />
    <StyledSelect
      :ref="fieldRefs.referralSource"
      v-model="patientData.referralSource"
      label="Origem do paciente"
      :options="referralSourceOptions"
      placeholder="Selecione a origem"
      :error="errors.referralSource"
    />
  </div>
</template>

<style scoped>
.form-group {
  margin-bottom: 1.25rem;
  text-align: left;
}
.form-label {
  color: #374151;
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}
.custom-date-trigger {
  align-items: center;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  display: flex;
  font-size: 1rem;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  text-align: left;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  width: 100%;
}
.custom-date-trigger:hover {
  border-color: var(--azul-principal);
}
.custom-date-trigger:focus {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
  outline: none;
}
.custom-date-trigger.has-error {
  border-color: #ef4444;
}
.custom-date-trigger.has-error:focus {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}
.placeholder-text {
  color: #9ca3af;
}
.error-message {
  color: #ef4444;
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  margin-top: 0.375rem;
}

.step-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem 2rem;
  padding-bottom: 1.25rem;
}
@media (max-width: 768px) {
  .step-content {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
}

.phone-input-wrapper {
  position: relative;
}

.ddi-notification-card {
  background: #ffffff;
  border: 1px solid #e4e4e7;
  border-radius: 12px;
  bottom: calc(100% + 12px);
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  color: #18181b;
  left: 50%;
  padding: 20px 16px;
  position: absolute;
  text-align: center;
  transform: translateX(-50%);
  width: 280px;
  z-index: 1000;
}

.card-badge {
  background: #0ea5e9;
  border-radius: 20px;
  color: #fff;
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 12px;
  padding: 4px 10px;
}

.card-title {
  color: #18181b;
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.card-description {
  color: #52525b;
  font-size: 0.8rem;
  line-height: 1.4;
  margin: 0 0 12px 0;
}

.card-footer {
  border-top: 1px solid #f4f4f5;
  color: #71717a;
  font-size: 0.7rem;
  margin-top: 4px;
  padding-top: 8px;
}

.close-btn {
  background: none;
  border: none;
  color: #a1a1aa;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 0.5;
  padding: 4px;
  position: absolute;
  right: 10px;
  top: 8px;
  transition: color 0.2s;
}

.close-btn:hover {
  color: #52525b;
}

.arrow-down {
  border-left: 6px solid transparent;
  border-right: 6px solid transparent;
  border-top: 6px solid #ffffff;
  bottom: -6px;
  filter: drop-shadow(0 1px 0 #e4e4e7);
  height: 0;
  left: 50%;
  position: absolute;
  transform: translateX(-50%);
  width: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px) scale(0.95);
}

.fade-slide-enter-to,
.fade-slide-leave-from {
  opacity: 1;
  transform: translateX(-50%) translateY(0) scale(1);
}

.fade-error-enter-active,
.fade-error-leave-active {
  transition: all 0.2s ease;
}

.fade-error-enter-from,
.fade-error-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
