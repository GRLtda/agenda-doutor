<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { useToast } from 'vue-toastification'
import confetti from 'canvas-confetti'
import { marked } from 'marked'
import {
  CheckCircle2,
  AlertTriangle,
  Building,
  Eraser,
  Send,
  Pencil,
  Type,
  Upload
} from 'lucide-vue-next'

const route = useRoute()
const consentTermsStore = useConsentTermsStore()
const toast = useToast()

const responseData = ref(null)
const submissionStatus = ref('pending') // pending, success, error
const token = route.params.token

// Canvas de assinatura
const signatureCanvas = ref(null)
const isDrawing = ref(false)
const hasSignature = ref(false)
let ctx = null

// Checkboxes de aceite
const acceptedTerms = ref(false)
const identityConfirmation = ref(false)

// Métodos de assinatura
const signatureMethod = ref('draw') // 'draw', 'type', 'upload'
const typedName = ref('')
const uploadedSignature = ref(null)
const fileInput = ref(null)

// Computed
const renderedContent = computed(() => {
  if (!responseData.value?.renderedContent) return ''
  // Substitui {assinatura} por um placeholder visual
  const content = responseData.value.renderedContent.replace(
    /\{ ?assinatura ?\}/gi,
    '<div class="signature-placeholder" id="signature-area">Área de Assinatura</div>'
  )
  // Configura marked para respeitar quebras de linha simples
  return marked.parse(content, { breaks: true, gfm: true })
})

const canSubmit = computed(() => {
  return hasSignature.value && acceptedTerms.value && identityConfirmation.value
})

// -- Lifecycle --
onMounted(async () => {
  const { success } = await consentTermsStore.fetchPublicTerm(token)

  if (success && consentTermsStore.publicTerm) {
    responseData.value = consentTermsStore.publicTerm
    await nextTick()
    initCanvas()
  } else {
    submissionStatus.value = 'error'
  }
})

// -- Canvas Functions --
function initCanvas() {
  const canvas = signatureCanvas.value
  if (!canvas) return

  ctx = canvas.getContext('2d')
  
  // Set canvas size
  const container = canvas.parentElement
  canvas.width = container.clientWidth
  canvas.height = 150

  // Style
  ctx.strokeStyle = '#1f2937'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Event listeners
  canvas.addEventListener('mousedown', startDrawing)
  canvas.addEventListener('mousemove', draw)
  canvas.addEventListener('mouseup', stopDrawing)
  canvas.addEventListener('mouseleave', stopDrawing)

  // Touch events
  canvas.addEventListener('touchstart', handleTouchStart)
  canvas.addEventListener('touchmove', handleTouchMove)
  canvas.addEventListener('touchend', stopDrawing)
}

function startDrawing(e) {
  isDrawing.value = true
  const rect = signatureCanvas.value.getBoundingClientRect()
  ctx.beginPath()
  ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top)
}

function draw(e) {
  if (!isDrawing.value) return
  const rect = signatureCanvas.value.getBoundingClientRect()
  ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top)
  ctx.stroke()
  hasSignature.value = true
}

function stopDrawing() {
  isDrawing.value = false
}

function handleTouchStart(e) {
  e.preventDefault()
  const touch = e.touches[0]
  const rect = signatureCanvas.value.getBoundingClientRect()
  isDrawing.value = true
  ctx.beginPath()
  ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top)
}

function handleTouchMove(e) {
  e.preventDefault()
  if (!isDrawing.value) return
  const touch = e.touches[0]
  const rect = signatureCanvas.value.getBoundingClientRect()
  ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top)
  ctx.stroke()
  hasSignature.value = true
}

function clearSignature() {
  if (signatureMethod.value === 'draw') {
    if (ctx && signatureCanvas.value) {
      ctx.clearRect(0, 0, signatureCanvas.value.width, signatureCanvas.value.height)
    }
  } else if (signatureMethod.value === 'type') {
    typedName.value = ''
  } else if (signatureMethod.value === 'upload') {
    uploadedSignature.value = null
    if (fileInput.value) fileInput.value.value = ''
  }
  hasSignature.value = false
}

function handleFileUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  
  if (!file.type.startsWith('image/')) {
    toast.error('Por favor, selecione uma imagem válida.')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    uploadedSignature.value = e.target?.result
    hasSignature.value = true
  }
  reader.readAsDataURL(file)
}

function onTypedNameInput() {
  hasSignature.value = typedName.value.trim().length > 0
}

