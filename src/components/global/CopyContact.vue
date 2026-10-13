<script setup>
import { ref, onUnmounted } from 'vue'
import { PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent } from 'reka-ui'
const props = defineProps({ value: { type: String, required: true }, label: { type: String, required: true }, message: { type: String, required: true } })
const open = ref(false)
const feedback = ref('')
let timer
let active = true
async function copy() {
  if (window.matchMedia('(max-width: 768px)').matches) return
  clearTimeout(timer)
  try {
    await navigator.clipboard.writeText(props.value)
    feedback.value = props.message
  } catch { feedback.value = 'Não foi possível copiar.' }
  if (!active) return
  open.value = true
  timer = setTimeout(() => { open.value = false }, 1800)
}
onUnmounted(() => { active = false; clearTimeout(timer) })
</script>
<template>
  <PopoverRoot v-model:open="open">
    <PopoverTrigger as-child @click.prevent>
      <button type="button" class="copy-contact" :aria-label="label" @click.stop="copy"><slot /></button>
    </PopoverTrigger>
    <PopoverPortal><PopoverContent as-child side="top" :side-offset="8" @open-auto-focus.prevent @close-auto-focus.prevent><div class="copy-feedback"><span role="status">{{ feedback }}</span></div></PopoverContent></PopoverPortal>
  </PopoverRoot>
</template>
<style scoped>
.copy-contact { display: inline-flex; align-items: center; max-width: 100%; text-align: left; padding: 0; border: 0; background: none; color: inherit; font: inherit; cursor: default; }
.copy-contact:hover { color: var(--azul-principal, #0057ff); }
.copy-contact:focus-visible { outline: 2px solid var(--azul-principal, #0057ff); outline-offset: 3px; border-radius: 3px; }
.copy-feedback { position: relative; z-index: 50010; padding: .45rem .6rem; border: 1px solid #e5e7eb; border-radius: 6px; background: #fff; color: #374151; font-size: .75rem; font-weight: 600; line-height: 1.35; white-space: nowrap; box-shadow: 0 10px 25px rgba(15, 23, 42, .18); }
.copy-feedback::after { content: ''; position: absolute; left: 50%; top: 100%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #fff; }
.copy-feedback[data-side='bottom']::after { top: auto; bottom: 100%; border-top-color: transparent; border-bottom-color: #fff; }
</style>
