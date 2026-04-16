import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  getScheduleBlocks as apiGetScheduleBlocks,
  previewScheduleBlockConflicts as apiPreviewScheduleBlockConflicts,
  createScheduleBlock as apiCreateScheduleBlock,
  updateScheduleBlock as apiUpdateScheduleBlock,
  getScheduleBlockConflicts as apiGetScheduleBlockConflicts,
  deleteScheduleBlock as apiDeleteScheduleBlock,
} from '@/api/schedule-blocks'

export const useScheduleBlocksStore = defineStore('scheduleBlocks', () => {
  const blocks = ref([])
  const isLoading = ref(false)
  const currentStartDate = ref(null)
  const currentEndDate = ref(null)
  const currentDoctorFilter = ref(null)

  async function fetchBlocksByDate(startDate, endDate, doctor = null) {
    isLoading.value = true
    currentStartDate.value = startDate
    currentEndDate.value = endDate || startDate
    currentDoctorFilter.value = doctor || null

    try {
      const response = await apiGetScheduleBlocks({
        startDate,
        endDate: endDate || startDate,
        doctor: doctor || undefined,
      })
      blocks.value = Array.isArray(response.data) ? response.data : []
    } catch (error) {
      console.error('Erro ao buscar bloqueios de agenda:', error)
      blocks.value = []
      return { success: false, error }
    } finally {
      isLoading.value = false
    }

    return { success: true, data: blocks.value }
  }

  async function refreshCurrentWindow() {
    if (!currentStartDate.value) return
    await fetchBlocksByDate(currentStartDate.value, currentEndDate.value, currentDoctorFilter.value)
  }

  async function createBlock(payload) {
    isLoading.value = true
    try {
      const response = await apiCreateScheduleBlock(payload)
      await refreshCurrentWindow()
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao criar bloqueio:', error)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  async function previewBlockConflicts(payload) {
    try {
      const response = await apiPreviewScheduleBlockConflicts(payload)
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao prever conflitos do bloqueio:', error)
      return { success: false, error }
    }
  }

  async function updateBlock(blockId, payload) {
    isLoading.value = true
    try {
      const response = await apiUpdateScheduleBlock(blockId, payload)
      await refreshCurrentWindow()
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao atualizar bloqueio:', error)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  async function deleteBlock(blockId) {
    isLoading.value = true
    try {
      await apiDeleteScheduleBlock(blockId)
      blocks.value = blocks.value.filter((block) => block._id !== blockId)
      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir bloqueio:', error)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchBlockConflicts(blockId) {
    try {
      const response = await apiGetScheduleBlockConflicts(blockId)
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao buscar conflitos do bloqueio:', error)
      return { success: false, error }
    }
  }

  return {
    blocks,
    isLoading,
    fetchBlocksByDate,
    createBlock,
    previewBlockConflicts,
    updateBlock,
    fetchBlockConflicts,
    deleteBlock,
  }
})
