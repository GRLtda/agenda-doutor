<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
const props = defineProps({ title: { type: String, required: true }, busy: Boolean, wide: Boolean })
const emit = defineEmits(['close'])
const dialog = ref(null)
let opener
onMounted(async () => {
  opener = document.activeElement
  dialog.value.showModal?.()
  if (!dialog.value.open) dialog.value.setAttribute('open', '')
  await nextTick()
  dialog.value?.querySelector('[autofocus]')?.focus()
})
onBeforeUnmount(() => { dialog.value?.close?.(); if (opener?.isConnected) opener.focus() })
function close() { if (!props.busy) emit('close') }
function onKey(event) {
  event.stopPropagation()
  if (event.key === 'Escape') { event.preventDefault(); close(); return }
  if (event.key !== 'Tab') return
  const nodes = [...dialog.value.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),[tabindex="0"]')]
  if (!nodes.length) { event.preventDefault(); return }
  if (event.shiftKey && event.target === nodes[0]) { event.preventDefault(); nodes.at(-1).focus() }
  else if (!event.shiftKey && event.target === nodes.at(-1)) { event.preventDefault(); nodes[0].focus() }
}
</script>
<template><dialog ref="dialog" class="lia-modal clarity-mask" :class="{ wide }" role="dialog" aria-modal="true" :aria-label="title" data-clarity-mask="true" data-sentry-mask @keydown="onKey" @cancel.prevent="close" @click.self="close"><slot /></dialog></template>
<style scoped>
.lia-modal { width: min(400px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); box-sizing: border-box; overflow: auto; margin: auto; padding: 24px; border: 1px solid var(--lia-line); border-radius: 18px; color: var(--lia-text); background: var(--lia-bg); box-shadow: 0 24px 80px #0005; font: inherit; }.wide { width: min(680px, calc(100vw - 32px)); padding: 0; }.lia-modal::backdrop { background: #05070bcc; backdrop-filter: blur(3px); }
@media(max-width:760px) { .lia-modal { max-height: calc(var(--lia-viewport-height, 100dvh) - 32px); } :deep(input),:deep(textarea),:deep(select) { font-size: 16px; } }
</style>
