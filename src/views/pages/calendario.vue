<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import { useAppointmentsStore } from '@/stores/appointments'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { Clock, ChevronLeft, ChevronRight, ArrowRight, LoaderCircle } from 'lucide-vue-next'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
import AppointmentDetailsModal from '@/components/pages/dashboard/AppointmentDetailsModal.vue'
import VueCal from 'vue-cal'
import 'vue-cal/dist/vuecal.css'
import {
  startOfWeek,
  endOfWeek,
  format,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from 'vue-toastification'

const appointmentsStore = useAppointmentsStore()
const authStore = useAuthStore()
const router = useRouter()
const toast = useToast()

const isModalOpen = ref(false)
const isDetailsModalOpen = ref(false)
const selectedEventForDetails = ref(null)
const initialAppointmentData = ref(null)
const selectedDate = ref(new Date())
const currentTime = ref(new Date())
const vueCalRef = ref(null)
let timer = null
const calendarView = ref('week')
const isMobile = ref(window.innerWidth <= 768)
const isInitialLoad = ref(true)

const weekAppointments = computed(() => appointmentsStore.appointments)

const weekStart = computed(() => startOfWeek(selectedDate.value, { weekStartsOn: 1 }))
const weekEnd = computed(() => endOfWeek(selectedDate.value, { weekStartsOn: 1 }))

// --- ✨ LÓGICA DE HORÁRIO DO CALENDÁRIO ATUALIZADA ✨ ---

// Helper para converter "HH:mm" para minutos (mais robusto)
const timeToMinutes = (timeStr) => {
  if (!timeStr || !timeStr.includes(':')) return null
  const [hours, minutes] = timeStr.split(':').map(Number)
  if (isNaN(hours) || isNaN(minutes)) return null
  return hours * 60 + minutes
}

// ✨ NOVO HELPER: Converter minutos para "HH:mm"
const minutesToTime = (totalMinutes) => {
  if (isNaN(totalMinutes) || totalMinutes === Infinity || totalMinutes === -Infinity) {
    return '00:00'
  }
  const hours = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, '0')
  const minutes = (totalMinutes % 60).toString().padStart(2, '0')
  return `${hours}:${minutes}`
}

// Calcula o iní­cio e fim da exibição do calendário (atualizado)
const calendarTimeRange = computed(() => {
  const defaultRange = { from: 0 * 60, to: 24 * 60 } // Padrão: 00:00 - 24:00
  const clinic = authStore.user?.clinic

  if (!clinic || clinic.allowAppointmentsOutsideWorkingHours === true) {
    return defaultRange
  }

  const workingHours = clinic.workingHours
  if (!workingHours || !Array.isArray(workingHours) || workingHours.length === 0) {
    return defaultRange
  }

  const openDays = workingHours.filter((day) => day.isOpen && day.startTime && day.endTime)

  if (openDays.length === 0) {
    return defaultRange
  }

  try {
    // Mapeia horários, filtrando nulos/inválidos
    const startTimes = openDays
      .map((day) => timeToMinutes(day.startTime))
      .filter((t) => t !== null)
    const endTimes = openDays
      .map((day) => timeToMinutes(day.endTime))
      .filter((t) => t !== null)

    if (startTimes.length === 0 || endTimes.length === 0) {
      return defaultRange
    }

    const minStart = Math.min(...startTimes)
    const maxEnd = Math.max(...endTimes)

    if (minStart === Infinity || maxEnd === -Infinity) {
      return defaultRange
    }

    return { from: minStart, to: maxEnd }
  } catch (error) {
    console.error('Erro ao calcular o intervalo de tempo do calendário:', error)
    return defaultRange
  }
})

