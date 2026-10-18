<script setup>
import AppEmptyState from '@/components/global/AppEmptyState.vue'
import illustration from '@/assets/illustrations/stock-dashboard-empty.svg?raw'
defineProps({ title: { type: String, required: true }, text: { type: String, required: true } })
</script>

<template>
  <AppEmptyState class="stock-empty" :title="title" :text="text">
    <template #illustration><div class="stock-empty-art" aria-hidden="true" v-html="illustration" /></template>
  </AppEmptyState>
</template>

<style scoped>
.stock-empty { display: flex; align-items: center; justify-content: center; flex: 1; min-height: 205px; padding: 24px 18px; }
.stock-empty-art { width: 88px; max-width: 100%; margin: 0 auto; }
.stock-empty-art :deep(svg) { display: block; width: 100%; height: auto; }
.stock-empty :deep(.empty-state-title) { font-size: 13px; font-weight: 500; color: #64748b; margin: 8px 0 5px; }
.stock-empty :deep(.empty-state-text) { font-size: 12px; font-weight: 400; line-height: 1.5; color: #64748b; margin: 0; max-width: 285px; }
</style>
