<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import { Input } from '@/components/ui/input'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <div class="relative max-w-xl mx-auto mb-12">
    <Search class="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
    <Input
      :model-value="modelValue"
      @update:model-value="(v) => emit('update:modelValue', v as string)"
      type="text"
      placeholder="Pesquisar..."
      class="pl-10 h-12 text-base rounded-2xl shadow-sm border-muted-foreground/20 focus-visible:ring-primary/20"
    />
  </div>
</template>
