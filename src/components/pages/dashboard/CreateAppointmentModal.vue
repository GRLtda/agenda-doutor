<script setup>
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { usePatientsStore } from '@/stores/patients'
import { useAppointmentsStore } from '@/stores/appointments'
import { useClinicStore } from '@/stores/clinic'
import { useToast } from 'vue-toastification'
// ✨ 1. Importar o LoaderCircle e a nova função da API
import { User, Calendar, Bell, Plus, X, DoorClosed, Info, LoaderCircle } from 'lucide-vue-next'
import { checkConflict } from '@/api/appointments'
import {
  isToday,
  isFuture,
  parse,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
} from 'date-fns'

import Stepper from '@/components/pages/onboarding/Stepper.vue'
import SearchableSelect from '@/components/global/SearchableSelect.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import Switch from '@/components/global/Switch.vue'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const props = defineProps({
  initialData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'saved'])
const patientsStore = usePatientsStore()
const appointmentsStore = useAppointmentsStore()
const clinicStore = useClinicStore()
const toast = useToast()
const router = useRouter()

let debounceTimeout = null
const currentStep = ref(1)
const errors = ref({})

// ✨ 2. Novos estados para verificação de conflito
const conflictError = ref(null)
const isCheckingConflict = ref(false)
let conflictCheckDebounce = null

// 💡 NOVO ESTADO: Armazena os horários sugeridos
const suggestedTimes = ref([])

const isRescheduleMode = computed(() => {
  return !!props.initialData?.patient && props.initialData?._mode === 'reschedule'
})

// Modo "Remarcar" (Atualiza o agendamento existente)
const isRebookMode = computed(() => {
  return !!props.initialData?.patient && props.initialData?._mode === 'rebook'
})

// Estamos em qualquer modo de edição (Reagendar ou Remarcar)?
// Usado para pular a Etapa 1 e desabilitar o select de paciente.
const isEditMode = computed(() => {
  return isRescheduleMode.value || isRebookMode.value
})

// 💡 NOVO COMPUTED: Identifica se estamos em modo "Reagendamento"
const clinicWorkingHours = computed(() => {
  if (!clinicStore.currentClinic?.workingHours) {
    return {}
  }
  const dayMapping = {
    Segunda: 'monday',
    Terça: 'tuesday',
    Quarta: 'wednesday',
    Quinta: 'thursday',
    Sexta: 'friday',
    Sábado: 'saturday',
    Domingo: 'sunday',
  }
  return clinicStore.currentClinic.workingHours.reduce((acc, schedule) => {
    const dayKey = dayMapping[schedule.day]
    if (dayKey) {
      acc[dayKey] = schedule.isOpen ? { open: schedule.startTime, close: schedule.endTime } : null
    }
    return acc
  }, {})
})

const steps = [
  { name: 'Paciente', icon: User },
  { name: 'Horário', icon: Calendar },
  { name: 'Lembretes', icon: Bell },
]

const appointmentData = ref({
  patient: null,
  date: new Date(),
  startTime: null,
  endTime: null,
  sendReminder: true,
  remindersSent: {
    oneDayBefore: true,
    twoHoursBefore: true,
  },
})

onMounted(() => {
  if (props.initialData) {
    appointmentData.value.patient = props.initialData.patient?._id || props.initialData.patient

    if (isEditMode.value) {
      currentStep.value = 2
      appointmentData.value.date = new Date()
      appointmentData.value.startTime = null
      appointmentData.value.endTime = null
    }
    // ✨ CORREÇÃO: Lógica para clique em célula vazia do calendário
    else if (props.initialData.date && props.initialData.startTime) {
      const initialDate = new Date(props.initialData.date)
      appointmentData.value.date = initialDate

      // ✨ CORREÇÃO: Espera o DOM ser atualizado após a mudança da data
      nextTick(() => {
        if (timeOptions.value.some((opt) => opt.value === props.initialData.startTime)) {
          appointmentData.value.startTime = props.initialData.startTime
        }
      })
    }
  }
})

const patientOptions = computed(() => {
  return (patientsStore.searchResults || []).map((p) => ({ value: p._id, label: p.name }))
})

function isTimeInFuture(timeString, selectedDate) {
  const now = new Date()
  if (!isToday(selectedDate)) {
    return true // Se não for hoje, qualquer horário é futuro em relação a "agora"
  }
  const [hours, minutes] = timeString.split(':').map(Number)
  const timeToCheck = setMilliseconds(
    setSeconds(setMinutes(setHours(selectedDate, hours), minutes), 0),
    0,
  )
  return timeToCheck > now
}

