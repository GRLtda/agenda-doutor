<script setup>
import { onMounted, computed, ref } from 'vue'
import { useAppointmentsStore } from '@/stores/appointments'
import { useRouter } from 'vue-router'
import {
  CalendarDays,
  Plus,
  CheckCircle,
  Clock,
  Search,
  Check,
  Play,
  X,
  CalendarPlus,
  Bell,
  AlertCircle,
  Ban,
} from 'lucide-vue-next'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
import AppointmentDetailsModal from '@/components/pages/dashboard/AppointmentDetailsModal.vue'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'
import { useStatusBadge } from '@/composables/useStatusBadge'
import AppButton from '@/components/global/AppButton.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'

const appointmentsStore = useAppointmentsStore()
const router = useRouter()
const toast = useToast()

const isModalOpen = ref(false)
const modalInitialData = ref(null)
const isDetailsModalOpen = ref(false)
const selectedAppointment = ref(null)
const searchQuery = ref('')

// Definição das colunas do Kanban
const kanbanColumns = [
  { key: 'Agendado', label: 'Agendado', icon: CalendarDays, color: '#3b82f6', bgColor: '#eff6ff' },
  { key: 'Confirmado', label: 'Confirmado', icon: CheckCircle, color: '#22c55e', bgColor: '#f0fdf4' },
  { key: 'Iniciado', label: 'Em Atendimento', icon: Play, color: '#8b5cf6', bgColor: '#f5f3ff' },
  { key: 'Realizado', label: 'Realizado', icon: Check, color: '#10b981', bgColor: '#ecfdf5' },
  { key: 'Não Compareceu', label: 'Não Compareceu', icon: AlertCircle, color: '#f59e0b', bgColor: '#fffbeb' },
  { key: 'Cancelado', label: 'Cancelado', icon: Ban, color: '#ef4444', bgColor: '#fef2f2' },
]

function getStatusIcon(status) {
  switch (status) {
    case 'Confirmado': return CheckCircle
    case 'Agendado': return CalendarDays
    case 'Iniciado': return Play
    case 'Finalizado': return Check
    case 'Não Compareceu': return AlertCircle
    case 'Cancelado': return Ban
    default: return Clock
  }
}

// Filtra appointments pela busca
const filteredAppointments = computed(() => {
  if (!appointmentsStore.todayAppointments || appointmentsStore.todayAppointments.length === 0) return []
  
  return appointmentsStore.todayAppointments.filter((appt) =>
    appt.patient.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )
})

// Agrupa appointments por status para o Kanban
const appointmentsByStatus = computed(() => {
  const grouped = {}
  kanbanColumns.forEach(col => {
    grouped[col.key] = []
  })
  
  filteredAppointments.value.forEach(appt => {
    if (grouped[appt.status]) {
      grouped[appt.status].push(appt)
    }
  })
  
  // Ordena cada grupo pelo horário
  Object.keys(grouped).forEach(status => {
    grouped[status].sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
  })
  
  return grouped
})

// Contagem total
const totalAppointments = computed(() => filteredAppointments.value.length)

function formatTime(dateTimeString) {
  return format(new Date(dateTimeString), 'HH:mm')
}

function openCreateModal() {
  modalInitialData.value = null
  isModalOpen.value = true
}

function openDetailsModal(appointment) {
  // Formatar para o mesmo formato que o calendário usa
  selectedAppointment.value = {
    originalEvent: appointment,
    start: appointment.startTime,
    end: appointment.endTime,
    title: appointment.patient?.name || 'Paciente'
  }
  isDetailsModalOpen.value = true
}

function closeDetailsModal() {
  isDetailsModalOpen.value = false
  selectedAppointment.value = null
}

async function handleStatusChange(appointment, newStatus) {
  const oldStatus = appointment.status
  appointmentsStore.updateLocalStatus(appointment._id, newStatus)
  
  const { success } = await appointmentsStore.updateAppointmentStatus(appointment._id, newStatus)
  
  if (success) {
    toast.success(`Status alterado para "${newStatus}"`)
  } else {
    appointmentsStore.updateLocalStatus(appointment._id, oldStatus)
    toast.error('Erro ao atualizar status.')
  }
}

