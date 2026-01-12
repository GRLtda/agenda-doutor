// src/stores/clinic.js

import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createClinic as apiCreateClinic,
  updateClinic as apiUpdateClinic,
} from '@/api/clinics'
import { uploadClinicLogo as apiUploadClinicLogo } from '@/api/uploads'
import { useAuthStore } from './auth'
import api from '@/api'

export const useClinicStore = defineStore('clinic', () => {
  const currentClinic = ref(null)

  function setClinic(clinicData) {
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
      const response = await apiUploadClinicLogo(formData)
      // A nova API retorna 'signedUrl' ao invés de 'imageUrl'
      const logoUrl = response.data.signedUrl

      if (currentClinic.value) {
        currentClinic.value.logoUrl = logoUrl
      }

      // NÃO chamar fetchUser() aqui! 
      // Isso trigger o watch no GeneralSettings e sobrescreve as alterações locais do usuário.
      // O fetchUser() será chamado após o updateClinicDetails.

      return { success: true, data: { logoUrl } }
    } catch (error) {
      console.error('Erro ao fazer upload do logo:', error)
      return { success: false, error }
    }
  }

  async function getSubscriptionStatus() {
    try {
      const response = await api.get('/subscriptions/status')
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

  async function getLatestInvoice() {
    try {
      const response = await api.get('/subscriptions/latest-invoice')
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao buscar comprovante:', error)
      return { success: false, error: error.response?.data?.message || 'Erro ao buscar comprovante' }
    }
  }

  return { currentClinic, createClinic, updateClinicDetails, setClinic, uploadLogo, getSubscriptionStatus, cancelSubscription, createPortalSession, getLatestInvoice }
})
