<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const props = defineProps<{
  title?: string
  description?: string
  noPadding?: boolean
  accent?: boolean
  class?: HTMLAttributes['class']
}>()

const cardClasses = computed(() => cn(
  'border-border/60 shadow-sm',
  props.accent && 'card-brand-accent',
  props.class
))
</script>

<template>
  <Card :class="cardClasses">
    <CardHeader v-if="title || $slots.header" class="pb-4">
      <slot name="header">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <slot name="icon" />
            <div>
              <CardTitle v-if="title" class="text-lg font-semibold">{{ title }}</CardTitle>
              <CardDescription v-if="description" class="mt-1">{{ description }}</CardDescription>
            </div>
          </div>
          <div v-if="$slots.actions" class="flex items-center gap-2">
            <slot name="actions" />
          </div>
        </div>
      </slot>
    </CardHeader>
    <CardContent :class="{ 'p-0': noPadding, 'pt-0': title || $slots.header }">
      <slot />
    </CardContent>
  </Card>
</template>
