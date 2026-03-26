import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchKnowledgePageBySlug, fetchKnowledgeTree } from '@/api/knowledge-base'

export const useKnowledgeBaseStore = defineStore('knowledge-base', () => {
  const categories = ref([])
  const currentPage = ref(null)
  const isLoadingTree = ref(false)
  const isLoadingPage = ref(false)
  const error = ref(null)

  async function loadTree() {
    try {
      isLoadingTree.value = true
      error.value = null

      const response = await fetchKnowledgeTree()
      categories.value = response.data || []

      return { success: true, data: categories.value }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao carregar base de conhecimento.'
      categories.value = []
      return { success: false, error: error.value }
    } finally {
      isLoadingTree.value = false
    }
  }

  async function loadPageBySlug(slug) {
    try {
      isLoadingPage.value = true
      error.value = null

      const response = await fetchKnowledgePageBySlug(slug)
      currentPage.value = response.data || null

      return { success: true, data: currentPage.value }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao carregar a página.'
      currentPage.value = null
      return { success: false, error: error.value }
    } finally {
      isLoadingPage.value = false
    }
  }

  function clearPage() {
    currentPage.value = null
  }

  return {
    categories,
    currentPage,
    isLoadingTree,
    isLoadingPage,
    error,
    loadTree,
    loadPageBySlug,
    clearPage,
  }
})
