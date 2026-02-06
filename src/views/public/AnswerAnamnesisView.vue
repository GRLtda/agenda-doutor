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
const logoError = ref(false)

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

// Normaliza valores de resposta para comparação consistente
// Trata: boolean true -> "Sim", boolean false -> "Não"
// Também trata strings "true"/"false"/"sim"/"não" (case-insensitive)
function normalizeAnswerValue(value) {
  if (typeof value === 'boolean') {
    return value ? 'Sim' : 'Não'
  }
  
  if (typeof value === 'string') {
    const lower = value.toLowerCase().trim()
    if (lower === 'true' || lower === 'sim') return 'Sim'
    if (lower === 'false' || lower === 'não' || lower === 'nao') return 'Não'
  }
  
  return String(value)
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

        if (answer === group.showWhenAnswerIs || normalizeAnswerValue(answer) === normalizeAnswerValue(group.showWhenAnswerIs)) {
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
          const normalizedA = normalizeAnswerValue(answerObj.answer)
          const normalizedT = normalizeAnswerValue(group.showWhenAnswerIs)
          if (answerObj.answer === group.showWhenAnswerIs || normalizedA === normalizedT) {
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
    <!-- ✨ TELA DE SUCESSO REFINADA -->
    <div v-if="submissionStatus === 'success'" class="status-wrapper">
      <div class="status-card success-card">
        <!-- Elementos decorativos -->
        <div class="decorative-circles">
          <div class="circle circle-1"></div>
          <div class="circle circle-2"></div>
          <div class="circle circle-3"></div>
        </div>

        <!-- Ícone com background animado -->
        <div class="icon-wrapper success-icon-bg">
          <div class="icon-glow"></div>
          <CheckCircle2 class="status-icon success-icon" :size="48" />
        </div>

        <!-- Conteúdo principal -->
        <div class="status-content">
          <h2 class="status-title success-title">Tudo certo!</h2>
          <p class="status-subtitle">Suas respostas foram enviadas com sucesso</p>
        
        </div>

        <!-- Mensagem de agradecimento -->
        <div class="thank-you-box">
          <p>Agradecemos pela sua colaboração! Suas informações são muito importantes para garantir um atendimento de qualidade.</p>
        </div>

        <!-- Rodapé -->
        <div class="status-footer">
          <div class="footer-divider"></div>
          <p class="footer-text">
            Você já pode fechar esta página com segurança
          </p>
        </div>
      </div>
    </div>

    <!-- ✨ TELA DE ERRO REFINADA -->
    <div v-else-if="submissionStatus === 'error'" class="status-wrapper">
      <div class="status-card error-card">
        <!-- Elementos decorativos -->
        <div class="decorative-circles error-circles">
          <div class="circle circle-1"></div>
          <div class="circle circle-2"></div>
          <div class="circle circle-3"></div>
        </div>

        <!-- Ícone com background animado -->
        <div class="icon-wrapper error-icon-bg">
          <div class="icon-glow error-glow"></div>
          <AlertTriangle class="status-icon error-icon" :size="48" />
        </div>

        <!-- Conteúdo principal -->
        <div class="status-content">
          <h2 class="status-title error-title">Link Inválido ou Expirado</h2>
          <p class="status-subtitle">Não foi possível carregar o formulário</p>
        </div>

        <!-- Box de instrução -->
        <div class="instruction-box">
          <div class="instruction-header">
            <span class="instruction-icon">💡</span>
            <span class="instruction-label">O que fazer agora?</span>
          </div>
          <ul class="instruction-list">
            <li>
              <span class="list-bullet">1</span>
              <span>Entre em contato com a clínica ou profissional de saúde</span>
            </li>
            <li>
              <span class="list-bullet">2</span>
              <span>Solicite um novo link para preencher o formulário</span>
            </li>
            <li>
              <span class="list-bullet">3</span>
              <span>Verifique se o link foi copiado corretamente</span>
            </li>
          </ul>
        </div>

        <!-- Rodapé -->
        <div class="status-footer">
          <div class="footer-divider error-divider"></div>
          <p class="footer-text error-footer-text">
            Links de anamnese expiram após um período para sua segurança
          </p>
        </div>
      </div>
    </div>

    <template v-else-if="responseData && answers">
      <header class="page-header">
        <div class="clinic-branding">
          <img
            v-if="responseData.clinicInfo?.logoUrl && !logoError"
            :src="responseData.clinicInfo.logoUrl"
            alt="Logo da clínica"
            class="clinic-logo"
            @error="logoError = true"
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

/* --- ✨ TELAS DE STATUS REFINADAS --- */
.status-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100%;
  padding: 2rem;
}

.status-card {
  position: relative;
  border-radius: 1.5rem;
  max-width: 480px;
  width: 100%;
  padding: 3rem 2.5rem;
  text-align: center;
  overflow: hidden;
  animation: card-appear 0.6s ease-out forwards;
}

/* Círculos decorativos */
.decorative-circles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.5;
}

.success-card .circle-1 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(16, 185, 129, 0) 70%);
  top: -80px;
  right: -60px;
  animation: float 6s ease-in-out infinite;
}

