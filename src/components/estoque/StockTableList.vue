<script setup>
import { computed } from 'vue'
import AppTableList from '@/components/global/AppTableList.vue'
import AppSkeleton from '@/components/global/AppSkeleton.vue'
import AppButton from '@/components/global/AppButton.vue'
import StockDashboardEmpty from './StockDashboardEmpty.vue'

const props = defineProps({
  loading: Boolean,
  error: { type: String, default: '' },
  empty: Boolean,
  emptyTitle: { type: String, required: true },
  emptyText: { type: String, required: true },
  columns: { type: Number, default: 6 },
  page: { type: Number, default: 1 },
  meta: { type: Object, default: () => ({}) },
  limit: { type: Number, default: 20 },
})
defineEmits(['retry', 'page-change'])
const pagination = computed(() => ({
  page: props.page,
  pages: props.meta.totalPages || 1,
  total: props.meta.total || 0,
  limit: props.limit,
}))
</script>

<template>
  <AppTableList class="stock-table-list" :pagination="loading || error ? null : pagination" @page-change="$emit('page-change', $event)">
    <template #filters><slot name="filters" /></template>
    <div v-if="loading" class="stock-loading" role="status" aria-label="Carregando registros">
      <div v-for="row in 6" :key="row" class="stock-skeleton-row" :style="{ '--columns': columns }">
        <AppSkeleton v-for="column in columns" :key="column" height="1rem" />
      </div>
    </div>
    <div v-else-if="error" class="stock-error" role="alert">
      <p>{{ error }}</p>
      <AppButton variant="outline" @click="$emit('retry')">Tentar novamente</AppButton>
    </div>
    <StockDashboardEmpty v-else-if="empty" :title="emptyTitle" :text="emptyText" />
    <slot v-else />
  </AppTableList>
</template>

<style scoped>
.stock-table-list { flex: 1; height: auto; min-height: 0; min-width: 0; }
.stock-table-list :deep(.filters-header) { background: #fff; padding: 1rem 1.25rem; }
.stock-table-list :deep(.list-content) { min-height: 0; overflow: auto; }
.stock-table-list :deep(.pagination-container) { flex-shrink: 0; }
.stock-table-list :deep(.filtros-bar) { width: 100%; margin: 0; align-items: center; }
.stock-table-list :deep(.table-container) { overflow: visible; }
.stock-table-list :deep(table) { width: 100%; border-collapse: collapse; }
.stock-table-list :deep(th), .stock-table-list :deep(td) { padding: 1rem 1.25rem; text-align: left; border-bottom: 1px solid #e5e7eb; vertical-align: middle; white-space: nowrap; font-size: .875rem; }
.stock-table-list :deep(thead th) { position: sticky; top: 0; z-index: 1; height: 44px; padding-top: 0; padding-bottom: 0; background: #f5f6f8; color: #64748b; font-size: .75rem; font-weight: 500; text-transform: none; letter-spacing: .01em; box-shadow: inset 0 -1px #e5e7eb; border-bottom: 0; }
.stock-table-list :deep(tbody tr:last-child td) { border-bottom: none; }
.stock-table-list :deep(tbody tr:hover td) { background: #f0f4fc; }
.stock-table-list :deep(.actions-cell), .stock-table-list :deep(.actions-cel), .stock-table-list :deep(.actions-header) { text-align: right; }
.stock-table-list :deep(.actions-row) { justify-content: flex-end; }
.stock-table-list :deep(.mobile-grid) { display: flex; flex-direction: column; gap: .75rem; padding: 0; }
.stock-table-list :deep(.produto-card), .stock-table-list :deep(.lote-card), .stock-table-list :deep(.mov-card) { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; box-shadow: none; transform: none; }
.stock-table-list :deep(.nome), .stock-table-list :deep(.lote-num), .stock-table-list :deep(.produto-nome-mb) { font-weight: 600; }
.stock-table-list :deep(.txt-gray), .stock-table-list :deep(.fabricante) { color: #64748b; }
.stock-table-list :deep(.search-input) { height: 44px; padding-top: 0; padding-bottom: 0; border: 1px solid #d1d5db; box-shadow: 0 1px 2px rgba(15, 23, 42, .04); font-weight: 400; }
.stock-table-list :deep(.select-prefix) { display: inline-flex; align-items: center; gap: .35rem; color: #64748b; font-size: .8125rem; font-weight: 600; white-space: nowrap; }
.stock-loading { flex: 1; }
.stock-skeleton-row { display: grid; grid-template-columns: repeat(var(--columns), minmax(0, 1fr)); gap: 2rem; padding: 1.25rem; border-bottom: 1px solid #e5e7eb; }
.stock-error { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 2rem; text-align: center; color: #64748b; }
@media (max-width: 768px) {
  .stock-table-list { background: transparent; }
  .stock-table-list :deep(.filters-header) { background: transparent; padding: 0 0 .75rem; border: 0; }
  .stock-table-list :deep(.filtros-bar) { flex-direction: column; align-items: stretch; gap: .5rem; }
  .stock-table-list :deep(.filtros-bar > div) { width: 100% !important; min-width: 0; }
  .stock-table-list :deep(.mobile-list) { display: flex; flex-direction: column; gap: .75rem; padding: 2px 8px 2px 2px; }
  .stock-table-list :deep(.list-content) { scrollbar-gutter: stable; }
  .stock-table-list :deep(.pagination-container) { background: transparent; padding: .5rem 0 0; min-height: 44px; border: 0; }
  .stock-table-list :deep(.summary-text), .stock-table-list :deep([aria-label='Primeira página']), .stock-table-list :deep([aria-label='Última página']) { display: none; }
  .stock-skeleton-row { grid-template-columns: 1fr 1fr; gap: .75rem; padding: 1rem; margin-bottom: .75rem; border: 1px solid #e5e7eb; border-radius: 12px; }
}
</style>
