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

            <div v-if="file.patient?.name" class="metadata-group">
              <label class="meta-label">Paciente</label>
              <div class="meta-value date-value">
                <User :size="14" />
                <span class="truncate-value" :title="file.patient.name">{{ file.patient.name }}</span>
              </div>
            </div>

            <div v-if="file.appointment || file.metadata?.appointmentOrigin" class="metadata-group">
              <label class="meta-label">Atendimento de origem</label>
              <div class="meta-value date-value">
                <Stethoscope :size="14" />
                <span class="truncate-value" :title="formatAppointment(file.appointment || file.metadata?.appointmentOrigin)">{{ formatAppointment(file.appointment || file.metadata?.appointmentOrigin) }}</span>
              </div>
              <button
                v-if="file.appointment?._id && file.patient?._id"
                type="button"
                class="appointment-link"
                @click="goToAppointment(file.appointment._id)"
              >
                Ir para o atendimento
                <ArrowUpRight :size="16" />
              </button>
              <span v-if="!file.appointment && file.metadata?.appointmentOrigin" class="empty-value">Atendimento removido; imagem preservada.</span>
            </div>

            <div v-if="file.linkedAppointments?.length" class="metadata-group"><label class="meta-label">Utilizada nos atendimentos</label><button v-for="appointment in file.linkedAppointments" :key="appointment._id" type="button" class="appointment-link" @click="goToAppointment(appointment._id)">{{ formatAppointment(appointment) }}<ArrowUpRight :size="16" /></button></div>

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
              <div v-if="visibleGalleryTags(file.metadata?.tags).length" class="tags-list">
                <span 
                  v-for="tag in visibleGalleryTags(file.metadata?.tags)"
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
                    <span class="truncate-value" style="font-size: 0.8em; opacity: 0.7" :title="file.metadata?.originalName">{{ file.metadata?.originalName }}</span>
                     <span style="font-size: 0.8em; opacity: 0.7">{{ file.metadata?.sizeBytes ? (file.metadata.sizeBytes / 1024 / 1024).toFixed(2) + ' MB' : '' }}</span>
                </div>
             </div>

          </div>
        </div>

        <!-- Main Image Area -->
        <div class="viewer-main" @click.self="$emit('close')">
          <button @click="$emit('close')" class="close-button" aria-label="Fechar visualização">
            <X :size="32" />
          </button>

          <!-- Loading spinner -->
          <div v-if="isLoading" class="image-loading">
            <Loader2 :size="48" class="spinner" />
            <span>Carregando imagem...</span>
          </div>
          <div v-if="imageError" class="viewer-error" role="alert"><span>{{ imageError }}</span><button type="button" @click="retryImage">Tentar novamente</button></div>
          <div class="viewer-controls"><button v-if="hasPrevious" type="button" aria-label="Imagem anterior" @click="$emit('previous')"><ChevronLeft :size="22" /></button><button type="button" aria-label="Diminuir zoom" :disabled="zoom <= 1" @click="setZoom(zoom - .5)"><ZoomOut :size="20" /></button><button type="button" aria-label="Restaurar zoom" @click="setZoom(1)">{{ Math.round(zoom * 100) }}%</button><button type="button" aria-label="Aumentar zoom" :disabled="zoom >= 4" @click="setZoom(zoom + .5)"><ZoomIn :size="20" /></button><button v-if="hasNext" type="button" aria-label="Próxima imagem" @click="$emit('next')"><ChevronRight :size="22" /></button></div>
          
          <img 
            :src="imageUrl"
            alt="Visualização em tela cheia" 
            class="fullscreen-image"
            :class="{ 'loaded': !isLoading }"
            :style="{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, cursor: zoom > 1 ? 'grab' : 'default' }"
            @dragstart.prevent
            @pointerdown="startPan"
            @pointermove="pan"
            @pointerup="dragging = false"
            @pointercancel="dragging = false"
            @load="onImageLoad"
            @error="onImageError"
          />
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { getGalleryItem, galleryError } from '@/api/gallery';
import { useRouter } from 'vue-router';
import { visibleGalleryTags } from '@/utils/galleryTags';
import { 
  ArrowUpRight,
  X, 
  Calendar, 
  FileText, 
  Loader2,
  Stethoscope,
  User,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut,
} from 'lucide-vue-next';

