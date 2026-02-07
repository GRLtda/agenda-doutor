<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
  clickable?: boolean
}>()

defineEmits<{
  (e: 'click'): void
}>()
</script>

<template>
  <div 
    class="flex items-center justify-between p-4 bg-background border border-border/60 rounded-lg transition-all"
    :class="{ 
      'hover:shadow-sm hover:border-border cursor-pointer': clickable 
    }"
    @click="clickable && $emit('click')"
  >
    <div class="flex-1 min-w-0">
      <div class="flex items-center gap-2">
        <span class="font-medium text-foreground truncate">{{ title }}</span>
        <slot name="badges" />
      </div>
      <p v-if="subtitle" class="text-sm text-muted-foreground mt-0.5 truncate">
        {{ subtitle }}
      </p>
    </div>
    <div class="flex items-center gap-2 ml-4 shrink-0">
      <slot name="value" />
      <slot name="actions" />
    </div>
  </div>
</template>
