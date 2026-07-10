<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  }
})

const emit = defineEmits(['close'])

const isClosing = ref(false)
const isLeaving = ref(false)
const isCloseButtonVisible = ref(false)
const overlayPointerDown = ref(null)
const closeButtonEnterDelayMs = 320
const closeButtonExitMs = 160
const drawerCloseMs = 280
let closeButtonTimer = null
let closeSequenceTimer = null
let emitCloseTimer = null

const widthClass = computed(() => {
  return `size-${props.size}`
})

onMounted(() => {
  closeButtonTimer = window.setTimeout(() => {
    isCloseButtonVisible.value = true
  }, closeButtonEnterDelayMs)
})

onUnmounted(() => {
  window.clearTimeout(closeButtonTimer)
  window.clearTimeout(closeSequenceTimer)
  window.clearTimeout(emitCloseTimer)
})

function requestClose() {
  if (isClosing.value) return

  isCloseButtonVisible.value = false
  isClosing.value = true

  closeSequenceTimer = window.setTimeout(() => {
    isLeaving.value = true
  }, closeButtonExitMs)

  emitCloseTimer = window.setTimeout(() => {
    emit('close')
  }, closeButtonExitMs + drawerCloseMs)
}

function handleOverlayPointerDown(event) {
  if (event.target !== event.currentTarget) return

  overlayPointerDown.value = {
    x: event.clientX,
    y: event.clientY,
  }
}

function handleOverlayPointerUp(event) {
  if (event.target !== event.currentTarget || !overlayPointerDown.value) {
    overlayPointerDown.value = null
    return
  }

  const deltaX = Math.abs(event.clientX - overlayPointerDown.value.x)
  const deltaY = Math.abs(event.clientY - overlayPointerDown.value.y)

  overlayPointerDown.value = null

  if (deltaX > 6 || deltaY > 6) return

  requestClose()
}
</script>

<template>
  <Teleport to="body">
    <div
      class="drawer-overlay"
      :class="{ 'is-closing': isClosing, 'is-leaving': isLeaving }"
      @pointerdown="handleOverlayPointerDown"
      @pointerup="handleOverlayPointerUp"
    >
      <!-- Botão de fechar fora do drawer (Desktop) -->
      <button
        @click="requestClose"
        class="close-btn-outside"
        :class="[widthClass, { 'is-visible': isCloseButtonVisible }]"
        :disabled="!isCloseButtonVisible || isClosing"
      >
        <X :size="24" />
      </button>

      <div class="drawer-content" :class="widthClass">
        <!-- Header Slot -->
        <slot name="header" :close="requestClose"></slot>

        <!-- Body Slot -->
        <div class="drawer-body">
          <slot :close="requestClose"></slot>
        </div>

        <!-- Footer Slot -->
        <slot name="footer" :close="requestClose"></slot>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(2px);
  z-index: 7000;
  display: flex;
  justify-content: flex-end;
  padding: 0.5rem;
  box-sizing: border-box;
  animation: overlay-fade-in 0.24s ease-out both;
}

.drawer-overlay.is-leaving {
  animation: overlay-fade-out 0.28s ease-in both;
  pointer-events: none;
}

.drawer-overlay.is-leaving .drawer-content {
  animation: slide-out 0.28s cubic-bezier(0.4, 0, 1, 1) both;
}

.drawer-overlay.is-closing .close-btn-outside {
  opacity: 0;
  transform: translateX(18px) scale(0.86);
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.close-btn-outside {
  position: absolute;
  top: 1rem;
  /* right via class specific rules below */
  background: #fff;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  opacity: 0;
  pointer-events: none;
  transform: translateX(18px) scale(0.86);
  transition: color 0.2s, border-color 0.2s;
  z-index: 7010;
}

.close-btn-outside.is-visible {
  animation: close-button-enter 0.32s cubic-bezier(0.16, 1, 0.3, 1) both;
  pointer-events: auto;
}

.close-btn-outside:disabled {
  cursor: default;
}

.close-btn-outside.is-visible:hover {
  color: #111827;
  transform: scale(1.1);
}

/* Size positioning for close button */
.close-btn-outside.size-sm { right: 432px; }
.close-btn-outside.size-md { right: 512px; }
.close-btn-outside.size-lg { right: 632px; }
.close-btn-outside.size-xl { right: 832px; }

.drawer-content {
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1.3px solid #abb0b8;
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 7005;
  overflow: hidden;
}

/* Size widths */
.drawer-content.size-sm { max-width: 400px; }
.drawer-content.size-md { max-width: 480px; }
.drawer-content.size-lg { max-width: 600px; }
.drawer-content.size-xl { max-width: 800px; }

@keyframes slide-in {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes slide-out {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

@keyframes close-button-enter {
  from {
    opacity: 0;
    transform: translateX(18px) scale(0.86);
  }
  60% {
    opacity: 1;
    transform: translateX(-3px) scale(1.04);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes overlay-fade-in {
  from {
    background: rgba(0, 0, 0, 0);
    backdrop-filter: blur(0);
  }
  to {
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(2px);
  }
}

@keyframes overlay-fade-out {
  from {
    background: rgba(0, 0, 0, 0.3);
    backdrop-filter: blur(2px);
  }
  to {
    background: rgba(0, 0, 0, 0);
    backdrop-filter: blur(0);
  }
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* Mobile Responsiveness for Close Button */
@media (max-width: 768px) {
  .close-btn-outside {
    display: none;
  }
  .drawer-content {
    max-width: 100% !important; /* Force full width on mobile */
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  .drawer-body {
    padding: 1rem;
    gap: 0.875rem;
  }
}

/* Styles for close buttons inside slots (Header) */
:deep(.mobile-close-btn),
:deep(.close-btn-header) {
  display: none;
}

@media (max-width: 768px) {
  :deep(.mobile-close-btn),
  :deep(.close-btn-header) {
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    color: #6b7280;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 50%;
    transition: all 0.2s;
  }

  :deep(.mobile-close-btn:hover),
  :deep(.close-btn-header:hover) {
    background-color: #f3f4f6;
    color: #111827;
  }
}
</style>
