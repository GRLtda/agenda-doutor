<script setup lang="ts">
import { TooltipProvider, type TooltipProviderProps } from 'radix-vue'
import { computed } from 'vue'

const props = withDefaults(defineProps<TooltipProviderProps>(), {
  delayDuration: 200,
})

const forwarded = computed(() => props)
</script>

<template>
  <TooltipProvider v-bind="forwarded">
    <slot />
  </TooltipProvider>
</template>
