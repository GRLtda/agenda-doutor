<script setup>
import { ref, computed } from 'vue' // 1. Importar o 'computed'
import { useClinicStore } from '@/stores/clinic'
import { Check } from 'lucide-vue-next'
import CustomSelect from '@/components/global/CustomSelect.vue'

const emit = defineEmits(['success'])
const clinicStore = useClinicStore()
const errorMessage = ref(null)

const dayEnum = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo']

const timeOptions = Array.from({ length: 24 * 2 }, (_, i) => {
  const hours = Math.floor(i / 2)
    .toString()
    .padStart(2, '0')
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${hours}:${minutes}`
})

const workingHours = ref(
  dayEnum.map((day) => ({
    day: day,
    startTime: '09:00',
    endTime: '18:00',
    isOpen: !['Sábado', 'Domingo'].includes(day),
  })),
)

// 2. Lógica da calculadora
const totalOpenDays = computed(() => {
  return workingHours.value.filter((day) => day.isOpen).length
})

const totalWeeklyHours = computed(() => {
  return workingHours.value
    .filter((day) => day.isOpen)
    .reduce((total, day) => {
      const [startHours, startMinutes] = day.startTime.split(':').map(Number)
      const [endHours, endMinutes] = day.endTime.split(':').map(Number)
      const start = startHours * 60 + startMinutes
      const end = endHours * 60 + endMinutes
      const dailyHours = end > start ? (end - start) / 60 : 0
      return total + dailyHours
    }, 0)
})

async function handleSaveHours() {
  errorMessage.value = null
  const openDays = workingHours.value.filter((day) => day.isOpen)
  const { success } = await clinicStore.updateClinicDetails({ workingHours: openDays })

  if (success) {
    emit('success')
  } else {
    errorMessage.value = 'Não foi possível salvar os horários.'
  }
}
</script>

<template>
  <form @submit.prevent="handleSaveHours" class="hours-form">
    <div class="form-header">
      <h2>Horário de Funcionamento</h2>
      <p>Defina os dias e horários em que a clínica estará aberta para atendimentos.</p>
    </div>

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
            <label class="time-field">
              <span>Abre</span>
              <CustomSelect v-model="day.startTime" :options="timeOptions" />
            </label>
            <label class="time-field">
              <span>Fecha</span>
              <CustomSelect v-model="day.endTime" :options="timeOptions" />
            </label>
          </div>
          <div v-else class="closed-text">Fechado</div>
        </div>
      </div>
    </div>

    <div class="hours-summary">
      <div class="summary-item">
        <span class="summary-label">Dias abertos</span>
        <span class="summary-value">{{ totalOpenDays }} / 7</span>
      </div>
      <div class="summary-item">
        <span class="summary-label">Total de horas / semana</span>
        <span class="summary-value">{{ totalWeeklyHours.toFixed(1).replace('.', ',') }}h</span>
      </div>
    </div>

    <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>
    <button type="submit" class="auth-button">Salvar e Continuar</button>
  </form>
</template>

<style scoped>
.form-header {
  text-align: left;
  margin-bottom: 0.75rem;
}
h2 {
  font-size: 1.25rem;
  margin-bottom: 0.25rem;
}
p {
  color: var(--cinza-texto);
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 0;
}

.days-grid {
  display: grid;
  gap: 0.5rem;
}

.day-card {
  display: grid;
  grid-template-columns: minmax(118px, 0.45fr) minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem;
  border-radius: 8px;
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
  margin-bottom: 0;
}
.day-name {
  font-weight: 600;
  color: #374151;
  font-size: 0.8rem;
  text-transform: uppercase;
}
.card-body {
  min-width: 0;
}

.closed-text {
  font-weight: 500;
  color: var(--cinza-texto);
  width: 100%;
}
.time-inputs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.6rem;
  min-width: 0;
}
.time-field {
  display: grid;
  gap: 0.25rem;
  min-width: 0;
}

.time-field span {
  color: var(--cinza-texto);
  font-size: 0.72rem;
  font-weight: 600;
}

.time-field :deep(.custom-select) {
  width: 100%;
  min-width: 0;
}

.time-field :deep(.select-button) {
  min-height: 38px;
  padding: 0.5rem 0.65rem;
}

/* Sumário */
.hours-summary {
  display: flex;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #f9fafb;
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
}
.summary-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.summary-label {
  font-size: 0.875rem;
  color: var(--cinza-texto);
}
.summary-value {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--preto);
}

/* Estilos de checkbox (sem alterações) */
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

/* Botão e erros (sem alterações) */
.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 1rem;
  text-align: center;
}
.auth-button {
  width: 100%;
  padding: 0.875rem;
  margin-top: 0.85rem;
  border-radius: 0.75rem;
  border: none;
  background-color: var(--azul-principal);
  color: var(--branco);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s ease;
}
.auth-button:hover {
  background-color: var(--azul-escuro);
}

@media (max-width: 640px) {
  .day-card {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }

  .card-header {
    justify-content: flex-start;
  }

  .hours-summary {
    gap: 0.75rem;
  }
}

@media (max-width: 420px) {
  .time-inputs {
    grid-template-columns: 1fr;
  }

  .hours-summary {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
