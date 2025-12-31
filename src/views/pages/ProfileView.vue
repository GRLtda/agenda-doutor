<script setup>
import { ref, computed, onMounted, reactive, nextTick, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useClinicStore } from '@/stores/clinic'
import { User, Mail, Briefcase, Building2, MapPin, Shield, Crown, UserCircle, Calendar, Pencil, Check, X, Eraser, Save, FileSignature } from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()
const clinicStore = useClinicStore()
const toast = useToast()
const isLoading = ref(false)
const isSaving = ref(false)
const isEditing = ref(false)

const user = computed(() => authStore.user)
const clinic = computed(() => authStore.user?.clinic)
const isOwner = computed(() => user.value?.role === 'owner')

const formData = reactive({
  name: '',
  email: ''
})

// Assinatura do Médico
const signatureCanvas = ref(null)
const croInput = ref('')
const crmInput = ref('')
const ufInput = ref('')
const isDrawing = ref(false)
const hasSignature = ref(false)
const isSavingSignature = ref(false)
let lastPoint = { x: 0, y: 0 }

const roleLabels = {
  owner: 'Proprietário',
  admin: 'Administrador',
  employee: 'Funcionário',
  staff: 'Equipe'
}

const planLabels = {
  basic: 'Básico',
  premium: 'Premium',
  enterprise: 'Enterprise',
  lifetime: 'Vitalício'
}

const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name[0].toUpperCase()
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
}

const startEditing = () => {
  formData.name = user.value?.name || ''
  formData.email = user.value?.email || ''
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const saveProfile = async () => {
  if (!formData.name || !formData.email) {
    toast.error('Nome e email são obrigatórios')
    return
  }

  isSaving.value = true
  const result = await authStore.updateProfile({
    name: formData.name,
    email: formData.email
  })
  isSaving.value = false

  if (result.success) {
    toast.success('Perfil atualizado com sucesso!')
    isEditing.value = false
  } else {
    toast.error(result.error)
  }
}

const refreshUserData = async () => {
  isLoading.value = true
  try {
    await authStore.fetchUser()
  } catch (error) {
    console.error('Erro ao atualizar dados do usuário:', error)
  } finally {
    isLoading.value = false
  }
}

// ========== Funções do Canvas de Assinatura ==========
const CANVAS_WIDTH = 422
const CANVAS_HEIGHT = 150

const initCanvas = () => {
  const canvas = signatureCanvas.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  
  // Define dimensões CSS
  canvas.style.width = CANVAS_WIDTH + 'px'
  canvas.style.height = CANVAS_HEIGHT + 'px'
  
  // Define tamanho real do canvas baseado no device pixel ratio
  canvas.width = CANVAS_WIDTH * dpr
  canvas.height = CANVAS_HEIGHT * dpr
  
  // Escala o contexto para manter proporção
  ctx.scale(dpr, dpr)
  
  // Configurações do traço
  ctx.strokeStyle = '#1e3a5f'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'

  // Carrega assinatura existente se houver
  if (clinic.value?.doctorSignature?.imageUrl) {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      hasSignature.value = true
    }
    img.src = clinic.value.doctorSignature.imageUrl
  }
}

const getPoint = (e, canvas) => {
  const rect = canvas.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const clientY = e.touches ? e.touches[0].clientY : e.clientY
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  }
}

const startDrawing = (e) => {
  isDrawing.value = true
  const canvas = signatureCanvas.value
  lastPoint = getPoint(e, canvas)
}

const draw = (e) => {
  if (!isDrawing.value) return
  const canvas = signatureCanvas.value
  const ctx = canvas.getContext('2d')
  const currentPoint = getPoint(e, canvas)

  ctx.beginPath()
  ctx.moveTo(lastPoint.x, lastPoint.y)
  ctx.lineTo(currentPoint.x, currentPoint.y)
  ctx.stroke()

  lastPoint = currentPoint
  hasSignature.value = true
}

const stopDrawing = () => {
  isDrawing.value = false
}

const handleTouchStart = (e) => {
  e.preventDefault()
  startDrawing(e)
}