function goToAppointmentPage(appointment) {
  router.push({
    name: 'atendimento-em-andamento',
    params: {
      appointmentId: appointment._id,
      patientId: appointment.patient._id
    }
  })
}

function rebookAppointment(appointment) {
  modalInitialData.value = {
    ...appointment,
    _mode: 'rebook'
  }
  isModalOpen.value = true
}

function handleEditAction(eventData) {
  modalInitialData.value = eventData
  isModalOpen.value = true
}

function handleReschedule(appointment) {
  const patientId = typeof appointment.patient === 'object' ? appointment.patient._id : appointment.patient
  
  modalInitialData.value = {
    patient: patientId,
    _id: appointment._id,
    _mode: 'rebook',
    startTime: appointment.startTime,
    endTime: appointment.endTime,
    date: appointment.startTime
  }
  
  isDetailsModalOpen.value = false
  isModalOpen.value = true
}

function handleReturn(event) {
  const appointment = event.originalEvent
  const patientId = typeof appointment.patient === 'object' ? appointment.patient._id : appointment.patient
  
  modalInitialData.value = {
    patient: patientId,
    _mode: 'reschedule'
  }
  
  isDetailsModalOpen.value = false
  isModalOpen.value = true
}

onMounted(() => {
  appointmentsStore.fetchTodayAppointments()
})
</script>

