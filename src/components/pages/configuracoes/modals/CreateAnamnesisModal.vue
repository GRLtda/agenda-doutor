<script setup>
import { ref, onMounted, computed } from 'vue'
import { useAnamnesisStore } from '@/stores/anamnesis'
import {
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  X,
  Split,
} from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import { useToast } from 'vue-toastification'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'

const props = defineProps({
  templateIdToEdit: { type: String, default: null },
  templateToDuplicate: { type: Object, default: null },
})
const emit = defineEmits(['close'])
const anamnesisStore = useAnamnesisStore()
const toast = useToast()

const isLoading = ref(true)
const templateName = ref('')
const questions = ref([])
const openConditionalGroups = ref({})
const validationErrors = ref(new Set())

const isEditMode = computed(() => !!props.templateIdToEdit && !props.templateToDuplicate)

const questionTypes = [
  { value: 'text', label: 'Texto Curto' },
  { value: 'long_text', label: 'Texto Longo' },
  { value: 'yes_no', label: 'Sim / Não' },
  { value: 'single_choice', label: 'Múltipla Escolha (1 resposta)' },
  { value: 'multiple_choice', label: 'Múltipla Escolha (várias respostas)' },
]

function generateQId() {
  return 'q_' + Math.random().toString(36).substring(2, 9)
}

function validateQuestions(questionArray) {
  let isValid = true
  if (!questionArray) return true

  for (const q of questionArray) {
    if (!q.title || !q.title.trim()) {
      validationErrors.value.add(q._tempId)
      isValid = false
    }

    if (q.conditionalQuestions && q.conditionalQuestions.length > 0) {
      for (const group of q.conditionalQuestions) {
        if (group.questions && group.questions.length > 0) {
          if (!validateQuestions(group.questions)) {
            isValid = false
          }
        }
      }
    }
  }
  return isValid
}

function processLoadedQuestions(questionArray) {
  if (!questionArray || questionArray.length === 0) {
    return []
  }

  return questionArray.map((q) => {
    const newQId = props.templateToDuplicate ? generateQId() : q.qId || generateQId()

    const processedConditionalQuestions = (q.conditionalQuestions || []).map(
      (group) => {
        let processedShowWhenAnswerIs = group.showWhenAnswerIs

        if (typeof processedShowWhenAnswerIs === 'boolean') {
          processedShowWhenAnswerIs = String(processedShowWhenAnswerIs)
        } else if (
          processedShowWhenAnswerIs === null ||
          processedShowWhenAnswerIs === undefined
        ) {
          processedShowWhenAnswerIs = ''
        }

        return {
          ...group,
          showWhenAnswerIs: processedShowWhenAnswerIs,
          _tempId: Date.now() + Math.random(),
          questions: processLoadedQuestions(group.questions || []),
        }
      }
    )

    return {
      ...q,
      qId: newQId,
      _tempId: q._id || newQId,
      options: q.options || [],
      conditionalQuestions: processedConditionalQuestions,
    }
  })
}

onMounted(async () => {
  isLoading.value = true
  try {
    if (props.templateToDuplicate) {
      templateName.value = `${props.templateToDuplicate.name} (Cópia)`
      questions.value = processLoadedQuestions(props.templateToDuplicate.questions)
    } else if (isEditMode.value) {
      const templateData = await anamnesisStore.fetchTemplateById(
        props.templateIdToEdit
      )
      if (templateData) {
        templateName.value = templateData.name
        questions.value = processLoadedQuestions(templateData.questions)
      } else {
        toast.error('Não foi possível carregar o modelo para edição.')
        emit('close')
      }
    } else {
      addNewQuestion()
    }
  } catch (error) {
    console.error('Erro no onMounted do modal:', error)
    toast.error(
      error.response?.data?.message ||
        'Erro ao preparar o modal de anamnese.'
    )
    emit('close')
  } finally {
    // Small delay to ensure smooth transition if fetch is too fast
    setTimeout(() => {
      isLoading.value = false
    }, 400)
  }
})

function addNewQuestion() {
  questions.value.push({
    _tempId: Date.now(),
    qId: generateQId(),
    title: '',
    questionType: 'text',
    options: [],
    conditionalQuestions: [],
  })
}

function removeQuestion(index) {
  questions.value.splice(index, 1)
}

function addOption(questionIndex) {
  questions.value[questionIndex].options.push('')
}

function removeOption(questionIndex, optionIndex) {
  questions.value[questionIndex].options.splice(optionIndex, 1)
}

