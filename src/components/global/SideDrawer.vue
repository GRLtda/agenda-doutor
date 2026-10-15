<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'
import { useMediaQuery } from '@vueuse/core'

const props = defineProps({
  secondaryOpen: { type: Boolean, default: false },
  secondaryLabel: { type: String, default: 'Painel secundário' },
  bodyClass: { type: String, default: '' },
  teleportTo: {
    type: [String, Object],
    default: 'body',
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  }
})

const emit = defineEmits(['close', 'close-secondary'])
const overlay = ref(null)
const secondary = ref(null)
const narrow = useMediaQuery('(max-width: 1099px)')
const secondaryLayout = ref(props.secondaryOpen)
const drawerGroup = ref(null)
const groupWidth = ref(0)
let groupObserver
const closePosition = computed(() => secondaryLayout.value ? { right: `min(calc(100% - 52px), ${groupWidth.value + 20}px)` } : undefined)
let opener, secondaryOpener
watch(() => props.secondaryOpen, async open => {
  if (open) { secondaryOpener = document.activeElement; secondaryLayout.value = true }
  await nextTick()
  if (open) secondary.value?.querySelector('button')?.focus()
  else if (!secondaryLayout.value) secondaryOpener?.focus?.()
})
function secondaryLeft() { secondaryLayout.value = false; nextTick(() => secondaryOpener?.focus?.()) }
function handleKey(event) {
  if (event.defaultPrevented || !overlay.value?.contains(event.target)) return
  if (event.key === 'Escape') {
    event.preventDefault(); event.stopPropagation()
    if (props.secondaryOpen) emit('close-secondary')
    else requestClose()
  }
  if (event.key === 'Tab') {
    const nodes = [...overlay.value.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]')].filter(el => el.getClientRects().length && !el.closest('[inert]'))
    const first = nodes[0], last = nodes.at(-1)
    if (event.shiftKey && event.target === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && event.target === last) { event.preventDefault(); first?.focus() }
  }
}

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
  groupObserver = new ResizeObserver(() => { groupWidth.value = drawerGroup.value?.getBoundingClientRect().width || 0 })
  groupObserver.observe(drawerGroup.value)
  opener = document.activeElement
  document.addEventListener('keydown', handleKey)
  nextTick(() => overlay.value?.focus())
  closeButtonTimer = window.setTimeout(() => {
    isCloseButtonVisible.value = true
  }, closeButtonEnterDelayMs)
})

