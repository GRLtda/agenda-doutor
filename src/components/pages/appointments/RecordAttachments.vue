<script setup>
import { ref, reactive, computed } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { Plus, Image as ImageIcon, ImageOff, UploadCloud, X, Calendar, Trash2, LayoutGrid, Loader2, Copy, AlertTriangle, FileText, Search, Filter, CheckSquare, Square, Download, Check, ChevronDown } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import MontageEditor from './MontageEditor.vue'
import PhotoViewerUpload from './PhotoViewerUpload.vue'

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
const showPhotoViewer = ref(false)
const pendingFiles = ref([])

// Filtering & Selection State
const searchQuery = ref('')
const isSelectionMode = ref(false)
const selectedAttachmentIds = ref(new Set())
const showFilterMenu = ref(false) // Toggle para filtros avançados se necessário

// Computed: Tags disponíveis em todas as fotos atuais
const availableTags = computed(() => {
  const tags = new Set()
  const attachments = props.record?.attachments || []
  attachments.forEach(att => {
    if (att.metadata?.tags) {
      att.metadata.tags.forEach(t => tags.add(t))
    }
  })
  return Array.from(tags).sort()
})

// Computed: Fotos filtradas
const filterTags = ref([]) // ✨ Filtro de tags (Array para v-model)
const isFilterDropdownOpen = ref(false) // ✨ Estado do dropdown
// toggleTagFilter removida (usando v-model)


const filteredAttachments = computed(() => {
  let attachments = props.record?.attachments || []
  const query = searchQuery.value.trim().toLowerCase()
  const activeTags = filterTags.value

  // 1. Filtro por Texto (Tag ou Descrição)
  if (query) {
    attachments = attachments.filter(att => {
      const description = att.metadata?.description?.toLowerCase() || ''
      const tags = att.metadata?.tags?.map(t => t.toLowerCase()) || []
      return description.includes(query) || tags.some(t => t.includes(query))
    })
  }

  // 2. Filtro por Tags Selecionadas
  if (activeTags.length > 0) {
    attachments = attachments.filter(att => {
       const attTags = att.metadata?.tags || []
       return attTags.some(t => activeTags.includes(t))
    })
  }

  return attachments
})

function toggleSelectionMode() {
  isSelectionMode.value = !isSelectionMode.value
  selectedAttachmentIds.value = new Set() // Limpa seleção ao sair/entrar
}

function toggleSelection(id) {
  if (selectedAttachmentIds.value.has(id)) {
    selectedAttachmentIds.value.delete(id)
  } else {
    selectedAttachmentIds.value.add(id)
  }
}

function selectAll() {
  const ids = filteredAttachments.value.map(a => a._id)
  selectedAttachmentIds.value = new Set(ids)
}

function deselectAll() {
  selectedAttachmentIds.value = new Set()
}

// Bulk Actions
async function handleBulkDelete() {
  if (props.disabled) return
  const count = selectedAttachmentIds.value.size
  if (count === 0) return

  if (!window.confirm(`Tem certeza que deseja excluir ${count} foto(s)?`)) {
    return
  }

  isUploading.value = true // Reusa loading state
  let successCount = 0
  let errorCount = 0
  

  
  // Bulk Delete Otimizado
  const ids = Array.from(selectedAttachmentIds.value)
  const { success, error } = await recordsStore.deleteAttachmentsBulk(ids)

  if (success) {
    toast.success(`${count} foto(s) excluída(s).`)
  } else {
    toast.error(error || `Falha ao excluir foto(s).`)
  }

  isUploading.value = false
  selectedAttachmentIds.value = new Set()
  isSelectionMode.value = false
}

async function handleBulkDownload() {
  const ids = Array.from(selectedAttachmentIds.value)
  const attachments = (props.record?.attachments || []).filter(a => ids.includes(a._id))
  
  if (attachments.length === 0) return

  const toastId = toast.info('Iniciando download...', { timeout: false })

  try {
    // Processa sequencialmente
    for (const att of attachments) {
      try {
        const { success, blob, filename, error } = await recordsStore.downloadAttachment(att._id)
        
        if (!success) throw new Error(error)
        
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = filename
        
        document.body.appendChild(a)
        a.click()
        
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        
        // Delay para evitar bloqueio
        await new Promise(r => setTimeout(r, 500))
      } catch (err) {
        console.error(`Erro ao baixar ${att._id}:`, err)
        toast.error(`Erro ao baixar imagem: ${err.message}`)
      }
    }
    toast.success('Downloads concluídos!')
  } finally {
    toast.dismiss(toastId)
  }
}