function addConditionalQuestionGroup(questionIndex) {
  const question = questions.value[questionIndex]
  if (!question.conditionalQuestions) {
    question.conditionalQuestions = []
  }

  let defaultCondition = ''
  if (question.questionType === 'yes_no') {
    defaultCondition = 'true'
  } else if (question.questionType === 'single_choice' && question.options.length > 0) {
    defaultCondition = question.options[0]
  }

  const newGroup = {
    _tempId: Date.now(),
    showWhenAnswerIs: defaultCondition,
    questions: [],
  }

  question.conditionalQuestions.push(newGroup)

  addConditionalQuestion(questionIndex, question.conditionalQuestions.length - 1)

}

function removeConditionalQuestionGroup(questionIndex, groupIndex) {
  questions.value[questionIndex].conditionalQuestions.splice(groupIndex, 1)
}

function addConditionalQuestion(questionIndex, groupIndex) {
  const group = questions.value[questionIndex].conditionalQuestions[groupIndex]
  if (!group.questions) {
    group.questions = []
  }
  group.questions.push({
    _tempId: Date.now(),
    qId: generateQId(),
    title: '',
    questionType: 'text',
    options: [],
    conditionalQuestions: [],
  })
}

function removeConditionalQuestion(questionIndex, groupIndex, subQuestionIndex) {
  questions.value[questionIndex].conditionalQuestions[groupIndex].questions.splice(
    subQuestionIndex,
    1
  )
}

function addSubQuestionOption(questionIndex, groupIndex, subQuestionIndex) {
  const subQuestion =
    questions.value[questionIndex].conditionalQuestions[groupIndex].questions[
      subQuestionIndex
    ]
  if (!subQuestion.options) {
    subQuestion.options = []
  }
  subQuestion.options.push('')
}

function removeSubQuestionOption(
  questionIndex,
  groupIndex,
  subQuestionIndex,
  optionIndex
) {
  questions.value[questionIndex].conditionalQuestions[groupIndex].questions[
    subQuestionIndex
  ].options.splice(optionIndex, 1)
}

function toggleConditionalGroup(questionTempId) {
  openConditionalGroups.value[questionTempId] =
    !openConditionalGroups.value[questionTempId]
}

function getConditionOptions(question) {
  if (question.questionType === 'yes_no') {
    return [
      { label: 'Sim', value: 'true' },
      { label: 'Não', value: 'false' },
    ]
  }
  if (question.questionType === 'single_choice') {
    return question.options.map((opt) => ({ label: opt, value: opt }))
  }
  return []
}

function cleanPayload(questionArray) {
  if (!questionArray) return []
  return questionArray.map((q) => {
    const { _tempId, ...questionData } = q

    const cleanedConditionalQuestions = (
      questionData.conditionalQuestions || []
    ).map((group) => {
      const { _tempId: groupTempId, ...groupData } = group
      return {
        ...groupData,
        questions: cleanPayload(groupData.questions || []),
      }
    })

    return {
      ...questionData,
      conditionalQuestions: cleanedConditionalQuestions,
    }
  })
}

async function handleSubmit() {
  validationErrors.value.clear()
  let isFormValid = true

  if (!templateName.value) {
    toast.error('Por favor, dê um nome ao modelo.')
    validationErrors.value.add('templateName')
    isFormValid = false
  }

  if (!validateQuestions(questions.value)) {
    isFormValid = false
  }

  if (!isFormValid) {
    toast.error(
      'Existem campos obrigatórios não preenchidos. Verifique os campos em vermelho.'
    )
    return
  }

  const preparedQuestions = cleanPayload(questions.value)

  const payload = {
    name: templateName.value,
    questions: preparedQuestions,
  }

  try {
    let response
    if (isEditMode.value) {
      response = await anamnesisStore.updateTemplate(
        props.templateIdToEdit,
        payload
      )
      toast.success(response.message || 'Modelo atualizado com sucesso!')
    } else {
      response = await anamnesisStore.createTemplate(payload)
      toast.success(response.message || 'Modelo criado com sucesso!')
    }
    emit('close')
  } catch (error) {
    console.error('Erro ao salvar o modelo:', error)
    toast.error(
      error.response?.data?.message || 'Não foi possível salvar o modelo.'
    )
  }
}
</script>

