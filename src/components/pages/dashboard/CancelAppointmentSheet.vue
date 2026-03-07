<script setup>
import { ref } from 'vue'
import { AlertCircle } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import BottomSheet from '@/components/global/BottomSheet.vue'

const props = defineProps({
  loading: {
    type: Boolean,
    default: false
  },
  absolute: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'confirm'])

const cancelReason = ref('')
const reasonOptions = [
  'Paciente desistiu', 
  'Imprevisto médico', 
  'Erro de agendamento', 
  'Não compareceu',
  'Duplicidade',
  'Procedimento contraindicado',
  'Remarcado',
  'Outro'
]

// Scroll Drag Logic for Quick Reasons
const quickReasonsRef = ref(null)
const isDown = ref(false)
const isDragging = ref(false)
const startX = ref(0)
const scrollLeft = ref(0)

function startDragging(e) {
  isDown.value = true
  isDragging.value = false
  startX.value = e.pageX - quickReasonsRef.value.offsetLeft
  scrollLeft.value = quickReasonsRef.value.scrollLeft
}

function stopDragging() {
  isDown.value = false
  setTimeout(() => {
    isDragging.value = false
  }, 100)
}

function onDragMove(e) {
  if (!isDown.value) return
  e.preventDefault()
  const x = e.pageX - quickReasonsRef.value.offsetLeft
  const walk = x - startX.value
  
  if (Math.abs(walk) > 5) {
    isDragging.value = true
    quickReasonsRef.value.scrollLeft = scrollLeft.value - walk * 1.5
  }
}

function selectReason(reason) {
  if (isDragging.value) return 
  cancelReason.value = reason
}

function handleClose() {
    emit('close')
}

function handleConfirm() {
    emit('confirm', cancelReason.value)
}
</script>

<template>
  <BottomSheet 
    :title="'Cancelar Atendimento'" 
    @close="handleClose"
    :absolute="absolute"
  >
    <template #header>
      <div class="sheet-header-custom">
         <div class="header-icon-wrapper">
            <AlertCircle :size="24" class="icon-danger" />
         </div>
         <div class="header-texts">
            <h3 class="header-title">Cancelar Atendimento</h3>
            <p class="header-subtitle">O agendamento poderá ser reaberto</p>
         </div>
      </div>
    </template>

    <div class="cancel-sheet-content">
      <p class="cancel-description">
        Selecione um motivo rápido ou descreva abaixo o motivo do cancelamento deste agendamento.
      </p>
      
      <div class="textarea-header">
          <label class="textarea-label">Descrever Motivo</label>
          <span class="textarea-counter">{{ cancelReason.length }}/140</span>
      </div>
      <textarea 
          v-model="cancelReason"
          class="cancel-textarea"
          placeholder="Informe os detalhes do cancelamento..."
          rows="4"
          autofocus
          maxlength="140"
      ></textarea>

       <div 
        ref="quickReasonsRef"
        class="quick-reasons"
        :class="{ 'is-dragging': isDragging }"
        @mousedown="startDragging"
        @mouseleave="stopDragging"
        @mouseup="stopDragging"
        @mousemove="onDragMove"
        @dragstart.prevent
      >
          <button 
            v-for="reason in reasonOptions" 
            :key="reason"
            class="reason-chip"
            :class="{ 'active': cancelReason === reason }"
            @click="selectReason(reason)"
          >
            {{ reason }}
          </button>
      </div>
    </div>

    <template #footer>
      <div class="cancel-footer-actions">
          <AppButton @click="handleClose" variant="outline" class="btn-flex">
              Voltar
          </AppButton>
          <AppButton 
              @click="handleConfirm" 
              variant="dangerous" 
              class="btn-flex"
              :loading="loading"
              :disabled="loading"
          >
              {{ loading ? 'Cancelando...' : 'Confirmar Cancelamento' }}
          </AppButton>
      </div>
    </template>
  </BottomSheet>
</template>

<style scoped>
/* Adaptação de CSS Puro, mantendo o visual do AppointmentDetailsModal */
.sheet-header-custom {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.header-icon-wrapper {
  background-color: #fef2f2;
  border-radius: 9999px;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-danger {
  color: #dc2626;
}

.header-texts {
  display: flex;
  flex-direction: column;
}

.header-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.header-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.cancel-sheet-content {
  margin-top: 1rem;
}

.cancel-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 1.5rem;
}

.textarea-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.textarea-label {
  display: block;
  font-size: 0.875rem;
  color: #374151;
  font-weight: 500;
}

.textarea-counter {
  font-size: 0.75rem;
  color: #6b7280;
}

.cancel-textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: #111827;
  resize: none;
  background-color: #fff;
  transition: border-color 0.2s, box-shadow 0.2s;
  font-family: inherit;
}

.cancel-textarea:focus {
  outline: none;
  border-color: #ef4444;
  box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
}

.quick-reasons {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
  margin-top: 1rem;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none;  /* IE and Edge */
  user-select: none;
  cursor: grab;
}

.quick-reasons::-webkit-scrollbar {
  display: none;
}

.quick-reasons.is-dragging {
  cursor: grabbing;
}

.reason-chip {
  white-space: nowrap;
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  border: 1px solid #e5e7eb;
  background-color: #fff;
  color: #4b5563;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.reason-chip:hover {
  background-color: #f9fafb;
}

.reason-chip.active {
  background-color: #fef2f2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.cancel-footer-actions {
  display: flex;
  gap: 0.75rem;
  padding-top: 1rem;
  padding-bottom: 0.5rem;
}

.btn-flex {
  flex: 1;
}
</style>
