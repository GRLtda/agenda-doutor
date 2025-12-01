<script setup>
import { computed, ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppointmentsStore } from '@/stores/appointments'
import { useToast } from 'vue-toastification'
import {
  X,
  Calendar,
  Clock,
  Phone,
  Mail,
  Check,
  XCircle,
  MessageSquare,
  FileText,
  Activity,
  ChevronLeft,
  ChevronRight,
  MapPin,
  User,
  MessageCircle,
  ExternalLink,
  Play,
  Bell,
  RotateCw,
  CalendarClock
} from 'lucide-vue-next'
import { useStatusBadge } from '@/composables/useStatusBadge.js'
import { formatPhone } from '@/directives/phone-mask.js'

const props = defineProps({
  event: { type: Object, required: true },
  hasPrevious: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
  currentIndex: { type: Number, default: 0 },
  totalCount: { type: Number, default: 0 },
})

const emit = defineEmits(['close', 'edit', 'previous', 'next', 'return', 'reschedule'])

const appointmentsStore = useAppointmentsStore()
const toast = useToast()
const router = useRouter()

const patient = computed(() => props.event.originalEvent.patient)
const appointment = computed(() => props.event.originalEvent)

const badgeInfo = computed(() => {
  return useStatusBadge(props.event.originalEvent.status)
})

const isReturn = computed(() => {
  return props.event.originalEvent?.isReturn === true
})

const isConfirmingCancel = ref(false)
const cancelConfirmTimer = ref(null)

function clearCancelTimer() {
  if (cancelConfirmTimer.value) {
    clearTimeout(cancelConfirmTimer.value)
    cancelConfirmTimer.value = null
  }
}

function formatTime(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch (error) {
    return '--:--'
  }
}

function formatDate(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'America/Sao_Paulo'
    })
  } catch (error) {
    return 'Data inválida'
  }
}

function formatTimelineDate(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch (error) {
    return ''
  }
}

function goToPatient() {
  if (patient.value && patient.value._id) {
    emit('close')
    router.push(`/app/pacientes/${patient.value._id}`)
  } else {
    toast.info('Este agendamento não parece ter um paciente vinculado.')
  }
}

