<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { computed } from 'vue'

const props = defineProps<{
  value: number
  originalValue?: number
  discountPercentage?: number
  currency?: string
}>()

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: props.currency || 'BRL',
  }).format(value)
}

const hasDiscount = computed(() => {
  return props.discountPercentage && props.discountPercentage > 0
})
</script>

<template>
  <div class="flex items-center gap-3">
    <Badge v-if="hasDiscount" variant="destructive" class="text-xs font-semibold">
      -{{ discountPercentage }}%
    </Badge>
    <div class="flex flex-col items-end">
      <span v-if="hasDiscount && originalValue" class="text-xs text-muted-foreground line-through">
        {{ formatCurrency(originalValue) }}
      </span>
      <span class="font-semibold text-emerald-600">
        {{ formatCurrency(value) }}
      </span>
    </div>
  </div>
</template>