const props = defineProps({
  hasPrevious: Boolean,
  hasNext: Boolean,
  show: {
    type: Boolean,
    default: false
  },
  file: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['close', 'previous', 'next']);
const router = useRouter();
const isLoading = ref(true);
const renewedUrl = ref('');
const imageError = ref('');
const zoom = ref(1);
const offset = ref({ x: 0, y: 0 });
const dragging = ref(false);
let start = { x: 0, y: 0 };
let renewed = false;
const imageUrl = computed(() => renewedUrl.value || props.file?.originalUrl || props.file?.signedUrl || '');
function setZoom(value) { zoom.value = Math.min(4, Math.max(1, value)); if (zoom.value === 1) offset.value = { x: 0, y: 0 }; }
function startPan(event) { if (zoom.value <= 1) return; dragging.value = true; start = { x: event.clientX - offset.value.x, y: event.clientY - offset.value.y }; event.target.setPointerCapture?.(event.pointerId); }
function pan(event) { if (dragging.value) offset.value = { x: event.clientX - start.x, y: event.clientY - start.y }; }
function keyboard(event) {
  if (!props.show || ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
  if (event.key === 'Escape') emit('close');
  if (event.key === 'ArrowLeft' && props.hasPrevious) emit('previous');
  if (event.key === 'ArrowRight' && props.hasNext) emit('next');
}
onMounted(() => window.addEventListener('keydown', keyboard));
onBeforeUnmount(() => window.removeEventListener('keydown', keyboard));

// Reset loading when file changes or modal opens
watch(() => props.file, () => {
  if (props.file) {
    isLoading.value = true;
    renewedUrl.value = ''; imageError.value = ''; renewed = false; setZoom(1);
  }
}, { immediate: true });

function onImageLoad() {
  isLoading.value = false;
}

async function retryImage() {
  const id = props.file?._id;
  if (!id) return;
  isLoading.value = true; imageError.value = '';
  try {
    const fresh = await getGalleryItem(id);
    if (props.file?._id !== id || !props.show) return;
    const url = fresh.originalUrl || fresh.signedUrl;
    if (url === imageUrl.value) { isLoading.value = false; imageError.value = 'A imagem não está disponível. Tente novamente mais tarde.'; return; }
    renewedUrl.value = url;
  } catch (cause) { if (props.file?._id === id) { isLoading.value = false; imageError.value = galleryError(cause); } }
}
function onImageError() { if (!renewed) { renewed = true; retryImage(); } else { isLoading.value = false; imageError.value = 'Não foi possível carregar a imagem.'; } }

function goToAppointment(appointmentId) {
  if (!appointmentId || !props.file?.patient?._id) return;
  emit('close');
  router.push({
    name: 'atendimento-em-andamento',
    params: {
      appointmentId,
      patientId: props.file.patient._id,
    },
  });
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
function formatAppointment(appointment) {
  if (!appointment) return '';
  const date = appointment.startTime
    ? new Date(appointment.startTime).toLocaleDateString('pt-BR')
    : null;
  return [appointment.type || 'Atendimento', date].filter(Boolean).join(' - ');
}
</script>

<style scoped>
.viewer-controls { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 6px; padding: 7px; border: 1px solid #ffffff30; background: #0f172ae8; border-radius: 12px; z-index: 60; }
.viewer-controls button { display: grid; place-items: center; min-width: 36px; height: 34px; border: 0; border-radius: 6px; background: transparent; color: white; cursor: pointer; font-size: 12px; }
.viewer-controls button:hover { background: #ffffff20; } .viewer-controls button:disabled { opacity: .4; }
.viewer-error { position: absolute; display: grid; gap: 12px; justify-items: center; max-width: 300px; padding: 20px; background: #0f172a; border-radius: 10px; color: white; z-index: 20; text-align: center; font-size: 14px; }
.viewer-error button { color: #93c5fd; background: none; border: 0; cursor: pointer; text-decoration: underline; } .fullscreen-image { touch-action: none; }
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
  min-width: 0;
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
  min-width: 0;
}

.date-value svg {
  flex-shrink: 0;
}

.truncate-value {
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.appointment-link {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
}

.appointment-link:hover {
  background: rgba(255, 255, 255, 0.18);
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
