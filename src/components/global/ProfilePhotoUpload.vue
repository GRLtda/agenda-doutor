<script setup>
import { ref, computed } from 'vue'
import { Camera, Trash2, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

const isUploading = ref(false)
const isDeleting = ref(false)
const errorMessage = ref('')
const fileInput = ref(null)

const hasPhoto = computed(() => !!authStore.user?.profilePhotoUrl)
const photoUrl = computed(() => authStore.user?.profilePhotoUrl)
const userInitial = computed(() => authStore.user?.name?.charAt(0)?.toUpperCase() || 'U')

function triggerFileInput() {
  fileInput.value?.click()
}

async function handleFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return

  // Validação de tipo
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    errorMessage.value = 'Formato inválido. Use JPEG, PNG ou WebP.'
    return
  }

  // Validação de tamanho (5MB)
  if (file.size > 5 * 1024 * 1024) {
    errorMessage.value = 'Imagem muito grande. Máximo 5MB.'
    return
  }

  errorMessage.value = ''
  isUploading.value = true

  try {
    const result = await authStore.uploadProfilePhoto(file)
    if (!result.success) {
      errorMessage.value = result.error || 'Erro ao fazer upload'
    }
  } catch (error) {
    console.error('Erro no upload:', error)
    errorMessage.value = 'Erro ao fazer upload. Tente novamente.'
  } finally {
    isUploading.value = false
    // Limpa o input para permitir selecionar o mesmo arquivo novamente
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  }
}

async function handleDelete() {
  if (!confirm('Tem certeza que deseja remover sua foto de perfil?')) return

  errorMessage.value = ''
  isDeleting.value = true

  try {
    const result = await authStore.deleteProfilePhoto()
    if (!result.success) {
      errorMessage.value = result.error || 'Erro ao remover foto'
    }
  } catch (error) {
    console.error('Erro ao remover foto:', error)
    errorMessage.value = 'Erro ao remover foto. Tente novamente.'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <div class="profile-photo-upload">
    <div class="photo-container">
      <div class="photo-preview" :class="{ 'has-photo': hasPhoto }">
        <img v-if="hasPhoto" :src="photoUrl" alt="Foto de perfil" class="photo-image" />
        <span v-else class="photo-initials">{{ userInitial }}</span>
        
        <div v-if="isUploading" class="upload-overlay">
          <Loader2 :size="24" class="animate-spin" />
        </div>
      </div>

      <div class="photo-actions">
        <button 
          type="button" 
          class="action-button upload-button" 
          @click="triggerFileInput"
          :disabled="isUploading || isDeleting"
        >
          <Camera :size="16" />
          <span>{{ hasPhoto ? 'Alterar' : 'Adicionar' }}</span>
        </button>
        <button 
          v-if="hasPhoto"
          type="button" 
          class="action-button delete-button" 
          @click="handleDelete"
          :disabled="isUploading || isDeleting"
        >
          <Trash2 :size="16" />
          <span>{{ isDeleting ? 'Removendo...' : 'Remover' }}</span>
        </button>
      </div>
    </div>

    <input
      ref="fileInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden-input"
      @change="handleFileChange"
    />

    <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
    <p class="help-text">JPEG, PNG ou WebP. Máximo 5MB.</p>
  </div>
</template>

<style scoped>
.profile-photo-upload {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.photo-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.photo-preview {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background-color: #eef2ff;
  color: var(--azul-principal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 600;
  overflow: hidden;
  border: 3px solid #e0e7ff;
  transition: border-color 0.2s ease;
}

.photo-preview.has-photo {
  border-color: var(--azul-principal);
}

.photo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-initials {
  user-select: none;
}

.upload-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.photo-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.upload-button {
  background-color: var(--azul-principal);
  color: white;
  border-color: var(--azul-principal);
}

.upload-button:hover:not(:disabled) {
  background-color: var(--azul-escuro);
  border-color: var(--azul-escuro);
}

.delete-button {
  background-color: transparent;
  color: #ef4444;
  border-color: #fecaca;
}

.delete-button:hover:not(:disabled) {
  background-color: #fef2f2;
  border-color: #ef4444;
}

.hidden-input {
  display: none;
}

.error-message {
  color: #ef4444;
  font-size: 0.75rem;
  margin: 0;
}

.help-text {
  color: #9ca3af;
  font-size: 0.75rem;
  margin: 0;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
