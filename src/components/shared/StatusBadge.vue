<script setup lang="ts">
import { Badge } from '@/components/ui/badge'
import { useStatusBadge } from '@/composables/useStatusBadge'
import { computed } from 'vue'

const props = defineProps<{
  status: string
}>()

const badgeInfo = computed(() => useStatusBadge(props.status))
</script>

<template>
  <Badge 
    :class="badgeInfo.badgeClass" 
    :style="badgeInfo.badgeStyle"
    class="font-medium"
  >
    {{ badgeInfo.displayText }}
  </Badge>
</template>
