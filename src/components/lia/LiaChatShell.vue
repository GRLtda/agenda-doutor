<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useMediaQuery, useScrollLock } from '@vueuse/core'

const props = defineProps({ open: Boolean, expanded: Boolean })
const emit = defineEmits(['close'])
const panel = ref(null)
const mobile = useMediaQuery('(max-width: 760px), (max-height: 500px) and (pointer: coarse)')
const viewportHeight = ref(window.visualViewport?.height || window.innerHeight)
const viewportTop = ref(window.visualViewport?.offsetTop || 0)
function updateViewport() {
  if (window.visualViewport && window.visualViewport.scale !== 1) return
  viewportHeight.value = window.visualViewport?.height || window.innerHeight
  viewportTop.value = window.visualViewport?.offsetTop || 0
}
onMounted(() => {
  window.addEventListener('resize', updateViewport)
  window.visualViewport?.addEventListener('resize', updateViewport)
  window.visualViewport?.addEventListener('scroll', updateViewport)
})
const locked = useScrollLock(document.body)
let opener
watch(() => [props.open, props.expanded, mobile.value], async ([open, expanded, isMobile], previous) => {
  locked.value = open && (expanded || isMobile)
  if (open && !previous?.[0]) {
    opener = document.activeElement
    await nextTick()
    panel.value?.focus()
  } else if (!open && previous?.[0]) opener?.focus?.()
}, { immediate: true })
function onKey(event) {
  if (event.defaultPrevented) return
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); return }
  if (event.key !== 'Tab' || !(props.expanded || mobile.value)) return
  const nodes = [...panel.value.querySelectorAll('button:not(:disabled),textarea:not(:disabled),input:not(:disabled),[tabindex="0"]')].filter(node => node.getClientRects().length)
  const first = nodes[0], last = nodes.at(-1)
  if (event.shiftKey && (event.target === first || event.target === panel.value)) { event.preventDefault(); last?.focus() }
  else if (!event.shiftKey && (event.target === last || event.target === panel.value)) { event.preventDefault(); first?.focus() }
}
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
  window.visualViewport?.removeEventListener('resize', updateViewport)
  window.visualViewport?.removeEventListener('scroll', updateViewport)
  locked.value = false; opener?.focus?.()
})
</script>

<template>
  <Teleport to="body">
    <Transition name="lia-window">
      <div v-if="open" class="lia-workspace" :class="{ expanded: expanded || mobile, mobile }" :style="mobile ? { '--lia-viewport-height': `${viewportHeight}px`, height: `${viewportHeight}px`, top: `${viewportTop}px` } : undefined">
        <div v-if="expanded && !mobile" class="lia-backdrop" @click.self="emit('close')"></div>
        <section ref="panel" class="lia-window" role="dialog" :aria-modal="expanded || mobile ? 'true' : 'false'" aria-label="Lia, assistente da clínica" tabindex="-1" @keydown="onKey">
          <slot></slot>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.lia-workspace { --lia-surface: var(--card, #fff); --lia-bg: var(--background, #fff); --lia-text: var(--foreground, #1c2738); --lia-muted: var(--muted-foreground, #737c8d); --lia-line: var(--border, #e7eaf0); --lia-soft: var(--muted, #f5f6f9); --lia-blue: var(--azul-principal, #0057ff); --lia-tint: color-mix(in srgb, var(--lia-blue) 7%, var(--lia-surface)); position: fixed; z-index: 5900; right: 22px; bottom: 22px; width: min(440px, calc(100vw - 44px)); height: min(740px, calc(100dvh - 44px)); color: var(--lia-text); font-family: var(--fonte-principal, 'DM Sans', sans-serif); }
.lia-window { position: relative; display: flex; flex-direction: column; width: 100%; height: 100%; overflow: hidden; border: 1px solid var(--lia-line); border-radius: 24px; outline: none; background: var(--lia-bg); box-shadow: 0 24px 80px #14233d24, 0 2px 12px #14233d0a; }
.expanded { inset: 0; display: grid; place-items: center; width: auto; height: auto; padding: clamp(16px, 3vw, 40px); }
.lia-backdrop { position: absolute; inset: 0; background: #0f172a57; backdrop-filter: blur(5px); }
.expanded .lia-window { width: min(1120px, 100%); height: min(84dvh, 850px); box-shadow: 0 30px 90px #0f172a40; }
.lia-window-enter-active, .lia-window-leave-active { transition: opacity .18s ease, transform .22s ease; }
.lia-window-enter-from, .lia-window-leave-to { opacity: 0; transform: translateY(12px) scale(.98); }
@media(max-width: 760px), (max-height: 500px) and (pointer: coarse) { .lia-workspace { inset: 0; width: 100%; height: 100dvh; padding: 0; } .lia-window, .expanded .lia-window { width: 100%; height: 100%; border: 0; border-radius: 0; box-shadow: none; } :deep(.lia-header) { padding-top: calc(7px + env(safe-area-inset-top)); padding-left: calc(12px + env(safe-area-inset-left)); padding-right: calc(12px + env(safe-area-inset-right)); } :deep(input),:deep(textarea),:deep(select),:deep([contenteditable=true]) { font-size: 16px !important; } }
@media(prefers-reduced-motion: reduce) { .lia-window-enter-active, .lia-window-leave-active { transition: none; } }
</style>