<template>
  <SideDrawer @close="emit('close')" size="xl">
    <template #header>
      <div class="drawer-header">
        <div class="header-left">
          <div class="title-row">
            <h3 v-if="isEditMode" class="modal-title">Editar Modelo de Anamnese</h3>
            <h3 v-else-if="props.templateToDuplicate" class="modal-title">
              Duplicar Modelo de Anamnese
            </h3>
            <h3 v-else class="modal-title">Criar Novo Modelo de Anamnese</h3>
          </div>
          <p class="description-text">
            Configure as perguntas, opções e regras do seu modelo de anamnese.
          </p>
        </div>
        <div class="header-right">
          <button @click="emit('close')" class="mobile-close-btn">
            <X :size="24" />
          </button>
        </div>
      </div>
    </template>

      <div class="drawer-body-padded">
        <div v-if="isLoading" class="skeleton-wrapper">
          <!-- Nome do Modelo Skeleton -->
           <div class="mb-6">
              <AppSkeleton width="150px" height="1rem" class="mb-2" />
              <AppSkeleton width="100%" height="42px" />
           </div>
           
           <hr class="separator" />

           <!-- Questions List Skeleton -->
           <div class="flex flex-col gap-6">
              <div v-for="i in 2" :key="i" class="question-card">
                 <div class="flex items-start gap-4">
                    <AppSkeleton width="20px" height="20px" class="mt-2" borderRadius="50%" />
                    <div class="flex-grow flex gap-4">
                       <div class="flex-grow">
                          <AppSkeleton width="80px" height="0.8rem" class="mb-2" />
                          <AppSkeleton width="100%" height="42px" />
                       </div>
                       <div class="w-[220px]">
                          <AppSkeleton width="100px" height="0.8rem" class="mb-2" />
                          <AppSkeleton width="100%" height="42px" />
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <div v-else>
        <FormInput
          label="Nome do Modelo"
          v-model="templateName"
          placeholder="Ex: Anamnese Adulto Completa"
          required
          :class="{ 'has-error': validationErrors.has('templateName') }"
        />

        <hr class="separator" />

        <div class="questions-list">
          <div
            v-for="(question, qIndex) in questions"
            :key="question._tempId"
            class="question-card"
          >
            <div class="question-header">
              <span class="question-number">{{ qIndex + 1 }}.</span>
              <div class="form-group-inline">
                <FormInput
                  label="Pergunta"
                  v-model="question.title"
                  placeholder="Ex: Você tem alguma alergia?"
                  class="question-title-input"
                  :class="{ 'has-error': validationErrors.has(question._tempId) }"
                />
                <StyledSelect
                  label="Tipo de Resposta"
                  v-model="question.questionType"
                  :options="questionTypes"
                  class="question-type-select"
                />
              </div>
              <AppButton
                variant="dangerous"
                size="sm"
                @click="removeQuestion(qIndex)"
                title="Remover Pergunta"
                class="mt-6"
              >
                <Trash2 :size="18" />
              </AppButton>
            </div>

            <div
              v-if="
                question.questionType === 'single_choice' ||
                question.questionType === 'multiple_choice'
              "
              class="options-wrapper"
            >
              <label class="options-label">Opções de Resposta</label>
              <div
                v-for="(option, oIndex) in question.options"
                :key="oIndex"
                class="option-input-wrapper"
              >
                <FormInput
                  :label="`Opção ${oIndex + 1}`"
                  :hideLabel="true"
                  v-model="question.options[oIndex]"
                  placeholder="Digite o texto da opção"
                />
                <AppButton
                  variant="dangerous"
                  size="sm"
                  @click="removeOption(qIndex, oIndex)"
                  class="mt-0 p-1"
                >
                  <Trash2 :size="16" />
                </AppButton>
              </div>
              <AppButton variant="secondary" size="sm" @click="addOption(qIndex)" class="mt-2">
                <Plus :size="16" /> Adicionar Opção
              </AppButton>
            </div>

            <div
              class="conditional-section"
              v-if="
                question.questionType === 'yes_no'"
            >
              <button
                class="btn-toggle-conditional"
                @click="toggleConditionalGroup(question._tempId)"
              >
                <ChevronRight
                  :size="16"
                  v-if="!openConditionalGroups[question._tempId]"
                />
                <ChevronDown :size="16" v-else />
                Perguntas Condicionais
                <span
                  class="badge"
                  v-if="question.conditionalQuestions?.length > 0"
                >
                  {{ question.conditionalQuestions.length }}
                </span>
              </button>

              <div
                class="conditional-groups-wrapper"
                v-if="openConditionalGroups[question._tempId]"
              >
                <div
                  v-for="(group, gIndex) in question.conditionalQuestions"
                  :key="group._tempId"
                  class="conditional-group"
                >
                  <div class="group-header">
                    <div class="condition-row">
                      <div class="condition-label-box">
                        <Split :size="16" class="text-blue-500" />
                        <span>Se a resposta for:</span>
                      </div>
                      <StyledSelect
                        :hideLabel="true"
                        v-model="group.showWhenAnswerIs"
                        :options="getConditionOptions(question)"
                        class="condition-select"
                      />
                      <button
                        class="btn-icon btn-delete-option ml-auto"
                        @click="removeConditionalQuestionGroup(qIndex, gIndex)"
                        title="Remover este grupo condicional"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </div>

                    <div class="sub-questions-divider">
                      <span class="divider-label">Perguntas deste grupo</span>
                      <hr />
                    </div>
                  </div>

                  <div class="sub-question-list">
                    <div
                      v-for="(subQuestion, sIndex) in group.questions"
                      :key="subQuestion._tempId"
                      class="sub-question-card"
                    >
                      <CornerDownRight :size="18" class="sub-q-icon" />

                      <div class="sub-question-content-wrapper">
                        <div class="form-group-inline">
                          <FormInput
                            label="Sub-Pergunta"
                            :hideLabel="true"
                            v-model="subQuestion.title"
                            placeholder="Ex: Quais alergias?"
                            class="question-title-input"
                            :class="{
                              'has-error': validationErrors.has(subQuestion._tempId),
                            }"
                          />
                          <StyledSelect
                            label="Tipo da Sub-Pergunta"
                            :hideLabel="true"
                            v-model="subQuestion.questionType"
                            :options="questionTypes"
                            class="question-type-select"
                          />
                        </div>

                        <div
                          v-if="
                            subQuestion.questionType === 'single_choice' ||
                            subQuestion.questionType === 'multiple_choice'
                          "
                          class="options-wrapper sub-options-wrapper"
                        >
                          <div
                            v-for="(option, oIndex) in subQuestion.options"
                            :key="oIndex"
                            class="option-input-wrapper"
                          >
                            <FormInput
                              :label="`Opção ${oIndex + 1}`"
                              :hideLabel="true"
                              v-model="subQuestion.options[oIndex]"
                              placeholder="Digite o texto da opção"
                            />
                            <button
                              class="btn-icon btn-delete-option"
                              @click="
                                removeSubQuestionOption(
                                  qIndex,
                                  gIndex,
                                  sIndex,
                                  oIndex
                                )
                              "
                            >
                              <Trash2 :size="16" />
                            </button>
                          </div>
                          <button
                            class="add-option-btn"
                            @click="
                              addSubQuestionOption(qIndex, gIndex, sIndex)
                            "
                          >
                            <Plus :size="16" /> Adicionar Opção
                          </button>
                        </div>
                      </div>
                      <button
                        class="btn-icon btn-delete"
                        @click="
                          removeConditionalQuestion(qIndex, gIndex, sIndex)
                        "
                        title="Remover Sub-Pergunta"
                      >
                        <Trash2 :size="16" />
                      </button>
                    </div>
                  </div>
                  <AppButton
                    variant="secondary"
                    size="sm"
                    @click="addConditionalQuestion(qIndex, gIndex)"
                    class="mt-2"
                  >
                    <Plus :size="16" /> Adicionar Sub-Pergunta
                  </AppButton>
                </div>

                <AppButton
                  variant="secondary"
                  size="sm"
                  @click="addConditionalQuestionGroup(qIndex)"
                  class="mt-4"
                >
                  <Plus :size="16" /> Adicionar Outra Condição
                </AppButton>
              </div>
            </div>
            </div>
        </div>

        </div>

        <AppButton variant="secondary" @click="addNewQuestion" class="btn-add-main" :disabled="isLoading">
          <Plus :size="20" />
          Adicionar Pergunta Principal
        </AppButton>
      </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton variant="default" @click="emit('close')">
          Cancelar
        </AppButton>
        <AppButton variant="primary" @click="handleSubmit">
          <span v-if="isEditMode">Salvar Alterações</span>
          <span v-else>Criar Modelo</span>
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.description-text {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;
}

