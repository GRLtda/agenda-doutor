<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import { useAppointmentsStore } from '@/stores/appointments'
import { useAuthStore } from '@/stores/auth'
import { useClinicStore } from '@/stores/clinic'
import { useRouter } from 'vue-router'
import { Clock, ChevronLeft, ChevronRight, ArrowRight, LoaderCircle, Plus, ChevronDown, Check, User, Filter, X } from 'lucide-vue-next'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
import AppointmentDetailsModal from '@/components/pages/dashboard/AppointmentDetailsModal.vue'
import VueCal from 'vue-cal'
import 'vue-cal/dist/vuecal.css'
import VueDatePicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  format,
  addDays,
  subDays,
  startOfDay,
  endOfDay,
  isToday,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from 'vue-toastification'
import SideDrawer from '@/components/global/SideDrawer.vue'
import CalendarFilterPanel from '@/components/pages/calendario/CalendarFilterPanel.vue'

const appointmentsStore = useAppointmentsStore()
const authStore = useAuthStore()
const clinicStore = useClinicStore()
const router = useRouter()
const toast = useToast()

const handleDateSelect = (value) => {
    if (value && typeof value === 'object' && 'month' in value && 'year' in value) {
        selectedDate.value = new Date(value.year, value.month, 1)
    }
    else if (Array.isArray(value) && value.length === 2) {
        const startDate = value[0] instanceof Date ? value[0] : new Date(value[0])
        if (!isNaN(startDate.getTime())) {
            selectedDate.value = startDate
        }
    } else if (value instanceof Date) {
        selectedDate.value = value
    } else if (value) {
        const parsed = new Date(value)
        if (!isNaN(parsed.getTime())) {
            selectedDate.value = parsed
        }
    }
    fetchDataForView()
}

// Computed para o v-model do datepicker (adapta formato conforme a view)
const datePickerModel = computed({
    get() {
        if (calendarView.value === 'week') {
            const start = startOfWeek(selectedDate.value, { weekStartsOn: 1 })
            const end = endOfWeek(selectedDate.value, { weekStartsOn: 1 })
            return [start, end]
        }
        if (calendarView.value === 'month') {
            return { month: selectedDate.value.getMonth(), year: selectedDate.value.getFullYear() }
        }
        return selectedDate.value
    },
    set(value) {
        handleDateSelect(value)
    }
})

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
const isFilterDrawerOpen = ref(false)

const statusOptions = [
  { label: 'Agendado', value: 'Agendado', color: 'bg-blue-100 text-blue-700' },
  { label: 'Confirmado', value: 'Confirmado', color: 'bg-yellow-100 text-yellow-700' },
  { label: 'Realizado', value: 'Realizado', color: 'bg-green-100 text-green-700' },
  { label: 'Cancelado', value: 'Cancelado', color: 'bg-red-100 text-red-700' },
  { label: 'Não Compareceu', value: 'Não Compareceu', color: 'bg-red-100 text-red-700 line-through' },
  { label: 'Em Atendimento', value: 'Em Atendimento', color: 'bg-purple-100 text-purple-700' },
]

// --- 🔎 FILTROS ---
const selectedDoctorId = ref('') // '' = Todos
// Inicializa com todos os status marcados
const selectedStatuses = ref(statusOptions.map(s => s.value))
const isDoctorSelectOpen = ref(false)

const selectedDoctor = computed(() => {
    if (!selectedDoctorId.value || !clinicStore.currentClinic?.staff) return null
    return clinicStore.currentClinic.staff.find(s => String(s._id) === String(selectedDoctorId.value))
})

function selectDoctor(doc) {
    selectedDoctorId.value = doc ? doc._id : ''
    isDoctorSelectOpen.value = false
}

