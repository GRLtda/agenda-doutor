<script setup>
import { onMounted, computed, ref } from 'vue'
import { useAppointmentsStore } from '@/stores/appointments'
import { useRouter } from 'vue-router'
import {
  CalendarDays,
  Plus,
  User,
  CheckCircle,
  Clock,
  Search,
  Check,
  Play,
  X,
  CalendarPlus,
  Bell,
} from 'lucide-vue-next'
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue'
import AppointmentInfoPopover from '@/components/pages/atendimentos/AppointmentInfoPopover.vue'
import { useToast } from 'vue-toastification'
import { format } from 'date-fns'
import { useStatusBadge } from '@/composables/useStatusBadge'
import AppButton from '@/components/global/AppButton.vue'

const appointmentsStore = useAppointmentsStore()
const router = useRouter()
const toast = useToast()

const isModalOpen = ref(false)
const modalInitialData = ref(null)
const activePopover = ref({ appointment: null, event: null })
const searchQuery = ref('')

function getStatusIcon(status) {
  switch (status) {
    case 'Confirmado': return CheckCircle
    case 'Agendado': return CalendarDays
    case 'Em Atendimento': return Play
    case 'Finalizado': return Check
    case 'Não Compareceu': return X
    case 'Cancelado': return X
    default: return Clock
  }
}

const filteredAndSortedAppointments = computed(() => {
  if (!appointmentsStore.appointments || appointmentsStore.appointments.length === 0) return []

  // 1. Filtra primeiro
  const filtered = appointmentsStore.appointments.filter((appt) =>
    appt.patient.name.toLowerCase().includes(searchQuery.value.toLowerCase()),
  )

  // 2. Depois ordena
  const statusOrder = {
    Confirmado: 1,
    Agendado: 2,
    'Em Atendimento': 3,
    Finalizado: 4,
    'Não Compareceu': 5,
    Cancelado: 6,
  }

  return filtered.sort((a, b) => {
    // Primeiro, ordena por status
    const orderA = statusOrder[a.status] || 99
    const orderB = statusOrder[b.status] || 99
    if (orderA !== orderB) {
      return orderA - orderB
    }
    // Se o status for o mesmo, ordena pelo horário de início
    return new Date(a.startTime) - new Date(b.startTime)
  })
})

function formatTime(dateTimeString) {
  return format(new Date(dateTimeString), 'HH:mm')
}

function openCreateModal() {
  modalInitialData.value = null
  isModalOpen.value = true
}

function openPopover(appointment, event) {
  // Fecha o popover anterior se estiver abrindo um novo
  if (activePopover.value.appointment) {
    activePopover.value.appointment = null
    activePopover.value.event = null
  }

  // Atraso para garantir que o DOM seja atualizado
  setTimeout(() => {
    activePopover.value.appointment = appointment
    activePopover.value.event = event
  }, 0)
}

function closePopover() {
  activePopover.value.appointment = null
  activePopover.value.event = null
}

async function handleStatusChange(appointment, newStatus) {
  const { success } = await appointmentsStore.updateAppointmentStatus(appointment._id, newStatus)
  if (success) {
    toast.success(`Status alterado para "${newStatus}"`)
    // A store já atualiza a lista, então o popover/card será atualizado
  } else {
    toast.error('Erro ao atualizar status.')
  }
  closePopover()
}

function goToAppointmentPage(appointment) {
  router.push({
    name: 'atendimento-em-andamento', // Nome da rota (como corrigimos antes)
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
  closePopover()
}

onMounted(() => {
  const today = new Date()
  const todayStr = format(today, 'yyyy-MM-dd')
  appointmentsStore.fetchAppointmentsByDate(todayStr, todayStr)
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
      <div
        v-if="!appointmentsStore.isLoading && filteredAndSortedAppointments.length === 0"
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

      <div v-else class="appointments-grid-container">
        <div v-if="appointmentsStore.isLoading" class="grid-layout">
           <div v-for="n in 6" :key="`skel-card-${n}`" class="skeleton-card"></div>
        </div>
        
        <div v-else class="grid-layout" v-auto-animate>
          <div
            v-for="appt in filteredAndSortedAppointments"
            :key="appt._id"
            class="appointment-card"
            @click="openPopover(appt, $event)"
          >
            <div class="card-header">
              <div class="patient-info">
                <div class="patient-avatar">{{ appt.patient.name.charAt(0) }}</div>
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
              <div class="tags-row">
                 <!-- <span class="tag-pill" :class="appt.isReturn ? 'tag-return' : 'tag-first'">
                    {{ appt.isReturn ? 'Retorno' : 'Primeira Consulta' }}
                 </span> -->
                 <span v-if="appt.sendReminder" class="tag-pill tag-reminder" title="Lembretes Ativos">
                    <Bell :size="12" /> Lembretes
                 </span>
              </div>

              <div class="info-row time-row">
                <div class="time-badge">
                  <Clock :size="14" />
                  <span>{{ formatTime(appt.startTime) }} - {{ formatTime(appt.endTime) }}</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
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
                  <Play :size="16" /> Continuar Atendimento
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
        </div>
      </div>
    </div>
  </div>

  <AppointmentInfoPopover
    v-if="activePopover.appointment"
    :appointment="activePopover.appointment"
    :click-event="activePopover.event"
    @close="closePopover"
    @start="goToAppointmentPage(activePopover.appointment)"
    @view="goToAppointmentPage(activePopover.appointment)"
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
  margin-bottom: 2rem;
}
.title {
  font-size: 2.25rem;
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
  width: 320px;
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
  min-height: 60vh;
}

/* Grid Layout */
.appointments-grid-container {
  padding-bottom: 2rem;
}

.grid-layout {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

/* Card Styles */
.appointment-card {
  background-color: var(--branco);
  border: 1px solid #f1f5f9;
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
  position: relative;
  overflow: hidden;
}

.appointment-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025);
  border-color: #e2e8f0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.patient-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
  margin-right: 0.5rem;
}

.patient-avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f8fafc;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 1.25rem;
  flex-shrink: 0;
  border: 1px solid #f1f5f9;
}

.patient-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.patient-name {
  font-weight: 600;
  color: #1e293b;
  font-size: 1rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.patient-phone {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-top: 2px;
}

.status-wrapper {
  flex-shrink: 0;
}

.status-badge-pill {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.tags-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
}

.tag-return {
  background-color: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.tag-first {
  background-color: #fdf4ff;
  color: #a21caf;
  border: 1px solid #f0abfc;
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
  gap: 0.5rem;
  background-color: #f8fafc;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  color: #334155;
  font-weight: 600;
  font-size: 0.9rem;
  border: 1px solid #f1f5f9;
  width: 100%;
}

.card-footer {
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #f8fafc;
}

.flex-grow {
  flex-grow: 1;
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

/* Skeleton */
.skeleton-card {
  height: 240px;
  background-color: #f1f5f9;
  border-radius: 1rem;
  animation: pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Responsividade */
@media (max-width: 1024px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1.5rem;
  }
  .header-actions {
    width: 100%;
    flex-direction: column;
    align-items: stretch;
  }
  .search-input {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .grid-layout {
    grid-template-columns: 1fr;
  }
}
</style>
