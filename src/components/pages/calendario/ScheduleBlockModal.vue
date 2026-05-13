<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { CalendarMinus, Trash2, X, Clock, Calendar, PartyPopper, Ban, Tag } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'
import SideDrawer from '@/components/global/SideDrawer.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import Switch from '@/components/global/Switch.vue'
import AppButton from '@/components/global/AppButton.vue'
import FormInput from '@/components/global/FormInput.vue'
import { useScheduleBlocksStore } from '@/stores/scheduleBlocks'
import { useClinicStore } from '@/stores/clinic'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  initialData: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['close', 'saved', 'resolve-before-save'])

const toast = useToast()
const scheduleBlocksStore = useScheduleBlocksStore()
const clinicStore = useClinicStore()
const authStore = useAuthStore()

const errors = ref({})
const ALL_DOCTORS_OPTION = '__ALL_DOCTORS__'

const isEditMode = computed(() => !!props.initialData?._id)

const blockTypes = [
  { value: 'folga', label: 'Folga', icon: Clock },
  { value: 'compromisso', label: 'Compromisso', icon: Calendar },
  { value: 'ferias', label: 'Férias', icon: PartyPopper },
  { value: 'indisponivel', label: 'Indisponível', icon: Ban },
  { value: 'outro', label: 'Outro', icon: Tag },
]

const doctorOptions = computed(() => {
  const staff = clinicStore.currentClinic?.staff || []
  const options = staff
    .filter((member) => member.role === 'medico' || member.role === 'owner')
    .map((member) => ({
      value: member._id,
      label: member.name,
      image: member.profilePhotoUrl,
    }))

  if (!isEditMode.value && !isCurrentUserDoctor.value) {
    return [{ value: ALL_DOCTORS_OPTION, label: 'Todos os médicos' }, ...options]
  }

  return options
})

const isCurrentUserDoctor = computed(() => authStore.user?.role === 'medico')

const form = ref({
  doctor: null,
  title: '',
  type: 'indisponivel',
  notes: '',
  isAllDay: false,
  startDate: new Date(),
  startTime: '09:00',
  endDate: new Date(),
  endTime: '09:30',
})

function pad(value) {
  return String(value).padStart(2, '0')
}

