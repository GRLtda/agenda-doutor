<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAnamnesisStore } from '@/stores/anamnesis'
import { useToast } from 'vue-toastification'
import confetti from 'canvas-confetti'
import Cookies from 'js-cookie'
import {
  CheckCircle2,
  AlertTriangle,
  Building,
  CornerDownRight,
} from 'lucide-vue-next'
import AnamnesisQuestionsRenderer from '../public/AnamnesisQuestionsRenderer.vue'

const route = useRoute()
const anamnesisStore = useAnamnesisStore()
const toast = useToast()

const responseData = ref(null)
const answers = ref({})
const submissionStatus = ref('pending')
const validationErrors = ref({})
const token = route.params.token
const storageKey = `anamnesis-answers-${token}`

// --- FUNÇÕES DE LÓGICA (Sem alteração) ---

function getDefaultAnswer(questionType) {
  if (questionType === 'multiple_choice') return []
  return null
}

function initializeAnswers(questionsArray) {
  if (!Array.isArray(questionsArray)) return

  for (const q of questionsArray) {
    if (!q || !q.qId) continue

    answers.value[q.qId] = {
      qId: q.qId,
      questionTitle: q.title,
      answer: getDefaultAnswer(q.questionType),
    }

    if (q.conditionalQuestions && q.conditionalQuestions.length > 0) {
      for (const group of q.conditionalQuestions) {
        initializeAnswers(group.questions)
      }
    }
  }
}

function getSubQuestionLetter(index) {
  return String.fromCharCode(65 + index)
}

onMounted(async () => {
  const { success } = await anamnesisStore.fetchPublicAnamnesis(token)

  if (success && anamnesisStore.publicTemplate) {
    responseData.value = anamnesisStore.publicTemplate
    const questions = responseData.value.template?.questions

    if (Array.isArray(questions)) {
      initializeAnswers(questions)

      const savedAnswersRaw = Cookies.get(storageKey)

      if (savedAnswersRaw) {
        try {
          const savedAnswers = JSON.parse(savedAnswersRaw)
          if (savedAnswers && typeof savedAnswers === 'object') {
            Object.keys(answers.value).forEach((qId) => {
              if (savedAnswers[qId]) {
                answers.value[qId] = savedAnswers[qId]
              }
            })
            toast.info('Seu progresso anterior foi restaurado!')
          }
        } catch (e) {
          console.error('Falha ao carregar respostas do cookie:', e)
          // ✨ ALTERADO: Remove o cookie em caso de erro
          Cookies.remove(storageKey, { path: '/' })
        }
      }
    } else {
      console.warn('Nenhuma pergunta encontrada no template:', responseData.value)
      submissionStatus.value = 'error'
    }
  } else {
    submissionStatus.value = 'error'
  }
})

// --- WATCHERS (Sem alteração) ---
watch(
  answers,
  (newAnswers) => {
    if (responseData.value && submissionStatus.value === 'pending') {
      // ✨ ALTERADO: Salva no cookie com expiração de 7 dias
      Cookies.set(storageKey, JSON.stringify(newAnswers), {
        expires: 7,
        path: '/',
        sameSite: 'Lax',
      })

      Object.keys(newAnswers).forEach((qId) => {
        const answer = newAnswers[qId].answer
        const isAnswerFilled = Array.isArray(answer)
          ? answer.length > 0
          : answer !== null
        if (isAnswerFilled && validationErrors.value[qId]) {
          delete validationErrors.value[qId]
        }
      })
    }
  },
  { deep: true },
)

watch(submissionStatus, (newStatus) => {
  if (newStatus === 'success') {
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      zIndex: 9999,
    })
  }
})

// --- FUNÇÕES DE VALIDAÇÃO E SUBMIT (Sem alteração) ---
function validateRecursive(questionsArray) {
  if (!Array.isArray(questionsArray)) return

  for (const q of questionsArray) {
    const answerObj = answers.value[q.qId]
    const answer = answerObj ? answerObj.answer : null

    const isAnswerEmpty = Array.isArray(answer)
      ? answer.length === 0
      : answer === null || answer === ''

    if (isAnswerEmpty) {
      validationErrors.value[q.qId] = true
    } else {
      delete validationErrors.value[q.qId]
    }

    if (q.conditionalQuestions && q.conditionalQuestions.length > 0) {
      for (const group of q.conditionalQuestions) {
        const cleanSubErrors = (subQuestions) => {
          if (!subQuestions) return
          subQuestions.forEach((subQ) => delete validationErrors.value[subQ.qId])
        }

        if (answer === group.showWhenAnswerIs) {
          validateRecursive(group.questions)
        } else {
          cleanSubErrors(group.questions)
        }
      }
    }
  }
}

function validateForm() {
  validationErrors.value = {}
  validateRecursive(responseData.value.template.questions)
  return Object.keys(validationErrors.value).length === 0
}

