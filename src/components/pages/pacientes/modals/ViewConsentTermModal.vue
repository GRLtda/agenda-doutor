<script setup>
import { ref, onMounted, computed } from 'vue'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { downloadConsentTermPdf, sendConsentTermPdf } from '@/api/consent-terms'
import { useToast } from 'vue-toastification'
import SideDrawer from '@/components/global/SideDrawer.vue'
import AppButton from '@/components/global/AppButton.vue'
import { 
  FileSignature, 
  Clock, 
  CheckCircle2, 
  MapPin, 
  Monitor, 
  Calendar,
  Download,
  Send,
  X 
} from 'lucide-vue-next'
import { marked } from 'marked'

const props = defineProps({
  patientId: { type: String, required: true },
  termId: { type: String, required: true },
})
const emit = defineEmits(['close'])

const consentTermsStore = useConsentTermsStore()
const toast = useToast()

const term = ref(null)
const isLoading = ref(true)

onMounted(async () => {
  isLoading.value = true
  const data = await consentTermsStore.fetchTermById(props.patientId, props.termId)
  if (data) {
    term.value = data
  } else {
    toast.error('Erro ao carregar termo.')
    emit('close')
  }
  isLoading.value = false
})

// Configurar marked para quebras de linha (para conteúdo markdown legado)
marked.setOptions({
  breaks: true,
  gfm: true
})

// Função para detectar se o conteúdo já é HTML
function isHtml(content) {
  // Verifica se começa com tag HTML típica
  return /<[a-z][\s\S]*>/i.test(content?.trim() || '')
}

const renderedContent = computed(() => {
  if (!term.value?.renderedContent) return ''
  // Remove a tag {assinatura} do conteúdo para visualização
  const content = term.value.renderedContent.replace(/\{ ?assinatura ?\}/gi, '')
  
  // Se já é HTML (novo formato TipTap), retorna direto
  if (isHtml(content)) {
    return content
  }
  
  // Caso contrário, processa como markdown (termos antigos)
  return marked.parse(content)
})

const isSigned = computed(() => term.value?.status === 'Assinado')

function formatDate(date) {
  if (!date) return '-'
  return new Date(date).toLocaleString('pt-BR')
}

const isDownloading = ref(false)
const isSending = ref(false)

async function handleDownloadPdf() {
  if (!isSigned.value) return
  
  isDownloading.value = true
  try {
    const response = await downloadConsentTermPdf(props.patientId, props.termId)
    const blob = new Blob([response.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `termo_${props.termId}.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
    toast.success('PDF baixado com sucesso!')
  } catch (err) {
    console.error('Erro ao baixar PDF:', err)
    toast.error('Erro ao gerar PDF do termo.')
  } finally {
    isDownloading.value = false
  }
}

async function handleSendPdf() {
  if (!isSigned.value) return
  
  isSending.value = true
  try {
    await sendConsentTermPdf(props.patientId, props.termId)
    toast.success('PDF enviado para o paciente via WhatsApp!')
  } catch (err) {
    console.error('Erro ao enviar PDF:', err)
    const message = err.response?.data?.message || 'Erro ao enviar PDF.'
    toast.error(message)
  } finally {
    isSending.value = false
  }
}
</script>

<template>
  <SideDrawer @close="emit('close')" size="lg">
    <template #header>
      <div class="drawer-header">
        <div class="header-left">
          <div class="title-row">
            <FileSignature :size="24" class="header-icon" />
            <h2>{{ term?.template?.name || 'Termo de Consentimento' }}</h2>
          </div>
          <div class="status-badge" :class="{ signed: isSigned, pending: !isSigned }">
            <CheckCircle2 v-if="isSigned" :size="14" />
            <Clock v-else :size="14" />
            {{ term?.status || 'Carregando...' }}
          </div>
        </div>
        <button @click="emit('close')" class="close-btn">
          <X :size="24" />
        </button>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando termo...</p>
    </div>

    <!-- Content -->
    <div v-else-if="term" class="drawer-content">
      <!-- Conteúdo do Termo -->
      <div class="term-content" v-html="renderedContent"></div>

      <!-- Informações de Assinatura -->
      <div v-if="isSigned && term.signature" class="signature-section">
        <h3 class="section-title">Dados da Assinatura</h3>
        
        <div class="signature-display">
          <img 
            v-if="term.signature.imageData" 
            :src="term.signature.imageData" 
            alt="Assinatura do paciente"
            class="signature-image"
          />
        </div>

        <div class="lgpd-info">
          <div class="info-item">
            <Calendar :size="14" />
            <span><strong>Assinado em:</strong> {{ formatDate(term.signature.signedAt) }}</span>
          </div>
          <div class="info-item">
            <MapPin :size="14" />
            <span><strong>IP:</strong> {{ term.signature.ipAddress || 'N/A' }}</span>
          </div>
          <div class="info-item">
            <Monitor :size="14" />
            <span><strong>Navegador:</strong> {{ term.signature.userAgent || 'N/A' }}</span>
          </div>
          <div class="info-item" v-if="term.signature.acceptedTerms">
            <CheckCircle2 :size="14" class="check-icon" />
            <span>Aceitou os termos e condições</span>
          </div>
          <div class="info-item" v-if="term.signature.identityConfirmation">
            <CheckCircle2 :size="14" class="check-icon" />
            <span>Confirmou sua identidade</span>
          </div>
        </div>
      </div>

      <!-- Aviso de Pendente -->
      <div v-else class="pending-notice">
        <Clock :size="24" />
        <p>Este termo ainda não foi assinado pelo paciente.</p>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton 
          v-if="isSigned" 
          @click="handleDownloadPdf" 
          variant="primary" 
          :loading="isDownloading"
          style="width: 100%"
        >
          <Download :size="18" />
          Baixar PDF
        </AppButton>
        <AppButton 
          v-if="isSigned" 
          @click="handleSendPdf" 
          variant="success" 
          :loading="isSending"
          style="width: 100%"
        >
          <Send :size="18" />
          Enviar ao Paciente
        </AppButton>
        <AppButton @click="emit('close')" variant="default" style="width: 100%">
          Fechar
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
  gap: 0.5rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  color: var(--azul-principal);
}

h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--preto);
  margin: 0;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  width: fit-content;
}

.status-badge.signed {
  color: #059669;
  background: #d1fae5;
}

.status-badge.pending {
  color: #d97706;
  background: #fef3c7;
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--cinza-texto);
  padding: 0.25rem;
}


.term-content {
  background: #fafafa;
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
  line-height: 1.7;
  margin-bottom: 1.5rem;
}

.term-content :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 1rem;
}

.term-content :deep(h2) {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}

.term-content :deep(h3) {
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.term-content :deep(p) {
  margin-bottom: 1rem;
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
  margin-bottom: 0.25rem;
  color: #374151;
  line-height: 1.6;
}

.signature-section {
  background: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  padding: 1.5rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--preto);
  margin: 0 0 1rem 0;
}

.signature-display {
  background: #f9fafb;
  border: 1px dashed #d1d5db;
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
}

.signature-image {
  max-width: 100%;
  max-height: 150px;
  object-fit: contain;
}

.lgpd-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--cinza-texto);
}

.info-item .check-icon {
  color: #10b981;
}

.pending-notice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 2rem;
  background: #fef3c7;
  border: 1px solid #fde68a;
  border-radius: 0.75rem;
  color: #92400e;
  text-align: center;
}

.pending-notice p {
  margin: 0;
  font-size: 0.875rem;
}

.drawer-footer {
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Loading */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid var(--azul-principal);
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
