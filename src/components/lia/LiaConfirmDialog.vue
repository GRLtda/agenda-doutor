<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import { Trash2 } from 'lucide-vue-next'
const props = defineProps({ title: String, busy: Boolean, error: String })
const emit = defineEmits(['cancel', 'confirm'])
const dialog = ref(null), cancel = ref(null), id = useId()
let opener
onMounted(async () => {
  opener = document.activeElement
  dialog.value.showModal?.()
  if (!dialog.value.open) dialog.value.setAttribute('open', '')
  await nextTick(); cancel.value?.focus()
})
onBeforeUnmount(() => { dialog.value?.close?.(); if (opener?.isConnected) opener.focus() })
function dismiss() { if (!props.busy) emit('cancel') }
function onKey(event) {
  event.stopPropagation()
  if (event.key === 'Escape') { event.preventDefault(); dismiss() }
  if (event.key !== 'Tab') return
  const buttons = [...dialog.value.querySelectorAll('button:not(:disabled)')]
  if (!buttons.length) { event.preventDefault(); return }
  if (event.shiftKey && event.target === buttons[0]) { event.preventDefault(); buttons.at(-1).focus() }
  else if (!event.shiftKey && event.target === buttons.at(-1)) { event.preventDefault(); buttons[0].focus() }
}
</script>
<template>
  <dialog ref="dialog" class="lia-confirm clarity-mask" role="alertdialog" aria-modal="true" :aria-labelledby="`${id}-title`" :aria-describedby="`${id}-description`" data-clarity-mask="true" data-sentry-mask @cancel.prevent="dismiss" @keydown="onKey" @click.self="dismiss">
    <span class="delete-icon"><Trash2 :size="22" /></span><h2 :id="`${id}-title`">Excluir conversa?</h2>
    <p :id="`${id}-description`">A conversa <strong>{{ title || 'Nova conversa' }}</strong> será removida do seu histórico. Essa ação não pode ser desfeita.</p>
    <p v-if="error" class="dialog-error" role="alert">{{ error }}</p>
    <div class="dialog-actions"><button ref="cancel" type="button" :disabled="busy" @click="dismiss">Cancelar</button><button type="button" class="destructive" :disabled="busy" @click="emit('confirm')">{{ busy ? 'Excluindo…' : 'Excluir conversa' }}</button></div>
  </dialog>
</template>
<style scoped>
.lia-confirm { width: min(380px, calc(100vw - 40px)); max-height: calc(100dvh - 40px); overflow-y: auto; box-sizing: border-box; margin: auto; padding: 26px; border: 1px solid var(--lia-line); border-radius: 20px; color: var(--lia-text); background: var(--lia-bg); box-shadow: 0 24px 80px #0004; font: inherit; }
.lia-confirm::backdrop { background: #0f172a80; backdrop-filter: blur(4px); }.delete-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; color: #dc4d62; background: #dc4d6212; }
h2 { margin: 18px 0 10px; font-size: 19px; font-weight: 600; letter-spacing: -.4px; }p { margin: 0; font-size: 13px; line-height: 1.7; color: var(--lia-muted); overflow-wrap: anywhere; }strong { color: var(--lia-text); font-weight: 550; }.dialog-error { margin-top: 14px; color: #dc4d62; }.dialog-actions { display: flex; justify-content: flex-end; gap: 9px; margin-top: 26px; }
button { min-height: 38px; padding: 8px 13px; border: 1px solid var(--lia-line); border-radius: 10px; background: var(--lia-bg); color: var(--lia-text); cursor: pointer; font: inherit; font-size: 12px; }.destructive { border-color: #c43d51; color: white; background: #c43d51; }button:disabled { opacity: .5; cursor: default; }button:focus-visible { outline: 2px solid var(--lia-blue); outline-offset: 3px; }
</style>