const closedTimeEvents = computed(() => {
  const clinic = authStore.user?.clinic
  if (!clinic || clinic.allowAppointmentsOutsideWorkingHours) {
    return []
  }

  const workingHours = clinic.workingHours
  if (!workingHours || !Array.isArray(workingHours)) {
    return []
  }

  const { from: globalMinStart, to: globalMaxEnd } = calendarTimeRange.value
  // Se o range já é 24h (ou padrão), não faz sentido bloquear
  if (globalMinStart === 0 && globalMaxEnd === 24 * 60) {
    return []
  }

  const events = []
  const weekStartDate = weekStart.value // Começa na Segunda (weekStartsOn: 1)
  // Mapeia os dias da semana baseado na ordem do weekStart (iniciando em Segunda)
  const dayMapping = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(weekStartDate, i)
    const dayName = dayMapping[i] // 'Segunda' para i=0, 'Domingo' para i=6
    const dateString = format(currentDate, 'yyyy-MM-dd')

    const dayConfig = workingHours.find((wh) => wh.day === dayName)

    if (!dayConfig || !dayConfig.isOpen) {
      events.push({
        _id: `closed-${dateString}-full`,
        start: `${dateString} ${minutesToTime(globalMinStart)}`,
        end: `${dateString} ${minutesToTime(globalMaxEnd)}`,
        class: 'clinic-closed-event',
      })
      continue // Próximo dia
    }

    // Caso 2: Dia "Aberto", verificar gaps
    const dayStartMinutes = timeToMinutes(dayConfig.startTime)
    const dayEndMinutes = timeToMinutes(dayConfig.endTime)

    if (dayStartMinutes === null || dayEndMinutes === null) {
      events.push({
        _id: `closed-${dateString}-invalid`,
        start: `${dateString} ${minutesToTime(globalMinStart)}`,
        end: `${dateString} ${minutesToTime(globalMaxEnd)}`,
        class: 'clinic-closed-event',
      })
      continue
    }

    // Gap antes de abrir
    if (dayStartMinutes > globalMinStart) {
      events.push({
        _id: `closed-${dateString}-before`,
        start: `${dateString} ${minutesToTime(globalMinStart)}`,
        end: `${dateString} ${minutesToTime(dayStartMinutes)}`,
        class: 'clinic-closed-event',
      })
    }

    // Gap depois de fechar
    if (dayEndMinutes < globalMaxEnd) {
      events.push({
        _id: `closed-${dateString}-after`,
        start: `${dateString} ${minutesToTime(dayEndMinutes)}`,
        end: `${dateString} ${minutesToTime(globalMaxEnd)}`,
        class: 'clinic-closed-event',
      })
    }
  }

  return events
})

// --- ✨ [FIM DAS MUDANÇAS] ✨ ---