.header-right {
  display: flex;
  align-items: flex-start;
}

.modal-title {
  font-family: var(--fonte-titulo);
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--preto);
}

.drawer-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  background: #fff;
  width: 100%;
}

.separator {
  border: 0;
  border-top: 1px solid #e5e7eb;
  margin: 1.5rem 0;
}

.questions-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.question-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  transition: box-shadow 0.2s ease;
}
.question-card:focus-within {
  border-color: var(--azul-principal-leve);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.question-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;
}

.question-number {
  font-family: var(--fonte-titulo);
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--azul-principal);
  /* padding-top: 0.75rem; */
}

.form-group-inline {
  display: flex;
  flex-grow: 1;
  gap: 1rem;
  align-items: flex-end;
}
.question-title-input {
  flex-grow: 1;
}
.question-type-select {
  width: 220px;
  flex-shrink: 0;
  margin-bottom: 1.25em;
}

.btn-icon {
  padding: 0.5rem;
  background: none;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--cinza-texto);
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
  margin-top: 1.75rem;
}
.btn-icon:hover {
  background-color: #f3f4f6;
  color: var(--preto);
  transform: scale(1.05);
}
.btn-icon.btn-delete:hover {
  background-color: #fee2e2;
  color: #ef4444;
  transform: scale(1.05);
}
.btn-icon.btn-delete-option {
  color: #9ca3af;
  margin-top: 0;
  padding: 0.25rem;
}
.btn-icon.btn-delete-option:hover {
  background-color: #fee2e2;
  color: #ef4444;
  transform: scale(1.05);
}