function handleBulkMontage() {
  if (selectedAttachmentIds.value.size > 4) {
    toast.warning('Selecione no máximo 4 fotos para a montagem.')
    return
  }
  showMontageEditor.value = true
}

const selectedImagesForMontage = computed(() => {
  if (!isSelectionMode.value || selectedAttachmentIds.value.size === 0) return []
  
  // Mapeia IDs para objetos { src: url }
  const attachments = props.record?.attachments || []
  return attachments
    .filter(a => selectedAttachmentIds.value.has(a._id))
    .map(a => ({ src: a.signedUrl }))
})

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
  selectedImage.value = attachment
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

  // Abre o PhotoViewer para preparar as fotos antes do upload
  pendingFiles.value = files
  showPhotoViewer.value = true
  
  // Limpa o input para permitir selecionar os mesmos arquivos novamente
  event.target.value = ''
}

// Processa o upload das fotos vindas do PhotoViewer
async function handlePhotoViewerUpload(photosWithMetadata) {
  showPhotoViewer.value = false
  pendingFiles.value = []
  
  if (!photosWithMetadata || photosWithMetadata.length === 0) return

  isUploading.value = true

  let successCount = 0
  let errorCount = 0
  let compressedCount = 0

  // Upload sequential to avoid overwhelming the server/browser
  for (let photoData of photosWithMetadata) {
    let { file, description, tags } = photoData
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
      { wasCompressed, description, tags },
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

  isUploading.value = false
}

function handlePhotoViewerClose() {
  showPhotoViewer.value = false
  pendingFiles.value = []
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
    <!-- Toolbar de Filtro e Seleção -->
    <div class="gallery-toolbar" v-if="!disabled && (record?.attachments?.length > 0 || searchQuery)">
      <div class="toolbar-main-row">
        <div class="search-box">
          <Search :size="16" class="search-icon" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Buscar por tag ou descrição..." 
            class="search-input"
          />
          <button v-if="searchQuery" @click="searchQuery = ''" class="clear-search">
              <X :size="14" />
          </button>
        </div>

        <!-- Dropdown de Tags (Ao lado da busca) -->
        <div class="filter-dropdown-container" v-if="availableTags.length > 0">
          <button 
            class="toolbar-btn" 
            :class="{ 'has-filters': filterTags.length > 0 }"
            @click="isFilterDropdownOpen = !isFilterDropdownOpen"
            title="Filtrar por Tags"
          >
            <Filter :size="16" />
            <span class="btn-label-desktop">Tags</span>
            <span v-if="filterTags.length > 0" class="filter-count-badge">{{ filterTags.length }}</span>
            <ChevronDown :size="14" class="chevron-icon" :class="{ rotated: isFilterDropdownOpen }" />
          </button>

          <!-- Menu Dropdown -->
          <div v-if="isFilterDropdownOpen" class="filter-dropdown-menu">
            <div class="dropdown-header">
              <span>Filtrar Tags</span>
              <button v-if="filterTags.length > 0" @click="filterTags = []" class="clear-filter-btn">
                Limpar
              </button>
            </div>
            <div class="dropdown-list">
              <label 
                v-for="tag in availableTags" 
                :key="tag" 
                class="dropdown-item"
                :class="{ selected: filterTags.includes(tag) }"
              >
                <input 
                  type="checkbox" 
                  :value="tag"
                  v-model="filterTags"
                />
                <span class="tag-label">{{ tag }}</span>
              </label>
            </div>
          </div>
        </div>
        
        <div class="toolbar-actions">
          <button 
            class="toolbar-btn" 
            :class="{ active: isSelectionMode }"
            @click="toggleSelectionMode"
            title="Selecionar fotos"
          >
            <CheckSquare :size="18" />
            <span class="btn-label-desktop">{{ isSelectionMode ? 'Cancelar Seleção' : 'Selecionar' }}</span>
          </button>
        </div>
      </div>
      <!-- Removed header-tags-row -->
    </div>

    <!-- Bulk Actions Bar (Flutuante) -->
    <Transition name="slide-up">
      <div v-if="isSelectionMode && selectedAttachmentIds.size > 0" class="bulk-actions-bar">
        <div class="bulk-info">
          <span class="count-badge">{{ selectedAttachmentIds.size }}</span>
          <span class="bulk-text">selecionada(s)</span>
        </div>
        
        <div class="bulk-buttons">
          <button @click="handleBulkDownload" class="bulk-btn" title="Baixar selecionadas">
            <Download :size="18" />
          </button>
          <button 
            @click="handleBulkMontage" 
            class="bulk-btn" 
            title="Criar Montagem (Máx 4)" 
            :disabled="selectedAttachmentIds.size < 2 || selectedAttachmentIds.size > 4"
          >
            <LayoutGrid :size="18" />
          </button>
          <div class="bulk-divider"></div>
          <button @click="handleBulkDelete" class="bulk-btn delete" title="Excluir selecionadas">
            <Trash2 :size="18" />
          </button>
        </div>
      </div>
    </Transition>

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
          <UploadCloud :size="24" />
          <span class="action-label">Adicionar Foto</span>
          <span class="upload-limits">Máx: 20 Fotos</span>
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
        v-for="attachment in filteredAttachments"
        :key="attachment._id"
        class="image-card"
        :class="{ 'selection-mode': isSelectionMode, 'selected': selectedAttachmentIds.has(attachment._id) }"
        @click="isSelectionMode ? toggleSelection(attachment._id) : (!imageLoadErrors.has(attachment._id) && openImageViewer(attachment))"
      >
        <!-- Selection Overlay -->
        <div v-if="isSelectionMode" class="selection-overlay">
             <div class="checkbox-circle" :class="{ checked: selectedAttachmentIds.has(attachment._id) }">
                <Check v-if="selectedAttachmentIds.has(attachment._id)" :size="14" stroke-width="3" />
             </div>
        </div>

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
          <div 
            class="image-date-chip" 
            :title="formatDate(attachment.createdAt)"
          >
            <!-- Sempre mostra a data -->
            <div class="chip-date">
                <Calendar :size="10" />
                <span>{{ formatDate(attachment.createdAt) }}</span>
            </div>
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
      :initial-images="selectedImagesForMontage"
      @close="showMontageEditor = false"
      @save="handleMontageComplete"
    />

    <!-- Photo Viewer para Upload -->
    <PhotoViewerUpload
      :visible="showPhotoViewer"
      :files="pendingFiles"
      :existing-count="record?.attachments?.length || 0"
      :max-attachments="MAX_ATTACHMENTS"
      @close="handlePhotoViewerClose"
      @upload="handlePhotoViewerUpload"
    />

    <Transition name="fade">
      <div v-if="selectedImage" class="image-viewer-overlay" @click.self="closeImageViewer">
        <div class="viewer-layout">
          <!-- Sidebar Metadata -->
          <div class="viewer-sidebar" v-if="!isImageLoading && selectedImage" @click.stop>
            <div class="sidebar-header">
              <h3 class="sidebar-title">Detalhes da Imagem</h3>
            </div>
            
            <div class="sidebar-content">
              <!-- Info Básica -->
              <div class="metadata-group">
                <label class="meta-label">Data de Criação</label>
                <div class="meta-value date-value">
                  <Calendar :size="14" />
                  <span>{{ formatDate(selectedImage.createdAt) }}</span>
                </div>
              </div>

              <!-- Descrição -->
              <div class="metadata-group">
                <label class="meta-label">Descrição</label>
                <div class="meta-value description-value">
                  <template v-if="selectedImage.metadata?.description">
                    <FileText :size="14" class="meta-icon" />
                    <p>{{ selectedImage.metadata.description }}</p>
                  </template>
                  <span v-else class="empty-value">Sem descrição</span>
                </div>
              </div>
              
              <!-- Tags -->
              <div class="metadata-group">
                <label class="meta-label">Tags</label>
                <div v-if="selectedImage.metadata?.tags?.length" class="tags-list">
                  <span 
                    v-for="tag in selectedImage.metadata.tags" 
                    :key="tag"
                    class="meta-tag"
                  >
                    {{ tag }}
                  </span>
                </div>
                <span v-else class="empty-value">Sem tags</span>
              </div>
            </div>
          </div>

          <!-- Main Image Area -->
          <div class="viewer-main" @click.self="closeImageViewer">
            <button @click="closeImageViewer" class="close-button">
              <X :size="32" />
            </button>

            <!-- Loading spinner -->
            <div v-if="isImageLoading" class="image-loading">
              <Loader2 :size="48" class="spinner" />
              <span>Carregando imagem...</span>
            </div>
            
            <img 
              :src="selectedImage?.signedUrl" 
              alt="Visualização em tela cheia" 
              class="fullscreen-image"
              @load="isImageLoading = false"
            />
          </div>
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
  gap: 0.25rem;
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
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: flex-start;
}

.image-date-chip.has-description {
  background-color: rgba(0, 0, 0, 0.7);
  border-bottom: 2px solid rgba(255, 255, 255, 0.6); /* Indicador visual solicitado */
  padding-bottom: 0.3rem;
}

.chip-date {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.7rem;
    opacity: 0.9;
}

.chip-description {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.75rem;
    font-weight: 600;
    width: 100%;
    margin-top: 1px;
    padding-top: 2px;
    border-top: 1px solid rgba(255,255,255,0.2);
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
  inset: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.70);
  backdrop-filter: blur(8px);
  z-index: 5000;
  display: flex;
}

