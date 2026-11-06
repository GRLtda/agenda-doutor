<script setup>
import { weekDays, getWeeklyHours } from '@/utils/workingHours'
import WorkingHoursFields from '@/components/shared/WorkingHoursFields.vue'
import { ref, computed } from 'vue' // 1. Importar o 'computed'
import { useClinicStore } from '@/stores/clinic'

const emit = defineEmits(['success'])
const clinicStore = useClinicStore()
const errorMessage = ref(null)

const dayEnum = weekDays

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

const totalWeeklyHours = computed(() => getWeeklyHours(workingHours.value))

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

    <WorkingHoursFields v-model="workingHours" />

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

  .hours-summary {
    gap: 0.75rem;
  }
}

@media (max-width: 420px) {

  .hours-summary {
    display: grid;
    grid-template-columns: 1fr;
  }
}
</style>