.options-wrapper {
  padding-left: 2.5rem;
  margin-top: 1rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 1rem;
}
.options-label {
  display: block;
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}
.option-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.option-input-wrapper .form-group {
  flex-grow: 1;
  margin-bottom: 0.5rem;
}

.add-option-btn {
  background: none;
  border: none;
  color: var(--azul-principal);
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-top: 0.5rem;
  font-size: 0.9rem;
  padding: 0.4rem 0.6rem;
  border-radius: 0.375rem;
  transition: background-color 0.2s ease;
}
.add-option-btn:hover {
  background-color: #eef2ff;
}

.btn-add-main {
  width: 100%;
  margin-top: 2rem;
  justify-content: center;
}

.btn-toggle-conditional {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
  color: var(--cinza-texto);
  font-size: 0.9rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}
.btn-toggle-conditional:hover {
  background-color: #f3f4f6;
  color: var(--preto);
}
.badge {
  background-color: #e0e7ff;
  color: #4f46e5;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.1rem 0.4rem;
  border-radius: 0.5rem;
  margin-left: 0.25rem;
}

.conditional-groups-wrapper {
  margin-top: 1rem;
  padding-left: 1rem;
  border-left: 2px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.conditional-group {
  background-color: #f9fafb;
  border-radius: 0.5rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.group-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.condition-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.condition-label-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
  background-color: #eef2ff;
  border-radius: 6px;
  border: 1px solid #e0e7ff;
  height: 38px;
  padding: 0 0.75rem;
}

.text-blue-500 {
  color: var(--azul-principal);
}

.sub-questions-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 0.25rem;
}

.sub-questions-divider hr {
  flex-grow: 1;
  border: 0;
  border-top: 1px dashed #d1d5db;
}

.divider-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.condition-select {
  width: 180px;
  flex-shrink: 0;
}

/* Force height match for StyledSelect */
.condition-select :deep(.select-button) {
  height: 38px;
  border-radius: 6px;
  font-size: 0.9rem;
}

.ml-auto {
  margin-left: auto;
}

.condition-row .btn-icon {
  margin-top: 0;
}

.sub-question-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.sub-question-card {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.sub-q-icon {
  color: #9ca3af;
  flex-shrink: 0;
  margin-top: 0.85rem;
}
.sub-question-card .form-group-inline {
  align-items: flex-start;
}
.sub-question-card .btn-icon {
  margin-top: 0.5rem;
}

.sub-question-content-wrapper {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}

.sub-options-wrapper {
  padding-left: 0;
  margin-top: 0.75rem;
  border-top: 1px solid #f3f4f6;
  padding-top: 0.75rem;
}

.has-error :deep(input),
.has-error :deep(textarea) {
  border-color: #ef4444 !important;
  background-color: #fee2e2 !important;
}

.has-error :deep(input:focus),
.has-error :deep(textarea:focus) {
  border-color: #ef4444 !important;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2) !important;
}

@media (max-width: 768px) {
  .question-header {
    gap: 0.5rem;
  }

  .form-group-inline {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .question-type-select {
    width: 100%;
    margin-bottom: 0;
  }

  .btn-icon {
    margin-top: 0.5rem;
  }

  .options-wrapper {
    padding-left: 1rem;
    margin-top: 1rem;
  }

  .group-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .condition-select {
    width: 100%;
  }

  .group-header .btn-icon {
    margin-left: 0;
    align-self: flex-end;
  }

  .sub-q-icon {
    margin-top: 0.5rem;
  }
  
  .drawer-footer {
    flex-direction: column-reverse;
    gap: 0.75rem;
  }
}
</style>
