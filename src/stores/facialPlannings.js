import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createFacialPlanning as apiCreate,
  downloadFacialPlanningPdf as apiDownloadPdf,
  finalizeFacialPlanning as apiFinalize,
  getFacialPlanningById as apiGetById,
  listFacialPlanningsByAppointment as apiListByAppointment,
  listFacialPlanningsByPatient as apiListByPatient,
  reopenFacialPlanning as apiReopen,
  updateFacialPlanning as apiUpdate,
} from '@/api/facial-plannings'

export const useFacialPlanningsStore = defineStore('facialPlannings', () => {
  const plannings = ref([])
  const currentPlanning = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  async function fetchByPatient(patientId) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiListByPatient(patientId)
      plannings.value = response.data || []
      return { success: true, data: plannings.value }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao carregar planejamentos faciais.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchByAppointment(appointmentId) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiListByAppointment(appointmentId)
      plannings.value = response.data || []
      return { success: true, data: plannings.value }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao carregar planejamentos do atendimento.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchById(id) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiGetById(id)
      currentPlanning.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao carregar planejamento facial.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function save(payload, id = null) {
    isLoading.value = true
    error.value = null
    try {
      const response = id ? await apiUpdate(id, payload) : await apiCreate(payload)
      currentPlanning.value = response.data
      const index = plannings.value.findIndex((item) => item._id === response.data._id)
      if (index >= 0) plannings.value[index] = response.data
      else plannings.value.unshift(response.data)
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao salvar planejamento facial.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function finalize(id, payload) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiFinalize(id, payload)
      currentPlanning.value = response.data
      const index = plannings.value.findIndex((item) => item._id === response.data._id)
      if (index >= 0) plannings.value[index] = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao finalizar planejamento facial.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function reopen(id) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiReopen(id)
      currentPlanning.value = response.data
      const index = plannings.value.findIndex((item) => item._id === response.data._id)
      if (index >= 0) plannings.value[index] = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao reabrir planejamento facial.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function downloadPdf(id) {
    try {
      const response = await apiDownloadPdf(id)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `planejamento-facial-${id}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao baixar PDF.'
      return { success: false, error: error.value }
    }
  }

  return {
    plannings,
    currentPlanning,
    isLoading,
    error,
    fetchByPatient,
    fetchByAppointment,
    fetchById,
    save,
    finalize,
    reopen,
    downloadPdf,
  }
})