// Inicializa com todos os status marcados (ou nenhum para significar todos, mas checkboxes geralmente começam marcados ou desmarcados. Vamos assumir que vazio = todos)
// Mas para UX de checkboxes, geralmente é melhor mostrar o que está ativo. Vamos iniciar com vazio (=todos) e se o usuário marcar alguns, filtra.


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
  const view = calendarView.value
  if (view === 'day') {
    startDate = format(startOfDay(selectedDate.value), 'yyyy-MM-dd')
    endDate = format(endOfDay(selectedDate.value), 'yyyy-MM-dd')
  } else if (view === 'month') {
    // Para mês, pegamos o mês inteiro. O vue-cal pode mostrar dias de outros meses,
    // mas o foco é o mês selecionado.
    // Melhor: Pegar startOfWeek do inicio do mes e endOfWeek do fim do mes para cobrir tudo.
    const startM = startOfMonth(selectedDate.value)
    const endM = endOfMonth(selectedDate.value)
    startDate = format(startOfWeek(startM, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    endDate = format(endOfWeek(endM, { weekStartsOn: 1 }), 'yyyy-MM-dd')
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
  if (!isMobile.value) {
    selectedDate.value = date
    if (calendarView.value === 'month') {
      calendarView.value = 'week'
    } else if (calendarView.value === 'week') {
      calendarView.value = 'day'
    }
    fetchDataForView()
  }
}

function handleViewChange(event) {
  const newView = event?.view
  if (newView && newView !== calendarView.value) {
    calendarView.value = newView
    fetchDataForView()
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
  
  // 1. Filtragem
  let filtered = weekAppointments.value

  // Filtro por Doutor
  if (selectedDoctorId.value) {
    filtered = filtered.filter(appt => {
      if (!appt.doctor) return false
      const id = appt.doctor._id || appt.doctor
      return String(id) === String(selectedDoctorId.value)
    })
  }

  // Filtro por Status
  if (selectedStatuses.value.length > 0) {
    filtered = filtered.filter(appt => selectedStatuses.value.includes(appt.status))
  }

  // 2. Mapeamento
  return filtered.map((appt) => {
    if (!appt.startTime || !appt.endTime) return null
    
    // Tratamento seguro para status
    const rawStatus = appt.status || 'Agendado'
    const status = rawStatus.toLowerCase().replace(/ /g, '-')

    const startTime = new Date(appt.startTime)
    const endTime = new Date(appt.endTime)
    
    // Validação de datas
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return null

    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60) // duração em minutos

    return {
      start: formatToVueCalString(appt.startTime),
      end: formatToVueCalString(appt.endTime),
      title: appt.patient ? (appt.patient.name || 'Sem Nome') : 'Paciente Desconhecido',
      class: `clinic-event status--${status}`,
      originalEvent: appt,
      duration: duration,
      status: status,
    }
  }).filter(evt => evt !== null) // Remove nulos gerados por dados inválidos
})

const allCalendarEvents = computed(() => {
  return [...formattedEvents.value, ...closedTimeEvents.value]
})

// Mapa de contagem de agendamentos por dia (yyyy-MM-dd -> count)
const appointmentsCountByDay = computed(() => {
  const countMap = {}

  for (const evt of formattedEvents.value || []) {
    if (!evt?.start) continue

    const startStr = String(evt.start)
    const safeIso = startStr.includes(' ')
      ? startStr.replace(' ', 'T')
      : startStr

    const d = new Date(safeIso)
    if (isNaN(d.getTime())) continue

    const key = format(d, 'yyyy-MM-dd')
    countMap[key] = (countMap[key] || 0) + 1
  }

  return countMap
})

function getAppointmentCount(dateLike) {
  if (!dateLike) return 0
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike)
  if (isNaN(d.getTime())) return 0

  const key = format(d, 'yyyy-MM-dd')
  return appointmentsCountByDay.value[key] || 0
}

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
  fetchDataForView()
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

function switchView(view) {
    // Normaliza o selectedDate caso esteja no formato array do week-picker
    if (Array.isArray(selectedDate.value)) {
        selectedDate.value = new Date(selectedDate.value[0])
    }
    calendarView.value = view
    fetchDataForView()
}

function toggleStatus(statusValue) {
    if (selectedStatuses.value.includes(statusValue)) {
        selectedStatuses.value = selectedStatuses.value.filter(s => s !== statusValue)
    } else {
        selectedStatuses.value.push(statusValue)
    }
}
// Helper seguro para obter o dia do mês
const getDayNumber = (heading) => {
  if (!heading || !heading.date || typeof heading.date.getDate !== 'function') {
    return ''
  }
  return heading.date.getDate()
}
</script>