function generateTypedSignatureImage() {
  // Cria um canvas temporário para gerar imagem da assinatura digitada
  const canvas = document.createElement('canvas')
  canvas.width = 400
  canvas.height = 100
  const context = canvas.getContext('2d')
  
  context.fillStyle = '#fafafa'
  context.fillRect(0, 0, canvas.width, canvas.height)
  
  context.font = 'italic 32px "Brush Script MT", cursive'
  context.fillStyle = '#1f2937'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(typedName.value, canvas.width / 2, canvas.height / 2)
  
  return canvas.toDataURL('image/png')
}

function getSignatureData() {
  if (signatureMethod.value === 'draw') {
    if (!signatureCanvas.value) return null
    return signatureCanvas.value.toDataURL('image/png')
  } else if (signatureMethod.value === 'type') {
    return generateTypedSignatureImage()
  } else if (signatureMethod.value === 'upload') {
    return uploadedSignature.value
  }
  return null
}

// -- Submit --
async function handleSubmit() {
  if (!canSubmit.value) {
    if (!hasSignature.value) {
      toast.error('Por favor, assine o termo no campo indicado.')
    } else if (!acceptedTerms.value || !identityConfirmation.value) {
      toast.error('Por favor, marque todas as confirmações obrigatórias.')
    }
    return
  }

  const signatureData = getSignatureData()
  if (!signatureData) {
    toast.error('Erro ao capturar assinatura.')
    return
  }

  const payload = {
    signatureData,
    acceptedTerms: acceptedTerms.value,
    identityConfirmation: identityConfirmation.value,
    signatureMethod: signatureMethod.value
  }

  const { success } = await consentTermsStore.submitSignature(token, payload)

  if (success) {
    submissionStatus.value = 'success'
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 },
      zIndex: 9999,
    })
  }
}
</script>

