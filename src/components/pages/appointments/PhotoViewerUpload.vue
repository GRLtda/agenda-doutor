<script setup>
import { ref, computed, watch } from 'vue'
import { X, ChevronLeft, ChevronRight, Upload, Trash2, Tag, FileText, Check } from 'lucide-vue-next'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  files: {
    type: Array,
    default: () => [],
  },
})

const emit = defineEmits(['close', 'upload'])

// Estado das fotos com metadados
const photosData = ref([])
const selectedIndex = ref(0)

// Tags disponíveis para seleção
const availableTags = [
  { id: 'frontal', label: 'Frontal', color: '#3b82f6' },
  { id: 'lateral-esquerda', label: 'Lateral Esquerda', color: '#8b5cf6' },
  { id: 'lateral-direita', label: 'Lateral Direita', color: '#a855f7' },
  { id: 'perfil', label: 'Perfil', color: '#ec4899' },
  { id: 'boca', label: 'Boca', color: '#ef4444' },
  { id: 'olhos', label: 'Olhos', color: '#14b8a6' },
  { id: 'nariz', label: 'Nariz', color: '#f59e0b' },
  { id: 'antes', label: 'Antes', color: '#22c55e' },
  { id: 'depois', label: 'Depois', color: '#06b6d4' },
  { id: 'outro', label: 'Outro', color: '#6b7280' },
]

// Foto atualmente selecionada
const currentPhoto = computed(() => photosData.value[selectedIndex.value] || null)