onUnmounted(() => {
  groupObserver?.disconnect()
  document.removeEventListener('keydown', handleKey)
  opener?.focus?.()
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
  <Teleport :to="teleportTo">
    <div
      ref="overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Painel de detalhes"
      tabindex="-1"
      class="drawer-overlay"
      :class="{ 'is-closing': isClosing, 'is-leaving': isLeaving, 'has-secondary': secondaryOpen }"
      @pointerdown="handleOverlayPointerDown"
      @pointerup="handleOverlayPointerUp"
    >
      <!-- Botão de fechar fora do drawer (Desktop) -->
      <button
        @click="requestClose"
        class="close-btn-outside"
        aria-label="Fechar detalhes"
        :style="closePosition"
        :class="[widthClass, { 'is-visible': isCloseButtonVisible }]"
        :disabled="!isCloseButtonVisible || isClosing"
      >
        <X :size="24" />
      </button>

      <div ref="drawerGroup" class="drawer-group" :class="[widthClass, { 'with-secondary': secondaryLayout }]">
        <Transition name="secondary-slide" @after-leave="secondaryLeft"><aside v-if="secondaryOpen" ref="secondary" class="drawer-secondary" :aria-label="secondaryLabel"><slot name="secondary"></slot></aside></Transition>
      <div class="drawer-content" :class="widthClass" :inert="secondaryOpen && narrow">
        <!-- Header Slot -->
        <slot name="header" :close="requestClose"></slot>

        <!-- Body Slot -->
        <div class="drawer-body" :class="bodyClass">
          <slot :close="requestClose"></slot>
        </div>

        <!-- Footer Slot -->
        <slot name="footer" :close="requestClose"></slot>
      </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.drawer-group{display:contents}.drawer-group.with-secondary{display:flex;gap:0;padding:0;margin:0;height:100%;max-width:calc(100vw - 16px);isolation:isolate;position:relative}.with-secondary.size-md{width:1120px}.with-secondary.size-sm{width:1040px}.with-secondary.size-lg{width:1240px}.with-secondary.size-xl{width:1440px}.with-secondary .drawer-content{flex:0 0 480px;border-radius:0 18px 18px 0}.with-secondary.size-sm .drawer-content{flex-basis:400px}.with-secondary.size-lg .drawer-content{flex-basis:600px}.with-secondary.size-xl .drawer-content{flex-basis:800px}.drawer-secondary{width:640px;min-width:0;height:100%;display:flex;flex-direction:column;overflow:hidden;background:#f3f4f6;border:1.3px solid #abb0b8;border-right:0;border-radius:18px 0 0 18px;position:relative;z-index:-1}.secondary-slide-enter-active,.secondary-slide-leave-active{transition:transform 280ms ease,opacity 280ms ease}.secondary-slide-enter-from,.secondary-slide-leave-to{transform:translateX(100%);opacity:0}.drawer-overlay.is-leaving .drawer-group.with-secondary{animation:slide-out .28s cubic-bezier(.4,0,1,1) both}.drawer-overlay.is-leaving .with-secondary .drawer-content{animation:none}.with-secondary .drawer-content{animation:none}@media(max-width:1099px){.drawer-group.with-secondary{width:100%;max-width:640px}.with-secondary .drawer-content{display:none}.drawer-secondary{width:100%;border-right:1.3px solid #abb0b8;border-radius:18px}}@media(max-width:768px){.drawer-group.with-secondary{max-width:100%}.drawer-secondary{border-radius:0}}@media(prefers-reduced-motion:reduce){.secondary-slide-enter-active,.secondary-slide-leave-active{transition:none}.drawer-overlay,.drawer-content,.drawer-group{animation:none!important}}
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
  background: #ffffff;
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
.close-btn-outside.size-md { right: 500px; }
.close-btn-outside.size-lg { right: 632px; }
.close-btn-outside.size-xl { right: 832px; }

.drawer-content {
  width: 100%;
  height: 100%;
  background: #fff;
  border: 1.3px solid #abb0b8;
  border-radius: 18px;
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
.drawer-content :deep(.step-navigation-footer) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #f3f4f6;
  background: #fff;
}

.drawer-content :deep(.step-navigation-footer .footer-actions),
.drawer-content :deep(.step-navigation-footer .footer-actions-right) {
  display: contents;
}

.drawer-content :deep(.step-navigation-footer .app-button) {
  flex: 0 1 auto;
  min-width: 0;
}

.drawer-content :deep(.step-navigation-footer .footer-btn-return),
.drawer-content :deep(.step-navigation-footer .variant-primary) {
  margin-left: auto;
}

.drawer-content :deep(.step-navigation-footer .variant-primary .lucide-arrow-right) {
  color: #fff;
  stroke: currentColor;
}

@media (max-width: 768px) {
  .drawer-content :deep(.step-navigation-footer) {
    padding: 1rem;
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .close-btn-outside {
    display: none;
  }
  .drawer-content {
    max-width: 100% !important; /* Force full width on mobile */
    padding-top: env(safe-area-inset-top, 0px);
    padding-bottom: env(safe-area-inset-bottom, 0px);
    border-radius: 0rem;
    border: 0;
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

  .drawer-overlay {
    padding: 0rem !important;
  }


  :deep(.mobile-close-btn:hover),
  :deep(.close-btn-header:hover) {
    background-color: #f3f4f6;
    color: #111827;
  }
}
</style>
