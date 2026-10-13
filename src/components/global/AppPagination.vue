<script setup>
import { computed, ref, watch } from 'vue'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-vue-next'

const props = defineProps({
  currentPage: { type: Number, required: true },
  totalPages: { type: Number, required: true },
  totalItems: { type: Number, required: true },
  limit: { type: Number, default: 10 },
})

const emit = defineEmits(['page-change'])
const pageDraft = ref(String(props.currentPage))
watch(() => props.currentPage, page => { pageDraft.value = String(page) })
function submitPage() {
  const number = Number(pageDraft.value)
  const page = pageDraft.value && Number.isFinite(number) ? Math.min(Math.max(Math.trunc(number), 1), Math.max(props.totalPages, 1)) : props.currentPage
  pageDraft.value = String(page)
  changePage(page)
}

const changePage = (page) => {
  if (page < 1 || page > props.totalPages || page === '...' || page === props.currentPage) {
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
  <nav class="pagination-container" aria-label="Paginação">
    <span class="summary-text">{{ summaryText }}</span>
    <div class="pagination-navigation">
      <button type="button" class="btn-nav" :disabled="isFirstPage" aria-label="Primeira página" title="Primeira página" @click="changePage(1)"><ChevronsLeft :size="16" /></button>
      <button type="button" class="btn-nav" :disabled="isFirstPage" aria-label="Página anterior" title="Página anterior" @click="changePage(currentPage - 1)"><ChevronLeft :size="16" /></button>
      <div class="page-numbers">
        <template v-for="(page, index) in pageNumbers" :key="index">
          <span v-if="page === '...'" class="dots" aria-hidden="true">…</span>
          <button v-else type="button" class="btn-page" :class="{ active: page === currentPage }" :aria-label="`Página ${page}`" :aria-current="page === currentPage ? 'page' : undefined" @click="changePage(page)">{{ page }}</button>
        </template>
      </div>
      <form class="page-jump mobile-jump" @submit.prevent="submitPage">
        <input v-model="pageDraft" type="text" inputmode="numeric" aria-label="Número da página" @input="pageDraft = pageDraft.replace(/\D/g, '')" @blur="submitPage" @keydown.enter.prevent="$event.target.blur()" />
        <span>/ {{ totalPages }}</span>
      </form>
      <button type="button" class="btn-nav" :disabled="isLastPage" aria-label="Próxima página" title="Próxima página" @click="changePage(currentPage + 1)"><ChevronRight :size="16" /></button>
      <button type="button" class="btn-nav" :disabled="isLastPage" aria-label="Última página" title="Última página" @click="changePage(totalPages)"><ChevronsRight :size="16" /></button>
    </div>
    <form class="page-jump desktop-jump" @submit.prevent="submitPage"><span>Página</span><input v-model="pageDraft" type="text" inputmode="numeric" aria-label="Número da página" @input="pageDraft = pageDraft.replace(/\D/g, '')" @blur="submitPage" @keydown.enter.prevent="$event.target.blur()" /><span>de {{ totalPages }}</span></form>
  </nav>
</template>

<style scoped>
.page-jump { position: relative; display: flex; align-items: center; gap: .375rem; color: #64748b; font-size: .75rem; }
.page-jump input { width: 42px; height: 30px; padding: 0 .25rem; border: 1px solid #dce1e7; border-radius: 6px; text-align: center; background: #fff; color: #334155; }
.mobile-jump { display: none; }
.page-jump input:focus-visible { outline: 2px solid var(--azul-principal, #0057ff); outline-offset: 2px; }
.pagination-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: .75rem 1rem;
  width: 100%;
  min-height: 64px;
  padding: .875rem 1.25rem;
  border-top: 1px solid #e5e7eb;
  background: #fff;
  box-sizing: border-box;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}
.summary-text, .page-summary { color: #64748b; font-size: .75rem; line-height: 1.5; }
.page-summary { white-space: nowrap; }
.page-summary strong { display: inline-flex; align-items: center; justify-content: center; min-width: 28px; height: 28px; margin: 0 .25rem; border: 1px solid #e5e7eb; border-radius: 6px; color: #334155; font-weight: 500; }
.pagination-navigation, .page-numbers { display: flex; align-items: center; gap: .375rem; }
.page-numbers { margin: 0 .375rem; }
.btn-nav, .btn-page { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; width: 30px; height: 30px; padding: 0; border: 1px solid transparent; border-radius: 7px; background: transparent; color: #475569; font-size: .75rem; font-weight: 500; cursor: pointer; transition: background-color 150ms, border-color 150ms, color 150ms; }
.btn-nav { border-color: #dce1e7; background: #fff; box-shadow: 0 1px 2px #0f172a05; }
.btn-nav:hover:not(:disabled), .btn-page:hover:not(.active) { background: #f1f5f9; border-color: #dce1e7; color: #0f172a; }
.btn-nav:disabled { color: #c0c6d0; background: #fafbfc; cursor: not-allowed; box-shadow: none; }
.btn-page.active { background: var(--azul-principal, #0057ff); border-color: var(--azul-principal, #0057ff); color: #fff; }
.btn-nav:focus-visible, .btn-page:focus-visible { outline: 2px solid var(--azul-principal, #0057ff); outline-offset: 2px; }
.dots { width: 24px; text-align: center; color: #94a3b8; }
.mobile-page { display: none; min-width: 68px; text-align: center; font-size: .8125rem; font-weight: 600; color: #334155; }
.mobile-page span { font-weight: 400; color: #64748b; }
@media (max-width: 1100px) { .page-summary { display: none; } }
@media (max-width: 768px) {
  .desktop-jump { display: none; }
  .mobile-jump { display: flex; }
  .pagination-container { justify-content: center; gap: .5rem; padding: .75rem 1rem; }
  .summary-text { width: 100%; text-align: center; }
  .page-numbers { display: none; }
  .mobile-page { display: inline-block; }
  .btn-nav { width: 32px; height: 32px; }
}
@media (prefers-reduced-motion: reduce) { .btn-nav, .btn-page { transition: none; } }
</style>
