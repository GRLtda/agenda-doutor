<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinicStore } from '@/stores/clinic'
import { Check, Settings } from 'lucide-vue-next'
import CustomSelect from '@/components/global/CustomSelect.vue'
import Switch from '@/components/global/Switch.vue'
import AppButton from '@/components/global/AppButton.vue'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()
const toast = useToast()
const clinicStore = useClinicStore()
const successMessage = ref('')

const dayEnum = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']
const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
  const hours = Math.floor(i / 2)
    .toString()
    .padStart(2, '0')
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${hours}:${minutes}`
})

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

const totalWeeklyHours = computed(() => {
  return workingHours.value
    .filter((day) => day.isOpen)
    .reduce((total, day) => {
      const start = parseFloat(day.startTime.replace(':', '.'))
      const end = parseFloat(day.endTime.replace(':', '.'))
      const dailyHours = end > start ? end - start : 0
      return total + dailyHours
    }, 0)
})

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
    <div class="days-grid">
      <div
        v-for="day in workingHours"
        :key="day.day"
        class="day-card"
        :class="{ closed: !day.isOpen }"
      >
        <div class="card-header">
          <label class="checkbox-wrapper">
            <input type="checkbox" v-model="day.isOpen" />
            <span class="checkmark"><Check :size="12" stroke-width="3" /></span>
          </label>
          <span class="day-name">{{ day.day }}</span>
        </div>
        <div class="card-body">
          <div class="time-inputs" v-if="day.isOpen">
            <CustomSelect v-model="day.startTime" :options="timeOptions" />
            <span class="separator">às</span>
            <CustomSelect v-model="day.endTime" :options="timeOptions" />
          </div>
          <div v-else class="closed-text">Fechado</div>
        </div>
      </div>
    </div>

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
.days-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
}
.day-card {
  padding: 1rem;
  border-radius: 1rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}
.day-card.closed {
  background-color: #f9fafb;
  opacity: 0.7;
}
.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}
.day-name {
  font-weight: 600;
  color: #374151;
}
.card-body {
  padding-left: 38px;
  min-height: 40px;
  display: flex;
  align-items: center;
}
.time-inputs {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}
.time-inputs :deep(.custom-select) {
  flex-grow: 1;
  width: auto;
  min-width: 80px;
}
.separator {
  color: var(--cinza-texto);
}
.closed-text {
  font-weight: 500;
  color: var(--cinza-texto);
  width: 100%;
}
.checkbox-wrapper {
  position: relative;
  display: inline-block;
  width: 22px;
  height: 22px;
  cursor: pointer;
}
.checkbox-wrapper input {
  opacity: 0;
  width: 0;
  height: 0;
}
.checkmark {
  position: absolute;
  top: 0;
  left: 0;
  height: 22px;
  width: 22px;
  background-color: var(--branco);
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--branco);
  transition: all 0.2s ease;
}
.checkbox-wrapper:hover .checkmark {
  border-color: #9ca3af;
}
.checkbox-wrapper input:checked ~ .checkmark {
  background-color: var(--azul-principal);
  border-color: var(--azul-principal);
}

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
