<template>
  <Transition name="fade">
    <div v-if="show && file" class="image-viewer-overlay" @click.self="$emit('close')">
      <div class="viewer-layout">
        <!-- Sidebar Metadata -->
        <div class="viewer-sidebar" @click.stop>
          <div class="sidebar-header">
            <h3 class="sidebar-title">Detalhes da Imagem</h3>
          </div>
          
          <div class="sidebar-content">
            <!-- Info Básica -->
            <div class="metadata-group">
              <label class="meta-label">Data de Criação</label>
              <div class="meta-value date-value">
                <Calendar :size="14" />
                <span>{{ formatDate(file.createdAt) }}</span>
              </div>
            </div>

            <!-- Descrição -->
            <div class="metadata-group">
              <label class="meta-label">Descrição</label>
              <div class="meta-value description-value">
                <template v-if="file.metadata?.description">
                  <FileText :size="14" class="meta-icon" />
                  <p>{{ file.metadata.description }}</p>
                </template>
                <span v-else class="empty-value">Sem descrição</span>
              </div>
            </div>
            
            <!-- Tags -->
            <div class="metadata-group">
              <label class="meta-label">Tags</label>
              <div v-if="file.metadata?.tags?.length" class="tags-list">
                <span 
                  v-for="tag in file.metadata.tags" 
                  :key="tag"
                  class="meta-tag"
                >
                  {{ tag }}
                </span>
              </div>
              <span v-else class="empty-value">Sem tags</span>
            </div>

             <!-- Info técnica extra (tipo, tamanho) opcional -->
             <div class="metadata-group">
                <label class="meta-label">Arquivo</label>
                <div class="meta-value description-value" style="flex-direction: column; gap: 4px; align-items: flex-start;">
                    <span style="font-size: 0.8em; opacity: 0.7">{{ file.metadata?.originalName }}</span>
                     <span style="font-size: 0.8em; opacity: 0.7">{{ file.metadata?.sizeBytes ? (file.metadata.sizeBytes / 1024 / 1024).toFixed(2) + ' MB' : '' }}</span>
                </div>
             </div>

          </div>
        </div>

        <!-- Main Image Area -->
        <div class="viewer-main" @click.self="$emit('close')">
          <button @click="$emit('close')" class="close-button">
            <X :size="32" />
          </button>

          <!-- Loading spinner -->
          <div v-if="isLoading" class="image-loading">
            <Loader2 :size="48" class="spinner" />
            <span>Carregando imagem...</span>
          </div>
          
          <img 
            :src="file.signedUrl" 
            alt="Visualização em tela cheia" 
            class="fullscreen-image"
            :class="{ 'loaded': !isLoading }"
            @load="onImageLoad"
            @error="onImageError"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, watch } from 'vue';
import { 
  X, 
  Calendar, 
  FileText, 
  Loader2 
} from 'lucide-vue-next';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  file: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close']);
const isLoading = ref(true);

// Reset loading when file changes or modal opens
watch(() => props.file, () => {
  if (props.file) {
    isLoading.value = true;
  }
}, { immediate: true });

function onImageLoad() {
  isLoading.value = false;
}

function onImageError() {
  isLoading.value = false;
  // Could emit error or handle it UI wise
}

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<style scoped>
.image-viewer-overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.85); /* Darker for focus */
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

@media (max-width: 768px) {
    .viewer-layout {
        flex-direction: column-reverse;
    }
    .viewer-sidebar {
        width: 100%;
        height: 40%;
        border-right: none;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
    }
    .viewer-main {
        height: 60%;
    }
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
  background-color: transparent; /* Overlay handles bg */
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
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fullscreen-image.loaded {
    opacity: 1;
    transform: scale(1);
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

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes slideRight {
  from { transform: translateX(-20px); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

/* Vue Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