const calendarHeader = computed(() => {
  if (calendarView.value === 'day') {
    // 💡 ALTERAÇÃO AQUI: Formato curto (DD/MM/AA) para mobile
    if (isMobile.value) {
      return format(selectedDate.value, 'dd/MM/yy')
    }
    // Formato longo para desktop em vista 'day'
    return format(selectedDate.value, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  }

  const startMonth = format(weekStart.value, 'MMMM', { locale: ptBR })
  const endMonth = format(weekEnd.value, 'MMMM', { locale: ptBR })
  const year = format(weekStart.value, 'yyyy')

  if (startMonth === endMonth) {
    return `${format(weekStart.value, 'dd')} - ${format(
      weekEnd.value,
      'dd',
    )} de ${startMonth} de ${year}`
  }
  return `${format(weekStart.value, "dd 'de' MMMM")} - ${format(
    weekEnd.value,
    "dd 'de' MMMM 'de' yyyy",
  )}`
})

const getAbbreviatedDay = (fullDay) => {
  const dayName = fullDay.split(' ')[0]
  if (dayName.toLowerCase() === 'sábado') return 'SÁB'
  return dayName.substring(0, 3).toUpperCase()
}

function handleCalendarReady() {
  // console.log('VueCal @ready event fired.')
  isInitialLoad.value = false
}

async function fetchDataForView() {
  let startDate, endDate
  if (calendarView.value === 'day') {
    startDate = format(startOfDay(selectedDate.value), 'yyyy-MM-dd')
    endDate = format(endOfDay(selectedDate.value), 'yyyy-MM-dd')
  } else {
    startDate = format(weekStart.value, 'yyyy-MM-dd')
    endDate = format(endOfWeek(selectedDate.value), 'yyyy-MM-dd')
  }
  await appointmentsStore.fetchAppointmentsByDate(startDate, endDate)
}

function handleEditAction(eventData) {
  // console.log('DEBUG (inicio.vue): handleEditAction chamado com modo:', eventData._mode)
  initialAppointmentData.value = eventData

  // console.log(
  //   'DEBUG (inicio.vue): Dados definidos para o CreateAppointmentModal:',
  //   initialAppointmentData.value,
  // )

  isModalOpen.value = true
}

function goToPrevious() {
  const daysToSubtract = calendarView.value === 'day' ? 1 : 7
  selectedDate.value = subDays(selectedDate.value, daysToSubtract)
  fetchDataForView()
}

function goToToday() {
  selectedDate.value = new Date()
  fetchDataForView()
}

function goToNext() {
  const daysToAdd = calendarView.value === 'day' ? 1 : 7
  selectedDate.value = addDays(selectedDate.value, daysToAdd)
  fetchDataForView()
}

const updateCalendarView = () => {
  const isNowMobile = window.innerWidth <= 768
  isMobile.value = isNowMobile
  const newView = isNowMobile ? 'day' : 'week'

  if (calendarView.value !== newView) {
    calendarView.value = newView
    fetchDataForView()
  }
}

function handleDayHeaderClick(date) {
  if (calendarView.value === 'week' && !isMobile.value) {
    selectedDate.value = date
    calendarView.value = 'day'
  }
}

function backToWeekView() {
  if (!isMobile.value) {
    calendarView.value = 'week'
  }
}

onMounted(async () => {
  updateCalendarView()
  await fetchDataForView()
  window.addEventListener('resize', updateCalendarView)
  timer = setInterval(() => {
    currentTime.value = new Date()
  }, 1000)
})

onUnmounted(() => {
  clearInterval(timer)
  window.removeEventListener('resize', updateCalendarView)
})

function formatToVueCalString(dateString) {
  if (!dateString) return ''
  const d = new Date(dateString)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

const formattedEvents = computed(() => {
  if (!Array.isArray(weekAppointments.value)) return []
  return weekAppointments.value.map((appt) => {
    const startTime = new Date(appt.startTime)
    const endTime = new Date(appt.endTime)
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // duração em minutos

    const status = appt.status.toLowerCase().replace(/ /g, '-')

    return {
      start: formatToVueCalString(appt.startTime),
      end: formatToVueCalString(appt.endTime),
      title: appt.patient.name,
      class: `clinic-event status--${status}`,
      originalEvent: appt,
      duration: duration,
      status: status,
    }
  })
})

const allCalendarEvents = computed(() => {
  return [...formattedEvents.value, ...closedTimeEvents.value]
})

// --- ✨ LÓGICA DE NAVEGAÇÃO ENTRE AGENDAMENTOS ✨ ---
const sortedCalendarEvents = computed(() => {
  if (!formattedEvents.value) return []
  return [...formattedEvents.value].sort((a, b) => {
    if (a.start < b.start) return -1
    if (a.start > b.start) return 1
    return 0
  })
})

const currentAppointmentIndex = computed(() => {
  if (!selectedEventForDetails.value || !sortedCalendarEvents.value.length) return -1
  
  const currentId = selectedEventForDetails.value.originalEvent?._id
  if (!currentId) return -1
  
  return sortedCalendarEvents.value.findIndex(e => e.originalEvent._id === currentId)
})

const totalAppointmentsCount = computed(() => sortedCalendarEvents.value.length)

const hasPreviousAppointment = computed(() => currentAppointmentIndex.value > 0)
const hasNextAppointment = computed(() => currentAppointmentIndex.value !== -1 && currentAppointmentIndex.value < totalAppointmentsCount.value - 1)

function handlePreviousAppointment() {
  if (hasPreviousAppointment.value) {
    selectedEventForDetails.value = sortedCalendarEvents.value[currentAppointmentIndex.value - 1]
  }
}

function handleNextAppointment() {
  if (hasNextAppointment.value) {
    selectedEventForDetails.value = sortedCalendarEvents.value[currentAppointmentIndex.value + 1]
  }
}

function formatTime(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ✨ CORREÇÃO: Função ajustada para enviar os dados corretos ao modal
function handleCellClick(date) {
  const now = new Date()
  if (date < now) {
    return
  }
  initialAppointmentData.value = {
    // O modal espera 'date' e 'startTime'
    date: date,
    startTime: format(date, 'HH:mm'),
  }
  isModalOpen.value = true
}

function handleEventClick(event, e) {
  // Prevent propagation if needed, though vue-cal usually handles this
  if (e && e.stopPropagation) e.stopPropagation()

  if (event.class && event.class.includes('clinic-closed-event')) {
    return
  }
  
  console.log('DEBUG: Event clicked', event)
  selectedEventForDetails.value = event
  
  // Ensure modal opens after state update
  nextTick(() => {
    isDetailsModalOpen.value = true
  })
}

// Removed redundant onEventClick function as it was identical/unused


function closeModal() {
  isModalOpen.value = false
  initialAppointmentData.value = null
}

function handleAppointmentSaved() {
  fetchDataForView()
  closeModal()
}

function closeDetailsModal() {
  isDetailsModalOpen.value = false
  fetchDataForView()
}

function handleReschedule(appointmentToReschedule) {
  // ✨ DEBUG 3: Ver o que o handleReschedule recebeu
  // console.log('DEBUG (inicio.vue): handleReschedule foi chamado.')
  // console.log(
  //   'DEBUG (inicio.vue): Recebido (deve ser o objeto do agendamento):',
  //   appointmentToReschedule,
  // )

  // A 'appointmentToReschedule' JÁ É o originalEvent (o agendamento em si)
  // ✨ A verificação de BUG estava aqui.
  if (!appointmentToReschedule) {
    console.error('DEBUG (inicio.vue): Erro! O objeto do agendamento é nulo ou indefinido.')
    toast.error('Erro ao carregar dados do agendamento.')
    closeDetailsModal()
    return
  }

  // 1. Define os dados iniciais para o modo "Reagendar" (Update)
  const patientData = appointmentToReschedule.patient
  const patientId = typeof patientData === 'object' ? patientData._id : patientData

  if (!patientId) {
    toast.error('Não foi possível identificar o paciente para o reagendamento.')
    closeDetailsModal()
    return
  }

  initialAppointmentData.value = {
    patient: patientId,
    _id: appointmentToReschedule._id, // ID do agendamento para update
    _mode: 'rebook', // Modo de atualização
    startTime: appointmentToReschedule.startTime,
    endTime: appointmentToReschedule.endTime,
    date: appointmentToReschedule.startTime // Data atual para referência
  }

  isDetailsModalOpen.value = false
  nextTick(() => {
    isModalOpen.value = true
  })
}

function handleReturn(appointment) {
  const patientData = appointment.originalEvent.patient
  const patientId = typeof patientData === 'object' ? patientData._id : patientData

  if (!patientId) {
    toast.error('Não foi possível identificar o paciente.')
    return
  }

  initialAppointmentData.value = {
    patient: patientId,
    _mode: 'reschedule', // Modo de retorno (cria novo com isReturn: true)
  }

  isDetailsModalOpen.value = false
  nextTick(() => {
    isModalOpen.value = true
  })
}
</script>

<template>
  <div class="calendar-page-container">
    <CreateAppointmentModal
      v-if="isModalOpen"
      :initial-data="initialAppointmentData"
      @close="closeModal"
      @saved="handleAppointmentSaved"
    />
    <AppointmentDetailsModal
      v-if="isDetailsModalOpen"
      :event="selectedEventForDetails"
      :has-previous="hasPreviousAppointment"
      :has-next="hasNextAppointment"
      :current-index="currentAppointmentIndex"
      :total-count="totalAppointmentsCount"
      @close="isDetailsModalOpen = false"
      @edit="handleEditAction"
      @previous="handlePreviousAppointment"
      @next="handleNextAppointment"
      @return="handleReturn(selectedEventForDetails)"
      @reschedule="handleReschedule(selectedEventForDetails.originalEvent)"
    />

    <div class="calendar-container" :class="{ 'is-loading': appointmentsStore.isLoading }">
      <div v-if="appointmentsStore.isLoading" class="loading-overlay">
        <div class="loading-animation">
          <LoaderCircle :size="32" class="animate-spin" />
          <span>Carregando...</span>
        </div>
      </div>
      <vue-cal
        ref="vueCalRef"
        @ready="handleCalendarReady"
        class="vuecal--full-height-delete"
        :selected-date="selectedDate"
        :events="allCalendarEvents" :active-view="calendarView" :disable-views="['years', 'year', 'month']"
        hide-view-selector
        :time-from="calendarTimeRange.from"
        :time-to="calendarTimeRange.to"
        :time-step="30"
        :snap-to-time="15"
        :min-cell-width="120"
        locale="pt-br"
        @cell-click="handleCellClick"
        @event-click="handleEventClick"
        no-events-text=""
      >
        <template #weekday-heading="{ heading }">
          <div class="custom-weekday-heading" @click="handleDayHeaderClick(heading.date)">
            <div class="day-name">{{ getAbbreviatedDay(heading.label) }}</div>
            <div class="day-number" :class="{ 'is-today': heading.today }">
              {{ heading.date.getDate() }}
            </div>
          </div>
        </template>

        <template #event="{ event }">
          <div v-if="event.class === 'clinic-closed-event'" class="closed-event-content">
            {{ event.title }}
          </div>

          <div
            v-else-if="event.duration <= 30"
            class="custom-event-content-short"
            :title="`${event.title} (${event.status})`"
          >
            <span class="event-title-short">{{ event.title }}</span>
            <ArrowRight :size="14" class="event-status-icon" />
          </div>

          <div v-else class="custom-event-content-long">
            <div class="event-title-long">{{ event.title }}</div>
            <div class="event-time-long">
              {{ formatTime(event.start) }} - {{ formatTime(event.end) }}
            </div>
          </div>
        </template>
      </vue-cal>
    </div>

    <footer class="calendar-toolbar-floating">
      <div class="calendar-nav">
        <button @click="goToPrevious" class="nav-btn" title="Anterior">
          <ChevronLeft :size="20" />
        </button>

        <div class="nav-center-content">
          <button
            v-if="calendarView === 'day' && !isMobile"
            @click="backToWeekView"
            class="today-btn week-btn"
          >
            <ChevronLeft :size="16" />
            Semana
          </button>
          <button @click="goToToday" class="today-btn">Hoje</button>
          <span class="calendar-header-display">{{ calendarHeader }}</span>
        </div>

        <button @click="goToNext" class="nav-btn" title="Próximo">
          <ChevronRight :size="20" />
        </button>
      </div>
    </footer>
  </div>
</template>

<style>
.vuecal__menu,
.vuecal__title-bar {
  display: none;
}
.vuecal__event {
  cursor: pointer;
  border-radius: 1vh;
  padding: 0;
  box-sizing: border-box;
  font-family: var(--fonte-principal);
  transition: all 0.2s ease-in-out;
  border: 1px solid transparent;
  position: relative;
  overflow: hidden;
}
.vuecal__event::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: currentColor;
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
  opacity: 0.8;
}
.vuecal__event:hover {
  transform: scale(0.98);
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.256);
}
.vuecal__event.clinic-closed-event {
  background-color: #fef2f2; /* Vermelho bem claro */
  color: #b91c1c79; /* Vermelho escuro */
  border: 1px solid #fecaca;
  border-radius: 0 !important;
  opacity: 0.8;
  cursor: not-allowed;
  z-index: 1; /* Fica por baixo dos eventos normais */
  background-image: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 5px,
    rgba(239, 68, 68, 0.1) 5px,
    rgba(239, 68, 68, 0.1) 10px
  );
}
.vuecal__event.clinic-closed-event:hover {
  transform: none;
  box-shadow: none;
  opacity: 0.8;
}
.vuecal__event.clinic-closed-event::before {
  display: none; /* Esconde a barra lateral */
}
.vuecal__event.clinic-event {
  background-color: #eef2ff;
  color: #3b82f6;
  border-color: #dbeafe;
}
.vuecal__event.status--confirmado {
  background-color: #fefce8;
  color: #a16207;
  border-color: #fde68a;
}
.vuecal__event.status--realizado {
  background-color: #f0fdf4;
  color: #16a34a;
  border-color: #bbf7d0;
}
.vuecal__event.status--cancelado,
.vuecal__event.status--não-compareceu {
  background-color: #fef2f2;
  color: #dc2626;
  border-color: #fecaca;
  text-decoration: line-through;
  opacity: 0.8;
}
.vuecal--week-view .vuecal__bg .vuecal__time-column {
  width: 70px;
}
.vuecal__cell-events-count {
  display: none;
}
.vuecal--overflow-x.vuecal--week-view .vuecal__time-column {
  margin-top: 4.2em;
}
.vuecal--day-view .vuecal__bg .vuecal__time-column {
  margin-top: 0;
}
.vuecal__event-time {
  display: none;
}
.vuecal__heading {
  height: auto;
  padding: 0;
  border-bottom: 1px solid #e5e7eb;
}
.vuecal--day-view .vuecal__heading {
  display: none;
}
.vuecal__time-cell-label {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  transform: translateY(-8px);
}
.vuecal__bg .vuecal__time-cell {
  border-bottom: 1px solid #e5e7eb;
}
.custom-weekday-heading {
  height: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: var(--fonte-principal);
  padding: 0.75rem 0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}
