<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentsStore } from '@/stores/documents'
import { useToast } from 'vue-toastification'
import {
  ArrowLeft,
  FileText,
  Download,
  Send,
  ShieldCheck,
  Eye,
  History,
  Clock,
  User,
  Calendar,
  Mail,
  MessageCircle,
  Loader2,
  Edit,
  XCircle,
  CheckCircle
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import DocumentStatusBadge from '@/components/documents/DocumentStatusBadge.vue'
import CertificateSelectModal from '@/components/documents/CertificateSelectModal.vue'
import PdfViewer from '@/components/documents/PdfViewer.vue'
import webpkiService from '@/services/webpki.service'

const route = useRoute()
const router = useRouter()
const documentsStore = useDocumentsStore()
const toast = useToast()

// State
const activeTab = ref('details')
const isLoading = ref(true)
const isSigning = ref(false)
const isSending = ref(false)
const showCertModal = ref(false)
const showSendModal = ref(false)
const pdfPreview = ref(null)
const signatureData = ref(null)
const history = ref([])
const versions = ref([])
const signatureInfo = ref(null)

const sendForm = ref({
  method: 'email',
  email: '',
  phone: ''
})

// Computed
const document = computed(() => documentsStore.selectedDocument)

const canEdit = computed(() => {
  const status = document.value?.status
  return status === 'draft' || status === 'signature_failed'
})

const canSign = computed(() => {
  const status = document.value?.status
  return status === 'draft' || status === 'signature_failed'
})

const canSend = computed(() => {
  return document.value?.status === 'signed'
})

const canDownload = computed(() => {
  return document.value?.status === 'signed' || document.value?.signedPdfUrl
})

// Lifecycle
onMounted(async () => {
  await loadDocument()
})

// Methods
async function loadDocument() {
  isLoading.value = true
  
  const { success } = await documentsStore.fetchDocument(route.params.id)
  
  if (!success) {
    toast.error('Documento não encontrado')
    router.push({ name: 'documents-list' })
    return
  }

  // Load additional data
  await Promise.all([
    loadHistory(),
    loadVersions(),
    loadSignatureInfo()
  ])

  // Prefill send form with patient data
  if (document.value?.patient) {
    sendForm.value.email = document.value.patient.email || ''
    sendForm.value.phone = document.value.patient.phone || ''
  }

  isLoading.value = false
}

async function loadHistory() {
  const { success, data } = await documentsStore.fetchHistory(route.params.id)
  if (success) {
    history.value = data
  }
}

async function loadVersions() {
  const { success, data } = await documentsStore.fetchVersions(route.params.id)
  if (success) {
    versions.value = data
  }
}

async function loadSignatureInfo() {
  if (document.value?.status === 'signed') {
    const { success, data } = await documentsStore.getSignatureInfo(route.params.id)
    if (success && data.length > 0) {
      signatureInfo.value = data[0]
    }
  }
}

function goBack() {
  router.push({ name: 'documents-list' })
}

function editDocument() {
  router.push({ name: 'document-edit', params: { id: route.params.id } })
}

async function handlePreviewPdf() {
  if (document.value?.signedPdfUrl) {
    pdfPreview.value = {
      url: document.value.signedPdfUrl,
      name: `${document.value.title}.pdf`,
      title: 'Documento Assinado'
    }
  } else {
    const { success, data, error } = await documentsStore.generatePdf(route.params.id)
    
    if (success) {
      pdfPreview.value = {
        url: data.pdfUrl,
        name: `${document.value.title}.pdf`,
        title: 'Preview do Documento'
      }
    } else {
      toast.error(error || 'Erro ao gerar preview')
    }
  }
}

async function handleDownload() {
  const { success, data, error } = await documentsStore.downloadDocument(route.params.id)
  
  if (success && data.pdfUrl) {
    window.open(data.pdfUrl, '_blank')
  } else {
    toast.error(error || 'Erro ao baixar documento')
  }
}

async function handleStartSign() {
  if (!canSign.value) return
  
  isSigning.value = true
  
  try {
    const { success, data, error } = await documentsStore.requestSignature(route.params.id)
    
    if (success) {
      signatureData.value = data
      showCertModal.value = true
    } else {
      toast.error(error || 'Erro ao iniciar assinatura')
    }
  } finally {
    isSigning.value = false
  }
}

async function handleCertificateSelected(cert) {
  showCertModal.value = false
  
  if (!signatureData.value) {
    toast.error('Dados de assinatura não encontrados')
    return
  }

  isSigning.value = true
  const loadingToast = toast.info('Assinando documento...', { timeout: false })

  try {
    // Sign PDF using Web PKI
    console.log('[DEBUG-DETAIL] Chamando webpkiService.signPdf com:', {
      pdfLength: signatureData.value.pdfBase64?.length,
      thumbprint: cert.thumbprint,
      options: {
        digestAlgorithm: signatureData.value.hashAlgorithm || 'SHA-256',
        signaturePolicy: signatureData.value.signatureOptions?.signaturePolicy
      },
      certKeys: Object.keys(cert)
    })
    
    const signedPdfBase64 = await webpkiService.signPdf(
      signatureData.value.pdfBase64,
      cert.thumbprint,
      {
        digestAlgorithm: signatureData.value.hashAlgorithm || 'SHA-256',
        signaturePolicy: signatureData.value.signatureOptions?.signaturePolicy
      },
      cert
    )

    const { success, error } = await documentsStore.submitSignedPdf(route.params.id, {
      signedPdfBase64,
      originalPdfHash: signatureData.value.pdfHash,
      signatureAppearance: signatureData.value.signatureOptions?.appearance || 'invisible',
      certificateInfo: {
        subjectName: cert.subjectName,
        pkiBrazil: cert.pkiBrazil,
        issuerName: cert.issuerName,
        serialNumber: cert.serialNumber,
        validityStart: cert.validityStart,
        validityEnd: cert.validityEnd,
        thumbprint: cert.thumbprint
      }
    })

    toast.dismiss(loadingToast)

    if (success) {
      toast.success('Documento assinado com sucesso!')
      await loadDocument()
    } else {
      toast.error(error || 'Erro ao enviar documento assinado')
    }
  } catch (err) {
    toast.dismiss(loadingToast)
    toast.error(err.message || 'Erro ao assinar documento')
  } finally {
    isSigning.value = false
    signatureData.value = null
  }
}

async function handleSend() {
  if (!canSend.value) return

  isSending.value = true

  try {
    const sendData = {
      method: sendForm.value.method
    }

    if (sendForm.value.method === 'email') {
      if (!sendForm.value.email) {
        toast.warning('Informe o e-mail do destinatário')
        return
      }
      sendData.email = sendForm.value.email
    } else {
      if (!sendForm.value.phone) {
        toast.warning('Informe o telefone do destinatário')
        return
      }
      sendData.phone = sendForm.value.phone
    }

    const { success, data, error } = await documentsStore.sendDocument(route.params.id, sendData)

    if (success) {
      toast.success(data.message || 'Documento enviado com sucesso!')
      showSendModal.value = false
    } else {
      toast.error(error || 'Erro ao enviar documento')
    }
  } finally {
    isSending.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatShortDate(dateString) {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('pt-BR')
}

function getActionLabel(action) {
  const labels = {
    'DOCUMENT_CREATE': 'Documento criado',
    'DOCUMENT_UPDATE': 'Documento atualizado',
    'DOCUMENT_VERSION_CREATE': 'Nova versão criada',
    'DOCUMENT_STATUS_CHANGE': 'Status alterado',
    'DOCUMENT_PDF_GENERATE': 'PDF gerado',
    'DOCUMENT_SIGNATURE_REQUEST': 'Assinatura solicitada',
    'DOCUMENT_SIGNATURE_FAILED': 'Falha na assinatura',
    'DOCUMENT_SIGNED': 'Documento assinado',
    'DOCUMENT_CANCELLED': 'Documento cancelado',
    'DOCUMENT_DOWNLOAD': 'Documento baixado',
    'DOCUMENT_SENT': 'Documento enviado'
  }
  return labels[action] || action
}
</script>

<template>
  <div class="document-detail-view">
    <!-- Modals -->
    <CertificateSelectModal
      v-if="showCertModal"
      @close="showCertModal = false"
      @select="handleCertificateSelected"
    />

    <PdfViewer
      v-if="pdfPreview"
      :pdf-url="pdfPreview.url"
      :file-name="pdfPreview.name"
      :title="pdfPreview.title"
      @close="pdfPreview = null"
    />

    <!-- Send Modal -->
    <div v-if="showSendModal" class="modal-overlay" @click.self="showSendModal = false">
      <div class="send-modal">
        <header class="modal-header">
          <h3>Enviar Documento</h3>
          <button @click="showSendModal = false" class="close-btn">×</button>
        </header>
        <div class="modal-content">
          <div class="send-method-tabs">
            <button 
              @click="sendForm.method = 'email'" 
              :class="{ active: sendForm.method === 'email' }"
            >
              <Mail :size="16" />
              E-mail
            </button>
            <button 
              @click="sendForm.method = 'whatsapp'" 
              :class="{ active: sendForm.method === 'whatsapp' }"
            >
              <MessageCircle :size="16" />
              WhatsApp
            </button>
          </div>

          <div v-if="sendForm.method === 'email'" class="form-group">
            <label>E-mail do destinatário</label>
            <input v-model="sendForm.email" type="email" placeholder="email@exemplo.com" />
          </div>

          <div v-else class="form-group">
            <label>Telefone (WhatsApp)</label>
            <input v-model="sendForm.phone" type="tel" placeholder="(00) 00000-0000" />
          </div>
        </div>
        <footer class="modal-footer">
          <AppButton @click="showSendModal = false" variant="secondary">Cancelar</AppButton>
          <AppButton @click="handleSend" variant="primary" :disabled="isSending">
            <Loader2 v-if="isSending" :size="16" class="spinner" />
            <Send v-else :size="16" />
            {{ isSending ? 'Enviando...' : 'Enviar' }}
          </AppButton>
        </footer>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <Loader2 :size="32" class="spinner" />
      <span>Carregando documento...</span>
    </div>

    <template v-else-if="document">
      <!-- Header -->
      <header class="detail-header">
        <div class="header-left">
          <button @click="goBack" class="back-btn">
            <ArrowLeft :size="20" />
          </button>
          <div class="header-info">
            <div class="title-row">
              <h1>{{ document.title }}</h1>
              <DocumentStatusBadge :status="document.status" />
            </div>
            <div class="meta-row">
              <span v-if="document.patient">
                <User :size="14" />
                {{ document.patient.name }}
              </span>
              <span v-if="document.documentType">
                <FileText :size="14" />
                {{ document.documentType.name }}
              </span>
              <span>
                <Calendar :size="14" />
                {{ formatShortDate(document.createdAt) }}
              </span>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <AppButton @click="handlePreviewPdf" variant="secondary">
            <Eye :size="16" />
            Visualizar
          </AppButton>
          <AppButton v-if="canEdit" @click="editDocument" variant="secondary">
            <Edit :size="16" />
            Editar
          </AppButton>
          <AppButton v-if="canDownload" @click="handleDownload" variant="secondary">
            <Download :size="16" />
            Baixar
          </AppButton>
          <AppButton v-if="canSend" @click="showSendModal = true" variant="secondary">
            <Send :size="16" />
            Enviar
          </AppButton>
          <AppButton v-if="canSign" @click="handleStartSign" variant="primary" :disabled="isSigning">
            <Loader2 v-if="isSigning" :size="16" class="spinner" />
            <ShieldCheck v-else :size="16" />
            {{ isSigning ? 'Assinando...' : 'Assinar' }}
          </AppButton>
        </div>
      </header>

      <!-- Tabs -->
      <nav class="tabs-nav">
        <button @click="activeTab = 'details'" :class="{ active: activeTab === 'details' }">
          <FileText :size="16" />
          Detalhes
        </button>
        <button @click="activeTab = 'history'" :class="{ active: activeTab === 'history' }">
          <History :size="16" />
          Histórico
        </button>
      </nav>

      <!-- Content -->
      <div class="tab-content">
        <!-- Details Tab -->
        <div v-if="activeTab === 'details'" class="details-tab">
          <!-- Signature Info -->
          <div v-if="signatureInfo" class="info-card signature-card">
            <div class="card-header">
              <CheckCircle :size="20" class="success-icon" />
              <h3>Assinatura Digital</h3>
            </div>
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Assinante</span>
                  <span class="value">{{ signatureInfo.certificate?.subjectName || 'Não informado' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">CPF</span>
                  <span class="value">{{ signatureInfo.certificate?.cpf || 'Não informado' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Certificadora</span>
                  <span class="value">{{ signatureInfo.certificate?.issuer || 'Não informado' }}</span>
                </div>
                <div class="info-item">
                  <span class="label">Data da Assinatura</span>
                  <span class="value">{{ formatDate(signatureInfo.signedAt) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Document Preview -->
          <div class="info-card">
            <div class="card-header">
              <FileText :size="20" />
              <h3>Conteúdo do Documento</h3>
            </div>
            <div class="card-body">
              <div class="document-content" v-html="document.content"></div>
            </div>
          </div>

          <!-- Patient Info -->
          <div v-if="document.patient" class="info-card">
            <div class="card-header">
              <User :size="20" />
              <h3>Paciente</h3>
            </div>
            <div class="card-body">
              <div class="info-grid">
                <div class="info-item">
                  <span class="label">Nome</span>
                  <span class="value">{{ document.patient.name }}</span>
                </div>
                <div v-if="document.patient.cpf" class="info-item">
                  <span class="label">CPF</span>
                  <span class="value">{{ document.patient.cpf }}</span>
                </div>
                <div v-if="document.patient.email" class="info-item">
                  <span class="label">E-mail</span>
                  <span class="value">{{ document.patient.email }}</span>
                </div>
                <div v-if="document.patient.phone" class="info-item">
                  <span class="label">Telefone</span>
                  <span class="value">{{ document.patient.phone }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- History Tab -->
        <div v-if="activeTab === 'history'" class="history-tab">
          <div class="info-card">
            <div class="card-header">
              <History :size="20" />
              <h3>Histórico de Atividades</h3>
            </div>
            <div class="card-body">
              <div v-if="history.length > 0" class="timeline">
                <div v-for="item in history" :key="item._id" class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <span class="timeline-action">{{ getActionLabel(item.action) }}</span>
                    <span class="timeline-user">{{ item.user?.name || 'Sistema' }}</span>
                    <span class="timeline-date">{{ formatDate(item.createdAt) }}</span>
                  </div>
                </div>
              </div>
              <div v-else class="empty-state">
                <p>Nenhuma atividade registrada</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.document-detail-view {
  padding: 1.5rem;
  max-width: 1000px;
  margin: 0 auto;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  gap: 1rem;
  color: #6b7280;
}

.spinner {
  animation: spin 1s linear infinite;
  color: #6366f1;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.back-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  transition: all 0.2s;
  margin-top: 0.25rem;
}

.back-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.title-row h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.meta-row span {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.5rem;
}

.tabs-nav button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.tabs-nav button:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.tabs-nav button.active {
  background: #eef2ff;
  color: #6366f1;
}

.tab-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.info-card {
  background: var(--branco, #fff);
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  overflow: hidden;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.card-header svg {
  color: #6366f1;
}

.card-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
}

.signature-card .card-header {
  background: #dcfce7;
}

.signature-card .success-icon {
  color: #16a34a;
}

.card-body {
  padding: 1.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item .label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #9ca3af;
}

.info-item .value {
  font-size: 0.9375rem;
  color: #1f2937;
}

.document-content {
  line-height: 1.7;
  color: #374151;
}

.document-content :deep(p) {
  margin: 0 0 0.5rem 0;
}

.document-content :deep(ul),
.document-content :deep(ol) {
  padding-left: 1.5rem;
}

.timeline {
  display: flex;
  flex-direction: column;
}

.timeline-item {
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  position: relative;
}

.timeline-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 2.5rem;
  bottom: 0;
  width: 2px;
  background: #e5e7eb;
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #6366f1;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.timeline-content {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.timeline-action {
  font-weight: 500;
  color: #1f2937;
}

.timeline-user {
  font-size: 0.875rem;
  color: #6b7280;
}

.timeline-date {
  font-size: 0.8125rem;
  color: #9ca3af;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: #9ca3af;
}

/* Send Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.send-modal {
  background: var(--branco, #fff);
  border-radius: 1rem;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

.send-modal .modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.send-modal .modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
}

.send-modal .close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  line-height: 1;
}

.send-modal .modal-content {
  padding: 1.5rem;
}

.send-method-tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.send-method-tabs button {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #f3f4f6;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.send-method-tabs button:hover {
  background: #e5e7eb;
}

.send-method-tabs button.active {
  background: #eef2ff;
  border-color: #6366f1;
  color: #6366f1;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.form-group input {
  padding: 0.75rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  font-size: 0.9375rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.send-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}

@media (max-width: 768px) {
  .document-detail-view {
    padding: 1rem;
  }

  .detail-header {
    flex-direction: column;
  }

  .header-actions {
    width: 100%;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