// Converter arquivos para objetos com preview e metadados
watch(() => props.files, (newFiles) => {
  if (newFiles.length > 0) {
    photosData.value = newFiles.map((file, index) => ({
      id: `photo-${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      description: '',
      tags: [],
    }))
    selectedIndex.value = 0
  }
}, { immediate: true })

// Limpar URLs ao fechar
watch(() => props.visible, (isVisible) => {
  if (!isVisible) {
    photosData.value.forEach(photo => {
      if (photo.preview) {
        URL.revokeObjectURL(photo.preview)
      }
    })
    photosData.value = []
    selectedIndex.value = 0
  }
})

function selectPhoto(index) {
  selectedIndex.value = index
}

function navigatePrev() {
  if (selectedIndex.value > 0) {
    selectedIndex.value--
  }
}

function navigateNext() {
  if (selectedIndex.value < photosData.value.length - 1) {
    selectedIndex.value++
  }
}

function toggleTag(tagId) {
  if (!currentPhoto.value) return
  
  const tagIndex = currentPhoto.value.tags.indexOf(tagId)
  if (tagIndex === -1) {
    currentPhoto.value.tags.push(tagId)
  } else {
    currentPhoto.value.tags.splice(tagIndex, 1)
  }
}

function isTagSelected(tagId) {
  return currentPhoto.value?.tags?.includes(tagId) || false
}

function removePhoto(index) {
  const photo = photosData.value[index]
  if (photo?.preview) {
    URL.revokeObjectURL(photo.preview)
  }
  
  photosData.value.splice(index, 1)
  
  if (photosData.value.length === 0) {
    handleClose()
  } else if (selectedIndex.value >= photosData.value.length) {
    selectedIndex.value = photosData.value.length - 1
  }
}

function handleClose() {
  emit('close')
}

function handleUpload() {
  // Emite os arquivos com seus metadados
  const result = photosData.value.map(photo => ({
    file: photo.file,
    description: photo.description,
    tags: photo.tags,
  }))
  emit('upload', result)
}

// Keyboard navigation
function handleKeydown(e) {
  if (!props.visible) return
  
  if (e.key === 'ArrowLeft') {
    navigatePrev()
  } else if (e.key === 'ArrowRight') {
    navigateNext()
  } else if (e.key === 'Escape') {
    handleClose()
  }
}

// Adicionar listener global
watch(() => props.visible, (isVisible) => {
  if (isVisible) {
    window.addEventListener('keydown', handleKeydown)
  } else {
    window.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="viewer-fade">
      <div v-if="visible && photosData.length > 0" class="photo-viewer-overlay">
        <!-- Header -->
        <header class="viewer-header">
          <div class="header-left">
            <span class="photo-counter">
              {{ selectedIndex + 1 }} / {{ photosData.length }}
            </span>
          </div>
          <div class="header-center">
            <h2 class="viewer-title">Preparar Fotos para Upload</h2>
          </div>
          <div class="header-right">
            <button class="close-btn" @click="handleClose" title="Fechar (Esc)">
              <X :size="24" />
            </button>
          </div>
        </header>

        <!-- Main Content -->
        <div class="viewer-content">
          <!-- Sidebar Esquerda - Metadados -->
          <aside class="sidebar-left">
            <div class="sidebar-section">
              <label class="section-label">
                <FileText :size="16" />
                Descrição
              </label>
              <textarea
                v-if="currentPhoto"
                v-model="currentPhoto.description"
                class="description-input"
                placeholder="Adicione uma descrição para esta foto..."
                rows="4"
              ></textarea>
            </div>

            <div class="sidebar-section">
              <label class="section-label">
                <Tag :size="16" />
                Tags
              </label>
              <div class="tags-grid">
                <button
                  v-for="tag in availableTags"
                  :key="tag.id"
                  class="tag-btn"
                  :class="{ selected: isTagSelected(tag.id) }"
                  :style="{ 
                    '--tag-color': tag.color,
                    '--tag-color-light': tag.color + '20'
                  }"
                  @click="toggleTag(tag.id)"
                >
                  <Check v-if="isTagSelected(tag.id)" :size="14" class="tag-check" />
                  {{ tag.label }}
                </button>
              </div>
            </div>
          </aside>

          <!-- Área Central - Foto Principal -->
          <main class="main-view">
            <!-- Navigation Arrows -->
            <button 
              v-if="selectedIndex > 0"
              class="nav-arrow nav-prev" 
              @click="navigatePrev"
            >
              <ChevronLeft :size="32" />
            </button>

            <div class="photo-display">
              <img 
                v-if="currentPhoto"
                :src="currentPhoto.preview" 
                :alt="`Foto ${selectedIndex + 1}`"
                class="main-photo"
              />
            </div>

            <button 
              v-if="selectedIndex < photosData.length - 1"
              class="nav-arrow nav-next" 
              @click="navigateNext"
            >
              <ChevronRight :size="32" />
            </button>
          </main>
        </div>

        <!-- Footer - Filmstrip -->
        <footer class="viewer-footer">
          <div class="filmstrip-container">
            <div class="filmstrip">
              <div
                v-for="(photo, index) in photosData"
                :key="photo.id"
                class="filmstrip-item"
                :class="{ active: index === selectedIndex }"
                @click="selectPhoto(index)"
              >
                <img :src="photo.preview" :alt="`Miniatura ${index + 1}`" />
                <span class="filmstrip-number">{{ index + 1 }}</span>
                <button 
                  class="filmstrip-remove" 
                  @click.stop="removePhoto(index)"
                  title="Remover foto"
                >
                  <Trash2 :size="12" />
                </button>
                <!-- Indicador de tags/descrição -->
                <div v-if="photo.tags.length > 0 || photo.description" class="meta-indicator">
                  <span v-if="photo.tags.length > 0" class="tag-count">{{ photo.tags.length }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Botão de Upload -->
          <div class="footer-actions">
            <button class="cancel-btn" @click="handleClose">
              Cancelar
            </button>
            <button class="upload-btn" @click="handleUpload">
              <Upload :size="18" />
              Enviar {{ photosData.length }} foto{{ photosData.length > 1 ? 's' : '' }}
            </button>
          </div>
        </footer>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.photo-viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: linear-gradient(180deg, #0f0f0f 0%, #1a1a1a 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Header */
.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1.5rem;
  background-color: rgba(0, 0, 0, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.header-left,
.header-right {
  flex: 1;
  display: flex;
}

.header-right {
  justify-content: flex-end;
}

.header-center {
  flex: 2;
  text-align: center;
}

.photo-counter {
  background: rgba(255, 255, 255, 0.1);
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.8);
}

.viewer-title {
  font-size: 1rem;
  font-weight: 600;
  color: white;
  margin: 0;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

/* Content Area */
.viewer-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* Sidebar */
.sidebar-left {
  width: 280px;
  background: rgba(0, 0, 0, 0.4);
  border-right: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1.25rem;
  overflow-y: auto;
  flex-shrink: 0;
}

.sidebar-section {
  margin-bottom: 1.5rem;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.description-input {
  width: 100%;
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 0.5rem;
  color: white;
  font-size: 0.875rem;
  resize: vertical;
  min-height: 100px;
  transition: all 0.2s ease;
}

.description-input::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.description-input:focus {
  outline: none;
  border-color: var(--primary-color, #3b82f6);
  background: rgba(255, 255, 255, 0.1);
}

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-btn:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.25);
  color: white;
}

.tag-btn.selected {
  background: var(--tag-color-light);
  border-color: var(--tag-color);
  color: white;
}

.tag-check {
  color: var(--tag-color);
}

/* Main View */
.main-view {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 2rem;
  min-width: 0;
}

.photo-display {
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-photo {
  max-width: 100%;
  max-height: calc(100vh - 240px);
  object-fit: contain;
  border-radius: 0.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

/* Navigation Arrows */
.nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;
}

.nav-arrow:hover {
  background: rgba(0, 0, 0, 0.7);
  border-color: rgba(255, 255, 255, 0.4);
}

.nav-prev {
  left: 1rem;
}

.nav-next {
  right: 1rem;
}

/* Footer / Filmstrip */
.viewer-footer {
  background: rgba(0, 0, 0, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding: 1rem 1.5rem;
  flex-shrink: 0;
}

.filmstrip-container {
  overflow-x: auto;
  padding-bottom: 0.75rem;
  margin-bottom: 0.75rem;
}

.filmstrip {
  display: flex;
  gap: 0.75rem;
  padding: 0.25rem;
}

.filmstrip-item {
  position: relative;
  width: 80px;
  height: 80px;
  flex-shrink: 0;
  border-radius: 0.5rem;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.filmstrip-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.filmstrip-item:hover {
  border-color: rgba(255, 255, 255, 0.4);
  transform: translateY(-2px);
}

.filmstrip-item.active {
  border-color: var(--primary-color, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.filmstrip-number {
  position: absolute;
  bottom: 4px;
  left: 4px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
}

.filmstrip-remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(239, 68, 68, 0.8);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s ease;
}

.filmstrip-item:hover .filmstrip-remove {
  opacity: 1;
}

.filmstrip-remove:hover {
  background: rgb(239, 68, 68);
}

.meta-indicator {
  position: absolute;
  top: 4px;
  left: 4px;
  display: flex;
  gap: 2px;
}

.tag-count {
  background: var(--primary-color, #3b82f6);
  color: white;
  font-size: 0.5rem;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: 4px;
}

/* Footer Actions */
.footer-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.cancel-btn {
  padding: 0.625rem 1.25rem;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 0.5rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
  color: white;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.5rem;
  background: var(--primary-color, #3b82f6);
  border: none;
  border-radius: 0.5rem;
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.upload-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
}

/* Transitions */
.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity 0.3s ease;
}

.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}

/* Scrollbar */
.sidebar-left::-webkit-scrollbar,
.filmstrip-container::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.sidebar-left::-webkit-scrollbar-track,
.filmstrip-container::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-left::-webkit-scrollbar-thumb,
.filmstrip-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

.sidebar-left::-webkit-scrollbar-thumb:hover,
.filmstrip-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .sidebar-left {
    display: none;
  }
  
  .nav-arrow {
    width: 36px;
    height: 36px;
  }
  
  .filmstrip-item {
    width: 60px;
    height: 60px;
  }
}
</style>
