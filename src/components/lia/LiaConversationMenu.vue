<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { Pin, PinOff, SquarePen, Trash2 } from 'lucide-vue-next'
const props = defineProps({ anchor: { type: Object, required: true }, pinned: Boolean })
const emit = defineEmits(['close', 'rename', 'pin', 'delete'])
const menu = ref(null), position = ref({})
function closeOutside(event) { if (!menu.value?.contains(event.target) && !props.anchor.contains(event.target)) emit('close') }
onMounted(async () => {
  const rect = props.anchor.getBoundingClientRect()
  position.value = { left: `${Math.max(8, Math.min(rect.right - 188, window.innerWidth - 196))}px`, top: `${Math.max(8, Math.min(rect.bottom + 4, window.innerHeight - 150))}px` }
  await nextTick()
  if (!menu.value) return
  menu.value.showPopover?.(); menu.value.querySelector('button')?.focus()
  document.addEventListener('pointerdown', closeOutside, true)
})
onBeforeUnmount(() => { document.removeEventListener('pointerdown', closeOutside, true); menu.value?.hidePopover?.(); if (props.anchor.isConnected) props.anchor.focus() })
function onKey(event) {
  event.stopPropagation()
  if (event.key === 'Escape') { event.preventDefault(); emit('close') }
  if (event.key === 'Tab') emit('close')
  const buttons = [...menu.value.querySelectorAll('button')], index = buttons.indexOf(event.target)
  if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    event.preventDefault()
    buttons[event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus()
  }
}
</script>
<template><div ref="menu" class="conversation-menu" popover="manual" role="menu" aria-label="Opções da conversa" :style="position" @keydown="onKey"><button type="button" role="menuitem" @click="emit('rename')"><SquarePen :size="15" />Renomear</button><button type="button" role="menuitem" @click="emit('pin')"><PinOff v-if="pinned" :size="15" /><Pin v-else :size="15" />{{ pinned ? 'Desafixar' : 'Fixar conversa' }}</button><button type="button" role="menuitem" class="destructive" @click="emit('delete')"><Trash2 :size="15" />Excluir</button></div></template>
<style scoped>
.conversation-menu { position: fixed; inset: auto; z-index: 2; display: grid; width: 188px; box-sizing: border-box; margin: 0; padding: 5px; border: 1px solid var(--lia-line); border-radius: 12px; color: var(--lia-text); background: var(--lia-bg); box-shadow: 0 10px 36px #0003; }.conversation-menu:popover-open { display: grid; }button { display: flex; align-items: center; gap: 10px; min-height: 39px; padding: 10px; border: 0; border-radius: 8px; text-align: left; background: transparent; color: inherit; font: inherit; font-size: 12px; cursor: pointer; }button:hover,button:focus-visible { outline: none; background: var(--lia-soft); }.destructive { color: #d54a60; }
</style>