.viewer-layout {
  display: flex;
  width: 100%;
  height: 100%;
}

/* Sidebar */
.viewer-sidebar {
  width: 320px;
  background: rgba(20, 20, 20, 0.95);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: white;
  animation: slideRight 0.3s ease-out;
  flex-shrink: 0;
}

@keyframes slideRight {
  from { opacity: 0; transform: translateX(-20px); }
  to { opacity: 1; transform: translateX(0); }
}

.sidebar-header {
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.sidebar-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.metadata-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.meta-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.5);
}

.meta-value {
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.95rem;
}

.date-value {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.description-value {
  line-height: 1.5;
  display: flex;
  gap: 0.5rem;
}

.meta-icon {
  margin-top: 3px;
  flex-shrink: 0;
  color: rgba(255, 255, 255, 0.5);
}

.empty-value {
  color: rgba(255, 255, 255, 0.3);
  font-style: italic;
  font-size: 0.875rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding-bottom: 0.5rem;
}

.tags-list::-webkit-scrollbar {
  height: 4px;
}
.tags-list::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 2px;
}
.tags-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 2px;
}
.tags-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

.meta-tag {
  flex-shrink: 0;
  white-space: nowrap;
  text-transform: capitalize;
  background: rgba(255, 255, 255, 0.12);
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.meta-tag:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

/* Main Area */
.viewer-main {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: hidden;
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
  z-index: 50;
}

.close-button:hover {
  background-color: rgba(0, 0, 0, 0.5);
}

.fullscreen-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.fullscreen-image.placeholder {
  filter: blur(1);
  transform: scale(7.5);
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

/* Loading spinner */
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Scrollbar Sidebar */
.viewer-sidebar::-webkit-scrollbar {
  width: 6px;
}
.viewer-sidebar::-webkit-scrollbar-track {
  background: transparent;
}
.viewer-sidebar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}
.viewer-sidebar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

@keyframes slideRight {
  from { transform: translateX(-100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Toolbar */
.gallery-toolbar {
  display: flex;
  flex-direction: column; /* Coluna para alinhar Row Busca + Row Tags */
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.toolbar-main-row {
  display: flex;
  justify-content: flex-start; /* ✨ Mudado de space-between para flex-start */
  align-items: center;
  gap: 0.5rem; /* Menor gap entre search e tags */
  width: 100%;
}

.toolbar-actions {
  margin-left: auto; /* ✨ Empurra as ações para a direita */
}

.gallery-toolbar .search-box {
  width: 320px; /* Largura fixa ou flex-basis */
  flex-shrink: 0;
}

/* Dropdown de Tags */
.filter-dropdown-container {
  position: relative;
}

.filter-count-badge {
  background: #3b82f6;
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0 0.35rem;
  border-radius: 999px;
  min-width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chevron-icon {
  transition: transform 0.2s ease;
  color: #9ca3af;
}
.chevron-icon.rotated {
  transform: rotate(180deg);
}

/* Toolbar Button com Filtros Ativos (Sutil) */
.toolbar-btn.has-filters {
  color: #2563eb;
  background: #eff6ff;
  border-color: #bfdbfe;
}

.filter-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0; /* Alinha à esquerda pois agora está no começo da linha */
  margin-top: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
  min-width: 220px;
  z-index: 50;
  overflow: hidden;
  animation: fadeIn 0.1s ease-out;
}

.dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid #f3f4f6;
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: #f9fafb;
}

.upload-limits {
  font-size: 0.6rem;
  color: #9ca3af;
  margin-top: 4px;
  text-align: center;
  width: 100%;
  line-height: 1.1;
  font-weight: 400;
}

.clear-filter-btn {
  background: none;
  border: none;
  color: #ef4444;
  font-size: 0.7rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
}
.clear-filter-btn:hover {
  text-decoration: underline;
}

.dropdown-list {
  max-height: 240px;
  overflow-y: auto;
  padding: 0.5rem 0;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  cursor: pointer;
  transition: background 0.1s;
  user-select: none;
}

.dropdown-item:hover {
  background: #f3f4f6;
}

.dropdown-item.selected {
  background: #eff6ff; /* Light Blue BG */
}

.dropdown-item.selected .tag-label {
  color: #2563eb; /* Blue Text */
  font-weight: 500;
}

.dropdown-item input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 1px solid #d1d5db; /* Gray-300 */
  background-color: white;
  cursor: pointer;
  display: grid;
  place-content: center;
  margin: 0;
}

.dropdown-item input[type="checkbox"]::before {
  content: "";
  width: 0.65rem;
  height: 0.65rem;
  transform: scale(0);
  transition: 0.1s transform ease-in-out;
  box-shadow: inset 1rem 1rem white; /* Icon color */
  transform-origin: center;
  clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
  background-color: white; /* Fallback */
}

.dropdown-item input[type="checkbox"]:checked {
  background-color: #2563eb; /* Blue-600 */
  border-color: #2563eb;
}

.dropdown-item input[type="checkbox"]:checked::before {
  transform: scale(1);
}

.tag-label {
  font-size: 0.875rem;
  color: #374151;
  text-transform: capitalize; /* ✨ Capitaliza as tags */
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e5e7eb;
}

/* Utils */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Scrollbar do dropdown */
.dropdown-list::-webkit-scrollbar {
  width: 4px;
}
.dropdown-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 4px;
}

.search-box {
  position: relative;
  flex: 1;
  max-width: 400px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  color: #9ca3af;
}

.search-input {
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 2.25rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: all 0.2s;
}

.search-input:focus {
  border-color: #3b82f6;
  outline: none;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.clear-search {
  position: absolute;
  right: 0.5rem;
  color: #9ca3af;
  background: none;
  border: none;
  cursor: pointer;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.375rem;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.toolbar-btn:hover {
  background: #f9fafb;
}

.toolbar-btn.active {
  background: #eff6ff;
  border-color: #3b82f6;
  color: #2563eb;
}

/* Bulk Actions Bar */
.bulk-actions-bar {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  background: #1f2937;
  color: white;
  padding: 0.75rem 1.5rem;
  border-radius: 1rem;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.2);
  z-index: 50;
  min-width: 300px;
  justify-content: space-between;
}

.bulk-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.count-badge {
  background: #3b82f6;
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
}

.bulk-text {
  font-size: 0.875rem;
  font-weight: 500;
}

.bulk-buttons {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.bulk-btn {
  background: rgba(255,255,255,0.1);
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.2);
  transform: translateY(-2px);
}

.bulk-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.bulk-btn.delete:hover {
  background: #ef4444;
}

.bulk-divider {
  width: 1px;
  height: 24px;
  background: rgba(255,255,255,0.2);
  margin: 0 0.25rem;
}

/* Selection Items */
.selection-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255,255,255,0.1);
  z-index: 20;
  display: flex;
  padding: 0.5rem;
  pointer-events: none; /* Deixa clique passar para o card */
}

.checkbox-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid white;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  transition: all 0.2s;
}