const timeOptions = computed(() => {
  const selectedDate = appointmentData.value.date // ✨ Data selecionada
  const selectedDay = getDayOfWeek(selectedDate)
  const workingHours = clinicWorkingHours.value[selectedDay]
  const allowOutside = clinicStore.currentClinic?.allowAppointmentsOutsideWorkingHours

  const options = []
  const interval = 15 // 15 minutos

  let startTime = 0 // 00:00
  let endTime = 24 * 60 // 24:00

  if (!allowOutside) {
    if (!workingHours) return [] // Dia fechado e não permite fora do horário
    const [startH, startM] = workingHours.open.split(':').map(Number)
    const [endH, endM] = workingHours.close.split(':').map(Number)
    startTime = startH * 60 + startM
    endTime = endH * 60 + endM
  }

  for (let i = startTime; i < endTime; i += interval) {
    const hours = Math.floor(i / 60)
    const minutes = i % 60
    const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`

    // ✨ VERIFICA SE O HORÁRIO É FUTURO APENAS SE FOR HOJE ✨
    if (isTimeInFuture(timeStr, selectedDate)) {
      options.push({ value: timeStr, label: timeStr })
    }
  }

  return options
})

const isOutsideWorkingHours = computed(() => {
  if (
    !appointmentData.value.startTime ||
    !clinicStore.currentClinic?.allowAppointmentsOutsideWorkingHours
  ) {
    return false
  }
  const selectedDay = getDayOfWeek(appointmentData.value.date)
  const workingHours = clinicWorkingHours.value[selectedDay]

  if (!workingHours) {
    return true // The whole day is outside working hours
  }

  return (
    appointmentData.value.startTime < workingHours.open ||
    appointmentData.value.startTime >= workingHours.close
  )
})

const noTimeSlotsAvailable = computed(() => {
  const selectedDay = getDayOfWeek(appointmentData.value.date)
  const workingHours = clinicWorkingHours.value[selectedDay]
  const allowOutside = clinicStore.currentClinic?.allowAppointmentsOutsideWorkingHours
  const shouldHaveTimes = allowOutside || (workingHours && workingHours.open && workingHours.close)

  return shouldHaveTimes && timeOptions.value.length === 0
})

const endTimeOptions = computed(() => {
  if (!appointmentData.value.startTime) return []
  return timeOptions.value.filter((option) => option.value > appointmentData.value.startTime)
})

function getDayOfWeek(date) {
  const dayIndex = new Date(date).getDay()
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  return days[dayIndex]
}

function handlePatientSearch(query) {
  clearTimeout(debounceTimeout)
  debounceTimeout = setTimeout(() => {
    patientsStore.searchPatients(query)
  }, 300)
}

function goToCreatePatient() {
  emit('close')
  router.push('/app/pacientes/novo')
}

// ✨ 3. Função para formatar data para ISO (necessária para a API)
function getISOString(date, timeString) {
  const [hour, minute] = timeString.split(':').map(Number)
  const baseDate = new Date(date)
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const day = baseDate.getDate()
  // Usa o fuso horário local para montar a data
  return new Date(year, month, day, hour, minute).toISOString()
}

// 💡 NOVA FUNÇÃO: Encontra os próximos horários disponíveis
function findNextAvailableTimes(conflictingTime) {
  const allTimes = timeOptions.value
  const conflictIndex = allTimes.findIndex((t) => t.value === conflictingTime)

  if (conflictIndex === -1) {
    suggestedTimes.value = []
    return
  }

  // Sugere os próximos 3 horários após o horário conflitante
  suggestedTimes.value = allTimes.slice(conflictIndex + 1, conflictIndex + 4)
}

// 💡 NOVA FUNÇÃO: Define o horário ao clicar na sugestão
function handleSuggestionClick(timeValue) {
  // Define o novo horário de início
  appointmentData.value.startTime = timeValue

  // Limpa as sugestões e o erro de conflito
  suggestedTimes.value = []
  conflictError.value = null
  if (errors.value.time) errors.value.time = null

  // Recalcula o horário de término (baseado na lógica existente no watcher)
  const [hour, minute] = timeValue.split(':').map(Number)
  const baseDate = new Date(appointmentData.value.date)
  baseDate.setHours(hour, minute, 0, 0)
  baseDate.setMinutes(baseDate.getMinutes() + 30) // Adiciona 30 minutos

  const endHour = String(baseDate.getHours()).padStart(2, '0')
  const endMinute = String(baseDate.getMinutes()).padStart(2, '0')
  const endTime = `${endHour}:${endMinute}`

  // Define o horário de término
  if (endTimeOptions.value.some((opt) => opt.value === endTime)) {
    appointmentData.value.endTime = endTime
  } else {
    appointmentData.value.endTime = null
  }

  // O watcher do 'endTime' será acionado automaticamente e chamará a verificação de conflito
}

// ✨ 4. Nova função para checar conflitos
async function checkAppointmentConflict() {
  // Só executa se todos os dados estiverem presentes
  if (
    !appointmentData.value.patient ||
    !appointmentData.value.date ||
    !appointmentData.value.startTime ||
    !appointmentData.value.endTime
  ) {
    return
  }

  isCheckingConflict.value = true
  conflictError.value = null
  suggestedTimes.value = [] // 💡 Limpa sugestões antigas
  // Limpa erro de "horário inválido" para dar lugar à verificação
  if (errors.value.time) errors.value.time = null

  // Debounce para evitar chamadas excessivas enquanto o usuário está digitando/clicando
  clearTimeout(conflictCheckDebounce)
  conflictCheckDebounce = setTimeout(async () => {
    try {
      const startTimeISO = getISOString(appointmentData.value.date, appointmentData.value.startTime)
      const endTimeISO = getISOString(appointmentData.value.date, appointmentData.value.endTime)

      const response = await checkConflict(appointmentData.value.patient, startTimeISO, endTimeISO)

      if (response.data.conflict) {
        conflictError.value = response.data.message
        errors.value.time = response.data.message // Para destacar os campos
        findNextAvailableTimes(appointmentData.value.startTime) // 💡 Chama as sugestões
      } else {
        conflictError.value = null
        suggestedTimes.value = [] // 💡 Limpa sugestões se não houver conflito
        if (
          errors.value.time &&
          (errors.value.time.includes('conflito') || errors.value.time.includes('existe'))
        ) {
          errors.value.time = null
        }
      }
    } catch (error) {
      console.error('Erro ao verificar conflito:', error)
      conflictError.value = 'Erro ao verificar disponibilidade.'
      errors.value.time = 'Erro ao verificar disponibilidade.'
    } finally {
      isCheckingConflict.value = false
    }
  }, 500) // 500ms de debounce
}

// ✨ 5. Watchers atualizados
watch(
  () => appointmentData.value.date,
  () => {
    appointmentData.value.startTime = null
    appointmentData.value.endTime = null
    conflictError.value = null // Limpa erro ao trocar de data
    errors.value.time = null
    suggestedTimes.value = [] // 💡 Limpa sugestões
  },
)

watch(
  () => appointmentData.value.startTime,
  (newStartTime) => {
    suggestedTimes.value = [] // 💡 Limpa sugestões ao trocar o início
    if (newStartTime) {
      const [hour, minute] = newStartTime.split(':').map(Number)
      // Usamos a data selecionada como base, não a data atual!
      const baseDate = new Date(appointmentData.value.date)
      baseDate.setHours(hour, minute, 0, 0) // Define hora e minuto na data selecionada
      baseDate.setMinutes(baseDate.getMinutes() + 30) // Adiciona 30 minutos

      const endHour = String(baseDate.getHours()).padStart(2, '0')
      const endMinute = String(baseDate.getMinutes()).padStart(2, '0')
      const endTime = `${endHour}:${endMinute}`

      if (endTimeOptions.value.some((opt) => opt.value === endTime)) {
        appointmentData.value.endTime = endTime
      } else {
        appointmentData.value.endTime = null
      }
    } else {
      appointmentData.value.endTime = null // Limpa o endTime se o startTime for limpo
    }
    // A verificação de conflito será chamada pelo watcher de endTime
  },
)

// ✨ 6. Novo Watcher para acionar a verificação de conflito
watch(
  [
    () => appointmentData.value.patient,
    () => appointmentData.value.date,
    () => appointmentData.value.endTime, // Aciona quando o endTime é definido
  ],
  () => {
    // Limpa erros anteriores e inicia a verificação
    conflictError.value = null
    if (
      errors.value.time &&
      (errors.value.time.includes('conflito') || errors.value.time.includes('existe'))
    ) {
      errors.value.time = null
    }
    checkAppointmentConflict()
  },
  { deep: true }, // Necessário para a data
)

// ✨ 7. Função de validação atualizada
function validateStep() {
  errors.value = {}
  if (currentStep.value === 1 && !appointmentData.value.patient) {
    errors.value.patient = 'Por favor, selecione um paciente para continuar.'
    return false
  }
  if (
    currentStep.value === 2 &&
    (!appointmentData.value.startTime || !appointmentData.value.endTime)
  ) {
    errors.value.time = 'Selecione um horário de início e fim.'
    return false
  }

  // ✨ Nova verificação de conflito e carregamento
  if (isCheckingConflict.value) {
    errors.value.time = 'Verificando disponibilidade...'
    return false
  }
  if (conflictError.value) {
    errors.value.time = conflictError.value
    return false
  }

  return true
}

function nextStep() {
  if (validateStep()) {
    if (currentStep.value < steps.length) {
      currentStep.value++
    }
  }
}

async function handleSubmit() {
  if (!validateStep()) return

  // Pega data e hora da UI
  const [startHour, startMinute] = appointmentData.value.startTime.split(':').map(Number)
  const [endHour, endMinute] = appointmentData.value.endTime.split(':').map(Number)
  const baseDate = new Date(appointmentData.value.date)
  const year = baseDate.getFullYear()
  const month = baseDate.getMonth()
  const day = baseDate.getDate()
  const startTime = new Date(year, month, day, startHour, startMinute)
  const endTime = new Date(year, month, day, endHour, endMinute)

  // Decide se vai ATUALIZAR (Remarcar) ou CRIAR (Novo/Reagendar)
  if (isRebookMode.value) {
    // --- MODO REMARCAR (UPDATE) ---
    const appointmentId = props.initialData?._id
    if (!appointmentId) {
      toast.error('Erro: ID do agendamento original não encontrado para remarcação.')
      return
    }

    const payload = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      sendReminder: appointmentData.value.sendReminder,
      reminderEnabled: appointmentData.value.remindersSent,
    }

    // Chama a nova ação 'rescheduleAppointment' da store
    const { success } = await appointmentsStore.rescheduleAppointment(appointmentId, payload)
    if (success) {
      toast.success('Agendamento remarcado com sucesso!')
      emit('saved')
      emit('close')
    } else {
      toast.error('Erro ao remarcar o agendamento.')
    }
  } else {
    // --- MODO CRIAR (NOVO/REAGENDAR) ---
    const payload = {
      patient: appointmentData.value.patient,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      sendReminder: appointmentData.value.sendReminder,
      isReturn: isRescheduleMode.value,
      // 👇 CORREÇÃO: Adicionando o objeto 'reminderEnabled' ao payload
      reminderEnabled: appointmentData.value.remindersSent,
    }

    const { success } = await appointmentsStore.createAppointment(payload)
    if (success) {
      toast.success(
        isRescheduleMode.value
          ? 'Agendamento reagendado com sucesso!'
          : 'Agendamento criado com sucesso!',
      )
      emit('saved')
      emit('close')
    } else {
      toast.error(isRescheduleMode.value ? 'Erro ao reagendar.' : 'Erro ao criar agendamento.')
    }
  }
}
</script>

<template>
  <SideDrawer @close="$emit('close')">
    <template #header>
      <header class="drawer-header">
        <div class="header-top">
          <div class="header-left">
            <h2>
              {{
                isRebookMode
                  ? 'Reagendar Horário'
                  : isRescheduleMode
                    ? 'Agendar Retorno'
                    : 'Novo Agendamento'
              }}
            </h2>
            <p>
              {{
                isRebookMode
                  ? 'Escolha o novo horário para o agendamento existente.'
                  : isRescheduleMode
                    ? 'Escolha uma nova data e horário para o paciente.'
                    : 'Preencha os dados para criar um novo atendimento.'
              }}
            </p>
          </div>
          <button @click="$emit('close')" class="mobile-close-btn">
            <X :size="24" />
          </button>
        </div>
        <Stepper :steps="steps" :currentStep="currentStep" class="stepper-component" />
      </header>
    </template>

    <template #default>
      <div v-auto-animate class="flex-1 flex flex-col">
        <div v-if="currentStep === 1" class="step-content">
          <SearchableSelect
            v-model="appointmentData.patient"
            :options="patientOptions"
            label="Quem é o paciente? *"
            :loading="patientsStore.isLoading"
            @search="handlePatientSearch"
            :error="!!errors.patient"
            placeholder="Digite para buscar um paciente"
            :disabled="isEditMode"
          />
          <p v-if="errors.patient" class="error-message">{{ errors.patient }}</p>

          <template v-if="!isEditMode">
            <div class="divider">
              <span>OU</span>
            </div>
            <AppButton variant="default" @click="goToCreatePatient" class="w-full">
              <Plus :size="16" />
              Cadastrar novo paciente
            </AppButton>
          </template>
        </div>

        <div v-if="currentStep === 2" class="step-content">
          <div class="form-group">
            <label class="form-label">Data do Atendimento</label>
            <Datepicker
              v-model="appointmentData.date"
              locale="pt-BR"
              format="dd/MM/yyyy"
              :enable-time-picker="false"
              auto-apply
              :teleport="true"
              placeholder="Selecione a data"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Horário</label>
            <div v-if="!noTimeSlotsAvailable && timeOptions.length > 0" class="time-inputs">
              <StyledSelect
                v-model="appointmentData.startTime"
                :options="timeOptions"
                placeholder="Início"
                class="time-select"
                :error="!!errors.time || !!conflictError"
              />
              <span>às</span>
              <StyledSelect
                v-model="appointmentData.endTime"
                :options="endTimeOptions"
                placeholder="Fim"
                :disabled="!appointmentData.startTime"
                class="time-select"
                :error="!!errors.time || !!conflictError"
              />
              <LoaderCircle v-if="isCheckingConflict" :size="18" class="spinner" />
            </div>
            <div v-else-if="noTimeSlotsAvailable" class="warning-message">
              <Info :size="16" /> Sem horários disponíveis para este dia após o horário atual.
            </div>
            <div v-else class="closed-message">
              <DoorClosed :size="16" /> Clínica fechada neste dia.
            </div>
            <div v-if="isOutsideWorkingHours && !conflictError" class="warning-message">
              <Info :size="16" />
              Atenção: O horário selecionado está fora do expediente da clínica.
            </div>
            <p v-if="errors.time || conflictError" class="error-message">
              {{ conflictError || errors.time }}
            </p>

            <div v-if="suggestedTimes.length > 0" class="suggestions-wrapper">
              <p class="suggestions-title">Horários alternativos sugeridos:</p>
              <div class="suggestions-list">
                <button
                  v-for="time in suggestedTimes"
                  :key="time.value"
                  @click="handleSuggestionClick(time.value)"
                  type="button"
                  class="suggestion-chip"
                >
                  {{ time.label }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentStep === 3" class="step-content">
          <div class="reminders-card">
            <h3 class="card-title"><Bell :size="18" /> Lembretes Automáticos</h3>
            <div class="reminders-content">
              <Switch
                v-model="appointmentData.sendReminder"
                label="Ativar envio de lembretes automáticos via WhatsApp"
              />
              <div
                class="reminder-options"
                :class="{ 'is-disabled': !appointmentData.sendReminder }"
              >
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="appointmentData.remindersSent.oneDayBefore"
                    :disabled="!appointmentData.sendReminder"
                  />
                  <span>Enviar 1 dia antes</span>
                </label>
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    v-model="appointmentData.remindersSent.twoHoursBefore"
                    :disabled="!appointmentData.sendReminder"
                  />
                  <span>Enviar 2 horas antes</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <footer class="drawer-footer">
        <AppButton @click="$emit('close')" variant="default">Cancelar</AppButton>
        <div class="footer-actions">
          <AppButton
            v-if="currentStep === 3 || (currentStep === 2 && !isEditMode)"
            @click="currentStep--"
            variant="default"
          >
            Voltar
          </AppButton>
          <AppButton
            v-if="currentStep < steps.length"
            @click="nextStep"
            variant="primary"
            :disabled="isCheckingConflict"
          >
            Avançar
          </AppButton>
          <AppButton
            v-else
            @click="handleSubmit"
            variant="primary"
            :loading="appointmentsStore.isLoading"
            :disabled="appointmentsStore.isLoading"
          >
            {{
              isRebookMode
                ? 'Confirmar Remarcação'
                : isRescheduleMode
                  ? 'Confirmar Reagendamento'
                  : 'Confirmar'
            }}
          </AppButton>
        </div>
      </footer>
    </template>
  </SideDrawer>
</template>

<style scoped>
/* Header */
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Footer */
.drawer-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  background-color: #f9fafb;
}

.footer-actions {
  display: flex;
  gap: 1rem;
}

/* Mobile Close Button */
.mobile-close-btn {
  display: none;
  background: transparent;
  border: none;
  color: #6b7280;
  padding: 0.25rem;
  cursor: pointer;
  border-radius: 0.375rem;
  transition: background-color 0.2s;
}

.mobile-close-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

/* --- Estilos Internos (Mantidos) --- */
.step-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.form-group {
  text-align: left;
}
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.875rem;
  color: #374151;
}
.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
  text-align: left;
}
.time-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.time-inputs span {
  color: var(--cinza-texto);
}
.time-inputs .time-select {
  flex-grow: 1;
}

.spinner {
  color: var(--azul-principal);
  animation: spin 1s linear infinite;
  margin-left: 0.5rem;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

:deep(.time-select .select-button.has-error) {
  border-color: #ef4444 !important;
  background-color: #fef2f2;
}

.divider {
  text-align: center;
  margin: 0.5rem 0;
  color: var(--cinza-texto);
  font-size: 0.875rem;
  font-weight: 500;
  display: flex;
  align-items: center;
}
.divider::before,
.divider::after {
  content: '';
  flex-grow: 1;
  height: 1px;
  background-color: #e5e7eb;
}
.divider span {
  padding: 0 1rem;
}

.closed-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  padding: 0.75rem;
  border-radius: 0.5rem;
  text-align: center;
  font-size: 0.875rem;
}

.warning-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: #fefce8;
  color: #a16207;
  border: 1px solid #fde68a;
  padding: 0.75rem;
  border-radius: 0.5rem;
  text-align: left;
  font-size: 0.875rem;
  margin-top: 1rem;
}

.reminders-card {
  background-color: #f9fafb;
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
}
.reminders-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 1.5rem;
}
.reminder-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: opacity 0.3s ease-in-out;
  padding-left: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.9rem;
  color: #374151;
  cursor: pointer;
}

.reminder-options.is-disabled {
  opacity: 0.5;
}
.reminder-options.is-disabled .checkbox-label {
  cursor: not-allowed;
  color: #9ca3af;
}

.checkbox-label input[type='checkbox'] {
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 0.4rem;
  border: 2px solid #d1d5db;
  background: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;
  accent-color: var(--azul-principal);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  position: relative;
  appearance: none;
  display: inline-block;
  vertical-align: middle;
}

.checkbox-label input[type='checkbox']:checked {
  border-color: var(--azul-principal);
  background: var(--azul-principal);
  box-shadow: 0 2px 6px rgba(30, 64, 175, 0.08);
}

.checkbox-label input[type='checkbox']:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 2px #bfdbfe;
}

.checkbox-label input[type='checkbox']:checked::after {
  content: '';
  position: absolute;
  left: 0.45rem;
  width: 0.35rem;
  height: 0.7rem;
  border: solid #fff;
  border-width: 0 0.18rem 0.18rem 0;
  transform: rotate(45deg);
  display: block;
}

/* Sugestões */
.suggestions-wrapper {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f9fafb;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}
.suggestions-title {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  margin: 0 0 0.75rem 0;
  text-align: left;
}
.suggestions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.suggestion-chip {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  background-color: var(--branco);
  border: 1px solid #d1d5db;
  border-radius: 99px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.suggestion-chip:hover {
  background-color: #eef2ff;
  border-color: var(--azul-principal);
  color: var(--azul-principal);
}

@media (max-width: 768px) {
  .close-btn-outside {
    display: none;
  }

  .mobile-close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .drawer-content {
    max-width: 100%;
  }

  .drawer-footer {
    padding: 1rem;
    flex-direction: column-reverse;
    gap: 0.75rem;
  }
  .footer-actions {
    width: 100%;
    flex-direction: column;
  }
  .footer-actions .app-button {
    width: 100%;
    justify-content: center;
  }
  .drawer-footer > .app-button:first-child {
    width: 100%;
    justify-content: center;
  }
  
  .drawer-header {
    padding: 1rem;
  }
  .drawer-body {
    padding: 1rem;
  }
}
</style>
