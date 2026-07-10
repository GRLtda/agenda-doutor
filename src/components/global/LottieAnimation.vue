<script setup>
import { computed } from 'vue'
import { DotLottieVue } from '@lottiefiles/dotlottie-vue'

const animationFiles = import.meta.glob('../../assets/animations/*.{json,lottie}', {
  eager: true,
  import: 'default',
  query: '?url',
})

const props = defineProps({
  name: { type: String, default: '' },
  src: { type: String, default: '' },
  data: { type: [String, ArrayBuffer], default: undefined },
  autoplay: { type: Boolean, default: true },
  loop: { type: Boolean, default: false },
  speed: { type: Number, default: 1 },
  mode: { type: String, default: 'forward' },
  ariaLabel: { type: String, default: 'Animação' },
})

const resolvedSrc = computed(() => {
  if (props.src) return props.src
  if (!props.name) return undefined

  const fileName = props.name.includes('.') ? props.name : `${props.name}.json`
  const match = Object.entries(animationFiles).find(([path]) => path.endsWith(`/${fileName}`))

  return match?.[1]
})
</script>

<template>
  <DotLottieVue
    v-if="resolvedSrc || data"
    class="lottie-animation"
    :aria-label="ariaLabel"
    role="img"
    :autoplay="autoplay"
    :loop="loop"
    :speed="speed"
    :mode="mode"
    :src="resolvedSrc"
    :data="data"
    :render-config="{ devicePixelRatio: 2 }"
  />
</template>

<style scoped>
.lottie-animation {
  display: block;
  height: 100%;
  width: 100%;
}
</style>
