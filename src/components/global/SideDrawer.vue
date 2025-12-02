<script setup>
import { X } from 'lucide-vue-next'

defineEmits(['close'])
</script>

<template>
  <div class="drawer-overlay" @click.self="$emit('close')">
    <!-- Botão de fechar fora do drawer (Desktop) -->
    <button @click="$emit('close')" class="close-btn-outside">
      <X :size="24" />
    </button>

    <div class="drawer-content">
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
  right: 496px; /* 480px (width) + 16px (gap) */
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

.drawer-content {
  width: 100%;
  max-width: 480px;
  height: 100%;
  background: #fff;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  animation: slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  z-index: 1005;
}

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
    max-width: 100%;
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