<template>
  <div class="calendar-page-wrapper">
    <!-- Layout Grid: Sidebar + Calendar -->
    <div class="calendar-layout">
        
        <!-- SIDEBAR (Menu Direito/Esquerdo - O usuário pediu "Lado Direito") -->
        <!-- Vou colocar na esquerda pois é padrão UX, mas se ele pediu direito, podemos inverter via CSS -->
        <!-- O prompt diz: "Na aba do calendario do lado direito coloque um menu..." -->
        <!-- Se ele quer um menu NA aba do calendário, DO lado direito. Pode ser um painel lateral a direita. -->
        <!-- Vou fazer um layout com sidebar na direita (order-2) -->

        <main class="calendar-main-content">
             <!-- Botão de Filtros Mobile (Superior Direito - Minimalista) -->
             <button 
               v-if="isMobile" 
               @click="isFilterDrawerOpen = true" 
               class="filter-fab-mobile-minimal"
             >
               <Filter :size="18" />
             </button>

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
                    :events="allCalendarEvents" :active-view="calendarView" :disable-views="['years', 'year']"
                    hide-view-selector
                    :time-from="calendarTimeRange.from"
                    :time-to="calendarTimeRange.to"
                    :time-step="30"
                    :snap-to-time="15"
                    :min-cell-width="120"
                    locale="pt-br"
                    @cell-click="handleCellClick"
                    @event-click="handleEventClick"
                    @view-change="handleViewChange"
                    no-events-text=""
                >
                    <template #weekday-heading="{ heading }">
                    <div class="custom-weekday-heading" @click="heading.date && handleDayHeaderClick(heading.date)">
                        <div class="day-name">{{ getAbbreviatedDay(heading.label) }}</div>
                        <div class="day-number" :class="{ 'is-today': heading.today }">
                        {{ getDayNumber(heading) }}
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

                    <template #cell-content="{ cell, view }">
                      <div
                        v-if="view?.id === 'month' && cell?.date"
                        class="month-cell-content"
                        @click.stop="handleDayHeaderClick(cell.date instanceof Date ? cell.date : new Date(cell.date))"
                      >
                        <span class="month-cell-day-number">
                          {{ (cell.date instanceof Date ? cell.date : new Date(cell.date)).getDate() }}
                        </span>

                        <div
                          v-if="getAppointmentCount(cell.date) > 0"
                          class="events-count-badge"
                        >
                          {{ getAppointmentCount(cell.date) }}
                        </div>
                      </div>
                    </template>
                </vue-cal>
            </div>
             <!-- Toolbar Flutuante (apenas navegação) -->
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
                
                 <!-- Aqui ficava o DatePicker, removido -->
                 <span class="calendar-header-display">{{ calendarHeader }}</span>

                </div>

                <button @click="goToNext" class="nav-btn" title="Próximo">
                <ChevronRight :size="20" />
                </button>

                <div class="separator-vertical"></div>
                <button class="new-appointment-btn" @click="handleEditAction(null)" title="Novo Agendamento">
                    <Plus :size="20" />
                </button>
            </div>
            </footer>
        </main>

        <!-- SIDEBAR - Lado Direito -->
        <aside class="calendar-sidebar-panel">
            <CalendarFilterPanel
                v-model:calendarView="calendarView"
                v-model:datePickerModel="datePickerModel"
                v-model:selectedDoctorId="selectedDoctorId"
                v-model:selectedStatuses="selectedStatuses"
                :statusOptions="statusOptions"
                :is-mobile="isMobile"
                @switchView="switchView"
                @selectDoctor="selectDoctor"
                @toggleStatus="toggleStatus"
            />
        </aside>

        <!-- Drawer de Filtros (Mobile) -->
        <SideDrawer 
            v-if="isFilterDrawerOpen" 
            size="lg" 
            @close="isFilterDrawerOpen = false"
        >
            <template #header>
                <div class="drawer-header-custom">
                    <div class="drawer-header-info">
                        <div>
                            <h2 class="drawer-title">Filtros e Opções</h2>
                            <p class="drawer-subtitle">Personalize sua visualização do calendário</p>
                        </div>
                    </div>
                    <button @click="isFilterDrawerOpen = false" class="mobile-close-btn">
                        <X :size="24" />
                    </button>
                </div>
            </template>
            
            <CalendarFilterPanel
                v-model:calendarView="calendarView"
                v-model:datePickerModel="datePickerModel"
                v-model:selectedDoctorId="selectedDoctorId"
                v-model:selectedStatuses="selectedStatuses"
                :statusOptions="statusOptions"
                :is-mobile="isMobile"
                @switchView="switchView"
                @selectDoctor="selectDoctor"
                @toggleStatus="toggleStatus"
            />

            <template #footer>
                <div class="drawer-footer-custom">
                    <button @click="isFilterDrawerOpen = false" class="apply-filters-btn">
                        Aplicar Filtros
                    </button>
                </div>
            </template>
        </SideDrawer>
    </div>
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
:deep(.vuecal__cell-events-count) {
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
/* ==========================================
   BADGE DE CONTADOR - CANTO SUPERIOR ESQUERDO
   ========================================== */

/* Garante que a célula pode receber position absolute */
.vuecal--month-view .vuecal__cell {
  position: relative;
}

/* Estilo do badge */
.vuecal--month-view .vuecal__cell-events-count {
  position: absolute !important;
  top: 6px !important;
  left: 10% !important;
  z-index: 20 !important;

  display: flex !important;
  align-items: center !important;
  justify-content: center !important;

  min-width: 22px !important;
  height: 22px !important;
  padding: 0 6px !important;

  border-radius: 999px !important;

  font-size: 12px !important;
  font-weight: 700 ;
  line-height: 1 !important;

  background-color: var(--azul-principal, #2563eb) !important;
  color: #fff !important;

  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;

  /* Remove estilo padrão do vuecal */
  margin: 0 !important;
}

/* Remove qualquer layout antigo do contador */
.vuecal__cell-events-count {
  float: none !important;
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
  .vuecal--month-view .vuecal__cell-events-count {
    left: 50% !important;
    top: 80% !important;
    transform: translate(-50%, -50%) !important;
  }
}
</style>

<style scoped>
/* Layout Principal */
.calendar-page-wrapper {
  display: flex;
  flex-direction: column;
  height: 100%; /* Adapta ao container pai, evitando scroll da tela */
  overflow: hidden;
  background-color: var(--branco);
}

.calendar-layout {
  display: flex;
  flex-direction: row; /* Sidebar ao lado */
  height: 100%;
  overflow: hidden;
  position: relative;
}

.calendar-main-content {
  flex: 1; /* Ocupa o espaço restante */
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* Sidebar */
.calendar-sidebar-panel {
  width: 320px; /* Largura fixa */
  background-color: #fff;
  border-left: 1px solid #e5e7eb;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  overflow-y: auto;
  flex-shrink: 0;
  z-index: 20;
  box-shadow: -2px 0 10px rgba(0,0,0,0.02);
}

.filter-fab-mobile-minimal {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 50;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    color: #4b5563; /* Gray 600 */
    border: 1px solid rgba(229, 231, 235, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    cursor: pointer;
    transition: all 0.2s ease;
}

.filter-fab-mobile-minimal:active {
    background-color: #f9fafb;
    transform: scale(0.95);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.filter-mobile-btn:hover {
  background-color: var(--azul-escuro) !important;
}

/* Drawer Customization */
.drawer-header-custom {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid #f3f4f6;
    background-color: #fff;
    position: sticky;
    top: 0;
    z-index: 50;
}
.drawer-header-info {
    display: flex;
    align-items: center;
    gap: 1rem;
}
.drawer-title {
    font-size: 1.125rem;
    font-weight: 800;
    color: var(--preto);
    margin: 0;
    letter-spacing: -0.01em;
}
.drawer-subtitle {
    font-size: 0.75rem;
    color: #6b7280;
    margin: 2px 0 0 0;
    font-weight: 500;
}
.drawer-footer-custom {
    padding: 1.5rem;
    border-top: 1px solid #f3f4f6;
    display: flex;
    justify-content: center;
}
.apply-filters-btn {
    width: 100%;
    padding: 0.875rem;
    background-color: var(--azul-principal);
    color: #fff;
    border: none;
    border-radius: 0.75rem;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
}
.apply-filters-btn:hover {
    background-color: var(--azul-escuro);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}


/* Toolbar Floating */
.calendar-toolbar-floating {
  position: absolute;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  width: auto;
  max-width: 95vw;
  z-index: 40;

  background-color: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(229, 231, 235, 0.7);
  border-radius: 9999px;
  padding: 0.5rem 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

  min-width: min-content;
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
  flex: 1;
  min-width: 0;
  justify-content: center;
}

.calendar-header-display {
  font-size: 0.875rem;
  color: var(--preto);
  font-weight: 500;
  padding: 0 0.5rem;
  min-width: 0;
  flex: 1;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nav-btn,
.today-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(0, 0, 0, 0.07);
  background-color: #f3f4f6;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #374151;
  flex-shrink: 0;
}
.nav-btn:hover,
.today-btn:hover {
  background-color: #e5e7eb;
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

.separator-vertical {
  width: 1px;
  height: 24px;
  background-color: #e5e7eb;
  margin: 0 0.25rem;
}

.new-appointment-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--azul-principal);
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 5px rgba(59, 130, 246, 0.3);
  transition: all 0.2s;
  flex-shrink: 0;
}
.new-appointment-btn:hover {
  background-color: #2563eb;
  transform: scale(1.05);
}

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
  border-radius: 0; 
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
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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

@media (max-width: 1024px) {
  .calendar-sidebar-panel {
    display: none; /* Esconder sidebar em telas menores por enquanto */
  }
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
    flex: 1;
    min-width: 0;
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

  /* Ajuste para o mês no mobile não esticar */
  :deep(.vuecal--month-view) {
    height: 460px !important;
    min-height: 460px !important;
    flex-grow: 0 !important;
  }
}
</style>