function buildPayloadRecursive(questionsArray, payload) {
  if (!Array.isArray(questionsArray)) return

  for (const q of questionsArray) {
    const answerObj = answers.value[q.qId]
    if (answerObj) {
      payload.push(answerObj)

      if (q.conditionalQuestions && q.conditionalQuestions.length > 0) {
        for (const group of q.conditionalQuestions) {
          if (answerObj.answer === group.showWhenAnswerIs) {
            buildPayloadRecursive(group.questions, payload)
          }
        }
      }
    }
  }
}

async function handleSubmit() {
  if (!validateForm()) {
    toast.error(
      'Por favor, responda todas as perguntas obrigatórias antes de enviar.',
    )
    const firstErrorId = Object.keys(validationErrors.value)[0]
    if (firstErrorId) {
      const errorElement = document.getElementById(`q-${firstErrorId}`)
      errorElement?.focus()
    }
    return
  }

  const payloadArray = []
  buildPayloadRecursive(responseData.value.template.questions, payloadArray)

  const payload = { answers: payloadArray }
  const { success } = await anamnesisStore.submitPublicAnamnesis(token, payload)

  if (success) {
    Cookies.remove(storageKey, { path: '/' })
    submissionStatus.value = 'success'
  }
}
</script>

<template>
  <div class="anamnesis-page">
    <div v-if="submissionStatus === 'success'" class="card success-card">
      <CheckCircle2 class="success-icon" :size="64" />
      <h2 class="success-title">Obrigado!</h2>
      <p class="success-message">
        Suas respostas foram enviadas com sucesso
        <span v-if="responseData?.clinicInfo?.name"
          >para a <strong>{{ responseData.clinicInfo.name }}</strong></span
        >.
      </p>
      <p class="success-footer">Você já pode fechar esta página.</p>
    </div>

    <div v-else-if="submissionStatus === 'error'" class="card error-card">
      <AlertTriangle class="error-icon" :size="64" />
      <h2 class="error-title">Link Inválido ou Expirado</h2>
      <p class="error-message">
        Não foi possível carregar o formulário. Por favor, entre em contato com a
        clínica para solicitar um novo link.
      </p>
    </div>

    <template v-else-if="responseData && answers">
      <header class="page-header">
        <div class="clinic-branding">
          <img
            v-if="responseData.clinicInfo?.logoUrl"
            :src="responseData.clinicInfo.logoUrl"
            alt="Logo da clínica"
            class="clinic-logo"
          />
          <div v-else class="clinic-logo-placeholder">
            <Building :size="24" />
          </div>
          <span class="clinic-name">{{ responseData.clinicInfo.name }}</span>
        </div>
      </header>

      <main class="main-content">
        <div class="card">
          <div v-if="responseData.patientInfo" class="patient-info-header">
            <div class="patient-avatar">
              {{ responseData.patientInfo.name.charAt(0) }}
            </div>
            <div class="patient-details">
              <h2 class="patient-name">{{ responseData.patientInfo.name }}</h2>
              <div class="patient-meta">
                <span>{{ responseData.patientInfo.gender }}</span>
                <span v-if="responseData.patientInfo.cpf"
                  >CPF:
                  {{
                    responseData.patientInfo.cpf.substring(0, 3)
                  }}.***.***-**</span
                >
              </div>
            </div>
          </div>

          <header class="form-header">
            <h1>{{ responseData.template.name }}</h1>
            <p>
              Preencha o formulário abaixo com atenção. Suas respostas são
              confidenciais e importantes para o seu atendimento.
            </p>
          </header>

          <form @submit.prevent="handleSubmit">
            <AnamnesisQuestionsRenderer
              :questions="responseData.template.questions"
              :answers="answers"
              :validationErrors="validationErrors"
            />
            <button type="submit" class="submit-button">Enviar Respostas</button>
            <p class="lpgd">Ao clicar em 'Enviar Respostas', declaro, sob minha responsabilidade, que todas as informações prestadas neste formulário são verdadeiras e completas, e autorizo seu uso exclusivamente para fins de atendimento clínico, conforme a Lei nº 13.709/2018 (LGPD).</p>
          </form>
        </div>
      </main>
    </template>

    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>Carregando formulário...</p>
    </div>
  </div>
</template>

<style scoped>
/* --- ESTILOS GLOBAIS (Sem alteração) --- */
.anamnesis-page {
  display: flex;
  justify-items: center;
  flex-direction: column;
  align-items: center;
  background-color: #f9fafb;
  min-height: 100vh;
}
.page-header {
  padding: 1rem 2rem;
  width: 100%;
  background-color: var(--branco);
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
}
.main-content {
  padding: 2rem;
  width: 100%;
}
.page-footer {
  text-align: center;
  padding: 1.5rem;
}
.card {
  background: var(--branco);
  border-radius: 1rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07);
  border: 1px solid #e5e7eb;
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  padding: 2.5rem 3rem;
}
.clinic-branding {
  display: flex;
  align-items: center;
  gap: 1rem;
}
.clinic-logo {
  height: 40px;
  max-height: 40px;
  border-radius: 1vh;
  width: auto;
  object-fit: contain;
}
.clinic-logo-placeholder {
  width: 40px;
  height: 40px;
  background-color: #eef2ff;
  color: var(--azul-principal);
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.clinic-name {
  font-weight: 600;
  font-size: 1.125rem;
  color: #374151;
}
.patient-info-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}
.patient-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #eef2ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  font-weight: 600;
  flex-shrink: 0;
}
.patient-name {
  font-size: 1.25rem;
  margin: 0;
  text-align: left;
}
.patient-meta {
  display: flex;
  gap: 1rem;
  color: var(--cinza-texto);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}
