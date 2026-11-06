<script setup>
import { nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps({
  open: Boolean,
  title: { type: String, required: true },
  wide: Boolean,
  busy: Boolean,
})
const emit = defineEmits(['close'])
const dialog = ref(null)
let previousFocus
watch(
  () => props.open,
  async (open) => {
    await nextTick()
    if (open) {
      previousFocus = document.activeElement
      dialog.value?.showModal?.()
    } else {
      dialog.value?.close?.()
      previousFocus?.focus?.()
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  dialog.value?.close?.()
  previousFocus?.focus?.()
})
function close() {
  if (!props.busy) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <dialog
      ref="dialog"
      class="gallery-dialog"
      :class="{ wide }"
      :aria-label="title"
      @cancel.prevent="close"
      @click="
        (event) => {
          if (event.target === dialog) close()
        }
      "
    >
      <header>
        <h2>{{ title }}</h2>
        <button type="button" aria-label="Fechar" :disabled="busy" @click="close">
          <X :size="20" />
        </button>
      </header>
      <div v-if="open" class="dialog-content"><slot /></div>
    </dialog>
  </Teleport>
</template>

<style scoped>
.gallery-dialog {
  width: min(460px, calc(100vw - 32px));
  max-height: calc(100dvh - 40px);
  margin: auto;
  padding: 0;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #fff;
  color: #1e293b;
  box-shadow: 0 24px 80px #0f172a30;
}
.gallery-dialog.wide {
  width: min(1100px, calc(100vw - 32px));
}
.gallery-dialog::backdrop {
  background: #0f172a88;
  backdrop-filter: blur(3px);
}
header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 18px 22px;
  border-bottom: 1px solid #e2e8f0;
}
h2 {
  margin: 0;
  font-size: 17px;
}
header button {
  border: 0;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 6px;
  cursor: pointer;
}
.dialog-content {
  padding: 22px;
}
:deep(button:focus-visible),
:deep(input:focus-visible),
:deep(select:focus-visible) {
  outline: 2px solid var(--azul-principal, #2563eb);
  outline-offset: 2px;
}
@media (max-width: 640px) {
  .dialog-content {
    padding: 14px;
  }
}
</style>