const handleTouchMove = (e) => {
  e.preventDefault()
  draw(e)
}

const clearSignature = () => {
  const canvas = signatureCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  
  // Limpa usando dimensões do canvas
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  hasSignature.value = false
}

const getSignatureData = () => {
  const canvas = signatureCanvas.value
  if (!canvas || !hasSignature.value) return null
  return canvas.toDataURL('image/png')
}

const saveSignature = async () => {
  if (!hasSignature.value && !croInput.value && !crmInput.value) {
    toast.error('Desenhe a assinatura ou informe o CRO/CRM')
    return
  }

  isSavingSignature.value = true
  
  const signatureData = getSignatureData()
  const result = await clinicStore.updateDoctorSignature({
    signatureData,
    cro: croInput.value,
    crm: crmInput.value,
    uf: ufInput.value
  })
  
  isSavingSignature.value = false

  if (result.success) {
    toast.success('Assinatura do médico salva com sucesso!')
  } else {
    toast.error(result.error || 'Erro ao salvar assinatura')
  }
}

// Watch para inicializar canvas quando clínica carregar
watch(() => clinic.value?.doctorSignature, async () => {
  if (clinic.value?.doctorSignature) {
    croInput.value = clinic.value.doctorSignature.cro || ''
    crmInput.value = clinic.value.doctorSignature.crm || ''
    ufInput.value = clinic.value.doctorSignature.uf || ''
  }
  await nextTick()
  if (isOwner.value) {
    initCanvas()
  }
}, { immediate: true })

onMounted(async () => {
  await refreshUserData()
  await nextTick()
  if (isOwner.value && signatureCanvas.value) {
    initCanvas()
  }
  if (clinic.value?.doctorSignature) {
    croInput.value = clinic.value.doctorSignature.cro || ''
    crmInput.value = clinic.value.doctorSignature.crm || ''
    ufInput.value = clinic.value.doctorSignature.uf || ''
  }
})
</script>

