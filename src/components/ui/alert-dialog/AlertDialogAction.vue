<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { AlertDialogAction, type AlertDialogActionProps } from 'radix-vue'
import { cn } from '@/lib/utils'
import { buttonVariants, type ButtonVariants } from '@/components/ui/button'

interface Props extends AlertDialogActionProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()

const delegatedProps = computed(() => {
  const { class: _, variant, size, ...delegated } = props
  return delegated
})
</script>

<template>
  <AlertDialogAction v-bind="delegatedProps" :class="cn(buttonVariants({ variant, size }), props.class)">
    <slot />
  </AlertDialogAction>
</template>
