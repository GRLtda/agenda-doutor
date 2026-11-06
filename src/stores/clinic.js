// src/stores/clinic.js

import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createClinic as apiCreateClinic,
  updateClinic as apiUpdateClinic,
  uploadClinicLogo as apiCreateClinicLogo,
} from '@/api/clinics'
import { useAuthStore } from './auth'
import api from '@/api'
import { getStorageSummary, getStorageDetails } from '@/api/storage'

export const useClinicStore = defineStore('clinic', () => {
  const currentClinic = ref(null)
  const subscriptionStatus = ref(null)
  const storageSummary = ref(null)
  const storageDetails = ref(null)
  const storageSummaryLoading = ref(false)
  const storageDetailsLoading = ref(false)
  const storageSummaryError = ref(false)
  const storageDetailsError = ref(false)
  let storageGeneration = 0
  let summaryRequest = null
  let detailsRequest = null

  const clinicId = (clinic) => clinic?._id || clinic?.id || (typeof clinic === 'string' ? clinic : null)

  function clearStorage() {
    storageGeneration++
    storageSummary.value = null
    storageDetails.value = null
    storageSummaryLoading.value = false
    storageDetailsLoading.value = false
    storageSummaryError.value = false
    storageDetailsError.value = false
    summaryRequest = null
    detailsRequest = null
  }

  function fetchStorageResource(detailed) {
    const pending = detailed ? detailsRequest : summaryRequest
    if (pending) return pending
    if (!clinicId(currentClinic.value)) return Promise.resolve()
    const generation = storageGeneration
    const data = detailed ? storageDetails : storageSummary
    const loading = detailed ? storageDetailsLoading : storageSummaryLoading
    const error = detailed ? storageDetailsError : storageSummaryError
    loading.value = true
    error.value = false
    const request = (detailed ? getStorageDetails() : getStorageSummary())
      .then((response) => {
        if (generation === storageGeneration) data.value = response.data
      })
      .catch(() => {
        if (generation === storageGeneration) error.value = true
      })
      .finally(() => {
        if (generation !== storageGeneration) return
        loading.value = false
        if (detailed) detailsRequest = null
        else summaryRequest = null
      })
    if (detailed) detailsRequest = request
    else summaryRequest = request
    return request
  }

  function refreshStorage(detailed = false) {
    return Promise.all([
      fetchStorageResource(false),
      ...(detailed ? [fetchStorageResource(true)] : []),
    ])
  }

  function setClinic(clinicData) {
    if (!clinicData || clinicId(clinicData) !== clinicId(currentClinic.value)) clearStorage()
    currentClinic.value = clinicData
  }

  async function createClinic(clinicData) {
    try {
      const response = await apiCreateClinic(clinicData)
      setClinic(response.data)

      const authStore = useAuthStore()
      await authStore.fetchUser()

      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao criar clínica:', error)
      return { success: false, error }
    }
  }

  async function updateClinicDetails(clinicData) {
    try {
      const response = await apiUpdateClinic(clinicData)
      setClinic(response.data)

      const authStore = useAuthStore()
      if (authStore.user) {
        await authStore.fetchUser()
      }

      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao atualizar a clínica:', error)
      return { success: false, error }
    }
  }

  async function uploadLogo(formData) {
    try {
      const response = await apiCreateClinicLogo(formData) // Fix import name below
      // A API /clinics/logo retorna signedUrl
      const logoUrl = response.data.signedUrl

      if (currentClinic.value) {
        currentClinic.value.logoUrl = logoUrl
      }

      const authStore = useAuthStore()
      await authStore.fetchUser()

      return { success: true, data: { logoUrl } }
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error)
      return { success: false, error }
    }
  }

  async function getSubscriptionStatus() {
    try {
      const response = await api.get('/subscriptions/status')
      subscriptionStatus.value = response.data
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao buscar status da assinatura:', error)
      return { success: false, error }
    }
  }

  async function cancelSubscription() {
    try {
      const response = await api.post('/subscriptions/cancel')
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error)
      return { success: false, error: error.response?.data?.message || 'Erro ao cancelar assinatura' }
    }
  }

  async function createPortalSession() {
    try {
      const response = await api.post('/subscriptions/portal')
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao criar sessão do portal:', error)
      return { success: false, error: error.response?.data?.message || 'Erro ao acessar portal' }
    }
  }

  function clearSubscriptionStatus() {
    subscriptionStatus.value = null
  }

  async function getLatestInvoice() {
    try {
      const response = await api.get('/subscriptions/latest-invoice')
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao buscar comprovante:', error)
      return { success: false, error: error.response?.data?.message || 'Erro ao buscar comprovante' }
    }
  }

  return {
    currentClinic,
    storageSummary,
    storageDetails,
    storageSummaryLoading,
    storageDetailsLoading,
    storageSummaryError,
    storageDetailsError,
    refreshStorage,
    subscriptionStatus,
    createClinic,
    updateClinicDetails,
    setClinic,
    uploadLogo,
    getSubscriptionStatus,
    cancelSubscription,
    createPortalSession,
    getLatestInvoice,
    clearSubscriptionStatus,
  }
})