<template>
  <div class="profile-page">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando informações...</p>
    </div>

    <div v-else>
      <!-- Header with Avatar - ResumoView Style -->
      <header class="page-header">
        <div class="header-left">
          <div class="avatar-wrapper">
            <div class="avatar">
              {{ getInitials(user?.name) }}
            </div>
          </div>
          <div class="header-text">
            <h1 class="title">{{ user?.name || 'Usuário' }}</h1>
            <p class="subtitle">{{ user?.email || 'email@exemplo.com' }}</p>
          </div>
        </div>
      </header>

      <!-- Main Content Grid - ResumoView lists-grid Style -->
      <div class="lists-grid">
        <!-- Personal Information Section -->
        <div class="table-card">
          <div class="card-header">
            <div class="card-header-text">
              <h3 class="card-title">Informações Pessoais</h3>
              <p class="card-subtitle">Suas informações básicas de perfil.</p>
            </div>
            <button v-if="!isEditing" @click="startEditing" class="btn-icon" title="Editar Perfil">
              <Pencil :size="18" />
            </button>
            <div v-else class="edit-actions">
              <button @click="cancelEditing" class="btn-icon btn-cancel" title="Cancelar">
                <X :size="18" />
              </button>
              <button @click="saveProfile" class="btn-icon btn-save" title="Salvar" :disabled="isSaving">
                <Check :size="18" />
              </button>
            </div>
          </div>

          <div class="card-content">
            <div class="info-grid">
              <div class="info-field">
                <label class="field-label">Nome completo</label>
                <div v-if="!isEditing" class="field-value">
                  <User :size="18" class="field-icon" />
                  <span>{{ user?.name || 'Não informado' }}</span>
                </div>
                <FormInput 
                  v-else 
                  v-model="formData.name" 
                  placeholder="Seu nome completo"
                  class="edit-input"
                />
              </div>

              <div class="info-field">
                <label class="field-label">Email</label>
                <div v-if="!isEditing" class="field-value">
                  <Mail :size="18" class="field-icon" />
                  <span>{{ user?.email || 'Não informado' }}</span>
                </div>
                <FormInput 
                  v-else 
                  v-model="formData.email" 
                  placeholder="Seu email"
                  type="email"
                  class="edit-input"
                />
              </div>

              <div class="info-field">
                <label class="field-label">Função</label>
                <div class="field-value">
                  <Briefcase :size="18" class="field-icon" />
                  <span>{{ roleLabels[user?.role] || 'Não informado' }}</span>
                </div>
              </div>

              <div class="info-field">
                <label class="field-label">Membro desde</label>
                <div class="field-value">
                  <Calendar :size="18" class="field-icon" />
                  <span>{{ formatDate(clinic?.createdAt) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Clinic Information Section -->
        <div v-if="clinic" class="table-card">
          <div class="card-header">
            <div class="card-header-text">
              <h3 class="card-title">Informações da Clínica</h3>
              <p class="card-subtitle">Detalhes da instituição vinculada ao seu perfil.</p>
            </div>
          </div>

          <div class="card-content">
            <!-- Clinic Header -->
            <div class="clinic-header">
              <div class="clinic-logo-wrapper">
                <img 
                  v-if="clinic.logoUrl" 
                  :src="clinic.logoUrl" 
                  :alt="clinic.name"
                  class="clinic-logo"
                />
                <div v-else class="clinic-logo-placeholder">
                  <Building2 :size="24" />
                </div>
              </div>
              <div class="clinic-info">
                <h3 class="clinic-name">{{ clinic.name }}</h3>
                <span class="clinic-plan" :class="`plan-${clinic.plan}`">
                  {{ planLabels[clinic.plan] || clinic.plan }}
                </span>
              </div>
            </div>

            <div class="info-grid">
              <div class="info-field">
                <label class="field-label">CNPJ</label>
                <div class="field-value">
                  <Building2 :size="18" class="field-icon" />
                  <span>{{ clinic.cnpj || 'Não informado' }}</span>
                </div>
              </div>

              <div class="info-field">
                <label class="field-label">Responsável</label>
                <div class="field-value">
                  <User :size="18" class="field-icon" />
                  <span>{{ clinic.responsibleName || 'Não informado' }}</span>
                </div>
              </div>

              <div v-if="clinic.address?.city" class="info-field">
                <label class="field-label">Localização</label>
                <div class="field-value">
                  <MapPin :size="18" class="field-icon" />
                  <span>{{ clinic.address.city }}{{ clinic.address.state ? `, ${clinic.address.state}` : '' }}</span>
                </div>
              </div>

              <div class="info-field">
                <label class="field-label">Membros da equipe</label>
                <div class="field-value">
                  <UserCircle :size="18" class="field-icon" />
                  <span>{{ clinic.staff?.length || 0 }} membro(s)</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Doctor Signature Section (Owner Only) -->
        <div v-if="isOwner" class="table-card signature-card">
          <div class="card-header">
            <div class="card-header-text">
              <h3 class="card-title">
                <FileSignature :size="20" class="title-icon" />
                Assinatura do Médico
              </h3>
              <p class="card-subtitle">Crie uma assinatura digital para uso nos termos de consentimento.</p>
            </div>
          </div>

          <div class="card-content">
            <div class="signature-layout">
              <!-- Coluna Esquerda: Canvas de Assinatura -->
              <div class="signature-column">
                <label class="section-label">Sua Assinatura</label>
                <div class="canvas-container">
                  <canvas 
                    ref="signatureCanvas"
                    class="signature-canvas"
                    @mousedown="startDrawing"
                    @mousemove="draw"
                    @mouseup="stopDrawing"
                    @mouseleave="stopDrawing"
                    @touchstart="handleTouchStart"
                    @touchmove="handleTouchMove"
                    @touchend="stopDrawing"
                  ></canvas>
                  <p v-if="!hasSignature" class="canvas-placeholder">Desenhe sua assinatura aqui</p>
                </div>
                <div class="canvas-actions">
                  <button @click="clearSignature" class="btn-clear" title="Limpar assinatura">
                    <Eraser :size="16" />
                    <span>Limpar</span>
                  </button>
                </div>
              </div>

              <!-- Coluna Direita: Registro Profissional -->
              <div class="registration-column">
                <label class="section-label">Registro Profissional</label>
                <div class="registration-grid">
                  <div class="registration-field">
                    <label class="field-label">CRO (Dentistas)</label>
                    <FormInput 
                      v-model="croInput" 
                      placeholder="Ex: 12345"
                      class="registration-input"
                    />
                  </div>
                  <div class="registration-field">
                    <label class="field-label">CRM (Médicos)</label>
                    <FormInput 
                      v-model="crmInput" 
                      placeholder="Ex: 67890"
                      class="registration-input"
                    />
                  </div>
                  <div class="registration-field">
                    <label class="field-label">UF de Emissão</label>
                    <select v-model="ufInput" class="uf-select">
                      <option value="">Selecione</option>
                      <option value="AC">AC</option>
                      <option value="AL">AL</option>
                      <option value="AP">AP</option>
                      <option value="AM">AM</option>
                      <option value="BA">BA</option>
                      <option value="CE">CE</option>
                      <option value="DF">DF</option>
                      <option value="ES">ES</option>
                      <option value="GO">GO</option>
                      <option value="MA">MA</option>
                      <option value="MT">MT</option>
                      <option value="MS">MS</option>
                      <option value="MG">MG</option>
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PR">PR</option>
                      <option value="PE">PE</option>
                      <option value="PI">PI</option>
                      <option value="RJ">RJ</option>
                      <option value="RN">RN</option>
                      <option value="RS">RS</option>
                      <option value="RO">RO</option>
                      <option value="RR">RR</option>
                      <option value="SC">SC</option>
                      <option value="SP">SP</option>
                      <option value="SE">SE</option>
                      <option value="TO">TO</option>
                    </select>
                  </div>
                </div>
                <p class="field-hint">O registro aparecerá formatado como CRO-SP 12345 ou CRM-RJ 67890.</p>
              </div>
            </div>

            <!-- Botão Salvar e Informações -->
            <div class="signature-footer">
              <div class="info-box">
                <p class="info-text">
                  <strong>💡 Dica:</strong> Use <code>{cro_medico}</code> e <code>{crm_medico}</code> nos modelos de termo. A assinatura será adicionada automaticamente ao PDF.
                </p>
              </div>
              <button @click="saveSignature" class="btn-save-signature" :disabled="isSavingSignature">
                <Save :size="18" />
                <span>{{ isSavingSignature ? 'Salvando...' : 'Salvar Assinatura' }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  font-family: var(--fonte-principal);
  color: var(--preto);
}

/* Header - ResumoView Style */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.header-text {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.1rem;
  color: var(--preto);
  line-height: 1.2;
}

.subtitle {
  color: var(--cinza-texto);
  font-size: 0.875rem;
}

/* Grid Layout - ResumoView Style */
.lists-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .lists-grid {
    grid-template-columns: 1fr;
  }
}

/* Table Card / Panels - ResumoView Style */
.table-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.3rem;
  flex-shrink: 0;
}

