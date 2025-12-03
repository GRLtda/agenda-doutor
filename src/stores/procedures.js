// stores/procedures.js

import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as proceduresApi from '@/api/procedures'

export const useProceduresStore = defineStore('procedures', () => {
  const procedures = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  /**
   * Busca todos os procedimentos
   */
  async function fetchProcedures() {
    isLoading.value = true
    error.value = null
    try {
      const response = await proceduresApi.getProcedures()
      procedures.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao carregar procedimentos'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Cria um novo procedimento
   */
  async function createProcedure(procedureData) {
    isLoading.value = true
    error.value = null
    try {
      const response = await proceduresApi.createProcedure(procedureData)
      procedures.value.push(response.data)
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar procedimento'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Atualiza um procedimento existente
   */
  async function updateProcedure(procedureId, procedureData) {
    isLoading.value = true
    error.value = null
    try {
      const response = await proceduresApi.updateProcedure(procedureId, procedureData)
      const index = procedures.value.findIndex((p) => p._id === procedureId)
      if (index !== -1) {
        procedures.value[index] = response.data
      }
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar procedimento'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  /**
   * Remove um procedimento
   */
  async function deleteProcedure(procedureId) {
    isLoading.value = true
    error.value = null
    try {
      await proceduresApi.deleteProcedure(procedureId)
      procedures.value = procedures.value.filter((p) => p._id !== procedureId)
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao excluir procedimento'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  return {
    procedures,
    isLoading,
    error,
    fetchProcedures,
    createProcedure,
    updateProcedure,
    deleteProcedure,
  }
})
