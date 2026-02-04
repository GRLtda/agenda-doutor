<script setup>
import { defineProps, defineEmits } from 'vue'
import { CornerDownRight } from 'lucide-vue-next'
import AnamnesisQuestionInputs from './AnamnesisQuestionInputs.vue'

const props = defineProps({
  questions: {
    type: Array,
    required: true,
  },
  answers: {
    type: Object,
    required: true,
  },
  validationErrors: {
    type: Object,
    default: () => ({}),
  },
  readonly: {
    type: Boolean,
    default: false,
  },
  level: {
    type: Number,
    default: 0,
  },
})

const emit = defineEmits(['update:answers'])

function getSubQuestionLetter(index) {
  return String.fromCharCode(65 + index)
}

function getVisibleSubQuestions(question) {
  if (!question.conditionalQuestions || question.conditionalQuestions.length === 0) {
    return []
  }

  const answerObj = props.answers[question.qId]
  
  // Normal Condition: Logic based on parent's answer
  const currentAnswer = answerObj ? String(answerObj.answer) : ''

  return question.conditionalQuestions
    .filter((group) => {
      if (answerObj && group.showWhenAnswerIs === currentAnswer) {
        return true
      }

      const hasAnsweredChild = group.questions.some(childQ => {
          const childVal = props.answers[childQ.qId]?.answer
          // Consider "answered" if not null/undefined and not empty string/array
          if (Array.isArray(childVal)) return childVal.length > 0
          return childVal !== undefined && childVal !== '' && childVal !== null
      })
      
      return hasAnsweredChild
    })
    .flatMap((group) => group.questions)
}
</script>

<template>
  <div class="questions-renderer">
    <div
      v-for="(question, index) in questions"
      :key="question.qId"
      class="question-block"
      :class="{
        'has-error': validationErrors[question.qId],
        'sub-question': level > 0,
      }"
    >
      <label class="question-title">
        <template v-if="level > 0">
          <CornerDownRight :size="18" class="sub-q-icon" />
          <span class="sub-q-number">
            {{ getSubQuestionLetter(index) }}
          </span>
        </template>
        <template v-else>
          <span>{{ index + 1 }}.</span>
        </template>
        {{ question.title }}
      </label>

      <div v-if="answers[question.qId]">
        <!-- Se for readonly, exibimos apenas o valor (ou componente desabilitado) -->
        <AnamnesisQuestionInputs
          :question="question"
          :qId="question.qId"
          v-model="answers[question.qId].answer"
          :disabled="readonly"
        />
      </div>

      <span v-if="validationErrors[question.qId]" class="error-text">
        Este campo é obrigatório.
      </span>

      <!-- Renderização Recursiva de Perguntas Condicionais -->
      <div
        v-if="getVisibleSubQuestions(question).length > 0"
        class="conditional-group"
      >
        <Transition name="slide-fade">
          <div class="sub-question-wrapper">
            <!-- Chama o próprio componente recursivamente com TODAS as sub-perguntas visíveis -->
            <AnamnesisQuestionsRenderer
              :questions="getVisibleSubQuestions(question)"
              :answers="answers"
              :validationErrors="validationErrors"
              :readonly="readonly"
              :level="level + 1"
            />
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.question-block {
  margin-bottom: 2.5rem;
}

.question-title {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #111827;
  border-left: 3px solid var(--azul-principal);
  padding-left: 1rem;
  text-align: left;
  transition: color 0.2s;
  line-height: 1.4;
}

.question-title span {
  color: var(--azul-principal);
  font-family: var(--fonte-titulo);
  margin-top: 2px;
}

/* Estilos de Erro */
.error-text {
  font-size: 0.875rem;
  color: #ef4444;
  margin-top: 0.5rem;
  display: block;
}

.question-block.has-error .question-title {
  color: #ef4444;
  border-left-color: #ef4444;
}

.question-block.has-error .question-title span,
.question-block.has-error .question-title .sub-q-icon,
.question-block.has-error .question-title .sub-q-number {
  color: #ef4444;
}

/* Estilos Condicionais / Sub-perguntas */
.conditional-group {
  margin-top: 1.5rem;
  padding-left: 1.5rem;
  border-left: 3px solid #e5e7eb;
}

.sub-question-wrapper {
  overflow: hidden;
}

.sub-question {
  margin-bottom: 1.5rem;
  border: none;
  padding-left: 0.5rem;
}

.sub-question .question-title {
  font-size: 1rem;
  border-left: none;
  padding-left: 0;
  font-weight: 500;
  color: #374151;
}

.sub-q-icon {
  color: #9ca3af;
  margin-right: 0.25rem;
  flex-shrink: 0;
  margin-top: 4px;
}

.sub-q-number {
  font-weight: 700;
  color: var(--azul-principal-leve);
  margin-right: 0.25rem;
  margin-top: 2px;
}

/* Animações */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>
