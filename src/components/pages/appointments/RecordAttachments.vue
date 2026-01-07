<script setup>
import { ref, reactive, computed } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { Plus, Image as ImageIcon, ImageOff, UploadCloud, X, Calendar, Trash2, LayoutGrid, Loader2, Copy, AlertTriangle } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import MontageEditor from './MontageEditor.vue'

const props = defineProps({
  record: {
    type: Object,
    default: null,
  },
  patientId: {
    type: String,
    required: true,
  },
  appointmentId: {
    type: String,
    required: true,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const recordsStore = useRecordsStore()
const toast = useToast()
const fileInput = ref(null)
const isUploading = ref(false)
const selectedImage = ref(null)
const isImageLoading = ref(false)
const showMontageEditor = ref(false)
const isCompressing = ref(false)
const imageLoadErrors = reactive(new Set())

const MAX_ATTACHMENTS = 20
const hasReachedLimit = computed(() => (props.record?.attachments?.length || 0) >= MAX_ATTACHMENTS)

function handleImageError(attachmentId) {
  imageLoadErrors.add(attachmentId)
}

function copyDebugInfo(attachment) {
  const metadata = attachment.metadata || {}
  const tags = metadata.tags?.join(', ') || '—'
  
  const debugInfo = `=== Debug Info - Anexo ===
ID: ${attachment._id}
S3 Key: ${attachment.s3Key || '—'}
Tipo: ${attachment.fileType || '—'}

Metadata:
  - Nome Original: ${metadata.originalName || '—'}
  - Mime Type: ${metadata.mimeType || '—'}
  - Tamanho: ${metadata.sizeBytes ? (metadata.sizeBytes / 1024 / 1024).toFixed(2) + ' MB' : '—'}
  - Categoria: ${metadata.category || '—'}
  - Tags: ${tags}
  - Descrição: ${metadata.description || '—'}

Criado em: ${attachment.createdAt ? new Date(attachment.createdAt).toLocaleString('pt-BR') : '—'}
URL Expira em: ${attachment.expiresIn ? attachment.expiresIn + 's' : '—'}
==============================`

  if (navigator.clipboard) {
    navigator.clipboard.writeText(debugInfo).then(() => {
      toast.info('Informações copiadas para a área de transferência!')
    })
  } else {
    const textArea = document.createElement('textarea')
    textArea.value = debugInfo
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      toast.info('Informações copiadas para a área de transferência!')
    } catch (err) {
      console.error('[RecordAttachments] Erro ao copiar debug info:', err)
      toast.error('Não foi possível copiar as informações.')
    }
    document.body.removeChild(textArea)
  }
}

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

/**
 * Comprime uma imagem para no máximo 10MB usando Canvas API
 * Reduz qualidade progressivamente até atingir o tamanho alvo
 */
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        let { width, height } = img
        const maxDimension = 4096
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width)
            width = maxDimension
          } else {
            width = Math.round((width * maxDimension) / height)
            height = maxDimension
          }
        }

        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)

        const tryCompress = (quality) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Falha ao comprimir imagem'))
                return
              }

              if (blob.size <= MAX_FILE_SIZE_BYTES || quality <= 0.3) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                tryCompress(quality - 0.05)
              }
            },
            'image/jpeg',
            quality
          )
        }

        tryCompress(0.95)
      }

      img.onerror = () => reject(new Error('Falha ao carregar imagem'))
      img.src = e.target.result
    }

    reader.onerror = () => reject(new Error('Falha ao ler arquivo'))
    reader.readAsDataURL(file)
  })
}


function openImageViewer(attachment) {
  // Inicia carregamento da imagem real
  isImageLoading.value = true
  selectedImage.value = attachment.signedUrl
}

function closeImageViewer() {
  selectedImage.value = null
  isImageLoading.value = false
}
function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}
function triggerFileUpload() {
  if (props.disabled) return
  fileInput.value.click()
}
async function handleFileUpload(event) {
  if (props.disabled) return
  const files = Array.from(event.target.files)
  if (!files.length) return

  isUploading.value = true

  let successCount = 0
  let errorCount = 0
  let compressedCount = 0

  // Upload sequential to avoid overwhelming the server/browser
  for (let file of files) {
    let wasCompressed = false
    
    // Comprimir imagens maiores que 10MB
    if (file.size > MAX_FILE_SIZE_BYTES) {
      try {
        isCompressing.value = true
        const originalSize = (file.size / (1024 * 1024)).toFixed(2)
        file = await compressImage(file)
        const newSize = (file.size / (1024 * 1024)).toFixed(2)
        console.log(`[RecordAttachments] Imagem comprimida de ${originalSize}MB para ${newSize}MB`)
        compressedCount++
        wasCompressed = true
      } catch (err) {
        console.error('[RecordAttachments] Erro ao comprimir imagem:', err)
        toast.error(`Falha ao comprimir imagem: ${file.name}`)
        errorCount++
        continue
      } finally {
        isCompressing.value = false
      }
    }

    const { success, error: uploadError } = await recordsStore.uploadAttachmentImage(
      props.record?._id,
      file,
      { patientId: props.patientId, appointmentId: props.appointmentId },
      { wasCompressed },
    )

    if (success) {
      successCount++
    } else {
      errorCount++
      if (uploadError) {
        toast.error(uploadError)
      }
    }
  }

  if (successCount > 0) {
    const compressedMsg = compressedCount > 0 ? ` (${compressedCount} comprimida(s))` : ''
    toast.success(`${successCount} imagem(ns) anexada(s) com sucesso!${compressedMsg}`)
  }

  event.target.value = ''
  isUploading.value = false
}

