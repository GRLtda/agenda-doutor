<script setup>
import { weekDays, getWeeklyHours } from '@/utils/workingHours'
import WorkingHoursFields from '@/components/shared/WorkingHoursFields.vue'
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinicStore } from '@/stores/clinic'

import Switch from '@/components/global/Switch.vue'
import AppButton from '@/components/global/AppButton.vue'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()
const toast = useToast()
const clinicStore = useClinicStore()
const successMessage = ref('')

const dayEnum = weekDays

const workingHours = ref([])
const allowAppointmentsOutsideWorkingHours = ref(false)

onMounted(() => {
  const clinic = authStore.user?.clinic
  if (clinic) {
    allowAppointmentsOutsideWorkingHours.value = clinic.allowAppointmentsOutsideWorkingHours || false
    const savedHours = clinic.workingHours || []
    workingHours.value = dayEnum.map((dayName) => {
      const savedDay = savedHours.find((h) => h.day === dayName)
      return (
        savedDay || {
          day: dayName,
          startTime: '09:00',
          endTime: '18:00',
          isOpen: !['Sábado', 'Domingo'].includes(dayName),
        }
      )
    })
  }
})

const totalOpenDays = computed(() => workingHours.value.filter((day) => day.isOpen).length)

const totalWeeklyHours = computed(() => getWeeklyHours(workingHours.value))

async function handleUpdateHours() {
  successMessage.value = ''
  const openDays = workingHours.value.filter((day) => day.isOpen)

  const payload = {
    workingHours: openDays,
    allowAppointmentsOutsideWorkingHours: allowAppointmentsOutsideWorkingHours.value,
  }

  const { success } = await clinicStore.updateClinicDetails(payload)
  if (success) {
    toast.success('Horários atualizados com sucesso!')
  } else {
    toast.error('Erro ao atualizar os horários.')
  }
}
</script>

<template>
  <form @submit.prevent="handleUpdateHours" class="hours-form">
    <WorkingHoursFields v-model="workingHours" />

    <div class="summary-and-action">
      <div class="hours-summary">
        <div class="summary-details">
          <div class="summary-item">
            <span class="summary-label">Dias abertos</span>
            <span class="summary-value">{{ totalOpenDays }} / 7</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Total de horas / semana</span>
            <span class="summary-value">{{ totalWeeklyHours.toFixed(1).replace('.', ',') }}h</span>
          </div>
        </div>
        <div class="summary-allow">
            <Switch
              v-model="allowAppointmentsOutsideWorkingHours"
              label="Permitir agendamentos fora do horário de funcionamento"
            />
        </div>
      </div>
      <div class="action-wrapper">
        <span v-if="successMessage" class="success-message">{{ successMessage }}</span>
        <AppButton type="submit" variant="primary">Salvar Alterações</AppButton>
      </div>
    </div>
  </form>
</template>

<style scoped>
.summary-and-action {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
  gap: 2rem;
}

.hours-summary {
  display: flex;
  flex-direction: row;
  gap: 1.5rem;
  background-color: #eef2ff;
  padding: 1.5rem;
  border-radius: 1rem;
  flex-grow: 1;
}

.summary-details {
  display: flex;
  gap: 2rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.summary-label {
  font-size: 0.875rem;
  color: #60a5fa;
}
.summary-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--azul-principal);
}

.extra-options-section {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #dbeafe;
}

.extra-options-section :deep(.switch-container) {
  align-items: center;
}

.extra-options-section :deep(.switch-label) {
  padding-top: 0;
}

.extra-options-section :deep(.switch-label) {
  color: #1e3a8a;
}

.action-wrapper {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}
.success-message {
  color: #10b981;
  font-weight: 500;
}
.success-message {
  color: #10b981;
  font-weight: 500;
}

@media (max-width: 900px) {
  .hours-summary{
    flex-direction: column;
    align-items: flex-start;
    gap: 2rem;
  }
  .summary-and-action {
    flex-direction: column;
    align-items: stretch;
    gap: 1.5rem;
  }

  .action-wrapper {
    justify-content: center;
  }
}
</style>
