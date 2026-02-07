<script setup lang="ts">
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { type Component } from 'vue'

interface TabItem {
  value: string
  label: string
  icon?: Component
}

defineProps<{
  modelValue: string
  items: TabItem[]
}>()

defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()
</script>

<template>
  <Tabs 
    :model-value="modelValue" 
    @update:model-value="$emit('update:modelValue', $event as string)"
    class="w-full"
  >
    <TabsList class="w-full justify-start h-auto p-1 bg-muted/50 rounded-lg overflow-x-auto flex-nowrap">
      <TabsTrigger
        v-for="tab in items"
        :key="tab.value"
        :value="tab.value"
        class="flex items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:text-brand rounded-md transition-all"
      >
        <component :is="tab.icon" v-if="tab.icon" class="h-4 w-4" />
        <span>{{ tab.label }}</span>
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>
