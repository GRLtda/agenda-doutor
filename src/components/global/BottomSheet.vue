<script setup>
import { onMounted, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'

const emit = defineEmits(['close'])

const props = defineProps({
  title: {
    type: String,
    default: ''
  },
  showClose: {
    type: Boolean,
    default: true
  },
  absolute: {
    type: Boolean,
    default: false
  }
})

// Fechar com ESC
function onKeydown(e) {
  if (e.key === 'Escape') {
    emit('close')
  }
}

// Drag Logic
import { ref } from 'vue'

const panelRef = ref(null)
const isDragging = ref(false)
const dragOffset = ref(0)
let startY = 0

function startDrag(e) {
    isDragging.value = true
    startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY
    dragOffset.value = 0
}

function onDrag(e) {
    if (!isDragging.value) return
    const clientY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY
    const delta = clientY - startY
    
    // Only allow dragging down
    if (delta > 0) {
        dragOffset.value = delta
    }
}

function stopDrag() {
    if (!isDragging.value) return
    isDragging.value = false
    
    // Threshold to close (e.g., 100px)
    if (dragOffset.value > 100) {
        emit('close')
    } else {
        dragOffset.value = 0 // Reset
    }
}

// Global mouse up to catch dragging outside the handle
function onWindowMouseUp() {
    if (isDragging.value) stopDrag()
}

onMounted(() => {
  if (!props.absolute) {
      document.body.style.overflow = 'hidden' // Impede scroll no fundo apenas se for fixed global
  }
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('mouseup', onWindowMouseUp)
  window.addEventListener('touchend', stopDrag)
})

onUnmounted(() => {
  document.body.style.overflow = ''
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('mouseup', onWindowMouseUp)
  window.removeEventListener('touchend', stopDrag)
})
</script>

<template>
  <div 
    class="bottom-sheet-overlay" 
    :class="{ 'is-absolute': absolute }"
    @click.self="$emit('close')"
  >
    <transition name="slide-up" appear>
      <div 
        ref="panelRef"
        class="bottom-sheet-panel" 
        :class="{ 'panel-absolute': absolute, 'is-dragging': isDragging }"
        :style="{ transform: isDragging || dragOffset > 0 ? `translateY(${dragOffset}px)` : '' }"
      >
        <!-- Handle Bar (Visual Cue) -->
        <div 
            class="handle-bar-container" 
            @mousedown="startDrag"
            @touchstart="startDrag"
            @mousemove="onDrag"
            @touchmove="onDrag"
        >
            <div class="handle-bar"></div>
        </div>

        <header v-if="title || $slots.header" class="bottom-sheet-header">
          <div class="header-content">
             <slot name="header">
                 <h3 v-if="title" class="sheet-title">{{ title }}</h3>
             </slot>
          </div>
          <button v-if="showClose" @click="$emit('close')" class="close-btn" title="Fechar">
            <X :size="20" />
          </button>
        </header>

        <div class="bottom-sheet-body">
          <slot></slot>
        </div>
        
        <div v-if="$slots.footer" class="bottom-sheet-footer">
            <slot name="footer"></slot>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.bottom-sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 9999; /* Z-index altíssimo para ficar sobre modais */
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  animation: fadeIn 0.3s ease;
}

.bottom-sheet-overlay.is-absolute {
    position: absolute;
    z-index: 2000; /* Maior que o conteudo do drawer mas local */
    border-radius: inherit; /* Tenta herdar bordas se possível, ou ajustar manualmente */
}

/* Painel */
.bottom-sheet-panel {
  background-color: #fff;
  border-top-left-radius: 1.5rem;
  border-top-right-radius: 1.5rem;
  width: 100vw; /* Garante que ocupa a largura total no mobile */
  max-width: 100%; /* Evita overflow */
  margin: 0 auto; 
  display: flex;
  flex-direction: column;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  max-height: 85vh; /* Máximo 85% da altura da tela */
  position: relative;
  /* Smooth reset transition when not dragging */
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); 
}

.bottom-sheet-panel.is-dragging {
    transition: none; /* Disable transition while dragging for instant feedback */
}

.panel-absolute {
    width: 100%; /* No modo absoluto ocupa 100% do pai */
    max-width: none !important; /* Remove limites de max-width desktop */
    margin: 0;
}

/* Desktop */
@media (min-width: 768px) {
    .bottom-sheet-panel:not(.panel-absolute) {
        max-width: 500px; /* Limite largura no Desktop para ficar elegante apenas no modo fixed */
    }
    
    .bottom-sheet-overlay:not(.is-absolute) {
        align-items: center; /* Centralizar horizontalmente apenas no modo fixed */
    }
}

/* Handle Bar */
.handle-bar-container {
    width: 100%;
    display: flex;
    justify-content: center;
    padding-top: 0.75rem;
    padding-bottom: 0.5rem;
    cursor: grab;
    touch-action: none; /* Prevent scroll while dragging */
}

.handle-bar-container:active {
    cursor: grabbing;
}

.handle-bar {
    width: 40px;
    height: 4px;
    background-color: #e5e7eb;
    border-radius: 2px;
}

/* Header */
.bottom-sheet-header {
  padding: 0 1.5rem 1rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #f3f4f6;
}

.sheet-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  margin-right: -0.5rem;
  border-radius: 50%;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

/* Body */
.bottom-sheet-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}

/* Footer */
.bottom-sheet-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #f3f4f6;
    background: #fff;
}

/* Animations */
@keyframes fadeIn {
  from { background-color: rgba(0, 0, 0, 0); }
  to { background-color: rgba(0, 0, 0, 0.4); }
}

/* Vue Transition classes for slide-up */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}

.slide-up-enter-to,
.slide-up-leave-from {
  transform: translateY(0);
}
</style>
