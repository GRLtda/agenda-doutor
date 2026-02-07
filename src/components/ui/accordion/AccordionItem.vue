<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import {
  AccordionItem,
  type AccordionItemProps,
  useForwardProps,
} from 'radix-vue'
import { cn } from '@/lib/utils'

const props = defineProps<AccordionItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props
  return delegated
})

const forwarded = useForwardProps(delegatedProps)
</script>

<template>
  <AccordionItem
    v-bind="forwarded"
    :class="cn('border-b', props.class)"
  >
    <slot />
  </AccordionItem>
</template>
