<script setup>
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import artwork from '@/assets/lia/lia-animated.svg?raw'
import { createLiaAnimation } from './liaAnimation'

const props = defineProps({ thinking: Boolean, state: { type: String, default: 'attentive', validator: value => ['attentive', 'thinking', 'surprised', 'responding', 'success', 'error', 'idle'].includes(value) }, intro: Boolean, active: { type: Boolean, default: true } })
const currentState = computed(() => props.thinking ? 'thinking' : props.state)
const stage = ref(null)
const prefix = `lia-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
const svg = computed(() => artwork
  .replace(/data-l="([^"]+)"/g, (_, part) => `data-l="${part}" data-part="${part}"`)
  .replace(/id="([^"]+)"/g, (_, id) => `id="${prefix}-${id}" data-part="${id}"`)
  .replace(/url\(#([^\)]+)\)/g, (_, id) => `url(#${prefix}-${id})`)
  .replace(/href="#([^"]+)"/g, (_, id) => `href="#${prefix}-${id}"`))
let animation, motionQuery
function mountAnimation() {
  animation?.destroy()
  animation = createLiaAnimation(stage.value, { intro: props.intro, reducedMotion: Boolean(motionQuery?.matches), state: currentState.value })
  if (!props.active) animation.pause()
}
onMounted(() => {
  motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)')
  mountAnimation()
  motionQuery?.addEventListener('change', mountAnimation)
})
watch(currentState, value => animation?.setState(value))
watch(() => props.active, value => value ? animation?.play() : animation?.pause())
onBeforeUnmount(() => { animation?.destroy(); motionQuery?.removeEventListener('change', mountAnimation) })
</script>

<template><span ref="stage" class="lia-character" aria-hidden="true" v-html="svg"></span></template>

<style scoped>
.lia-character { display: inline-block; flex: 0 0 auto; width: 100%; aspect-ratio: 1; }
.lia-character :deep(svg) { display: block; width: 100%; height: 100%; overflow: visible; }
</style>