<template>
  <div class="appointments-page">
    <header class="page-header">
      <div>
        <h1 class="title">Atendimentos de Hoje</h1>
        <p class="subtitle">Confirme a chegada e inicie os atendimentos dos seus pacientes.</p>
      </div>
      <div class="header-actions">
        <div class="search-wrapper">
          <Search :size="18" class="search-icon" />
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Buscar por paciente..."
            class="search-input"
          />
        </div>
        <AppButton variant="primary" @click="openCreateModal">
          <Plus :size="16" />
          Marcar Atendimento
        </AppButton>
      </div>
    </header>

    <div class="content-wrapper">
      <!-- Empty State -->
      <div
        v-if="!appointmentsStore.isTodayLoading && totalAppointments === 0"
        class="empty-state"
      >
        <div class="empty-state-icon">
          <CalendarDays :size="48" />
        </div>
        <h2 class="empty-state-title">Nenhum atendimento para hoje</h2>
        <p class="empty-state-text">
          Aproveite para organizar a agenda ou marque o próximo atendimento.
        </p>
        <AppButton variant="primary" @click="openCreateModal">
          <Plus :size="16" />
          Marcar Atendimento
        </AppButton>
      </div>

      <!-- Kanban Board -->
      <div v-else class="kanban-container">
        <div class="kanban-board">
          <div
            v-for="column in kanbanColumns"
            :key="column.key"
            class="kanban-column"
          >
            <!-- Column Header -->
            <div class="column-header" :style="{ '--column-color': column.color, '--column-bg': column.bgColor }">
              <div class="column-title-wrapper">
                <component :is="column.icon" :size="16" class="column-icon" />
                <span class="column-title">{{ column.label }}</span>
              </div>
              <span class="column-count">{{ appointmentsByStatus[column.key]?.length || 0 }}</span>
            </div>

            <!-- Column Content -->
            <div class="column-content">
              <!-- Skeleton Loading -->
              <template v-if="appointmentsStore.isTodayLoading">
                <div v-for="n in 2" :key="`skel-${column.key}-${n}`" class="skeleton-card">
                  <div class="skeleton-header">
                    <AppSkeleton width="40px" height="40px" borderRadius="10px" />
                    <div class="skeleton-info">
                      <AppSkeleton width="120px" height="14px" />
                      <AppSkeleton width="90px" height="12px" />
                    </div>
                  </div>
                  <div class="skeleton-body">
                    <AppSkeleton width="80px" height="22px" borderRadius="6px" />
                  </div>
                  <div class="skeleton-footer">
                    <AppSkeleton width="100%" height="32px" borderRadius="8px" />
                  </div>
                </div>
              </template>

              <!-- Appointment Cards -->
              <template v-else>
                <TransitionGroup name="card" tag="div" class="cards-wrapper">
                  <div
                    v-for="appt in appointmentsByStatus[column.key]"
                    :key="appt._id"
                    class="appointment-card"
                    @click="openDetailsModal(appt)"
                  >
                    <div class="card-header">
                      <div class="patient-info">
                        <div class="patient-avatar" :style="{ '--avatar-color': column.color }">
                          {{ appt.patient.name.charAt(0) }}
                        </div>
                        <div class="patient-details">
                          <span class="patient-name">{{ appt.patient.name }}</span>
                          <span class="patient-phone">{{ appt.patient.phone || 'Sem telefone' }}</span>
                        </div>
                      </div>
                      <div class="status-wrapper">
                        <span
                          :class="['status-badge-pill', useStatusBadge(appt.status).badgeClass]"
                          :style="useStatusBadge(appt.status).badgeStyle"
                        >
                          <component :is="getStatusIcon(appt.status)" :size="12" />
                          {{ useStatusBadge(appt.status).displayText }}
                        </span>
                      </div>
                    </div>

                    <div class="card-body">
                      <div class="tags-row" v-if="appt.sendReminder">
                        <span class="tag-pill tag-reminder" title="Lembretes Ativos">
                          <Bell :size="12" /> Lembretes
                        </span>
                      </div>

                      <div class="time-row">
                        <div class="time-badge">
                          <Clock :size="14" />
                          <span>{{ formatTime(appt.startTime) }} - {{ formatTime(appt.endTime) }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="card-footer" v-if="appt.status !== 'Cancelado'">
                      <template v-if="appt.status === 'Agendado'">
                        <AppButton
                          @click.stop="handleStatusChange(appt, 'Confirmado')"
                          variant="secondary"
                          size="sm"
                          title="Confirmar Chegada"
                          class="flex-grow"
                        >
                          <Check :size="16" /> Confirmar
                        </AppButton>
                        <AppButton
                          @click.stop="handleStatusChange(appt, 'Cancelado')"
                          variant="dangerous"
                          size="sm"
                          title="Cancelar"
                        >
                          <X :size="18" />
                        </AppButton>
                      </template>
                      <template v-else-if="appt.status === 'Confirmado'">
                        <AppButton @click.stop="goToAppointmentPage(appt)" variant="primary" size="sm" class="flex-grow">
                          <Play :size="16" /> Iniciar
                        </AppButton>
                      </template>
                      <template v-else-if="appt.status === 'Iniciado'">
                        <AppButton @click.stop="goToAppointmentPage(appt)" variant="primary" size="sm" class="flex-grow">
                          <Play :size="16" /> Continuar
                        </AppButton>
                      </template>
                      <template v-else-if="appt.status === 'Não Compareceu'">
                        <AppButton @click.stop="rebookAppointment(appt)" variant="warning" size="sm" class="flex-grow">
                          <CalendarPlus :size="16" /> Reagendar
                        </AppButton>
                      </template>
                      <template v-else>
                        <AppButton @click.stop="goToAppointmentPage(appt)" variant="default" size="sm" class="flex-grow">
                          Ver Detalhes
                        </AppButton>
                      </template>
                    </div>
                  </div>
                </TransitionGroup>

                <!-- Empty column state -->
                <div v-if="!appointmentsByStatus[column.key]?.length" class="empty-column">
                  <component :is="column.icon" :size="24" class="empty-icon" />
                  <span>Nenhum atendimento</span>
                </div>
              </template>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <AppointmentDetailsModal
    v-if="isDetailsModalOpen"
    :event="selectedAppointment"
    @close="closeDetailsModal"
    @edit="handleEditAction"
    @return="handleReturn(selectedAppointment)"
    @reschedule="handleReschedule(selectedAppointment.originalEvent)"
  />

  <CreateAppointmentModal
    v-if="isModalOpen"
    :initial-data="modalInitialData"
    @close="isModalOpen = false"
  />
</template>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.25rem;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #64748b;
  font-size: 0.95rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.search-wrapper {
  position: relative;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 1rem;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 280px;
  height: 38px;
  padding: 0.75rem 1rem 0.75rem 2.75rem;
  border-radius: 0.5rem;
  border: 1px solid #e2e8f0;
  background-color: var(--branco);
  font-size: 0.95rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.search-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.content-wrapper {
  min-height: calc(100vh - 280px);
}

/* Kanban Container */
.kanban-container {
  width: 100%;
}

.kanban-board {
  display: flex;
  gap: 0.75rem;
  width: 100%;
}

/* Kanban Column */
.kanban-column {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background-color: #f8fafc;
  border-radius: 0.75rem;
  border: 1px solid #e2e8f0;
  height: 75vh;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 0.75rem;
  border-bottom: 1px solid #e2e8f0;
  background: var(--column-bg);
  border-radius: 0.75rem 0.75rem 0 0;
  overflow: hidden;
  gap: 0.5rem;
}

.column-title-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
  overflow: hidden;
}

.column-icon {
  color: var(--column-color);
}

.column-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
}

