<template>
  <div class="actions-wrapper" v-click-outside="close" @click.stop>
    <button @click.stop="toggle" class="btn-icon">
      <MoreHorizontal :size="20" />
    </button>
    <Transition name="fade">
      <div v-if="isOpen" class="actions-dropdown">
        <slot :close="close"></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { MoreHorizontal } from 'lucide-vue-next'

const isOpen = ref(false)

function toggle() {
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}
</script>

<style scoped>
.actions-wrapper {
  position: relative;
  display: inline-block;
  z-index: 100;
}
.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--cinza-texto, #6b7280);
}
.btn-icon:hover {
  background-color: #f3f4f6;
}
.actions-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 0.5rem);
  background-color: var(--branco, #fff);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
  width: 140px;
  padding: 0.5rem;
}

@media (max-width: 768px) {
  .actions-dropdown {
    bottom: calc(100% + 5px);
    top: auto;
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}

:deep(.dropdown-item) {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem;
  border-radius: 0.5rem;
  width: 100%;
  background: none;
  border: none;
  cursor: pointer;
  text-decoration: none;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
}
:deep(.dropdown-item:hover) {
  background-color: #f3f4f6;
}
:deep(.dropdown-item.delete) {
  color: #ef4444;
}
:deep(.dropdown-item.delete:hover) {
  background-color: #fee2e2;
}
</style>
