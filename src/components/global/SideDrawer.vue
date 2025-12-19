<script setup>
import { computed } from 'vue' // Import computed
import { X } from 'lucide-vue-next'

const props = defineProps({
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'lg', 'xl'].includes(value)
  }
})

defineEmits(['close'])

const widthClass = computed(() => {
  return `size-${props.size}`
})
</script>

<template>
  <div class="drawer-overlay" @click.self="$emit('close')">
    <!-- Botão de fechar fora do drawer (Desktop) -->
    <button @click="$emit('close')" class="close-btn-outside" :class="widthClass">
      <X :size="24" />
    </button>

    <div class="drawer-content" :class="widthClass">
      <!-- Header Slot -->
      <slot name="header"></slot>

      <!-- Body Slot -->
      <div class="drawer-body">
        <slot></slot>
      </div>

      <!-- Footer Slot -->
      <slot name="footer"></slot>
    </div>
  </div>
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
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
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
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  transition: all 0.2s;
  z-index: 1010;
}
.close-btn-outside:hover {
  color: #111827;
  transform: scale(1.1);
}

/* Size positioning for close button */
.close-btn-outside.size-sm { right: 416px; }
.close-btn-outside.size-md { right: 496px; }
.close-btn-outside.size-lg { right: 616px; }
.close-btn-outside.size-xl { right: 816px; }

.drawer-content {
  width: 100%;
  height: 100%;
  background: #fff;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 1005;
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

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

/* Mobile Responsiveness for Close Button */
@media (max-width: 768px) {
  .close-btn-outside {
    display: none;
  }
  .drawer-content {
    max-width: 100% !important; /* Force full width on mobile */
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
