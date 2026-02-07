<script setup lang="ts">
import { TooltipTrigger, type TooltipTriggerProps } from 'radix-vue'
import { computed } from 'vue'

const props = defineProps<TooltipTriggerProps>()

const forwarded = computed(() => props)
</script>

<template>
  <TooltipTrigger v-bind="forwarded">
    <slot />
  </TooltipTrigger>
</template>