.column-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 0.5rem;
  border-radius: 9999px;
  background-color: var(--column-color);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
}

.column-content {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.cards-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Appointment Card */
.appointment-card {
  background-color: var(--branco);
  border: 1px solid #e2e8f0;
  border-radius: 0.5rem;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.appointment-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-color: #cbd5e1;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.patient-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 0;
}

.patient-avatar {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  color: var(--avatar-color, var(--azul-principal));
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 0.75rem;
  flex-shrink: 0;
  border: 1px solid #e2e8f0;
}

.patient-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.patient-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 0.75rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patient-phone {
  font-size: 0.65rem;
  color: #94a3b8;
}

.status-wrapper {
  flex-shrink: 0;
}

.status-badge-pill {
  display: none;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tags-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.6rem;
  font-weight: 500;
}

.tag-reminder {
  background-color: #fffbeb;
  color: #b45309;
  border: 1px solid #fde68a;
}

.time-row {
  display: flex;
  align-items: center;
}

.time-badge {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background-color: #f8fafc;
  padding: 0.25rem 0.4rem;
  border-radius: 4px;
  color: #475569;
  font-weight: 500;
  font-size: 0.7rem;
  border: 1px solid #e2e8f0;
}

.card-footer {
  display: flex;
  gap: 0.35rem;
  margin-top: auto;
  padding-top: 0.4rem;
  border-top: 1px solid #f1f5f9;
}

.flex-grow {
  flex-grow: 1;
}

/* Empty Column State */
.empty-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  color: #94a3b8;
  gap: 0.5rem;
  text-align: center;
}

.empty-icon {
  opacity: 0.5;
}

.empty-column span {
  font-size: 0.85rem;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  background-color: var(--branco);
  border-radius: 1rem;
  border: 1px dashed #e2e8f0;
}

.empty-state-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #f8fafc;
  margin-bottom: 1.5rem;
  color: #94a3b8;
}

.empty-state-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.empty-state-text {
  color: #64748b;
  max-width: 400px;
  margin-bottom: 1.5rem;
}

/* Skeleton Card */
.skeleton-card {
  background-color: var(--branco);
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.skeleton-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.skeleton-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.skeleton-body {
  padding: 0.25rem 0;
}

.skeleton-footer {
  padding-top: 0.75rem;
  border-top: 1px solid #f1f5f9;
}

/* Card Transitions */
.card-enter-active,
.card-leave-active {
  transition: all 0.3s ease;
}

.card-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.card-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.card-move {
  transition: transform 0.3s ease;
}

/* Responsividade */
@media (max-width: 1400px) {
  .kanban-board {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
  }

  .kanban-column {
    height: 40vh;
    min-height: 300px;
  }
}

@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100%;
  }

  .kanban-board {
    grid-template-columns: repeat(2, 1fr);
  }

  .kanban-column {
    height: 35vh;
    min-height: 280px;
  }
}

@media (max-width: 640px) {
  .title {
    font-size: 1.5rem;
  }

  .kanban-board {
    grid-template-columns: 1fr;
  }

  .kanban-column {
    height: auto;
    min-height: 200px;
    max-height: 50vh;
  }
}
</style>
