<template>
  <div 
    class="image-card"
    :class="{ 'selection-mode': selectionMode, 'selected': selected }"
    @click="handleClick"
  >
    <!-- Selection Overlay -->
    <div v-if="selectionMode" class="selection-overlay">
      <div class="checkbox-circle" :class="{ checked: selected }">
        <Check v-if="selected" :size="14" stroke-width="3" />
      </div>
    </div>

    <!-- Placeholder de erro quando a imagem falha -->
    <div v-if="hasError" class="error-placeholder">
      <ImageOff :size="28" class="error-icon" />
      <span class="error-text">Erro ao carregar</span>
      <button 
        class="debug-copy-btn" 
        @click.stop="copyDebugInfo"
        title="Copiar informações de debug"
      >
        <Copy :size="12" />
      </button>
    </div>

    <!-- Thumbnail -->
    <img
      v-else
      :src="file.signedUrl"
      alt="Anexo"
      class="thumbnail-image"
      loading="lazy"
      decoding="async"
      @error="handleImageError"
    />

    <div class="image-overlay">
      <div 
        class="image-date-chip" 
        :title="formattedDate"
      >
        <div class="chip-date">
          <Calendar :size="10" />
          <span>{{ formattedDate }}</span>
        </div>
      </div>
      
      <button
        v-if="!disabled && canDelete"
        class="delete-button"
        @click.stop="$emit('delete', file)"
        title="Excluir imagem"
      >
        <Trash2 :size="16" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { 
  Trash2, 
  Calendar, 
  ImageOff, 
  Copy, 
  Check 
} from 'lucide-vue-next';
import { useToast } from 'vue-toastification';

const props = defineProps({
  file: {
    type: Object,
    required: true
  },
  selectionMode: {
    type: Boolean,
    default: false
  },
  selected: {
    type: Boolean,
    default: false
  },
  disabled: {
    type: Boolean,
    default: false
  },
  canDelete: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['click', 'delete', 'select']);
const toast = useToast();
const hasError = ref(false);

const formattedDate = computed(() => {
  if (!props.file.createdAt) return '';
  return new Date(props.file.createdAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
});

function handleImageError() {
  hasError.value = true;
}

function handleClick() {
  if (props.selectionMode) {
    emit('select', props.file);
  } else if (!hasError.value) {
    emit('click', props.file);
  }
}

function copyDebugInfo() {
  const metadata = props.file.metadata || {};
  const tags = metadata.tags?.join(', ') || '—';
  
  const debugInfo = `=== Debug Info - Anexo ===
ID: ${props.file._id}
S3 Key: ${props.file.s3Key || '—'}
Tipo: ${props.file.fileType || '—'}

Metadata:
  - Nome Original: ${metadata.originalName || '—'}
  - Mime Type: ${metadata.mimeType || '—'}
  - Tamanho: ${metadata.sizeBytes ? (metadata.sizeBytes / 1024 / 1024).toFixed(2) + ' MB' : '—'}
  - Categoria: ${metadata.category || '—'}
  - Tags: ${tags}
  - Descrição: ${metadata.description || '—'}

Criado em: ${formattedDate.value}
URL Expira em: ${props.file.expiresIn ? props.file.expiresIn + 's' : '—'}
==============================`;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(debugInfo).then(() => {
      toast.info('Informações copiadas para a área de transferência!');
    });
  } else {
    // Fallback logic could go here, but omitted for brevity
    toast.error('Não foi possível copiar automaticamente.');
  }
}
</script>

<style scoped>
.image-card {
  position: relative;
  aspect-ratio: 1 / 1;
  border-radius: 0.5rem;
  overflow: hidden;
  background-color: #f3f4f6;
  border: 1px solid #e5e7eb;
  transition: transform 0.2s ease;
  cursor: default;
}

.image-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.image-card.selection-mode {
  cursor: pointer;
}

.image-card.selected {
  border: 2px solid #2563eb;
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

/* Thumbnail */
.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  /* Visual tweaks from reference */
  image-rendering: pixelated; /* Optional styling choice from ref */
}

/* Overlay */
.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 0.5rem;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  /* Gradient for better text readability */
  background: linear-gradient(to top, rgba(0,0,0,0.4), transparent);
}

/* Date Chip */
.image-date-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  border-radius: 0.375rem;
  color: white;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.chip-date {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.7rem;
  opacity: 0.9;
}

/* Delete Button */
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
  transition: all 0.2s ease-in-out;
  transform: translateY(10px);
}

.image-card:hover .delete-button {
  opacity: 1;
  transform: translateY(0);
}

.delete-button:hover {
  background-color: rgb(239, 68, 68);
}

/* Debug Button */
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

/* Selection Overlay */
.selection-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0.5rem;
  z-index: 10;
}

.checkbox-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.5);
  border: 2px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.checkbox-circle.checked {
  background-color: #2563eb;
  border-color: #2563eb;
  color: white;
}
</style>