function toTimeString(dateLike) {
  const d = new Date(dateLike)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function mergeDateAndTime(dateLike, time) {
  const date = new Date(dateLike)
  const [hours, minutes] = String(time || '00:00').split(':').map(Number)
  date.setHours(hours || 0, minutes || 0, 0, 0)
  return date
}

function plusMinutes(dateLike, minutes) {
  const d = new Date(dateLike)
  d.setMinutes(d.getMinutes() + minutes)
  return d
}

function initializeForm() {
  const now = new Date()
  const roundedStart = new Date(now)
  roundedStart.setMinutes(roundedStart.getMinutes() - (roundedStart.getMinutes() % 15), 0, 0)
  const defaultEnd = plusMinutes(roundedStart, 30)

  const startAt = props.initialData?.startAt || props.initialData?.date || roundedStart
  const endAt = props.initialData?.endAt || plusMinutes(startAt, 30)
  const initialDoctor = props.initialData?.doctor?._id || props.initialData?.doctor || null

  form.value = {
    doctor: initialDoctor || (isCurrentUserDoctor.value ? authStore.user?._id : null),
    title: props.initialData?.title || '',
    type: props.initialData?.type || 'indisponivel',
    notes: props.initialData?.notes || '',
    isAllDay: !!props.initialData?.isAllDay,
    startDate: new Date(startAt),
    startTime: props.initialData?.startTime || toTimeString(startAt),
    endDate: new Date(endAt),
    endTime: props.initialData?.endTime || toTimeString(endAt),
  }

  if (!form.value.doctor && doctorOptions.value.length === 1) {
    form.value.doctor = doctorOptions.value[0].value
  }
}

onMounted(() => {
  initializeForm()
})

watch(
  () => form.value.isAllDay,
  (isAllDay) => {
    if (isAllDay) {
      form.value.startTime = '00:00'
      form.value.endTime = '23:59'
    }
  }
)

function validateForm() {
  const nextErrors = {}

  if (!form.value.doctor) nextErrors.doctor = 'Selecione o médico.'
  if (!form.value.title?.trim()) nextErrors.title = 'Informe o título do bloqueio.'
  if (!form.value.type) nextErrors.type = 'Selecione o tipo.'
  if (!form.value.startDate) nextErrors.startDate = 'Informe a data de início.'
  if (!form.value.endDate) nextErrors.endDate = 'Informe a data de fim.'
  if (!form.value.isAllDay && !form.value.startTime) nextErrors.startTime = 'Informe o horário de início.'
  if (!form.value.isAllDay && !form.value.endTime) nextErrors.endTime = 'Informe o horário de fim.'

  const start = mergeDateAndTime(form.value.startDate, form.value.isAllDay ? '00:00' : form.value.startTime)
  const end = mergeDateAndTime(form.value.endDate, form.value.isAllDay ? '23:59' : form.value.endTime)

  if (end <= start) {
    nextErrors.interval = 'O horário final deve ser maior que o horário inicial.'
  }

  errors.value = nextErrors
  return Object.keys(nextErrors).length === 0
}

function getPayload() {
  const start = mergeDateAndTime(form.value.startDate, form.value.isAllDay ? '00:00' : form.value.startTime)
  const end = mergeDateAndTime(form.value.endDate, form.value.isAllDay ? '23:59' : form.value.endTime)
  const applyToAllDoctors = !isEditMode.value && !isCurrentUserDoctor.value && form.value.doctor === ALL_DOCTORS_OPTION

  return {
    ...(applyToAllDoctors ? {} : { doctor: form.value.doctor }),
    ...(applyToAllDoctors ? { applyToAllDoctors: true } : {}),
    title: form.value.title.trim(),
    type: form.value.type,
    notes: form.value.notes?.trim() || '',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    isAllDay: !!form.value.isAllDay,
  }
}

async function handleSubmit() {
  if (!validateForm()) return

  const payload = getPayload()
  const previewPayload = {
    ...(payload.doctor ? { doctor: payload.doctor } : {}),
    ...(payload.applyToAllDoctors ? { applyToAllDoctors: true } : {}),
    startAt: payload.startAt,
    endAt: payload.endAt,
  }

  if (isEditMode.value) {
    const previewResult = await scheduleBlocksStore.previewBlockConflicts(previewPayload)
    if (!previewResult.success) {
      toast.error(previewResult.error?.response?.data?.message || 'Não foi possível validar conflitos do bloqueio.')
      return
    }

    const previewConflicts = previewResult.data?.conflictSummary?.conflicts || []
    if (previewConflicts.length > 0) {
      toast.info('Resolva os agendamentos em conflito para concluir a atualização do bloqueio.')
      emit('resolve-before-save', {
        operation: 'update',
        blockId: props.initialData._id,
        payload,
        conflicts: previewConflicts,
        conflictSummary: previewResult.data?.conflictSummary,
      })
      emit('close')
      return
    }

    const { success, error, data } = await scheduleBlocksStore.updateBlock(props.initialData._id, {
      ...payload,
      requireNoConflicts: true,
    })

    if (!success) {
      const conflictSummary = error?.response?.data?.conflictSummary
      const conflictItems = conflictSummary?.conflicts || []

      if (error?.response?.status === 409 && conflictItems.length > 0) {
        toast.warning('Novos conflitos surgiram durante a atualização. Resolva-os para finalizar.')
        emit('resolve-before-save', {
          operation: 'update',
          blockId: props.initialData._id,
          payload,
          conflicts: conflictItems,
          conflictSummary,
        })
        emit('close')
        return
      }

      const message = error?.response?.data?.message || 'Não foi possível salvar o bloqueio.'
      toast.error(message)
      return
    }

    const conflicts = data?.conflictSummary?.conflictingAppointmentsCount || 0
    if (conflicts > 0) {
      toast.warning(`Bloqueio salvo com ${conflicts} agendamento(s) em conflito.`)
    } else {
      toast.success('Bloqueio atualizado com sucesso.')
    }

    emit('saved', data)
    emit('close')
    return
  }

  const previewResult = await scheduleBlocksStore.previewBlockConflicts(previewPayload)
  if (!previewResult.success) {
    toast.error(previewResult.error?.response?.data?.message || 'Não foi possível validar conflitos do bloqueio.')
    return
  }

  const previewConflicts = previewResult.data?.conflictSummary?.conflicts || []
  if (previewConflicts.length > 0) {
    toast.info('Resolva os agendamentos em conflito para concluir a criação do bloqueio.')
    emit('resolve-before-save', {
      operation: 'create',
      payload,
      conflicts: previewConflicts,
      conflictSummary: previewResult.data?.conflictSummary,
    })
    emit('close')
    return
  }

  const createResult = await scheduleBlocksStore.createBlock({
    ...payload,
    requireNoConflicts: true,
  })

  if (!createResult.success) {
    const conflictSummary = createResult.error?.response?.data?.conflictSummary
    const conflictItems = conflictSummary?.conflicts || []

    if (createResult.error?.response?.status === 409 && conflictItems.length > 0) {
      toast.warning('Novos conflitos surgiram durante a criação. Resolva-os para finalizar.')
      emit('resolve-before-save', {
        operation: 'create',
        payload,
        conflicts: conflictItems,
        conflictSummary,
      })
      emit('close')
      return
    }

    const message = createResult.error?.response?.data?.message || 'Não foi possível salvar o bloqueio.'
    toast.error(message)
    return
  }

  toast.success('Bloqueio criado com sucesso.')
  emit('saved', createResult.data)
  emit('close')
}

async function handleDelete() {
  if (!isEditMode.value) return
  const confirmed = window.confirm('Deseja excluir este bloqueio de agenda?')
  if (!confirmed) return

  const { success, error } = await scheduleBlocksStore.deleteBlock(props.initialData._id)
  if (!success) {
    toast.error(error?.response?.data?.message || 'Não foi possível excluir o bloqueio.')
    return
  }

  toast.success('Bloqueio excluído com sucesso.')
  emit('saved', null)
  emit('close')
}
</script>

<template>
  <SideDrawer @close="$emit('close')">
    <template #header>
      <header class="drawer-header">
        <div class="header-top">
          <h2 class="header-title">
            <CalendarMinus :size="20" class="header-icon" />
            {{ isEditMode ? 'Editar Bloqueio' : 'Novo Bloqueio de Agenda' }}
          </h2>

          <button @click="$emit('close')" class="mobile-close-btn">
            <X :size="24" />
          </button>
        </div>
        <p class="header-subtitle">
          Defina um período de indisponibilidade para impedir agendamentos neste intervalo.
        </p>
      </header>
    </template>

    <template #default>
      <div class="content">
        <div class="form-group">
          <label class="form-label">Médico Responsável</label>
          <StyledSelect
            v-model="form.doctor"
            :options="doctorOptions"
            :error="!!errors.doctor"
            placeholder="Selecione o médico"
            :disabled="isCurrentUserDoctor"
          />
          <p v-if="errors.doctor" class="error-message">{{ errors.doctor }}</p>
        </div>

        <FormInput
          v-model="form.title"
          label="Título do bloqueio"
          placeholder="Ex: Férias, Congresso, Compromisso pessoal"
          :error="errors.title"
          :required="true"
        />

        <div class="form-group">
          <label class="form-label">Tipo</label>
          <StyledSelect
            v-model="form.type"
            :options="blockTypes"
            :error="!!errors.type"
            placeholder="Selecione o tipo"
          />
          <p v-if="errors.type" class="error-message">{{ errors.type }}</p>
        </div>

        <Switch v-model="form.isAllDay" label="Dia inteiro" />

        <div class="date-time-grid">
          <div class="form-group">
            <label class="form-label">Data início</label>
            <Datepicker
              v-model="form.startDate"
              locale="pt-BR"
              format="dd/MM/yyyy"
              :enable-time-picker="false"
              auto-apply
              :teleport="true"
            />
            <p v-if="errors.startDate" class="error-message">{{ errors.startDate }}</p>
          </div>

          <FormInput
            v-model="form.startTime"
            class="time-field"
            label="Hora início"
            type="time"
            :disabled="form.isAllDay"
            :error="errors.startTime"
            :required="!form.isAllDay"
          />
        </div>

        <div class="date-time-grid">
          <div class="form-group">
            <label class="form-label">Data fim</label>
            <Datepicker
              v-model="form.endDate"
              locale="pt-BR"
              format="dd/MM/yyyy"
              :enable-time-picker="false"
              auto-apply
              :teleport="true"
            />
            <p v-if="errors.endDate" class="error-message">{{ errors.endDate }}</p>
          </div>

          <FormInput
            v-model="form.endTime"
            class="time-field"
            label="Hora fim"
            type="time"
            :disabled="form.isAllDay"
            :error="errors.endTime"
            :required="!form.isAllDay"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Observação</label>
          <textarea
            v-model="form.notes"
            class="notes-textarea"
            placeholder="Observações internas (opcional)"
            rows="4"
          ></textarea>
        </div>

        <p v-if="errors.interval" class="error-message">{{ errors.interval }}</p>
      </div>
    </template>

    <template #footer>
      <footer class="drawer-footer">
        <AppButton v-if="isEditMode" variant="dangerous" @click="handleDelete">
          <Trash2 :size="16" />
          Excluir
        </AppButton>

        <div class="actions-right">
          <AppButton @click="$emit('close')">Cancelar</AppButton>
          <AppButton variant="primary" :loading="scheduleBlocksStore.isLoading" @click="handleSubmit">
            {{ isEditMode ? 'Salvar alterações' : 'Criar bloqueio' }}
          </AppButton>
        </div>
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
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
  color: #111827;
}

.header-icon {
  color: var(--azul-principal);
}

.header-subtitle {
  margin: 0.5rem 0 0;
  color: #6b7280;
  font-size: 0.875rem;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  text-align: left;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.date-time-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  align-items: end;
}

.date-time-grid .form-group {
  margin-bottom: 0;
}

.date-time-grid :deep(.time-field) {
  margin-bottom: 0;
}

.notes-textarea {
  width: 100%;
  border: 1px solid #d1d5db;
  border-radius: 0.75rem;
  padding: 0.75rem 0.9rem;
  resize: none;
  min-height: 110px;
  font-size: 0.95rem;
}

.notes-textarea:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
}

.error-message {
  color: #ef4444;
  font-size: 0.8rem;
  margin-top: 0.4rem;
}

.drawer-footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  background-color: #fff;
}

.actions-right {
  display: flex;
  gap: 0.5rem;
  margin-left: auto;
}

@media (max-width: 768px) {
  .date-time-grid {
    grid-template-columns: 1fr;
  }

  .drawer-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .actions-right {
    width: 100%;
  }

  .actions-right :deep(.app-button),
  .drawer-footer :deep(.app-button) {
    width: 100%;
  }
}
</style>

