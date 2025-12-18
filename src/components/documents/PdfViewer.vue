<script setup>
import { ref, computed, watch } from 'vue'
import { X, Download, Printer, ExternalLink, Loader2 } from 'lucide-vue-next'
import AppButton from '@/components/global/AppButton.vue'

const props = defineProps({
  pdfUrl: {
    type: String,
    default: null
  },
  pdfBase64: {
    type: String,
    default: null
  },
  fileName: {
    type: String,
    default: 'documento.pdf'
  },
  title: {
    type: String,
    default: 'Visualizar Documento'
  }
})

const emit = defineEmits(['close', 'download'])

const isLoading = ref(true)
const iframe = ref(null)

const pdfSrc = computed(() => {
  if (props.pdfBase64) {
    return `data:application/pdf;base64,${props.pdfBase64}`
  }
  return props.pdfUrl
})

watch(pdfSrc, () => {
  isLoading.value = true
})

function handleIframeLoad() {
  isLoading.value = false
}

function handleDownload() {
  if (pdfSrc.value) {
    const link = document.createElement('a')
    link.href = pdfSrc.value
    link.download = props.fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
  emit('download')
}

function handlePrint() {
  if (iframe.value) {
    iframe.value.contentWindow?.print()
  }
}

function handleOpenNew() {
  if (pdfSrc.value) {
    window.open(pdfSrc.value, '_blank')
  }
}
</script>

<template>
  <div class="modal-overlay" @click.self="emit('close')">
    <div class="modal-container">
      <header class="modal-header">
        <h2>{{ title }}</h2>
        <div class="header-actions">
          <button @click="handleDownload" class="action-btn" title="Baixar PDF">
            <Download :size="18" />
          </button>
          <button @click="handlePrint" class="action-btn" title="Imprimir">
            <Printer :size="18" />
          </button>
          <button @click="handleOpenNew" class="action-btn" title="Abrir em nova aba">
            <ExternalLink :size="18" />
          </button>
          <button @click="emit('close')" class="close-btn" title="Fechar">
            <X :size="20" />
          </button>
        </div>
      </header>

      <div class="modal-content">
        <div v-if="isLoading" class="loading-overlay">
          <Loader2 :size="32" class="spinner" />
          <span>Carregando documento...</span>
        </div>
        
        <iframe
          v-if="pdfSrc"
          ref="iframe"
          :src="pdfSrc"
          class="pdf-iframe"
          @load="handleIframeLoad"
        />
        
        <div v-else class="no-pdf">
          <p>Nenhum PDF para exibir</p>
        </div>
      </div>

      <footer class="modal-footer">
        <AppButton @click="emit('close')" variant="secondary">
          Fechar
        </AppButton>
        <AppButton @click="handleDownload" variant="primary">
          <Download :size="16" />
          Baixar PDF
        </AppButton>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: var(--branco, #fff);
  border-radius: 1rem;
  width: 100%;
  max-width: 900px;
  height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.close-btn {
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  color: #6b7280;
  border-radius: 0.5rem;
  margin-left: 0.5rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #fee2e2;
  color: #dc2626;
}

.modal-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  background: #f9fafb;
}

.loading-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  background: #f9fafb;
  z-index: 10;
}

.spinner {
  animation: spin 1s linear infinite;
  color: #6366f1;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loading-overlay span {
  color: #6b7280;
  font-size: 0.9375rem;
}

.pdf-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.no-pdf {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
}
</style>
