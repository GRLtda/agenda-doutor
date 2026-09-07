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
const resolvedTemplate = ref(null)
const resolvedAnamnesis = ref(null)
const validationErrors = ref({})
const saveError = ref('')

// Initialize localAnswers when anamnesis changes
watch(
  () => props.anamnesis,
  async (newVal) => {
    localAnswers.value = {}
    resolvedTemplate.value = null
    resolvedAnamnesis.value = null
    validationErrors.value = {}
    saveError.value = ''

    if (!newVal) return

    let anamnesis = newVal
    const patientId = newVal.patient?.id || newVal.patient?._id || newVal.patientId || newVal.patient

    if ((!newVal.template?.questions || !Array.isArray(newVal.answers)) && patientId && newVal._id) {
      const result = await anamnesisStore.fetchAnamnesisResponse(patientId, newVal._id)
      if (!result.success) {
        saveError.value = result.error.message
        return
      }
      anamnesis = result.data
    }

    const template = anamnesis.template || null
    if (template) {
      resolvedAnamnesis.value = anamnesis
      resolvedTemplate.value = template

      const map = {}
      
      // 1. Populate with existing answers
      if (anamnesis.answers) {
        anamnesis.answers.forEach(ans => {
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
              answer: q.questionType === 'multiple_choice' ? [] : null
            }
          }
          // Recursively init conditional questions
          if (q.conditionalQuestions) {
             q.conditionalQuestions.forEach(group => initQuestions(group.questions))
          }
        })
      }
      
      if (template.questions) {
        initQuestions(template.questions)
      }
      
      localAnswers.value = map
    }
  },
  { immediate: true, deep: true },
)

const template = computed(
  () =>
    resolvedTemplate.value ||
    props.anamnesis.template ||
    (props.anamnesis.templateName ? { name: props.anamnesis.templateName } : {}) ||
    {},
)
const patientName = computed(() => props.anamnesis.patient?.name || 'Paciente')
const date = computed(() => {
    const dateValue = resolvedAnamnesis.value?.answeredAt || props.anamnesis.updatedAt
    if(!dateValue) return 'N/A'
    return new Date(dateValue).toLocaleDateString('pt-BR')
})

// Computed to choose which answers to display (local for editing, prop for viewing)
const displayAnswers = computed(() => {
  if (props.isEditing) return localAnswers.value
  
  // For viewing, we can rebuild the map from props or just use localAnswers 
  // (localAnswers is initialized from props anyway, so it's safe to use)
  return localAnswers.value
})

function normalizedValue(value) {
  if (typeof value === 'string') {
    const normalized = value.trim().toLocaleLowerCase('pt-BR')
    if (normalized === 'sim' || normalized === 'true') return true
    if (normalized === 'não' || normalized === 'nao' || normalized === 'false') return false
    return normalized
  }
  return value
}

function validateQuestions(questions) {
  for (const question of questions || []) {
    const value = localAnswers.value[question.qId]?.answer
    const empty = Array.isArray(value) ? value.length === 0 : value === null || value === ''
    if (empty) validationErrors.value[question.qId] = 'Este campo é obrigatório.'

    for (const group of question.conditionalQuestions || []) {
      if (normalizedValue(value) === normalizedValue(group.showWhenAnswerIs)) {
        validateQuestions(group.questions)
      }
    }
  }
}

function buildAnswers(questions, result = []) {
  for (const question of questions || []) {
    const answer = localAnswers.value[question.qId]
    if (!answer) continue
    result.push({ qId: question.qId, answer: answer.answer })

    for (const group of question.conditionalQuestions || []) {
      if (normalizedValue(answer.answer) === normalizedValue(group.showWhenAnswerIs)) {
        buildAnswers(group.questions, result)
      }
    }
  }
  return result
}

async function handleSave() {
  if (isSaving.value) return
  saveError.value = ''
  validationErrors.value = {}

  const patientId = props.anamnesis.patient?.id || props.anamnesis.patient?._id || props.anamnesis.patientId || props.anamnesis.patient
  if (!patientId || !props.anamnesis._id) {
    saveError.value = 'Não foi possível identificar o paciente ou a anamnese.'
    return
  }

  validateQuestions(template.value.questions)
  if (Object.keys(validationErrors.value).length > 0) {
    const firstErrorId = Object.keys(validationErrors.value)[0]
    document.getElementById(`q-${firstErrorId}`)?.focus()
    return
  }

  isSaving.value = true
  const payload = { answers: buildAnswers(template.value.questions) }

  const result = await anamnesisStore.updateAnamnesisResponse(
    patientId,
    props.anamnesis._id,
    payload
  )

  isSaving.value = false

  if (result.success) {
    toast.success('Anamnese respondida com sucesso!')
    emit('saved', result.data)
  } else {
    for (const field of result.error?.fields || []) {
      if (localAnswers.value[field.field]) validationErrors.value[field.field] = field.message
    }
    saveError.value = result.error?.message || 'Não foi possível salvar as respostas.'
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
        <p v-if="saveError && !isEditing" class="save-error body-error" role="alert">
          {{ saveError }}
        </p>
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
            :validation-errors="validationErrors"
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
        <p v-if="saveError" class="save-error" role="alert">{{ saveError }}</p>
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
.save-error {
  color: #b91c1c;
  font-size: 0.875rem;
  margin: 0 auto 0 0;
  max-width: 50%;
}
.body-error {
  margin: 1rem 0 0;
  max-width: none;
}


</style>
