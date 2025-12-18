<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDocumentsStore } from '@/stores/documents'
import { usePatientsStore } from '@/stores/patients'
import { useToast } from 'vue-toastification'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import {
  ArrowLeft,
  Save,
  FileText,
  Eye,
  ShieldCheck,
  Loader2,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  Code,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon
} from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import SearchableSelect from '@/components/global/SearchableSelect.vue'
import DocumentStatusBadge from '@/components/documents/DocumentStatusBadge.vue'
import CertificateSelectModal from '@/components/documents/CertificateSelectModal.vue'
import PdfViewer from '@/components/documents/PdfViewer.vue'
import webpkiService from '@/services/webpki.service'

const route = useRoute()
const router = useRouter()
const documentsStore = useDocumentsStore()
const patientsStore = usePatientsStore()
const toast = useToast()

// State
const isEditMode = computed(() => !!route.params.id)
const isLoading = ref(false)
const isSaving = ref(false)
const isSigning = ref(false)
const showCertModal = ref(false)
const pdfPreview = ref(null)
const signatureData = ref(null)
let debounceTimeout = null

const documentData = ref({
  patientId: '',
  documentTypeId: '',
  title: '',
  content: ''
})

// TipTap Editor
const editor = useEditor({
  extensions: [
    StarterKit,
    Underline,
    Link.configure({
      openOnClick: false
    })
  ],
  content: '',
  onUpdate: ({ editor }) => {
    documentData.value.content = editor.getHTML()
  }
})

// Computed
const document = computed(() => documentsStore.selectedDocument)
const documentTypes = computed(() => documentsStore.documentTypes)
const patients = computed(() => patientsStore.searchResults)

const documentTypeOptions = computed(() => 
  documentTypes.value.map(type => ({
    value: type._id,
    label: type.name
  }))
)

const patientOptions = computed(() =>
  patients.value.map(patient => ({
    value: patient._id,
    label: patient.name
  }))
)

const canSave = computed(() => 
  documentData.value.patientId && 
  documentData.value.documentTypeId && 
  documentData.value.title.trim() !== ''
)

const canSign = computed(() => {
  if (!isEditMode.value) return false
  const status = document.value?.status
  return status === 'draft' || status === 'signature_failed'
})

// Lifecycle
onMounted(async () => {
  await documentsStore.fetchDocumentTypes()
  
  if (isEditMode.value) {
    await loadDocument()
  }
})

// Methods
async function loadDocument() {
  isLoading.value = true
  const { success } = await documentsStore.fetchDocument(route.params.id)
  
  if (success && document.value) {
    documentData.value = {
      patientId: document.value.patient?._id || '',
      documentTypeId: document.value.documentType?._id || '',
      title: document.value.title || '',
      content: document.value.content || ''
    }
    
    if (editor.value) {
      editor.value.commands.setContent(document.value.content || '')
    }
  } else {
    toast.error('Documento não encontrado')
    router.push({ name: 'documents-list' })
  }
  
  isLoading.value = false
}

function handlePatientSearch(query) {
  clearTimeout(debounceTimeout)
  if (query) {
    debounceTimeout = setTimeout(() => {
      patientsStore.searchPatients(query)
    }, 300)
  } else {
    patientsStore.searchResults = []
  }
}

async function handleSave() {
  if (!canSave.value) {
    toast.warning('Preencha todos os campos obrigatórios')
    return
  }

  isSaving.value = true
  
  try {
    if (isEditMode.value) {
      const { success, error } = await documentsStore.updateDocument(route.params.id, {
        title: documentData.value.title,
        content: documentData.value.content
      })
      
      if (success) {
        toast.success('Documento atualizado com sucesso!')
      } else {
        toast.error(error || 'Erro ao atualizar documento')
      }
    } else {
      const { success, data, error } = await documentsStore.createDocument(documentData.value)
      
      if (success) {
        toast.success('Documento criado com sucesso!')
        router.push({ name: 'document-edit', params: { id: data._id } })
      } else {
        toast.error(error || 'Erro ao criar documento')
      }
    }
  } finally {
    isSaving.value = false
  }
}