function openWhatsApp() {
  if (patient.value && patient.value.phone) {
    const phone = patient.value.phone.replace(/\D/g, '')
    const message = `Olá ${patient.value.name}, tudo bem?`
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(message)}`, '_blank')
  } else {
    toast.warning('Paciente sem telefone cadastrado.')
  }
}

async function updateStatus(status) {
  const appointmentId = props.event.originalEvent._id
  const success = await appointmentsStore.updateAppointmentStatus(appointmentId, status)
  if (success) {
    toast.success(`Status atualizado para: ${status}`)
    emit('close')
  } else {
    toast.error('Erro ao atualizar status.')
  }
}

function handleCancelClick() {
  if (isConfirmingCancel.value) {
    clearCancelTimer()
    updateStatus('Cancelado')
  } else {
    isConfirmingCancel.value = true
    cancelConfirmTimer.value = setTimeout(() => {
      isConfirmingCancel.value = false
    }, 5000)
  }
}

async function handleStartService() {
  const appointmentId = props.event.originalEvent._id
  
    toast.success('Iniciando atendimento...')
    emit('close')
    
    if (patient.value && patient.value._id) {
      router.push({ 
        name: 'atendimento-em-andamento', 
        params: { 
          appointmentId: appointmentId,
          patientId: patient.value._id 
        } 
      })
    } else {
      toast.warning('Não foi possível redirecionar: Paciente não identificado.')
    }
}

function handleFinishService() {
  updateStatus('Realizado')
}

function handleApprove() {
  updateStatus('Confirmado')
}

onUnmounted(() => {
  clearCancelTimer()
})
</script>

<template>
  <div class="drawer-overlay" @click.self="$emit('close')">
    <!-- Botão de fechar fora do drawer -->
    <button @click="$emit('close')" class="close-btn-outside">
      <X :size="24" />
    </button>

    <div class="drawer-content">
      <!-- Header -->
      <header class="drawer-header">
        <div class="header-left">
          <h2>Detalhes do Agendamento</h2>
          <span class="appointment-id">ID #{{ appointment._id.slice(-6).toUpperCase() }}</span>
        </div>
        <div class="header-right">
          <button @click="$emit('close')" class="mobile-close-btn">
            <X :size="24" />
          </button>
           <!-- Paginação visual -->
          <div class="pagination-controls">
            <span class="page-info">{{ currentIndex + 1 }} de {{ totalCount }}</span>
            <div class="nav-buttons">
              <button 
                class="nav-btn" 
                :disabled="!hasPrevious" 
                @click="$emit('previous')"
                title="Anterior"
              >
                <ChevronLeft :size="16" />
              </button>
              <button 
                class="nav-btn" 
                :disabled="!hasNext" 
                @click="$emit('next')"
                title="Próximo"
              >
                <ChevronRight :size="16" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="drawer-body">
        <!-- Personal Detail -->
        <section class="section">
          <h3 class="section-title">Dados do Paciente</h3>
          <div class="patient-card">
            <div class="patient-avatar">
              <img v-if="patient.photoUrl" :src="patient.photoUrl" alt="Patient" />
              <span v-else>{{ patient.name.charAt(0) }}</span>
            </div>
            <div class="patient-info">
              <h4 @click="goToPatient" class="patient-name">{{ patient.name }}</h4>
              <div class="contact-row">
                 <div class="contact-item">
                    <Phone :size="14" />
                    <span>{{ formatPhone(patient.phone) }}</span>
                 </div>
                 <div class="contact-item" v-if="patient.email">
                    <Mail :size="14" />
                    <span>{{ patient.email }}</span>
                 </div>
              </div>
            </div>
            <div class="patient-actions">
               <button @click="openWhatsApp" class="action-btn whatsapp" title="WhatsApp">
                  <MessageCircle :size="18" />
               </button>
               <button @click="goToPatient" class="action-btn profile" title="Ver Perfil">
                  <ExternalLink :size="18" />
               </button>
            </div>
          </div>
        </section>

        <!-- Reason -->
        <section class="section">
           <div class="reason-box">
              <h4 class="reason-title">Motivo / Queixa</h4>
              <p class="reason-text">
                {{ appointment.notes || 'Nenhuma observação registrada para este agendamento.' }}
              </p>
           </div>
        </section>

        <!-- Booking Information -->
        <section class="section">
           <h3 class="section-title">Informações do Agendamento</h3>
           <div class="booking-info-card">
              <div class="booking-row">
                 <div class="booking-item">
                    <span class="label">Data</span>
                    <div class="value">
                       <Calendar :size="16" />
                       <span>{{ formatDate(event.start) }}</span>
                    </div>
                 </div>
                 <div class="booking-item">
                    <span class="label">Tipo</span>
                    <div class="value">
                       <MessageSquare :size="16" />
                       <span>{{ isReturn ? 'Retorno' : 'Consulta' }}</span>
                    </div>
                 </div>
              </div>
              <div class="booking-row mt-4">
                 <div class="booking-item full-width">
                    <span class="label">Status Atual</span>
                    <div :class="['status-pill', badgeInfo.badgeClass]" :style="badgeInfo.badgeStyle">
                       {{ badgeInfo.displayText }}
                    </div>
                 </div>
              </div>
           </div>
        </section>

        <!-- Ações Rápidas -->
        <section class="section">
           <div class="actions-grid">
              <button @click="$emit('return')" class="action-card-btn">
                 <div class="icon-box">
                    <RotateCw :size="20" />
                 </div>
                 <div class="action-text">
                    <span class="action-label">Retorno</span>
                    <span class="action-desc">Agendar nova consulta</span>
                 </div>
              </button>
              <button @click="$emit('reschedule')" class="action-card-btn">
                 <div class="icon-box">
                    <CalendarClock :size="20" />
                 </div>
                 <div class="action-text">
                    <span class="action-label">Reagendar</span>
                    <span class="action-desc">Alterar horário atual</span>
                 </div>
              </button>
           </div>
        </section>

        <!-- Timeline (History) -->
        <section class="section" v-if="appointment.timeline && appointment.timeline.length > 0">
           <h3 class="section-title">Histórico</h3>
           <div class="timeline-history">
              <div 
                v-for="(item, index) in appointment.timeline" 
                :key="index" 
                class="history-item"
              >
                 <div class="history-marker">
                    <!-- Ícone específico para lembrete enviado -->
                    <Bell v-if="item.action === 'REMINDER_SENT'" :size="12" class="marker-icon" />
                    <!-- Check para itens passados (exceto o último) -->
                    <Check v-else-if="index < appointment.timeline.length - 1" :size="12" class="marker-icon" />
                    <!-- Ponto para o último item (atual) -->
                    <div v-else class="marker-dot"></div>
                 </div>
                 
                 <div class="history-content">
                    <div class="history-header">
                       <span class="history-date">{{ formatTimelineDate(item.timestamp) }}</span>
                       <span class="history-user" v-if="item.user">por {{ item.user.name }}</span>
                       <span class="history-user" v-else>Sistema</span>
                    </div>
                    <p class="history-description">{{ item.description }}</p>
                 </div>
              </div>
           </div>
        </section>
      </div>

      <!-- Footer -->
      <footer class="drawer-footer">
         <button
            v-if="appointment.status !== 'Cancelado' && appointment.status !== 'Realizado'"
            @click="handleCancelClick"
            :class="['btn-decline', { 'confirming': isConfirmingCancel }]"
         >
            <XCircle :size="18" />
            {{ isConfirmingCancel ? 'Confirmar?' : 'Cancelar' }}
         </button>
         
         <!-- Se não confirmado, mostra Confirmar -->
         <button
            v-if="appointment.status !== 'Confirmado' && appointment.status !== 'Cancelado' && appointment.status !== 'Realizado' && appointment.status !== 'Em Atendimento'"
            @click="handleApprove"
            class="btn-approve"
         >
            <Check :size="18" />
            Confirmar
         </button>

         <!-- Se Confirmado, mostra Iniciar Atendimento -->
         <button
            v-if="appointment.status === 'Confirmado'"
            @click="handleStartService"
            class="btn-approve"
         >
            <Play :size="18" />
            Iniciar Atendimento
         </button>

         <!-- Se Em Atendimento, mostra Finalizar -->
         <button
            v-if="appointment.status === 'Em Atendimento'"
            @click="handleFinishService"
            class="btn-approve"
         >
            <Check :size="18" />
            Finalizar Atendimento
         </button>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.close-btn-outside {
  position: absolute;
  top: 1rem;
  right: 496px; /* 480px (width) + 16px (gap) */
  background: #fff;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  z-index: 1010;
}
.close-btn-outside:hover {
  color: #111827;
  transform: scale(1.1);
}

.drawer-content {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: #fff;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 1005;
}

@keyframes slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

/* Header */
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.header-left h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.appointment-id {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.page-info {
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.nav-buttons {
  display: flex;
  gap: 0.5rem;
}

.nav-btn {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  padding: 0.25rem;
  color: #6b7280;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  transition: all 0.2s;
}
.nav-btn:hover:not(:disabled) {
  border-color: #d1d5db;
  color: #374151;
  background: #f9fafb;
}
.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #f3f4f6;
}

/* Body */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
}

/* Patient Card */
.patient-card {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  position: relative;
}

.patient-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e0e7ff;
  color: #4f46e5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 1.25rem;
  overflow: hidden;
}
.patient-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.patient-info {
  flex: 1;
  min-width: 0; /* Permite que o texto trunque dentro do flex */
}

.patient-name {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.patient-name:hover {
  color: #4f46e5;
}

.contact-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.patient-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #e5e7eb;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  color: #6b7280;
}
.action-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}
.action-btn.whatsapp:hover {
  background: #dcfce7;
  color: #16a34a;
  border-color: #bbf7d0;
}
.action-btn.profile:hover {
  background: #eff6ff;
  color: #2563eb;
  border-color: #bfdbfe;
}

/* Reason Box */
.reason-box {
  background: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
}

.reason-title {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin: 0 0 0.5rem 0;
}

.reason-text {
  font-size: 0.875rem;
  color: #374151;
  line-height: 1.5;
  margin: 0;
}

/* Grid Sections */
.grid-2-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-block {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.block-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #6b7280;
}
.block-header h4 {
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0;
}

.block-content {
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
  margin: 0;
}

.badge-return {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  width: fit-content;
}

/* Booking Info */
.booking-info-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
}

.booking-row {
  display: flex;
  gap: 1.5rem;
}
.booking-row.mt-4 {
  margin-top: 1rem;
}

.booking-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.booking-item.full-width {
  width: 100%;
}

.booking-item .label {
  font-size: 0.75rem;
  color: #6b7280;
}

.booking-item .value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #111827;
}

.status-pill {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 600;
  width: fit-content;
}

/* Timeline History Styles */
.timeline-history {
  display: flex;
  flex-direction: column;
  position: relative;
  padding-left: 0.5rem;
}

.history-item {
  display: flex;
  gap: 1rem;
  position: relative;
  padding-bottom: 1.5rem;
}

.history-item:last-child {
  padding-bottom: 0;
}

/* Linha conectora */
.history-item:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 24px;
  left: 11px; /* Centralizado com o marker (24px width / 2 - 1px) */
  bottom: 0;
  width: 2px;
  background-color: #e5e7eb; /* Cor clara e suave */
  z-index: 0;
}

.history-marker {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  flex-shrink: 0;
  background-color: #10b981; /* Verde esmeralda vibrante */
  color: #fff;
  /* border: 2px solid #fff; Borda branca para separar da linha */
  box-shadow: 0 0 0 1px #e5e7eb; /* Anel sutil externo */
}

/* Estilo para o último item (ponto atual) */
.history-item:last-child .history-marker {
  background-color: #fff;
  border: 2px solid #f59e0b; /* Amarelo/Laranja moderno */
  box-shadow: 0 0 0 4px #fef3c7; /* Anel de foco suave */
  padding: 0;
}

.marker-dot {
  width: 8px;
  height: 8px;
  background-color: #f59e0b;
  border-radius: 50%;
}

.marker-icon {
  stroke-width: 3px;
}

.history-content {
  flex: 1;
  padding-top: 0.125rem;
}

.history-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
}

.history-date {
  font-size: 0.75rem;
  font-weight: 600;
  color: #9ca3af;
}

.history-user {
  font-size: 0.75rem;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.history-description {
  font-size: 0.875rem;
  color: #374151;
  margin: 0;
  line-height: 1.4;
}

/* Footer */
.drawer-footer {
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: #fff;
}

.btn-approve {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-approve:hover {
  background: #4338ca;
}

.btn-decline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-decline:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}
.btn-decline.confirming {
  background: #fee2e2;
  color: #ef4444;
  border-color: #fecaca;
}

/* Action Buttons */
.actions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.action-card-btn {
  display: flex;
  align-items: center;
  text-align: left;
  gap: 0.75rem;
  padding: 1rem;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
}

.action-card-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.action-card-btn .icon-box {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  background: #f3f4f6;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.action-card-btn:hover .icon-box {
  color: #4f46e5;
  background: #e0e7ff;
}

.action-text {
  display: flex;
  flex-direction: column;
}

.action-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #111827;
}

.action-desc {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.125rem;
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

  .pagination-controls {
    display: none;
  }
}
</style>
