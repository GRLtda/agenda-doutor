<script setup>
import { ref } from 'vue'
import { useRecordsStore } from '@/stores/records'
import { Plus, Image as ImageIcon, UploadCloud, X, Calendar, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

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

function openImageViewer(imageUrl) {
  selectedImage.value = imageUrl
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
</script>

<template>
  <div class="attachments-container">
    <div class="attachments-grid">
      <div
        v-if="!disabled"
        class="upload-card"
        :class="{ disabled: disabled }"
        @click="triggerFileUpload"
      >
        <div v-if="isUploading" class="upload-loading">
          <UploadCloud :size="40" class="icon-loading" />
          <span>Enviando...</span>
        </div>
        <div v-else class="upload-prompt">
          <Plus :size="40" />
          <span>Adicionar Imagem</span>
        </div>
      </div>

      <div
        v-for="attachment in record?.attachments || []"
        :key="attachment._id"
        class="image-card"
      >
        <img
          :src="attachment.url"
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
      accept="image/png, image/jpeg, image/webp"
      multiple
      hidden
      :disabled="disabled"
    />

    <Transition name="fade">
      <div v-if="selectedImage" class="image-viewer-overlay" @click.self="closeImageViewer">
        <button @click="closeImageViewer" class="close-button">
          <X :size="32" />
        </button>
        <img :src="selectedImage" alt="Visualização em tela cheia" class="fullscreen-image" />
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

.upload-card,
.image-card {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 0.75rem;
  overflow: hidden;
  background-color: #f3f4f6;
  transition: transform 0.2s ease;
}

.upload-card {
  border: 2px dashed #d1d5db;
  cursor: pointer;
}

.upload-card:hover {
  border-color: var(--azul-principal);
  background-color: #eef2ff;
  transform: translateY(-4px);
}

.upload-card.disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.upload-card.disabled:hover {
  border-color: #d1d5db;
  background-color: #f3f4f6;
  transform: none;
}

.upload-prompt,
.upload-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #6b7280;
}
.upload-card:hover .upload-prompt {
  color: var(--azul-principal);
}
.upload-card.disabled:hover .upload-prompt {
  color: #6b7280;
}
.upload-loading .icon-loading {
  animation: pulse 1.5s infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
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

.fullscreen-image {
  max-width: 90vw;
  max-height: 90vh;
  object-fit: contain;
  border-radius: 0.5rem;
  box-shadow:
    0 20px 25px -5px rgb(0 0 0 / 0.4),
    0 8px 10px -6px rgb(0 0 0 / 0.4);
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
