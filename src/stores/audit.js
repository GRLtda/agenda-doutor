import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getAuditLogs } from '@/api/audit'

export const useAuditStore = defineStore('audit', () => {
  const logs = ref([])
  const pagination = ref({ page: 1, pages: 1, total: 0, limit: 20 })
  const displayOptions = ref({ entities: [] })
  const isLoading = ref(false)
  const error = ref(null)

  async function fetchLogs(params = { page: 1, limit: 20 }) {
    isLoading.value = true
    error.value = null
    try {
      const response = await getAuditLogs(params)
      logs.value = response.data.data
      displayOptions.value = response.data.displayOptions || { entities: [] }
      pagination.value = {
        total: response.data.total,
        page: response.data.page,
        pages: response.data.pages,
        limit: response.data.limit,
      }
      return { success: true }
    } catch (err) {
      error.value = 'Erro ao carregar auditoria.'
      console.error('Erro ao buscar logs de auditoria:', err)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  return {
    logs,
    pagination,
    displayOptions,
    isLoading,
    error,
    fetchLogs,
  }
})
