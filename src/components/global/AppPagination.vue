<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  limit: { type: Number, default: 10 },
})

const emit = defineEmits(['page-change'])

const changePage = (page) => {
  if (page < 1 || page > props.totalPages || page === '...') {
    return
  }
  emit('page-change', page)
}

const pageNumbers = computed(() => {
  if (props.totalPages <= 7) {
    return Array.from({ length: props.totalPages }, (_, i) => i + 1)
  }

  const pages = new Set()
  pages.add(1)
  pages.add(props.totalPages)

  for (let i = -1; i <= 1; i++) {
    const page = props.currentPage + i
    if (page > 1 && page < props.totalPages) {
      pages.add(page)
    }
  }

  const sortedPages = Array.from(pages).sort((a, b) => a - b)
  const result = []
  for (let i = 0; i < sortedPages.length; i++) {
    result.push(sortedPages[i])
    if (i < sortedPages.length - 1 && sortedPages[i + 1] > sortedPages[i] + 1) {
      result.push('...')
    }
  }
  return result
})

const fromItem = computed(() => (props.currentPage - 1) * props.limit + 1)
const toItem = computed(() => Math.min(props.currentPage * props.limit, props.totalItems))

const isFirstPage = computed(() => props.currentPage === 1)
const isLastPage = computed(() => props.currentPage === props.totalPages)

const summaryText = computed(() => {
  if (props.totalItems === 0) {
    return 'Nenhum item encontrado'
  }
  if (props.totalItems === 1) {
    return 'Mostrando 1 resultado'
  }
  return `Mostrando ${fromItem.value} - ${toItem.value} de ${props.totalItems} resultados`
})
</script>

<template>
  <div class="pagination-container">
    <div class="summary-desktop">
      <span class="summary-text">{{ summaryText }}</span>
    </div>

    <div class="nav-desktop">
      <button
        @click="changePage(currentPage - 1)"
        :disabled="isFirstPage"
        class="btn-nav"
      >
        <ChevronLeft class="h-4 w-4 shrink-0" />
        <span class="hidden sm:inline">Anterior</span>
      </button>

      <div class="page-numbers">
        <template v-for="(page, index) in pageNumbers" :key="index">
          <span v-if="page === '...'" class="dots">...</span>
          <button
            v-else
            @click="changePage(page)"
            :class="['btn-page', { active: page === currentPage }]"
          >
            {{ page }}
          </button>
        </template>
      </div>

      <button
        @click="changePage(currentPage + 1)"
        :disabled="isLastPage"
        class="btn-nav"
      >
        <span class="hidden sm:inline">Próximo</span>
        <ChevronRight class="h-4 w-4 shrink-0" />
      </button>
    </div>

    <div class="nav-mobile">
      <button
        @click="changePage(currentPage - 1)"
        :disabled="isFirstPage"
        class="btn-nav"
      >
        <ChevronLeft class="h-4 w-4" />
      </button>

      <span class="mobile-summary">
        Página {{ currentPage }} / {{ totalPages }}
      </span>

      <button
        @click="changePage(currentPage + 1)"
        :disabled="isLastPage"
        class="btn-nav"
      >
        <ChevronRight class="h-4 w-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Container principal */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.25rem;
  background-color: transparent;
  width: 100%;
  border-top: none; /* Remove border to clean up layout inside cards */
}

/* --- Layout Desktop --- */
.summary-desktop {
  display: flex;
  align-items: center;
  color: var(--cinza-texto);
}

.summary-text {
  font-size: 0.82rem;
  color: #64748b;
  white-space: nowrap;
}

.nav-desktop {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin: 0 0.5rem;
}

/* --- Navegação Mobile --- */
.nav-mobile {
  display: none;
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.mobile-summary {
  color: #64748b;
  font-weight: 500;
  font-size: 0.8rem;
}

/* --- Estilos Gerais de Botões --- */
.btn-nav,
.btn-page {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 0.375rem;
  background-color: transparent;
  color: #475569;
  font-weight: 500;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-nav {
  padding: 0.3rem 0.5rem;
  gap: 0.25rem;
}

.btn-page {
  width: 28px;
  height: 28px;
}

.btn-nav:hover:not(:disabled),
.btn-page:hover:not(.active) {
  background-color: #f1f5f9;
  color: #0f172a;
}

.btn-nav:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.btn-page.active {
  background-color: var(--azul-principal, #3b82f6);
  color: #ffffff;
  border-color: var(--azul-principal, #3b82f6);
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.2);
}

.dots {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 28px;
  color: #94a3b8;
  font-size: 0.85rem;
}

/* ✨ INÍCIO DOS ESTILOS RESPONSIVOS ✨ */
@media (max-width: 768px) {
  .pagination-container {
    padding: 0.5rem 0;
  }

  .summary-desktop,
  .nav-desktop {
    display: none;
  }

  .nav-mobile {
    display: flex;
  }
}
</style>
