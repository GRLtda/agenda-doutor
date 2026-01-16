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
      <span class="text-sm text-gray-600">{{ summaryText }}</span>
    </div>

    <div class="nav-desktop">
      <button
        @click="changePage(currentPage - 1)"
        :disabled="isFirstPage"
        class="btn-nav"
      >
        <ChevronLeft class="h-5 w-5" />
        <span>Anterior</span>
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
        <span>Próximo</span>
        <ChevronRight class="h-5 w-5" />
      </button>
    </div>

    <div class="empty-desktop"></div>

    <div class="nav-mobile">
      <button
        @click="changePage(currentPage - 1)"
        :disabled="isFirstPage"
        class="btn-nav"
      >
        <ChevronLeft class="h-5 w-5" />
      </button>

      <span class="mobile-summary text-sm text-gray-600">
        Página {{ currentPage }} / {{ totalPages }}
      </span>

      <button
        @click="changePage(currentPage + 1)"
        :disabled="isLastPage"
        class="btn-nav"
      >
        <ChevronRight class="h-5 w-5" />
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Container principal */
.pagination-container {
  display: flex;
  justify-content: space-between; /* 3 colunas: Esquerda, Centro, Direita */
  align-items: center;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--cinza-borda);
  background-color: var(--branco);
  width: 100%;
}

/* --- Layout Desktop (3 Colunas) --- */
.summary-desktop {
  display: flex;
  flex: 1;
  justify-content: flex-start; /* Alinha sumário à esquerda */
  color: var(--cinza-texto);
}

.nav-desktop {
  display: flex;
  flex: 1;
  justify-content: center; /* 🎯 Centraliza a navegação */
  align-items: center;
  gap: 0.5rem;
}

.empty-desktop {
  display: flex;
  flex: 1;
  /* Este slot fica vazio para balancear o flex: 1 do sumário */
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0.5rem; /* Espaço entre números e botões de navegação */
}

/* --- Navegação Mobile --- */
.nav-mobile {
  display: none; /* Escondido no Desktop */
  width: 100%;
  justify-content: space-between;
  align-items: center;
}

.mobile-summary {
  color: var(--cinza-texto);
  font-weight: 500;
}

/* --- Estilos Gerais de Botões --- */
.btn-nav,
.btn-page {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--cinza-borda);
  border-radius: 0.375rem;
  /* Botões ficam brancos para contrastar com o novo fundo */
  background-color: var(--branco);
  color: var(--cinza-texto-escuro);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}
.btn-nav {
  padding: 0.5rem 1rem;
  gap: 0.25rem; /* Espaço entre ícone e texto */
}
.btn-page {
  width: 36px;
  height: 36px;
}
.btn-nav:hover,
.btn-page:hover {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}
.btn-nav:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-page.active {
  background-color: var(--azul-principal);
  color: var(--branco);
  border-color: var(--azul-principal);
}
.dots {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--cinza-texto);
}

/* ✨ INÍCIO DOS ESTILOS RESPONSIVOS ✨ */
@media (max-width: 768px) {
  .pagination-container {
    padding: 1rem; /* Menor padding no mobile */
    /* A cor de fundo #f9fafb é herdada */
  }

  /* Esconde os elementos de desktop */
  .summary-desktop,
  .nav-desktop,
  .empty-desktop {
    display: none;
  }

  /* Mostra a navegação mobile */
  .nav-mobile {
    display: flex;
  }
}
</style>