async function handleDeleteAttachment(uploadId) {
  if (props.disabled) return
  if (!window.confirm('Tem certeza que deseja excluir esta imagem?')) {
    return
  }

  const { success, error } = await recordsStore.deleteAttachment(uploadId)

  if (success) {
    toast.success('Imagem excluída com sucesso!')
  } else {
    toast.error(error || 'Não foi possível excluir a imagem.')
  }
}

async function handleMontageComplete(file) {
  if (props.disabled) return
  
  isUploading.value = true
  let wasCompressed = false

  // Comprimir montagem se maior que 10MB
  let fileToUpload = file
  if (file.size > MAX_FILE_SIZE_BYTES) {
    try {
      isCompressing.value = true
      fileToUpload = await compressImage(file)
      console.log(`[RecordAttachments] Montagem comprimida de ${(file.size / (1024 * 1024)).toFixed(2)}MB para ${(fileToUpload.size / (1024 * 1024)).toFixed(2)}MB`)
      wasCompressed = true
    } catch (err) {
      console.error('[RecordAttachments] Erro ao comprimir montagem:', err)
      toast.error('Falha ao comprimir a montagem.')
      isUploading.value = false
      return
    } finally {
      isCompressing.value = false
    }
  }
  
  const { success, error: uploadError } = await recordsStore.uploadAttachmentImage(
    props.record?._id,
    fileToUpload,
    { patientId: props.patientId, appointmentId: props.appointmentId },
    { wasCompressed },
  )

  if (success) {
    toast.success('Montagem salva com sucesso!')
  } else {
    toast.error(uploadError || 'Falha ao salvar a montagem.')
  }

  isUploading.value = false
}
</script>

<template>
  <div class="attachments-container">
    <div class="attachments-grid">
      <!-- Botão Adicionar -->
      <div
        v-if="!disabled"
        class="action-card"
        :class="{ disabled: disabled || hasReachedLimit }"
        @click="!hasReachedLimit && triggerFileUpload()"
      >
        <div v-if="hasReachedLimit" class="action-content limit-reached">
          <AlertTriangle :size="22" />
          <span>Limite atingido</span>
        </div>
        <div v-else-if="isCompressing" class="action-content">
          <Loader2 :size="22" class="icon-loading" />
          <span>Comprimindo...</span>
        </div>
        <div v-else-if="isUploading" class="action-content">
          <UploadCloud :size="22" class="icon-loading" />
          <span>Enviando...</span>
        </div>
        <div v-else class="action-content">
          <Plus :size="22" />
          <span>Adicionar</span>
        </div>
      </div>

      <!-- Botão de Montagem -->
      <div
        v-if="!disabled"
        class="action-card"
        :class="{ disabled: hasReachedLimit }"
        @click="!hasReachedLimit && (showMontageEditor = true)"
      >
        <div v-if="hasReachedLimit" class="action-content limit-reached">
          <AlertTriangle :size="22" />
          <span>Limite atingido</span>
        </div>
        <div v-else class="action-content">
          <LayoutGrid :size="22" />
          <span>Montagem</span>
        </div>
      </div>

      <div
        v-for="attachment in record?.attachments || []"
        :key="attachment._id"
        class="image-card"
        @click="!imageLoadErrors.has(attachment._id) && openImageViewer(attachment)"
      >
        <!-- Placeholder de erro quando a imagem falha -->
        <div v-if="imageLoadErrors.has(attachment._id)" class="error-placeholder">
          <ImageOff :size="28" class="error-icon" />
          <span class="error-text">Erro ao carregar</span>
          <button 
            class="debug-copy-btn" 
            @click.stop="copyDebugInfo(attachment)"
            title="Copiar informações de debug"
          >
            <Copy :size="12" />
          </button>
        </div>
        <!-- Thumbnail com resolução reduzida via CSS -->
        <img
          v-else
          :src="attachment.signedUrl"
          alt="Anexo"
          class="thumbnail-image"
          loading="lazy"
          decoding="async"
          @error="handleImageError(attachment._id)"
        />
        <div class="image-overlay">
          <div class="image-date-chip">
            <Calendar :size="12" />
            <span>{{ formatDate(attachment.createdAt) }}</span>
          </div>
          <button
            v-if="!disabled"
            class="delete-button"
            @click.stop="handleDeleteAttachment(attachment._id)"
            title="Excluir imagem"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="(!record?.attachments?.length || record?.attachments?.length === 0) && !isUploading"
      class="empty-attachments"
    >
      <ImageIcon :size="48" />
      <h3 class="empty-title">Nenhum anexo ainda</h3>
      <p v-if="!disabled" class="empty-text">Clique em "Adicionar Imagem" para começar.</p>
    </div>

    <input
      type="file"
      ref="fileInput"
      @change="handleFileUpload"
      accept="image/*"
      multiple
      hidden
      :disabled="disabled"
    />

    <!-- Editor de Montagem -->
    <MontageEditor
      :visible="showMontageEditor"
      @close="showMontageEditor = false"
      @save="handleMontageComplete"
    />

    <Transition name="fade">
      <div v-if="selectedImage" class="image-viewer-overlay" @click.self="closeImageViewer">
        <button @click="closeImageViewer" class="close-button">
          <X :size="32" />
        </button>
        <div class="image-wrapper">
          <!-- Loading spinner -->
          <div v-if="isImageLoading" class="image-loading">
            <Loader2 :size="48" class="spinner" />
            <span>Carregando imagem...</span>
          </div>
          <img 
            :src="selectedImage" 
            alt="Visualização em tela cheia" 
            class="fullscreen-image"
            @load="isImageLoading = false"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.attachments-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}

