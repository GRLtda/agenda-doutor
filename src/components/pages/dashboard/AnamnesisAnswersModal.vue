<script setup>
import { computed, ref, watch } from 'vue'
import { X, Calendar, User, Save } from 'lucide-vue-next'
import AnamnesisQuestionsRenderer from '@/views/public/AnamnesisQuestionsRenderer.vue'
import { useAnamnesisStore } from '@/stores/anamnesis'
import { useToast } from 'vue-toastification'
import AppButton from '@/components/global/AppButton.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'

const props = defineProps({
  anamnesis: { type: Object, required: true },
  isOpen: { type: Boolean, default: false },
  isEditing: { type: Boolean, default: false }, // ✨ New prop
})

const emit = defineEmits(['close', 'saved'])
const anamnesisStore = useAnamnesisStore()
const toast = useToast()

const localAnswers = ref({})
const isSaving = ref(false)

// Initialize localAnswers when anamnesis changes
watch(() => props.anamnesis, (newVal) => {
  if (newVal && newVal.template) {
    const map = {}
    
    // 1. Populate with existing answers
    if (newVal.answers) {
      newVal.answers.forEach(ans => {
        map[ans.qId] = { ...ans } // Clone
      })
    }

    // 2. Ensure all questions from template have an entry (for v-model binding)
    const initQuestions = (questions) => {
      questions.forEach(q => {
        if (!map[q.qId]) {
          // Initialize empty answer
          map[q.qId] = { 
            qId: q.qId, 
            questionTitle: q.title, 
            answer: q.questionType === 'checkbox' ? [] : '' 
          }
        }
        // Recursively init conditional questions
        if (q.conditionalQuestions) {
           q.conditionalQuestions.forEach(group => initQuestions(group.questions))
        }
      })
    }
    
    if (newVal.template.questions) {
      initQuestions(newVal.template.questions)
    }
    
    localAnswers.value = map
  }
}, { immediate: true, deep: true })

const template = computed(() => props.anamnesis.template || {})
const patientName = computed(() => props.anamnesis.patient?.name || 'Paciente')
const date = computed(() => {
    if(!props.anamnesis.updatedAt) return 'N/A'
    return new Date(props.anamnesis.updatedAt).toLocaleDateString('pt-BR')
})

// Computed to choose which answers to display (local for editing, prop for viewing)
const displayAnswers = computed(() => {
  if (props.isEditing) return localAnswers.value
  
  // For viewing, we can rebuild the map from props or just use localAnswers 
  // (localAnswers is initialized from props anyway, so it's safe to use)
  return localAnswers.value
})

async function handleSave() {
  if (!props.anamnesis.patient || !props.anamnesis._id) {
    toast.error('Erro: Dados da anamnese incompletos.')
    return
  }

  isSaving.value = true
  
  // Convert map back to array
  const answersArray = Object.values(localAnswers.value).filter(a => {
      // Filter out empty answers if desired, or keep them. 
      // Usually we send everything or just what's filled.
      // Let's send what's filled to avoid clutter, but for editing it might be better to send all?
      // The backend likely replaces the answers array.
      return a.answer !== '' && a.answer !== null && (Array.isArray(a.answer) ? a.answer.length > 0 : true)
  })

  // Ensure questionTitle is up to date (in case template changed? unlikely but good practice)
  // Actually localAnswers already has titles from init.

  const payload = {
    answers: answersArray,
    status: 'Preenchido' // Auto-complete when doctor saves? Or keep pending? User said "ao preencher ele mostra as perguntas respondidas", implies completion.
  }

  const result = await anamnesisStore.updateAnamnesisResponse(
    props.anamnesis.patient._id || props.anamnesis.patient, // Handle populated or ID
    props.anamnesis._id,
    payload
  )

  isSaving.value = false

  if (result.success) {
    emit('saved', result.data)
  }
}
</script>

<template>
  <SideDrawer v-if="isOpen" @close="$emit('close')">
    <template #header>
      <header class="drawer-header">
        <div class="header-left">
          <h2>{{ isEditing ? 'Responder Anamnese' : 'Respostas da Anamnese' }}</h2>
          <span class="anamnesis-title">{{ template.name || 'Sem Título' }}</span>
        </div>
        <button @click="$emit('close')" class="close-btn-header">
          <X :size="24" />
        </button>
      </header>
    </template>

    <template #default>
      <div class="drawer-body">
        <section class="section">
             <div class="info-card">
                 <div class="info-row">
                     <User :size="16" class="text-gray-400" />
                     <span class="font-medium">{{ patientName }}</span>
                 </div>
                 <div class="info-row">
                     <Calendar :size="16" class="text-gray-400" />
                     <span>{{ isEditing ? 'Respondendo agora' : `Respondido em: ${date}` }}</span>
                 </div>
             </div>
        </section>

        <section class="section questions-section">
          <AnamnesisQuestionsRenderer
            v-if="template.questions"
            :questions="template.questions"
            :answers="displayAnswers"
            :readonly="!isEditing"
          />
          <div v-else class="empty-state">
              Nenhuma pergunta encontrada neste modelo.
          </div>
        </section>
      </div>
    </template>

    <template #footer>
      <!-- Footer for Actions -->
      <footer v-if="isEditing" class="drawer-footer">
        <AppButton variant="default" @click="$emit('close')" :disabled="isSaving">
          Cancelar
        </AppButton>
        <AppButton variant="primary" @click="handleSave" :loading="isSaving" :disabled="isSaving">
          <Save :size="18" v-if="!isSaving" />
          Responder
        </AppButton>
      </footer>
    </template>
  </SideDrawer>
</template>

<style scoped>
/* Header */
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
}

.anamnesis-title {
    font-size: 0.875rem;
    color: #6b7280;
    margin-top: 0.25rem;
    display: block;
}

/* Body */
.drawer-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.info-card {
    background-color: #f9fafb;
    padding: 1rem;
    border-radius: 0.5rem;
    border: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #374151;
}

.questions-section {
    /* Ajustes para o renderer dentro do modal */
    padding-bottom: 2rem;
}

/* Sobrescrevendo alguns estilos do renderer para caber melhor no modal se necessário */
:deep(.question-title) {
    font-size: 1rem;
}

.drawer-footer {
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background-color: #fff;
}


</style>
