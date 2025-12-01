<script setup>
import { computed } from 'vue'
import { X, CornerDownRight } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'

const props = defineProps({
  anamnesis: { type: Object, required: true },
})
const emit = defineEmits(['close'])

function formatSimpleDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ✨ NOVO: Helper para converter índice em letra (0=A, 1=B, etc.)
function getSubQuestionLetter(index) {
  return String.fromCharCode(65 + index) // 65 é o char code para 'A'
}

const answersMap = computed(() => {
  if (!props.anamnesis || !Array.isArray(props.anamnesis.answers)) {
    return {}
  }
  return props.anamnesis.answers.reduce((acc, ans) => {
    acc[ans.qId] = ans
    return acc
  }, {})
})

function formatAnswer(answerObj) {
  if (!answerObj || answerObj.answer === null || answerObj.answer === undefined) {
    return '<span class="no-answer">Não respondido</span>' // ✨ Adiciona classe
  }

  const answer = answerObj.answer

  if (Array.isArray(answer)) {
    if (answer.length === 0)
      return '<span class="no-answer">Nenhuma opção selecionada</span>'
    return `<ul>${answer.map((item) => `<li>${item}</li>`).join('')}</ul>`
  }

  if (typeof answer === 'boolean') {
    return answer ? 'Sim' : 'Não'
  }

  if (typeof answer === 'string') {
    if (answer.trim() === '') {
      return '<span class="no-answer">Não respondido</span>'
    }
    return answer.replace(/\n/g, '<br>')
  }

  return answer
}
</script>

<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header class="modal-header">
        <div>
          <h2 class="title">{{ anamnesis.template.name }}</h2>
          <p class="subtitle">
            Respondido por {{ anamnesis.patient?.name || 'Paciente' }} em
            {{ formatSimpleDate(anamnesis.updatedAt) }}
          </p>
        </div>
        <AppButton @click="$emit('close')" variant="default" class="close-btn" title="Fechar">
          <X :size="24" />
        </AppButton>
      </header>

      <div class="modal-body">
        <template
          v-for="(question, index) in anamnesis.template.questions"
          :key="question.qId"
        >
          <div class="answer-block">
            <label class="question-title">
              <span>{{ index + 1 }}.</span> {{ question.title }}
            </label>
            <div
              class="answer-field"
              v-html="formatAnswer(answersMap[question.qId])"
            ></div>
          </div>

          <div
            v-for="group in question.conditionalQuestions"
            :key="`${question.qId}-${group.showWhenAnswerIs}`"
            class="conditional-block"
          >
            <Transition name="slide-fade">
              <div
                class="sub-question-wrapper"
                v-if="
                  answersMap[question.qId] &&
                  answersMap[question.qId].answer === group.showWhenAnswerIs
                "
              >
                <div
                  v-for="(subQuestion, subIndex) in group.questions"
                  :key="subQuestion.qId"
                  class="answer-block sub-question"
                >
                  <label class="question-title">
                    <CornerDownRight :size="16" class="sub-q-icon" />
                    <span class="sub-q-number"
                      >{{ index + 1 }}.{{
                        getSubQuestionLetter(subIndex)
                      }}</span
                    >
                    {{ subQuestion.title }}
                  </label>
                  <div
                    class="answer-field"
                    v-html="formatAnswer(answersMap[subQuestion.qId])"
                  ></div>
                </div>
              </div>
            </Transition>
          </div>
          </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(249, 250, 251, 0.7);
  backdrop-filter: blur(10px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
}
.modal-content {
  background: var(--branco);
  width: 100%;
  max-width: 700px;
  max-height: 90vh;
  border-radius: 1rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  animation: slide-up 0.3s ease-out;
}
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}
.title {
  font-size: 1.25rem;
  font-weight: 700;
  margin: 0;
}
.subtitle {
  color: var(--cinza-texto);
  margin-top: 0.25rem;
  font-size: 0.875rem;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
}
.answer-block {
  margin-bottom: 1.5rem;
}
.answer-block:last-child {
  margin-bottom: 0;
}
.question-title {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 1rem;
  color: var(--preto);
  line-height: 1.4;
}
.question-title span {
  color: var(--azul-principal);
  font-weight: 700;
  margin-top: 2px;
}
.answer-field {
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  border: 1px solid #e5e7eb;
  background-color: #f9fafb;
  font-size: 1rem;
  color: #374151;
  min-height: 44px;
  display: flex;
  align-items: center;
  line-height: 1.6;
}

.answer-field :deep(ul) {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
}
.answer-field :deep(li) {
  background-color: #f0f1f3;
  border: 1px solid #e5e7eb;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  font-size: 0.9rem;
}
.answer-field :deep(.no-answer) {
  /* ✨ Estilo para "Não respondido" */
  color: #9ca3af;
  font-style: italic;
  font-size: 0.95rem;
}

/* --- ✨ NOVOS ESTILOS --- */
.conditional-block {
  padding-left: 1.5rem;
  border-left: 3px solid #e5e7eb;
  margin-left: 0.5rem;
  margin-bottom: 1.5rem;
}
.sub-question-wrapper {
  overflow: hidden;
}
.sub-question {
  margin-bottom: 1rem;
}
.sub-question:last-child {
  margin-bottom: 0;
}
.sub-question .question-title {
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}
.sub-q-icon {
  color: #9ca3af;
  flex-shrink: 0;
  margin-top: 3px;
}
.sub-q-number {
  font-weight: 700;
  color: var(--azul-principal-leve);
  margin-right: 0.25rem;
  margin-top: 2px;
}

/* --- ✨ ESTILOS DE ANIMAÇÃO --- */
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