.card-header-text {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--preto);
  margin: 0;
  line-height: 1.2;
}

.card-subtitle {
  font-size: 0.8rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
  line-height: 1.2;
}

.card-content {
  padding: 0 1.3rem 1.3rem;
  flex: 1;
}

/* Clinic Header */
.clinic-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  min-width: 0;
}

.clinic-logo-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  flex-shrink: 0;
}

.clinic-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.clinic-logo-placeholder {
  color: var(--azul-principal);
}

.clinic-info {
  flex: 1;
  min-width: 0;
}

.clinic-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--preto);
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clinic-plan {
  display: inline-block;
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.clinic-plan.plan-basic {
  background: #dbeafe;
  color: #1e40af;
}

.clinic-plan.plan-premium {
  background: #fef3c7;
  color: #92400e;
}

.clinic-plan.plan-enterprise,
.clinic-plan.plan-lifetime {
  background: #fef3c7;
  color: #92400e;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cinza-texto);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.field-value {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--preto);
  transition: all 0.2s ease;
  min-width: 0;
}

.field-value span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.field-value:hover {
  background: #f1f5f9;
  border-color: #d1d5db;
}

.field-icon {
  color: #6b7280;
  flex-shrink: 0;
}

/* Edit Mode Styles */
.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #f9fafb;
  color: #111827;
  border-color: #d1d5db;
}