<template>
  <div class="consent-page">
    <!-- Success State -->
    <div v-if="submissionStatus === 'success'" class="card success-card">
      <CheckCircle2 class="success-icon" :size="64" />
      <h2 class="success-title">Termo Assinado!</h2>
      <p class="success-message">
        Sua assinatura foi registrada com sucesso
        <span v-if="responseData?.clinicInfo?.name">
          para a <strong>{{ responseData.clinicInfo.name }}</strong>
        </span>.
      </p>
      <p class="success-footer">Você já pode fechar esta página.</p>
    </div>

    <!-- Error State -->
    <div v-else-if="submissionStatus === 'error'" class="card error-card">
      <AlertTriangle class="error-icon" :size="64" />
      <h2 class="error-title">Link Inválido ou Expirado</h2>
      <p class="error-message">
        Não foi possível carregar o termo. Por favor, entre em contato com a
        clínica para solicitar um novo link.
      </p>
    </div>

    <!-- Form -->
    <template v-else-if="responseData">
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
          <span class="clinic-name">{{ responseData.clinicInfo?.name }}</span>
        </div>
      </header>

      <main class="main-content">
        <div class="card">
          <!-- Patient Info -->
          <div v-if="responseData.patientInfo" class="patient-info-header">
            <div class="patient-avatar">
              {{ responseData.patientInfo.name.charAt(0) }}
            </div>
            <div class="patient-details">
              <h2 class="patient-name">{{ responseData.patientInfo.name }}</h2>
              <div class="patient-meta">
                <span>{{ responseData.patientInfo.gender }}</span>
                <span v-if="responseData.patientInfo.cpf">
                  CPF: {{ responseData.patientInfo.cpf }}.***.***-**
                </span>
              </div>
            </div>
          </div>

          <!-- Term Title -->
          <header class="form-header">
            <h1>{{ responseData.template?.name }}</h1>
            <p>Leia atentamente o termo abaixo e assine para confirmar.</p>
          </header>

          <!-- Term Content -->
          <div class="term-content" v-html="renderedContent"></div>

          <!-- Signature Area -->
          <div class="signature-section">
            <div class="signature-header">
              <h3>Sua Assinatura</h3>
              <button @click="clearSignature" class="clear-btn" type="button">
                <Eraser :size="16" />
                Limpar
              </button>
            </div>

            <!-- Signature Method Tabs -->
            <div class="signature-tabs">
              <button 
                type="button"
                :class="['tab-btn', { active: signatureMethod === 'draw' }]"
                @click="signatureMethod = 'draw'"
              >
                <Pencil :size="16" />
                Desenhar
              </button>
              <button 
                type="button"
                :class="['tab-btn', { active: signatureMethod === 'type' }]"
                @click="signatureMethod = 'type'"
              >
                <Type :size="16" />
                Digitar Nome
              </button>
              <button 
                type="button"
                :class="['tab-btn', { active: signatureMethod === 'upload' }]"
                @click="signatureMethod = 'upload'"
              >
                <Upload :size="16" />
                Carregar
              </button>
            </div>

            <!-- Draw Method -->
            <div v-if="signatureMethod === 'draw'" class="canvas-container">
              <canvas 
                ref="signatureCanvas"
                class="signature-canvas"
              ></canvas>
              <p v-if="!hasSignature" class="canvas-hint">
                Desenhe sua assinatura aqui
              </p>
            </div>

            <!-- Type Method -->
            <div v-else-if="signatureMethod === 'type'" class="type-container">
              <input 
                v-model="typedName"
                @input="onTypedNameInput"
                type="text"
                class="typed-signature-input"
                placeholder="Digite seu nome completo"
              />
              <div v-if="typedName" class="typed-signature-preview">
                {{ typedName }}
              </div>
            </div>

            <!-- Upload Method -->
            <div v-else-if="signatureMethod === 'upload'" class="upload-container">
              <input 
                ref="fileInput"
                type="file"
                accept="image/*"
                @change="handleFileUpload"
                class="file-input"
                id="signature-upload"
              />
              <label v-if="!uploadedSignature" for="signature-upload" class="upload-label">
                <Upload :size="32" />
                <span>Clique para carregar uma imagem de assinatura</span>
                <span class="upload-hint">PNG, JPG ou GIF</span>
              </label>
              <div v-else class="uploaded-preview">
                <img :src="uploadedSignature" alt="Assinatura carregada" />
              </div>
            </div>
          </div>

          <!-- Confirmations -->
          <div class="confirmations">
            <label class="checkbox-item" @click.prevent="acceptedTerms = !acceptedTerms">
              <div class="custom-checkbox" :class="{ checked: acceptedTerms }">
                <svg v-if="acceptedTerms" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span>Li e concordo com todos os termos descritos acima.</span>
            </label>
            <label class="checkbox-item" @click.prevent="identityConfirmation = !identityConfirmation">
              <div class="custom-checkbox" :class="{ checked: identityConfirmation }">
                <svg v-if="identityConfirmation" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
              <span>Confirmo que sou o(a) paciente identificado(a) neste documento.</span>
            </label>
          </div>

          <!-- Submit -->
          <button 
            @click="handleSubmit" 
            class="submit-button"
            :disabled="!canSubmit"
          >
            <Send :size="18" />
            Assinar e Enviar
          </button>

          <p class="lgpd">
            Ao clicar em 'Assinar e Enviar', você concorda com o registro da sua 
            assinatura digital, incluindo data, hora e outras informações para 
            fins de autenticidade, conforme a Lei nº 13.709/2018 (LGPD).
          </p>
        </div>
      </main>
    </template>

    <!-- Loading -->
    <div v-else class="loading-state">
      <div class="spinner"></div>
      <p>Carregando termo...</p>
    </div>
  </div>
</template>

<style scoped>
.consent-page {
  display: flex;
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
  border-radius: 0.5rem;
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
  margin-bottom: 2rem;
}

.form-header h1 {
  font-size: 1.5rem;
  margin: 0 0 0.5rem 0;
}

.form-header p {
  margin: 0;
  color: var(--cinza-texto);
}

.term-content {
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  line-height: 1.7;
  margin-bottom: 2rem;
}

/* Estilos para markdown renderizado */
.term-content :deep(h1) {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 0;
  margin-bottom: 1rem;
  color: #111827;
}

.term-content :deep(h2) {
  font-size: 1.5rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  color: #111827;
}

.term-content :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
  color: #111827;
}

.term-content :deep(p) {
  margin-bottom: 0.75rem;
  color: #374151;
}

.term-content :deep(strong) {
  font-weight: 700;
  color: #111827;
}

.term-content :deep(em) {
  font-style: italic;
}

.term-content :deep(ol) {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
  list-style-type: decimal;
}

.term-content :deep(ul) {
  padding-left: 1.5rem;
  margin-bottom: 1rem;
  list-style-type: disc;
}

