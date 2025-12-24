<template>
  <div class="app-table-list-container">
    <div v-if="!hideHeader" class="filters-header">
      <div v-if="$slots.filters" class="filters-content">
        <slot name="filters"></slot>
      </div>
      <div v-if="$slots['header-info']" class="header-info">
        <slot name="header-info"></slot>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      Carregando...
    </div>

    <div v-else-if="isEmpty" class="empty-state">
      <h3>{{ emptyTitle || 'Nenhum resultado encontrado' }}</h3>
      <p>{{ emptyMessage || 'Tente ajustar os filtros ou verifique mais tarde.' }}</p>
    </div>

    <div v-else class="list-wrapper">
      <div class="list-content">
        <slot></slot>
      </div>

      <AppPagination
        v-if="pagination && pagination.pages > 1"
        :current-page="pagination.page"
        :total-pages="pagination.pages"
        :total-items="pagination.total"
        :limit="pagination.limit"
        @page-change="$emit('page-change', $event)"
      />
    </div>
  </div>
</template>

<script setup>
import AppPagination from '@/components/global/AppPagination.vue'

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  isEmpty: {
    type: Boolean,
    default: false,
  },
  emptyTitle: {
    type: String,
    default: '',
  },
  emptyMessage: {
    type: String,
    default: '',
  },
  pagination: {
    type: Object,
    default: () => ({}),
  },
  hideHeader: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['page-change'])
</script>

<style scoped>
.app-table-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  overflow: hidden;
  background: white;
}

.filters-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.25rem;
  background-color: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  flex-shrink: 0;
}

.filters-content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  flex-grow: 1;
}

.loading-state,
.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  color: var(--cinza-texto, #6b7280);
  background-color: var(--branco, #ffffff);
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--preto, #1f2937);
  margin-bottom: 0.5rem;
}

.list-wrapper {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0;
  overflow: hidden;
}

.list-content {
  flex-grow: 1;
  overflow-y: auto;
  display: flex; /* Para permitir que o slot ocupe altura se necessário */
  flex-direction: column; 
}

/* Responsividade Básica */
@media (max-width: 768px) {
  .app-table-list-container {
    border: none;
    border-radius: 0;
    height: 100%;
    min-height: auto;
  }
  
  .filters-header {
    flex-direction: column;
    align-items: stretch;
    padding: 1rem;
    gap: 0.75rem;
  }
  
  .filters-content {
    flex-direction: column;
    width: 100%;
  }

  .header-info {
    width: 100%;
    justify-content: center; /* Centraliza info em mobile se desejar */
    display: flex;
  }

  :deep(.pagination-container) {
    border-radius: 0;
    border-left: none;
    border-right: none;
  }
}
</style>