.form-header {
  text-align: center;
  margin-bottom: 2.5rem;
}
h1 {
  font-size: 1.75rem;
}
h2 {
  font-size: 1.75rem;
  text-align: center;
}
p {
  color: var(--cinza-texto);
  text-align: center;
}
.lpgd {
  font-size: 0.8rem;
  margin-top: 1rem;
}
.question-block {
  margin-bottom: 2.5rem;
}
.question-title {
  display: flex;
  align-items: flex-start; /* ✨ Alinha no topo para texto longo */
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #111827;
  border-left: 3px solid var(--azul-principal);
  padding-left: 1rem;
  text-align: left;
  transition: color 0.2s;
  line-height: 1.4; /* ✨ Melhora a leitura */
}
.question-title span {
  color: var(--azul-principal);
  font-family: var(--fonte-titulo);
  margin-top: 2px; /* ✨ Ajuste fino de alinhamento */
}

.submit-button {
  width: 100%;
  padding: 1rem;
  border: none;
  background: var(--azul-principal);
  color: var(--branco);
  font-size: 1rem;
  font-weight: 600;
  border-radius: 0.75rem;
  cursor: pointer;
  margin-top: 2rem;
  transition: background-color 0.2s;
}
.submit-button:hover {
  background-color: var(--azul-escuro);
}

/* --- ESTILOS DE ERRO (Sem alteração) --- */
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
  /* ✨ Adiciona sub-q-number ao seletor de erro */
  color: #ef4444;
}

/* --- ✨ ESTILOS CONDICIONAIS ATUALIZADOS --- */
.conditional-group {
  margin-top: 1.5rem;
  padding-left: 1.5rem;
  border-left: 3px solid #e5e7eb;
}
.sub-question-wrapper {
  /* ✨ Wrapper para a animação */
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
  margin-top: 4px; /* ✨ Ajusta alinhamento do ícone */
}
.sub-q-number {
  /* ✨ Estilo para o número 1.A, 1.B... */
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

/* --- Telas de Status e Loading (Sem alteração) --- */
.success-card,
.error-card {
  text-align: center;
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.success-icon {
  color: #10b981;
  margin-bottom: 1.5rem;
  animation: pop-in 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
}
.success-title {
  font-family: var(--fonte-titulo);
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  animation: slide-up 0.6s ease-out forwards;
  animation-delay: 0.2s;
  opacity: 0;
}
.success-message {
  font-size: 1.125rem;
  color: var(--cinza-texto);
  line-height: 1.6;
  max-width: 450px;
  margin-bottom: 2rem;
  animation: slide-up 0.6s ease-out forwards;
  animation-delay: 0.3s;
  opacity: 0;
}
.success-message strong {
  color: var(--preto);
  font-weight: 600;
}
.success-footer {
  font-size: 0.875rem;
  color: #9ca3af;
  animation: slide-up 0.6s ease-out forwards;
  animation-delay: 0.4s;
  opacity: 0;
}
.error-icon {
  color: #f59e0b;
  margin-bottom: 1.5rem;
}
.error-title {
  font-family: var(--fonte-titulo);
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: #b45309;
}
.error-message {
  font-size: 1.125rem;
  color: var(--cinza-texto);
  line-height: 1.6;
  max-width: 450px;
}

@keyframes pop-in {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes slide-up {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 1rem;
}
.spinner {
  width: 48px;
  height: 48px;
  border: 5px solid var(--azul-principal);
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}
@keyframes rotation {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* --- Estilos Responsivos (Sem alteração) --- */
@media (max-width: 768px) {
  .page-header {
    padding: 1rem;
    justify-content: space-between;
  }
  .main-content {
    padding: 1rem;
  }
  .page-footer {
    padding: 1rem;
  }
  .card {
    margin: 0;
    padding: 1.5rem 1rem;
    box-shadow: none;
    border: none;
    background: transparent;
  }
  .patient-info-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.75rem;
  }
  .patient-details {
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .patient-meta {
    justify-content: center;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .patient-name {
    text-align: center;
    font-size: 1.125rem;
  }
  .form-header {
    margin-bottom: 2rem;
  }
  .form-header h1 {
    font-size: 1.5rem;
  }
  .card.success-card,
  .card.error-card {
    padding: 3rem 1rem;
    margin-top: 2rem;
    background: var(--branco);
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.07);
  }
}
</style>