.term-content :deep(li) {
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  color: #374151;
  line-height: 1.6;
}

.term-content :deep(.signature-placeholder) {
  background: #fef3c7;
  border: 2px dashed #f59e0b;
  border-radius: 0.5rem;
  padding: 1rem;
  text-align: center;
  color: #92400e;
  font-weight: 500;
  margin: 1rem 0;
}

.signature-section {
  margin-bottom: 1.5rem;
}

.signature-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.signature-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: none;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  color: var(--cinza-texto);
  cursor: pointer;
  transition: border-color 0.2s;
}

.clear-btn:hover {
  border-color: var(--azul-principal);
  color: var(--azul-principal);
}

.canvas-container {
  position: relative;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  background: #fafafa;
  overflow: hidden;
}

.signature-canvas {
  display: block;
  width: 100%;
  height: 150px;
  cursor: crosshair;
  touch-action: none;
}

.canvas-hint {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #9ca3af;
  font-size: 0.875rem;
  pointer-events: none;
  margin: 0;
}

/* Signature Method Tabs */
.signature-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--cinza-texto);
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn:hover {
  border-color: var(--azul-principal);
  color: var(--azul-principal);
}

.tab-btn.active {
  background: var(--azul-principal);
  border-color: var(--azul-principal);
  color: white;
}

/* Type Method */
.type-container {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.typed-signature-input {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 1rem;
  transition: border-color 0.2s;
}

.typed-signature-input:focus {
  outline: none;
  border-color: var(--azul-principal);
}

.typed-signature-preview {
  background: #fafafa;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  text-align: center;
  font-family: 'Brush Script MT', cursive;
  font-size: 2rem;
  font-style: italic;
  color: #1f2937;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Upload Method */
.upload-container {
  position: relative;
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.upload-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  border: 2px dashed #d1d5db;
  border-radius: 0.75rem;
  background: #fafafa;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
  color: var(--cinza-texto);
}

.upload-label:hover {
  border-color: var(--azul-principal);
  background: #eef2ff;
  color: var(--azul-principal);
}

.upload-hint {
  font-size: 0.75rem;
  color: #9ca3af;
}

.uploaded-preview {
  background: #fafafa;
  border: 2px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.uploaded-preview img {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
}

.confirmations {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.checkbox-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  transition: border-color 0.2s, background-color 0.2s;
  user-select: none;
}

.checkbox-item:hover {
  border-color: var(--azul-principal);
  background-color: #eef2ff;
}

.custom-checkbox {
  width: 22px;
  height: 22px;
  min-width: 22px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.custom-checkbox.checked {
  background: var(--azul-principal);
  border-color: var(--azul-principal);
}

.custom-checkbox svg {
  width: 14px;
  height: 14px;
  color: white;
}

.checkbox-item span {
  color: #374151;
  line-height: 1.4;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: background-color 0.2s, opacity 0.2s;
}

.submit-button:hover:not(:disabled) {
  background-color: var(--azul-escuro);
}

.submit-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lgpd {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  text-align: center;
  margin-top: 1rem;
  margin-bottom: 0;
}

/* Success & Error Cards */
.success-card,
.error-card {
  text-align: center;
  padding: 4rem 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: 2rem;
}

.success-icon {
  color: #10b981;
  margin-bottom: 1.5rem;
  animation: pop-in 0.5s ease forwards;
}

.success-title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.success-message {
  font-size: 1.125rem;
  color: var(--cinza-texto);
  max-width: 450px;
  margin-bottom: 2rem;
}

.success-message strong {
  color: var(--preto);
}

.success-footer {
  font-size: 0.875rem;
  color: #9ca3af;
}

.error-icon {
  color: #f59e0b;
  margin-bottom: 1.5rem;
}

.error-title {
  font-size: 2rem;
  font-weight: 700;
  color: #b45309;
  margin-bottom: 0.5rem;
}

.error-message {
  font-size: 1.125rem;
  color: var(--cinza-texto);
  max-width: 450px;
}

/* Loading */
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
  animation: spin 1s linear infinite;
}

@keyframes pop-in {
  from { transform: scale(0.5); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    padding: 1rem;
  }

  .main-content {
    padding: 1rem;
  }

  .card {
    padding: 1.5rem 1rem;
  }

  .patient-info-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .patient-meta {
    justify-content: center;
    flex-wrap: wrap;
  }

  .form-header h1 {
    font-size: 1.25rem;
  }
}
</style>
