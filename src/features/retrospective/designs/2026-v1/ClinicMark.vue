<script setup>
// Logo da clínica num círculo branco; sem logo, a inicial do nome.
import { computed, ref, watch } from 'vue'
import { initialOf } from './format'

const props = defineProps({
  name: { type: String, default: '' },
  logoUrl: { type: String, default: null },
  size: { type: Number, default: 32 },
  border: { type: String, default: 'transparent' },
  shadow: { type: String, default: '' },
})
const failed = ref(false)
watch(() => props.logoUrl, () => { failed.value = false })
const initial = computed(() => initialOf(props.name))
const style = computed(() => ({
  width: `${props.size}px`, height: `${props.size}px`,
  boxShadow: [`0 0 0 1px ${props.border}`, props.shadow].filter(Boolean).join(', '),
}))
</script>

<template>
  <div class="mark" :style="style">
    <img v-if="logoUrl && !failed" :src="logoUrl" alt="" crossorigin="anonymous" @error="failed = true" />
    <span v-else :style="{ fontSize: `${Math.round(size * 0.46)}px` }" aria-hidden="true">{{ initial }}</span>
  </div>
</template>

<style scoped>
.mark { flex: none; border-radius: 999px; background: #FFFFFF; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.mark img { width: 78%; height: 78%; object-fit: contain; display: block; }
.mark span { color: #0057FF; font-weight: 700; letter-spacing: -0.02em; line-height: 1; }
</style>
