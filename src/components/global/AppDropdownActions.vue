<script>
import { shallowRef } from 'vue'

// Shared between rows and their desktop/mobile representations.
const activeMenu = shallowRef(null)
</script>

<script setup>
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import { MoreHorizontal } from 'lucide-vue-next'

const props = defineProps({
  disabled: { type: Boolean, default: false },
  menuWidth: { type: String, default: '180px' },
})
const menuId = Symbol('actions-menu')
const isOpen = computed(() => activeMenu.value === menuId)
const trigger = ref(null)
const panel = ref(null)
const panelStyle = ref({})

function close() {
  if (isOpen.value) activeMenu.value = null
}

function toggle() {
  if (!props.disabled) activeMenu.value = isOpen.value ? null : menuId
}

async function updatePosition() {
  await nextTick()
  if (!isOpen.value || !trigger.value || !panel.value) return
  const rect = trigger.value.getBoundingClientRect()
  if (!rect.width || rect.bottom < 0 || rect.top > window.innerHeight) return close()
  const { width, height } = panel.value.getBoundingClientRect()
  const openUp =
    window.innerHeight - rect.bottom < height + 8 && rect.top > window.innerHeight - rect.bottom
  panelStyle.value = {
    left: `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`,
    top: `${Math.max(8, Math.min(openUp ? rect.top - height - 4 : rect.bottom + 4, window.innerHeight - height - 8))}px`,
    visibility: 'visible',
  }
}

function handleOutside(event) {
  if (!trigger.value?.contains(event.target) && !panel.value?.contains(event.target)) close()
}

function handleKey(event) {
  if (event.key === 'Escape') {
    close()
    trigger.value?.focus()
  }
}

function removeListeners() {
  document.removeEventListener('click', handleOutside, true)
  document.removeEventListener('keydown', handleKey)
  window.removeEventListener('scroll', updatePosition, true)
  window.removeEventListener('resize', updatePosition)
}

watch(isOpen, (open) => {
  removeListeners()
  if (!open) return
  panelStyle.value = { visibility: 'hidden' }
  updatePosition()
  document.addEventListener('click', handleOutside, true)
  document.addEventListener('keydown', handleKey)
  window.addEventListener('scroll', updatePosition, true)
  window.addEventListener('resize', updatePosition)
})
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) close()
  },
)
onUnmounted(() => {
  close()
  removeListeners()
})
</script>

<template>
  <div class="actions-wrapper" @click.stop>
    <button
      ref="trigger"
      type="button"
      class="btn-icon"
      aria-label="Abrir ações"
      :aria-expanded="isOpen"
      :disabled="disabled"
      @click.stop="toggle"
    >
      <MoreHorizontal :size="20" />
    </button>
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="isOpen"
          ref="panel"
          class="actions-dropdown"
          :style="{ width: menuWidth, ...panelStyle }"
          @click.stop
        >
          <slot :close="close" />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.actions-wrapper {
  display: inline-block;
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
.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.actions-dropdown {
  position: fixed;
  background-color: var(--branco, #fff);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  box-shadow: 0 4px 10px rgb(0 0 0 / 10%);
  z-index: 10000;
  max-width: calc(100vw - 16px);
  max-height: calc(100vh - 16px);
  overflow-y: auto;
  padding: 0.5rem;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.actions-dropdown :deep(.dropdown-item) {
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
  text-align: left;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
}
.actions-dropdown :deep(.dropdown-item:hover:not(:disabled)) {
  background-color: #f3f4f6;
}
.actions-dropdown :deep(.dropdown-item:disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
.actions-dropdown :deep(.dropdown-item.delete),
.actions-dropdown :deep(.dropdown-item.delete-item) {
  color: #ef4444;
}
.actions-dropdown :deep(.dropdown-item.delete:hover:not(:disabled)),
.actions-dropdown :deep(.dropdown-item.delete-item:hover:not(:disabled)) {
  background-color: #fee2e2;
}
.actions-dropdown :deep(.dropdown-item.success) {
  color: #16a34a;
}
.actions-dropdown :deep(.dropdown-item.primary) {
  color: var(--azul-principal);
}
</style>
