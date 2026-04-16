<script setup>
import { computed, ref, watch } from 'vue'
import { AlertTriangle, X, Clock3, Stethoscope, StickyNote, CheckCircle2 } from 'lucide-vue-next'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppButton from '@/components/global/AppButton.vue'
import FormInput from '@/components/global/FormInput.vue'
import { useAppointmentsStore } from '@/stores/appointments'
import { useScheduleBlocksStore } from '@/stores/scheduleBlocks'
import { useToast } from 'vue-toastification'

const props = defineProps({
  blockId: {
    type: String,
    default: null,
  },
  blockTitle: {
    type: String,
    default: 'Bloqueio de Agenda',
  },
  initialConflicts: {
    type: Array,
    default: () => [],
  },
  pendingBlockPayload: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'resolved'])

const appointmentsStore = useAppointmentsStore()
const scheduleBlocksStore = useScheduleBlocksStore()
const toast = useToast()

const conflicts = ref([])
const actionByAppointment = ref({})
const formByAppointment = ref({})
const loadingByAppointment = ref({})
const isRefreshing = ref(false)

function toTimeString(value) {
  const d = new Date(value)
  if (isNaN(d.getTime())) return '09:00'
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function normalizeConflict(item) {
  const start = new Date(item.startTime)
  const end = new Date(item.endTime)

  return {
    appointmentId: item.appointmentId,
    patientName: item.patientName || 'Paciente',
    doctorName: item.doctorName || 'Profissional',
    status: item.status || 'Agendado',
    notes: item.notes || '',
    startTime: item.startTime,
    endTime: item.endTime,
    defaultDate: isNaN(start.getTime()) ? new Date() : start,
    defaultStartTime: toTimeString(start),
    defaultEndTime: toTimeString(end),
  }
}

function hydrateState(items) {
  conflicts.value = (items || []).map(normalizeConflict)

  const nextAction = {}
  const nextForm = {}

  conflicts.value.forEach((conflict) => {
    nextAction[conflict.appointmentId] = actionByAppointment.value[conflict.appointmentId] || null
    nextForm[conflict.appointmentId] = formByAppointment.value[conflict.appointmentId] || {
      date: conflict.defaultDate,
      startTime: conflict.defaultStartTime,
      endTime: conflict.defaultEndTime,
      status: 'Realizado',
      cancellationReason: '',
    }
  })

  actionByAppointment.value = nextAction
  formByAppointment.value = nextForm
}

watch(
  () => props.initialConflicts,
  (next) => {
    hydrateState(next)
  },
  { immediate: true }
)

const pendingCount = computed(() => conflicts.value.length)
const hasPendingConflicts = computed(() => pendingCount.value > 0)
const pendingPayloadData = computed(() => props.pendingBlockPayload?.payload || null)

function setAction(appointmentId, action) {
  actionByAppointment.value = {
    ...actionByAppointment.value,
    [appointmentId]: action,
  }

  if (action === 'status_cancelled') {
    formByAppointment.value[appointmentId].status = 'Cancelado'
  }
  if (action === 'status_no_show') {
    formByAppointment.value[appointmentId].status = 'Não Compareceu'
  }
  if (action === 'status_done') {
    formByAppointment.value[appointmentId].status = 'Realizado'
  }
}

function mergeDateAndTime(dateLike, timeStr) {
  const date = new Date(dateLike)
  const [h, m] = String(timeStr || '00:00').split(':').map(Number)
  date.setHours(h || 0, m || 0, 0, 0)
  return date
}

function formatDateTime(dateValue) {
  const d = new Date(dateValue)
  if (isNaN(d.getTime())) return '-'
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

async function refreshConflicts() {
  isRefreshing.value = true

  let result
  if (props.blockId) {
    result = await scheduleBlocksStore.fetchBlockConflicts(props.blockId)
  } else if (pendingPayloadData.value?.startAt && pendingPayloadData.value?.endAt) {
    result = await scheduleBlocksStore.previewBlockConflicts({
      ...(pendingPayloadData.value?.doctor ? { doctor: pendingPayloadData.value.doctor } : {}),
      ...(pendingPayloadData.value?.applyToAllDoctors ? { applyToAllDoctors: true } : {}),
      startAt: pendingPayloadData.value.startAt,
      endAt: pendingPayloadData.value.endAt,
    })
  } else {
    isRefreshing.value = false
    hydrateState([])
    emit('resolved')
    return
  }

  isRefreshing.value = false

  const { success, data, error } = result
  if (!success) {
    toast.error(error?.response?.data?.message || 'Não foi possível atualizar os conflitos do bloqueio.')
    return
  }

  const nextConflicts = data?.conflictSummary?.conflicts || []
  hydrateState(nextConflicts)

  if (nextConflicts.length === 0) {
    toast.success('Todos os conflitos foram resolvidos.')
    emit('resolved')
  }
}

async function applyResolution(conflict) {
  const appointmentId = conflict.appointmentId
  const selectedAction = actionByAppointment.value[appointmentId]
  const form = formByAppointment.value[appointmentId]

  if (!selectedAction) {
    toast.warning('Selecione uma ação para este agendamento.')
    return
  }

  loadingByAppointment.value = {
    ...loadingByAppointment.value,
    [appointmentId]: true,
  }

  try {
    if (selectedAction === 'reschedule') {
      const start = mergeDateAndTime(form.date, form.startTime)
      const end = mergeDateAndTime(form.date, form.endTime)

      if (end <= start) {
        toast.error('O horário de fim deve ser maior que o horário de início.')
        return
      }

      const result = await appointmentsStore.rescheduleAppointment(appointmentId, {
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        ...(props.blockId
          ? {
              conflictResolution: {
                scheduleBlockId: props.blockId,
              },
            }
          : {}),
      })

      if (!result.success) {
        throw result.error
      }

      toast.success('Agendamento reagendado com sucesso.')
    } else {
      const payload = { status: form.status }
      if (props.blockId) {
        payload.conflictResolution = {
          scheduleBlockId: props.blockId,
        }
      }

      if (form.status === 'Cancelado' && form.cancellationReason?.trim()) {
        payload.cancellationReason = form.cancellationReason.trim()
      }

      const result = await appointmentsStore.updateAppointment(appointmentId, payload)
      if (!result.success) {
        throw result.error
      }

      toast.success('Status do agendamento atualizado com sucesso.')
    }

    await refreshConflicts()
  } catch (error) {
    toast.error(error?.response?.data?.message || 'Não foi possível resolver este conflito.')
  } finally {
    loadingByAppointment.value = {
      ...loadingByAppointment.value,
      [appointmentId]: false,
    }
  }
}

function closeDrawer() {
  emit('close')
}
</script>

<template>
  <SideDrawer size="xl" @close="closeDrawer">
    <template #header>
      <header class="drawer-header">
        <div class="header-top">
          <h2 class="header-title">
            <AlertTriangle :size="20" class="header-icon" />
            Resolver Conflitos do Bloqueio
          </h2>
          <button @click="closeDrawer" class="mobile-close-btn">
            <X :size="24" />
          </button>
        </div>
        <p class="header-subtitle">
          <template v-if="pendingBlockPayload?.payload">
            Resolva {{ pendingCount }} agendamento(s) impactado(s) para concluir o bloqueio <strong>{{ blockTitle }}</strong>.
          </template>
          <template v-else>
            O bloqueio <strong>{{ blockTitle }}</strong> foi criado e impactou {{ pendingCount }} agendamento(s).
          </template>
        </p>
      </header>
    </template>

    <template #default>
      <div class="content">
        <div class="top-actions">
          <AppButton variant="outline" :loading="isRefreshing" @click="refreshConflicts">
            Atualizar lista
          </AppButton>
        </div>

        <div v-if="!hasPendingConflicts" class="empty-state">
          <CheckCircle2 :size="18" />
          Nenhum conflito pendente.
        </div>

        <article v-for="conflict in conflicts" :key="conflict.appointmentId" class="conflict-card">
          <header class="card-header">
            <div class="card-title">{{ conflict.patientName }}</div>
            <div class="card-status">{{ conflict.status }}</div>
          </header>

          <div class="info-grid">
            <div class="info-item">
              <Clock3 :size="14" />
              <span>{{ formatDateTime(conflict.startTime) }} - {{ format(new Date(conflict.endTime), 'HH:mm') }}</span>
            </div>
            <div class="info-item">
              <Stethoscope :size="14" />
              <span>{{ conflict.doctorName }}</span>
            </div>
            <div v-if="conflict.notes" class="info-item note-item">
              <StickyNote :size="14" />
              <span>{{ conflict.notes }}</span>
            </div>
          </div>

          <div class="resolution-actions">
            <button
              class="action-chip"
              :class="{ active: actionByAppointment[conflict.appointmentId] === 'reschedule' }"
              @click="setAction(conflict.appointmentId, 'reschedule')"
            >
              Reagendar
            </button>
            <button
              class="action-chip"
              :class="{ active: actionByAppointment[conflict.appointmentId] === 'status_done' }"
              @click="setAction(conflict.appointmentId, 'status_done')"
            >
              Marcar como realizado
            </button>
            <button
              class="action-chip"
              :class="{ active: actionByAppointment[conflict.appointmentId] === 'status_no_show' }"
              @click="setAction(conflict.appointmentId, 'status_no_show')"
            >
              Marcar não compareceu
            </button>
            <button
              class="action-chip"
              :class="{ active: actionByAppointment[conflict.appointmentId] === 'status_cancelled' }"
              @click="setAction(conflict.appointmentId, 'status_cancelled')"
            >
              Marcar cancelado
            </button>
          </div>

          <div v-if="actionByAppointment[conflict.appointmentId] === 'reschedule'" class="resolution-form">
            <div class="form-group">
              <label class="form-label">Nova data</label>
              <Datepicker
                v-model="formByAppointment[conflict.appointmentId].date"
                locale="pt-BR"
                format="dd/MM/yyyy"
                :enable-time-picker="false"
                auto-apply
                :teleport="true"
              />
            </div>

            <div class="time-grid">
              <FormInput
                v-model="formByAppointment[conflict.appointmentId].startTime"
                label="Hora início"
                type="time"
                :required="true"
              />
              <FormInput
                v-model="formByAppointment[conflict.appointmentId].endTime"
                label="Hora fim"
                type="time"
                :required="true"
              />
            </div>
          </div>

          <div
            v-else-if="actionByAppointment[conflict.appointmentId] === 'status_cancelled'"
            class="resolution-form"
          >
            <FormInput
              v-model="formByAppointment[conflict.appointmentId].cancellationReason"
              label="Motivo do cancelamento (opcional)"
              placeholder="Informe o motivo, se necessário"
            />
          </div>

          <div class="card-footer">
            <AppButton
              variant="primary"
              :loading="loadingByAppointment[conflict.appointmentId]"
              @click="applyResolution(conflict)"
            >
              Aplicar ação
            </AppButton>
          </div>
        </article>
      </div>
    </template>

    <template #footer>
      <footer class="drawer-footer">
        <AppButton @click="closeDrawer">Fechar</AppButton>
      </footer>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-size: 1.1rem;
  color: #111827;
}

.header-icon {
  color: #f59e0b;
}

.header-subtitle {
  margin: 0.5rem 0 0;
  color: #6b7280;
  font-size: 0.9rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.top-actions {
  display: flex;
  justify-content: flex-end;
}

.empty-state {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #15803d;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 0.75rem;
  padding: 0.75rem;
}

.conflict-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.9rem;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.card-title {
  font-weight: 700;
  color: #111827;
}

.card-status {
  font-size: 0.78rem;
  color: #374151;
  background: #f3f4f6;
  border-radius: 9999px;
  padding: 0.25rem 0.6rem;
}

.info-grid {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: #4b5563;
  font-size: 0.86rem;
}

.note-item {
  align-items: flex-start;
}

.resolution-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.action-chip {
  border: 1px solid #d1d5db;
  background: #fff;
  color: #374151;
  border-radius: 9999px;
  padding: 0.35rem 0.7rem;
  font-size: 0.78rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-chip:hover {
  border-color: var(--azul-principal);
  color: var(--azul-principal);
}

.action-chip.active {
  background: #eff6ff;
  border-color: var(--azul-principal);
  color: var(--azul-principal);
}

.resolution-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 0.75rem;
}

.form-group {
  text-align: left;
}

.form-label {
  display: block;
  margin-bottom: 0.45rem;
  font-size: 0.85rem;
  color: #374151;
  font-weight: 500;
}

.time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.card-footer {
  display: flex;
  justify-content: flex-end;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .time-grid {
    grid-template-columns: 1fr;
  }

  .card-footer {
    justify-content: stretch;
  }

  .card-footer :deep(.app-button) {
    width: 100%;
  }
}
</style>
