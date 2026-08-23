<script setup>
import { computed, onMounted, ref } from 'vue'
import { CalendarDays, FileDown, MapPin, Sparkles } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import {
  importFacialPlanningToAppointment,
  listImportableFacialPlannings,
} from '@/api/facial-plannings'

const props = defineProps({
  patientId: { type: String, required: true },
  appointmentId: { type: String, required: true },
  recordId: { type: String, default: null },
})

const emit = defineEmits(['close', 'imported'])
const toast = useToast()
const plannings = ref([])
const selectedId = ref(null)
const isLoading = ref(true)
const isImporting = ref(false)

const selectedPlanning = computed(
  () => plannings.value.find((planning) => planning._id === selectedId.value) || null,
)

function formatDate(value) {
  return value ? new Date(value).toLocaleDateString('pt-BR') : '-'
}

async function loadPlannings() {
  isLoading.value = true
  try {
    const response = await listImportableFacialPlannings(props.patientId)
    plannings.value = response.data || []
  } catch (error) {
    toast.error(
      error.response?.data?.message || 'Não foi possível carregar os planejamentos em rascunho.',
    )
  } finally {
    isLoading.value = false
  }
}

async function importPlanning() {
  if (!selectedPlanning.value) return

  isImporting.value = true
  try {
    const response = await importFacialPlanningToAppointment(selectedPlanning.value._id, {
      appointmentId: props.appointmentId,
      recordId: props.recordId || undefined,
    })
    emit('imported', response.data)
    toast.success('Planejamento importado para o atendimento.')
  } catch (error) {
    toast.error(error.response?.data?.message || 'Não foi possível importar o planejamento.')
  } finally {
    isImporting.value = false
  }
}

onMounted(loadPlannings)
</script>

<template>
  <SideDrawer size="md" @close="emit('close')">
    <template #header>
      <div class="drawer-header">
        <div class="drawer-title-icon"><FileDown :size="20" /></div>
        <div>
          <h2>Importar planejamento</h2>
          <p>Selecione um rascunho para vincular a este atendimento.</p>
        </div>
      </div>
    </template>

    <div v-if="isLoading" class="drawer-state">Carregando planejamentos...</div>
    <div v-else-if="!plannings.length" class="drawer-state empty">
      <Sparkles :size="28" />
      <strong>Nenhum rascunho disponível</strong>
      <span>Os planejamentos em rascunho deste paciente aparecerão aqui.</span>
    </div>
    <div v-else class="planning-list">
      <button
        v-for="planning in plannings"
        :key="planning._id"
        type="button"
        class="planning-option"
        :class="{ selected: selectedId === planning._id }"
        @click="selectedId = planning._id"
      >
        <span class="option-radio" :class="{ active: selectedId === planning._id }"></span>
        <span class="option-content">
          <strong>{{ planning.title || 'Planejamento Facial' }}</strong>
          <small
            ><CalendarDays :size="13" /> Atualizado em {{ formatDate(planning.updatedAt) }}</small
          >
          <small><MapPin :size="13" /> {{ planning.points?.length || 0 }} ponto(s) no mapa</small>
          <em>{{ planning.author?.name || 'Profissional não informado' }}</em>
        </span>
      </button>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="outline" @click="emit('close')">Cancelar</AppButton>
        <AppButton
          variant="primary"
          :disabled="!selectedPlanning"
          :loading="isImporting"
          @click="importPlanning"
        >
          <FileDown :size="16" />
          Importar
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  border-bottom: 1px solid #e5eaf2;
}

.drawer-title-icon {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border-radius: 8px;
  background: #eaf1ff;
  color: #1d5eff;
}

.drawer-header h2,
.drawer-header p {
  margin: 0;
}

.drawer-header h2 {
  color: #17213b;
  font-size: 1rem;
}

.drawer-header p {
  margin-top: 3px;
  color: #71809a;
  font-size: 0.8rem;
}

.drawer-state {
  display: grid;
  min-height: 180px;
  place-content: center;
  gap: 8px;
  color: #71809a;
  font-size: 0.86rem;
  text-align: center;
}

.drawer-state.empty svg {
  justify-self: center;
  color: #91a5c5;
}

.drawer-state.empty strong {
  color: #33415c;
}

.planning-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.planning-option {
  display: flex;
  gap: 12px;
  width: 100%;
  padding: 13px;
  border: 1px solid #e1e7f0;
  border-radius: 8px;
  background: #ffffff;
  color: inherit;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background 0.16s ease;
}

.planning-option:hover,
.planning-option.selected {
  border-color: #b9d0ff;
  background: #f6f9ff;
}

.option-radio {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin-top: 2px;
  border: 1px solid #b7c4d8;
  border-radius: 50%;
}

.option-radio.active {
  border: 5px solid #2563eb;
}

.option-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.option-content strong {
  color: #1d2944;
  font-size: 0.86rem;
}

.option-content small {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: #6c7d98;
  font-size: 0.76rem;
}

.option-content em {
  margin-top: 2px;
  color: #96a4bb;
  font-size: 0.73rem;
  font-style: normal;
}

.drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid #e5eaf2;
}
</style>
