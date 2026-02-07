<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { type Component } from 'vue'

defineProps<{
  icon?: Component
  title: string
  description?: string
  actionLabel?: string
}>()

defineEmits<{
  (e: 'action'): void
}>()
</script>

<template>
  <div class="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
    <div v-if="icon" class="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
      <component :is="icon" class="h-8 w-8 text-muted-foreground" />
    </div>
    <h3 class="text-lg font-semibold mb-1">{{ title }}</h3>
    <p v-if="description" class="text-muted-foreground max-w-sm mb-4">
      {{ description }}
    </p>
    <Button v-if="actionLabel" variant="outline" @click="$emit('action')">
      {{ actionLabel }}
    </Button>
    <slot name="action" />
  </div>
</template>