.checkbox-circle.checked {
  background: #3b82f6;
  border-color: #3b82f6;
}

.image-card.selection-mode {
  cursor: pointer;
}

.image-card.selected {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
}

/* Mobile responsive for new elements */
@media (max-width: 640px) {
  .btn-label-desktop {
    display: none;
  }
  .bulk-actions-bar {
    width: 90%;
    bottom: 1rem;
    padding: 0.75rem 1rem;
    gap: 1rem;
  }
  .image-card.selected .image-overlay {
    display: none; /* Hide overlay actions during selection */
  }
}

/* Slide Up Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 100%);
  opacity: 0;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .viewer-layout {
    flex-direction: column;
  }

  .viewer-sidebar {
    width: 100%;
    /* Altura ajustável ou fixa dependendo do conteúdo, mas max-height para não ocupar tudo */
    height: auto;
    max-height: 40%;
    border-right: none;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    animation: slideUp 0.3s ease-out;
    order: 2; /* Coloca sidebar abaixo da imagem */
  }
  
  .viewer-main {
    width: 100%;
    flex: 1; /* Ocupa o restante do espaço */
    padding: 1rem;
    padding-bottom: 0;
    order: 1; /* Imagem acima */
    min-height: 0; /* Importante para flex nested scrolling/sizing */
  }
  
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
}

</style>