.success-card .circle-2 {
  width: 120px;
  height: 120px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0) 70%);
  bottom: -40px;
  left: -30px;
  animation: float 8s ease-in-out infinite reverse;
}

.success-card .circle-3 {
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0) 70%);
  top: 50%;
  right: -20px;
  animation: float 5s ease-in-out infinite;
}

.error-circles .circle-1 {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0) 70%);
}

.error-circles .circle-2 {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(239, 68, 68, 0) 70%);
}

.error-circles .circle-3 {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0) 70%);
}

/* Wrapper do ícone */
.icon-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.success-icon-bg {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.error-icon-bg {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
}

.icon-glow {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(16, 185, 129, 0.2);
  animation: pulse-glow 2s ease-in-out infinite;
}

.error-glow {
  background: rgba(245, 158, 11, 0.2);
}

.status-icon {
  position: relative;
  z-index: 1;
}

.success-icon {
  color: #10b981;
}

.error-icon {
  color: #f59e0b;
}

/* Conteúdo */
.status-content {
  margin-bottom: 1.5rem;
  animation: slide-up 0.6s ease-out forwards;
  animation-delay: 0.15s;
  opacity: 0;
}

.status-title {
  font-family: var(--fonte-titulo);
  font-size: 1.75rem;
  font-weight: 700;
  margin: 0 0 0.5rem;
  letter-spacing: -0.025em;
}

.success-title {
  color: #065f46;
}

.error-title {
  color: #92400e;
}

.status-subtitle {
  font-size: 1rem;
  color: #64748b;
  margin: 0 0 1rem;
  line-height: 1.5;
}

/* Badge da clínica */
.clinic-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border: 1px solid #bbf7d0;
  border-radius: 2rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #166534;
}

.clinic-badge svg {
  color: #22c55e;
}

/* Box de agradecimento */
.thank-you-box {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid #e2e8f0;
  animation: slide-up 0.6s ease-out forwards;
  animation-delay: 0.25s;
  opacity: 0;
}

.thank-you-box p {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.6;
  margin: 0;
}

/* Box de instruções */
.instruction-box {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-radius: 1rem;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  border: 1px solid #fde68a;
  text-align: left;
  animation: slide-up 0.6s ease-out forwards;
  animation-delay: 0.25s;
  opacity: 0;
}

.instruction-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.instruction-icon {
  font-size: 1.25rem;
}

.instruction-label {
  font-weight: 600;
  color: #92400e;
  font-size: 0.9rem;
}

.instruction-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.instruction-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #78350f;
  line-height: 1.5;
}

.list-bullet {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  background: #fbbf24;
  color: #78350f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Rodapé */
.status-footer {
  animation: slide-up 0.6s ease-out forwards;
  animation-delay: 0.35s;
  opacity: 0;
}

.footer-divider {
  width: 60px;
  height: 3px;
  background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
  border-radius: 2px;
  margin: 0 auto 1rem;
}

.error-divider {
  background: linear-gradient(90deg, #f59e0b 0%, #fbbf24 100%);
}

.footer-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.error-footer-text {
  font-size: 0.8rem;
  color: #78716c;
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

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-15px) rotate(5deg);
  }
}

@keyframes pulse-glow {
  0%, 100% {
    transform: scale(1);
    opacity: 0.2;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.4;
  }
}

@keyframes card-appear {
  from {
    transform: translateY(30px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
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

/* --- Estilos Responsivos --- */
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

  /* ✨ Estilos responsivos para as telas de status */
  .status-wrapper {
    padding: 1rem;
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)
  }

  .status-card {
    padding: 0;
    border-radius: 1.25rem;
    margin: 0;
  }

  .icon-wrapper {
    width: 80px;
    height: 80px;
    margin-bottom: 1.25rem;
  }

  .status-icon {
    width: 40px;
    height: 40px;
  }

  .status-title {
    font-size: 1.5rem;
  }

  .status-subtitle {
    font-size: 0.9rem;
  }

  .clinic-badge {
    font-size: 0.8rem;
    padding: 0.4rem 0.85rem;
  }

  .thank-you-box,
  .instruction-box {
    padding: 1rem;
  }

  .thank-you-box p {
    font-size: 0.8rem;
  }

  .instruction-list li {
    font-size: 0.8rem;
  }

  .list-bullet {
    width: 20px;
    height: 20px;
    font-size: 0.7rem;
  }

  .footer-text {
    font-size: 0.8rem;
  }

  /* Esconde círculos decorativos em mobile para performance */
  .decorative-circles {
    display: none;
  }
}
</style>