async function handlePreviewPdf() {
  if (!isEditMode.value) {
    toast.warning('Salve o documento primeiro para gerar o preview')
    return
  }

  const { success, data, error } = await documentsStore.generatePdf(route.params.id)
  
  if (success) {
    pdfPreview.value = {
      url: data.pdfUrl,
      name: `${documentData.value.title}.pdf`,
      title: 'Preview do Documento'
    }
  } else {
    toast.error(error || 'Erro ao gerar preview')
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
  } catch (err) {
    toast.error('Erro ao iniciar assinatura')
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
    const signedPdfBase64 = await webpkiService.signPdf(
      signatureData.value.pdfBase64,
      cert.thumbprint,
      {
        digestAlgorithm: signatureData.value.hashAlgorithm || 'SHA-256',
        signaturePolicy: signatureData.value.signatureOptions?.signaturePolicy
      },
      cert
    )

    // Submit signed PDF to backend
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
      await loadDocument() // Reload to get updated status
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

function goBack() {
  router.push({ name: 'documents-list' })
}
</script>

<template>
  <div class="document-editor-view">
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

    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <Loader2 :size="32" class="spinner" />
      <span>Carregando documento...</span>
    </div>

    <template v-else>
      <!-- Header -->
      <header class="editor-header">
        <div class="header-left">
          <button @click="goBack" class="back-btn">
            <ArrowLeft :size="20" />
          </button>
          <div class="header-title">
            <h1>{{ isEditMode ? 'Editar Documento' : 'Novo Documento' }}</h1>
            <DocumentStatusBadge 
              v-if="isEditMode && document" 
              :status="document.status" 
            />
          </div>
        </div>
        <div class="header-actions">
          <AppButton 
            v-if="isEditMode" 
            @click="handlePreviewPdf" 
            variant="secondary"
            :disabled="isSaving"
          >
            <Eye :size="16" />
            Preview PDF
          </AppButton>
          <AppButton 
            @click="handleSave" 
            variant="secondary"
            :disabled="!canSave || isSaving"
          >
            <Loader2 v-if="isSaving" :size="16" class="spinner" />
            <Save v-else :size="16" />
            {{ isSaving ? 'Salvando...' : 'Salvar Rascunho' }}
          </AppButton>
          <AppButton 
            v-if="canSign" 
            @click="handleStartSign" 
            variant="primary"
            :disabled="isSigning"
          >
            <Loader2 v-if="isSigning" :size="16" class="spinner" />
            <ShieldCheck v-else :size="16" />
            {{ isSigning ? 'Assinando...' : 'Assinar Documento' }}
          </AppButton>
        </div>
      </header>

      <!-- Form -->
      <div class="editor-content">
        <div class="form-grid">
          <div class="form-row">
            <FormInput
              v-model="documentData.title"
              label="Título do Documento"
              placeholder="Ex: Receituário - João Silva"
              required
              class="title-input"
            />
          </div>
          
          <div class="form-row two-cols">
            <div class="form-group">
              <SearchableSelect
                v-model="documentData.patientId"
                :options="patientOptions"
                :loading="patientsStore.isLoading"
                @search="handlePatientSearch"
                placeholder="Buscar paciente por nome..."
                label="Paciente"
                required
                :disabled="isEditMode"
              />
            </div>
            <div class="form-group">
              <label class="form-label">Tipo de Documento *</label>
              <StyledSelect
                v-model="documentData.documentTypeId"
                :options="documentTypeOptions"
                placeholder="Selecione o tipo"
                :disabled="isEditMode"
              />
            </div>
          </div>
        </div>

        <!-- Rich Text Editor -->
        <div class="editor-section">
          <label class="form-label">Conteúdo do Documento</label>
          
          <!-- Toolbar -->
          <div v-if="editor" class="editor-toolbar">
            <button
              @click="editor.chain().focus().toggleBold().run()"
              :class="{ active: editor.isActive('bold') }"
              title="Negrito"
            >
              <Bold :size="16" />
            </button>
            <button
              @click="editor.chain().focus().toggleItalic().run()"
              :class="{ active: editor.isActive('italic') }"
              title="Itálico"
            >
              <Italic :size="16" />
            </button>
            <button
              @click="editor.chain().focus().toggleUnderline().run()"
              :class="{ active: editor.isActive('underline') }"
              title="Sublinhado"
            >
              <UnderlineIcon :size="16" />
            </button>
            <button
              @click="editor.chain().focus().toggleStrike().run()"
              :class="{ active: editor.isActive('strike') }"
              title="Tachado"
            >
              <Strikethrough :size="16" />
            </button>
            
            <div class="toolbar-divider"></div>
            
            <button
              @click="editor.chain().focus().toggleBulletList().run()"
              :class="{ active: editor.isActive('bulletList') }"
              title="Lista"
            >
              <List :size="16" />
            </button>
            <button
              @click="editor.chain().focus().toggleOrderedList().run()"
              :class="{ active: editor.isActive('orderedList') }"
              title="Lista Numerada"
            >
              <ListOrdered :size="16" />
            </button>
            
            <div class="toolbar-divider"></div>
            
            <button
              @click="editor.chain().focus().toggleBlockquote().run()"
              :class="{ active: editor.isActive('blockquote') }"
              title="Citação"
            >
              <Quote :size="16" />
            </button>
            <button
              @click="editor.chain().focus().toggleCodeBlock().run()"
              :class="{ active: editor.isActive('codeBlock') }"
              title="Bloco de Código"
            >
              <Code :size="16" />
            </button>
            
            <div class="toolbar-divider"></div>
            
            <button
              @click="editor.chain().focus().undo().run()"
              :disabled="!editor.can().undo()"
              title="Desfazer"
            >
              <Undo :size="16" />
            </button>
            <button
              @click="editor.chain().focus().redo().run()"
              :disabled="!editor.can().redo()"
              title="Refazer"
            >
              <Redo :size="16" />
            </button>
          </div>

          <!-- Editor Content -->
          <EditorContent :editor="editor" class="editor-wrapper" />
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.document-editor-view {
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

.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
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
}

.back-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.editor-content {
  background: var(--branco, #fff);
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  padding: 1.5rem;
}

.form-grid {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

.form-row.two-cols {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
}

.title-input {
  width: 100%;
}

.editor-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-bottom: none;
  border-radius: 0.5rem 0.5rem 0 0;
}

.editor-toolbar button {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.375rem;
  transition: all 0.2s;
}

.editor-toolbar button:hover:not(:disabled) {
  background: #e5e7eb;
  color: #1f2937;
}

.editor-toolbar button.active {
  background: #6366f1;
  color: #fff;
}

.editor-toolbar button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
  margin: 0 0.25rem;
}

.editor-wrapper {
  border: 1px solid #e5e7eb;
  border-radius: 0 0 0.5rem 0.5rem;
  min-height: 300px;
}

.editor-wrapper :deep(.ProseMirror) {
  padding: 1rem;
  min-height: 300px;
  outline: none;
}

.editor-wrapper :deep(.ProseMirror p) {
  margin: 0 0 0.5rem 0;
}

.editor-wrapper :deep(.ProseMirror h1),
.editor-wrapper :deep(.ProseMirror h2),
.editor-wrapper :deep(.ProseMirror h3) {
  margin: 1rem 0 0.5rem 0;
}

.editor-wrapper :deep(.ProseMirror ul),
.editor-wrapper :deep(.ProseMirror ol) {
  padding-left: 1.5rem;
}

.editor-wrapper :deep(.ProseMirror blockquote) {
  border-left: 3px solid #e5e7eb;
  padding-left: 1rem;
  color: #6b7280;
  margin: 0.5rem 0;
}

.editor-wrapper :deep(.ProseMirror code) {
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-family: monospace;
}

.editor-wrapper :deep(.ProseMirror pre) {
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .document-editor-view {
    padding: 1rem;
  }

  .editor-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .form-row.two-cols {
    grid-template-columns: 1fr;
  }
}
</style>