@media (max-width: 640px) {
  .attachments-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}

/* Action Cards - Clean Design */
.action-card {
  aspect-ratio: 1 / 1;
  border-radius: 0.5rem;
  background-color: #fafafa;
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-card:hover {
  background-color: #f5f5f5;
  border-color: #d1d5db;
}

.action-card.disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.action-card.disabled:hover {
  background-color: #fafafa;
  border-color: #e5e7eb;
}

.action-content.limit-reached {
  color: #d97706;
}

.action-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  color: #6b7280;
}

.action-content span {
  font-size: 0.75rem;
  font-weight: 500;
}

.action-card:hover .action-content {
  color: #374151;
}

.action-card.disabled:hover .action-content {
  color: #6b7280;
}

.action-content .icon-loading {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Image Cards */
.image-card {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  transition: transform 0.2s ease;
}

.image-card {
  border: 1px solid #e5e7eb;
  cursor: default;
}
.image-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

/* Error Placeholder */
.error-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  background-color: #fef2f2;
  border: 1px dashed #fca5a5;
  border-radius: 0.5rem;
}

.error-icon {
  color: #ef4444;
}

.error-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: #b91c1c;
}

.debug-copy-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 4px;
  color: #6b7280;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
}

.error-placeholder:hover .debug-copy-btn {
  opacity: 1;
}

.debug-copy-btn:hover {
  background-color: rgba(0, 0, 0, 0.2);
  color: #374151;
}

/* Thumbnail com resolução visualmente reduzida */
.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  /* Força renderização em baixa qualidade */
  image-rendering: pixelated;
  filter: blur(0.5px);
  transform: scale(1.02); /* Oculta bordas do blur */
}

/* Loading spinner no viewer */
.image-loading {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: white;
  z-index: 10;
}

.image-loading .spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.image-date-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border-radius: 0.375rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.delete-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background-color: rgba(239, 68, 68, 0.7);
  backdrop-filter: blur(4px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  padding: 0;
  opacity: 0;
  transition:
    all 0.2s ease-in-out;
  transform: translateY(10px);
}
.image-card:hover .delete-button {
  opacity: 1;
  transform: translateY(0);
}
.delete-button:hover {
  background-color: rgb(239, 68, 68);
}

.empty-attachments {
  text-align: center;
  padding: 3rem;
  color: #9ca3af;
}
.empty-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 1rem 0 0.5rem;
  color: #4b5563;
}
.empty-text {
  font-size: 0.9rem;
}

.image-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
  padding: 2rem;
}

.image-wrapper {
  display: grid;
  place-items: center;
  max-width: 90vw;
  max-height: 90vh;
}

.image-wrapper > * {
  grid-area: 1 / 1;
}

.fullscreen-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.4),
    0 8px 10px -6px rgb(0 0 0 / 0.4);
}

.fullscreen-image.placeholder {
  filter: blur(1);
  transform: scale(7.5); /* Prevents white edges */
  opacity: 1;
  transition: opacity 0.5s ease-out;
  z-index: 10;
}

.fullscreen-image.main-image {
  opacity: 0;
  transition: opacity 0.5s ease-in;
  z-index: 20;
}

.fullscreen-image.main-image.loaded {
  opacity: 1;
}

.close-button {
  position: absolute;
  top: 1.5rem;
  right: 1.5rem;
  background-color: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease;
}

.close-button:hover {
  background-color: rgba(0, 0, 0, 0.5);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-enter-active .fullscreen-image,
.fade-leave-active .fullscreen-image {
  transition: transform 0.3s ease;
}

.fade-enter-from .fullscreen-image,
.fade-leave-to .fullscreen-image {
  transform: scale(0.95);
}
</style>