.custom-weekday-heading:hover {
  background-color: #f9fafb;
}
.day-name {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--cinza-texto);
  text-transform: uppercase;
  margin-bottom: 0.3rem;
}
.day-number {
  font-size: 1.5rem;
  font-weight: 500;
  color: var(--preto);
  line-height: 1;
}
.day-number.is-today {
  color: var(--azul-principal);
  font-weight: 700;
}

@media (max-width: 768px) {
  .custom-weekday-heading {
    padding: 0.5rem 0;
    cursor: default;
  }
  .custom-weekday-heading:hover {
    background-color: transparent;
  }
  .day-name {
    font-size: 0.6rem;
  }
  .day-number {
    font-size: 1.25rem;
  }
  .vuecal--week-view .vuecal__bg .vuecal__time-column,
  .vuecal--day-view .vuecal__bg .vuecal__time-column {
    width: 55px;
  }
  .vuecal__time-cell-label {
    font-size: 0.65rem;
  }
  .event-title-short,
  .event-title-long {
    font-size: 0.75rem;
  }
  .event-time-long {
    font-size: 0.7rem;
  }
}
</style>

<style scoped>
.calendar-page-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  position: relative;
  background-color: var(--branco);
}

.calendar-toolbar-floating {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: 35%;
  z-index: 40;

  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(229, 231, 235, 0.7);
  border-radius: 9999px;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

  min-width: 380px;
  box-sizing: border-box;

  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: float-in 0.5s 0.2s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes float-in {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.calendar-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 0.75rem;
}

.nav-center-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: nowrap;
}