.btn-save {
  background: #22c55e;
  color: white;
  border-color: #22c55e;
}

.btn-save:hover {
  background: #16a34a;
  border-color: #16a34a;
  color: white;
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-cancel {
  background: white;
  color: #ef4444;
  border-color: #fee2e2;
}

.btn-cancel:hover {
  background: #fef2f2;
  border-color: #ef4444;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: var(--branco);
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  gap: 1rem;
  color: var(--cinza-texto);
}

.spinner {
  border: 3px solid #f1f5f9;
  border-top: 3px solid var(--azul-principal);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 1.25rem;
  }

  .subtitle {
    font-size: 0.8rem;
  }

  .lists-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    padding: 1rem;
  }

  .card-content {
    padding: 0 1rem 1rem;
  }

  .clinic-header {
    flex-direction: column;
    text-align: center;
  }
}

/* ========== Doctor Signature Section ========== */
.signature-card {
  grid-column: 1 / -1;
}

.signature-card .card-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.title-icon {
  color: var(--azul-principal);
}

/* Layout Principal em Duas Colunas */
.signature-layout {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2rem;
  margin-bottom: 1.5rem;
}

.section-label {
  display: block;
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--preto);
  margin-bottom: 0.75rem;
}

/* Coluna do Canvas */
.signature-column {
  display: flex;
  flex-direction: column;
}

.canvas-container {
  position: relative;
  width: 422px;
  height: 150px;
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  background: #fafbfc;
  transition: all 0.2s ease;
  overflow: hidden;
}

.canvas-container:hover {
  border-color: var(--azul-principal);
  background: #f0f7ff;
}

.signature-canvas {
  cursor: crosshair;
  touch-action: none;
}

.canvas-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #9ca3af;
  font-size: 0.875rem;
  pointer-events: none;
  margin: 0;
}

.canvas-actions {
  margin-top: 0.75rem;
}

.btn-clear {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-clear:hover {
  color: #dc2626;
  background: #fef2f2;
  border-color: #fecaca;
}

/* Coluna do Registro Profissional */
.registration-column {
  display: flex;
  flex-direction: column;
}

.registration-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.registration-field {
  width: 100%;
}

/* O campo UF deve ocupar menos espaço se possível, ou ficar na linha de baixo junto com outro */
.registration-field.uf-field {
  grid-column: 1 / -1;
}

.registration-input {
  width: 100%;
}

.uf-select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
  font-size: 0.875rem;
  color: var(--preto);
  cursor: pointer;
  transition: all 0.2s ease;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236b7280' d='M3 5l3 3 3-3'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  padding-right: 2rem;
}

.uf-select:hover {
  border-color: var(--azul-principal);
  background-color: #f0f7ff;
}

.uf-select:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.field-hint {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.75rem;
  margin-bottom: 0;
}

/* Footer da Seção de Assinatura */
.signature-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.info-box {
  flex: 1;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 10px;
  padding: 0.875rem 1rem;
}

.info-text {
  font-size: 0.8rem;
  color: #0369a1;
  margin: 0;
  line-height: 1.5;
}

.info-text code {
  background: #e0f2fe;
  color: #0c4a6e;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-family: 'Fira Code', monospace;
  font-size: 0.75rem;
}

.btn-save-signature {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(135deg, var(--azul-principal) 0%, #2563eb 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
  white-space: nowrap;
}

.btn-save-signature:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

.btn-save-signature:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Responsividade */
@media (max-width: 768px) {
  .signature-layout {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
  
  .canvas-container {
    width: 100%;
    max-width: 422px;
    height: 150px;
  }
  
  .signature-footer {
    flex-direction: column;
    align-items: stretch;
  }
  
  .btn-save-signature {
    width: 100%;
    justify-content: center;
  }
}
</style>
