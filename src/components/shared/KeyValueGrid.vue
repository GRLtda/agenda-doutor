<script setup lang="ts">
export interface KeyValueItem {
  label: string
  value: string | number | null | undefined
}

defineProps<{
  items: KeyValueItem[]
  columns?: 2 | 3 | 4
}>()

function displayValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'Não informado'
  }
  return String(value)
}
</script>

<template>
  <div 
    class="grid gap-x-6 gap-y-4"
    :class="{
      'grid-cols-1 sm:grid-cols-2': columns === 2 || !columns,
      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3': columns === 3,
      'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4': columns === 4,
    }"
  >
    <div v-for="item in items" :key="item.label" class="space-y-1">
      <dt class="text-xs uppercase text-muted-foreground tracking-wide">{{ item.label }}</dt>
      <dd class="text-sm font-medium text-foreground">
        <slot :name="item.label" :value="item.value">
          {{ displayValue(item.value) }}
        </slot>
      </dd>
    </div>
  </div>
</template>