.calendar-header-display {
  font-size: 0.875rem;
  color: var(--preto);
  font-weight: 500;
  padding: 0 0.5rem;
  min-width: 180px;
  text-align: center;
  transition: all 3s ease-in-out;
}

.nav-buttons {
  display: none;
}

.nav-btn,
.today-btn {
  display: flex;
  align-items: center;
  justify-content: center;

  /* ✨ BOTÕES COM MAIS DESTAQUE ✨ */
  border: 1px solid rgba(0, 0, 0, 0.07);
  background-color: #f3f4f6; /* Cor de fundo cinza claro */
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);

  border-radius: 9999px;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
  color: #374151;
  flex-shrink: 0;
}
.nav-btn:hover,
.today-btn:hover {
  background-color: #e5e7eb; /* Hover cinza mais escuro */
  border-color: rgba(0, 0, 0, 0.08);
}
.nav-btn {
  width: 36px;
  height: 36px;
}
.today-btn {
  height: 36px;
  padding: 0 1rem;
  font-weight: 600;
  font-size: 0.875rem;
  gap: 0.25rem;
}
.week-btn {
  padding: 0 0.75rem;
}
/* --- ✨ [FIM DA ALTERAÇÃO] --- */

.calendar-container {
  height: 100%;
  width: 100%;
  border: none;
  border-radius: 0;
  background-color: var(--branco);
  position: relative;
  flex-grow: 1;
  min-height: 400px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  border-radius: 1rem;
}
.loading-animation {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 1.5rem 2rem;
  background-color: var(--branco);
  border-radius: 1rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  font-weight: 500;
  color: var(--preto);
}
.animate-spin {
  animation: spin 1s linear infinite;
  color: var(--azul-principal);
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.closed-event-content {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;
  font-weight: 500;
  font-size: 0.8rem;
  color: inherit;
  opacity: 0.9;
  padding: 4px;
  box-sizing: border-box;
}
.custom-event-content-short,
.custom-event-content-long {
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  overflow: hidden;
  padding: 4px 8px 4px 10px;
  box-sizing: border-box;
}
.custom-event-content-short {
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 2px 8px 2px 10px;
}
.event-title-short,
.event-title-long {
  font-weight: 600;
  font-size: 0.8rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
}
.event-title-short {
  flex-grow: 1;
  margin-right: 4px;
}
.event-status-icon {
  flex-shrink: 0;
  color: inherit;
  opacity: 0.8;
}
.event-time-long {
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: inherit;
  opacity: 0.7;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .calendar-toolbar-floating {
    bottom: 1rem;
    width: calc(100% - 2rem);
    max-width: 400px;
    min-width: auto;
    padding: 0.5rem;
  }
  .nav-center-content {
    gap: 0.25rem;
  }
  .calendar-header-display {
    font-size: 0.875rem;
    color: var(--preto);
    font-weight: 600;
    text-align: center;
    flex-grow: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 0.5rem;
  }
}
</style>
