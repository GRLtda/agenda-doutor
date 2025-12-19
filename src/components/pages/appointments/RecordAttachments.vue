<script setup>
import { ref } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { Plus, Image as ImageIcon, UploadCloud, X, Calendar, Trash2, LayoutGrid } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { getCloudinaryUrl } from '@/helpers/cloudinary'
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
const placeholderImage = ref(null)
const isImageLoaded = ref(false)
const showMontageEditor = ref(false)


function openImageViewer(imageUrl) {
  selectedImage.value = imageUrl
  // Low quality placeholder for blur effect
  placeholderImage.value = getCloudinaryUrl(imageUrl, { width: 50, quality: 'auto:low' }) 
  isImageLoaded.value = false
}
function closeImageViewer() {
  selectedImage.value = null
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

  // Upload sequential to avoid overwhelming the server/browser
  for (const file of files) {
    const { success } = await recordsStore.uploadAttachmentImage(
      props.record?._id,
      file,
      { patientId: props.patientId, appointmentId: props.appointmentId },
    )

    if (success) {
      successCount++
    } else {
      errorCount++
    }
  }

  if (successCount > 0) {
    toast.success(`${successCount} imagem(ns) anexada(s) com sucesso!`)
  }
  
  if (errorCount > 0) {
    toast.error(`Falha no upload de ${errorCount} imagem(ns).`)
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
  
  const { success } = await recordsStore.uploadAttachmentImage(
    props.record?._id,
    file,
    { patientId: props.patientId, appointmentId: props.appointmentId },
  )

  if (success) {
    toast.success('Montagem salva com sucesso!')
  } else {
    toast.error('Falha ao salvar a montagem.')
  }

  isUploading.value = false
}
</script>

<template>
  <div class="attachments-container">
    <div class="attachments-grid">
      <div
        v-if="!disabled"
        class="action-card"
        :class="{ disabled: disabled }"
        @click="triggerFileUpload"
      >
        <div v-if="isUploading" class="action-content">
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
        @click="showMontageEditor = true"
      >
        <div class="action-content">
          <LayoutGrid :size="22" />
          <span>Montagem</span>
        </div>
      </div>

      <div
        v-for="attachment in record?.attachments || []"
        :key="attachment._id"
        class="image-card"
      >
        <img
          :src="getCloudinaryUrl(attachment.url, { width: 300, height: 300, crop: 'fill', quality: 'auto' })"
          alt="Anexo do paciente"
          class="attachment-image"
          @click="openImageViewer(attachment.url)"
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
          <!-- Placeholder (Blurred) -->
          <img 
            v-if="placeholderImage"
            :src="placeholderImage" 
            alt="Placeholder" 
            class="fullscreen-image placeholder"
          />
          <!-- Main Image (High Quality) -->
          <img 
            :src="selectedImage" 
            alt="Visualização em tela cheia" 
            class="fullscreen-image main-image"
            :class="{ 'loaded': isImageLoaded }"
            @load="isImageLoaded = true"
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
  opacity: 0.5;
}

.action-card.disabled:hover {
  background-color: #fafafa;
  border-color: #e5e7eb;
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

.attachment-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
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
