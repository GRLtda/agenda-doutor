import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createAppointment as apiCreateAppointment,
  updateAppointment as apiUpdateAppointment,
  getAppointments as apiGetAppointments,
  getAppointmentById as apiGetAppointmentById,
  deleteAppointment as apiDeleteAppointment,
} from '@/api/appointments'
import apiClient from '@/api'
import { useDashboardStore } from './dashboard'

export const useAppointmentsStore = defineStore('appointments', () => {
  const appointments = ref([])
  const patientAppointments = ref([])
  const isLoading = ref(false)

  // State dedicado para agendamentos do dia (AppointmentsView)
  const todayAppointments = ref([])
  const isTodayLoading = ref(false)

  const currentStartDate = ref(null)
  const currentEndDate = ref(null)

  async function fetchAppointmentsByDate(startDate, endDate) {
    isLoading.value = true

    currentStartDate.value = startDate
    currentEndDate.value = endDate

    try {
      const params = { startDate, endDate: endDate || startDate }
      const response = await apiGetAppointments(params)

      if (Array.isArray(response.data)) {
        appointments.value = response.data
      } else {
        console.warn('API de agendamentos não retornou um array.')
        appointments.value = []
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos:', error)
      appointments.value = []
    } finally {
      isLoading.value = false
    }
  }

  // Função dedicada para buscar apenas os agendamentos de hoje
  async function fetchTodayAppointments() {
    isTodayLoading.value = true
    try {
      const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
      const response = await apiGetAppointments({ startDate: today, endDate: today })

      if (Array.isArray(response.data)) {
        todayAppointments.value = response.data
      } else {
        console.warn('API de agendamentos não retornou um array.')
        todayAppointments.value = []
      }
    } catch (error) {
      console.error('Erro ao buscar agendamentos de hoje:', error)
      todayAppointments.value = []
    } finally {
      isTodayLoading.value = false
    }
  }

  // ✨ Função para buscar um agendamento específico pelo ID
  async function fetchAppointmentById(appointmentId) {
    isLoading.value = true
    try {
      const response = await apiGetAppointmentById(appointmentId)
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao buscar agendamento:', error)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  async function createAppointment(appointmentData) {
    isLoading.value = true
    try {
      await apiCreateAppointment(appointmentData)
      const dashboardStore = useDashboardStore()
      dashboardStore.fetchDashboardStats()

      if (currentStartDate.value) {
        fetchAppointmentsByDate(currentStartDate.value, currentEndDate.value)
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao criar agendamento:', error)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  async function updateAppointment(appointmentId, appointmentData) {
    isLoading.value = true
    try {
      await apiUpdateAppointment(appointmentId, appointmentData)

      if (currentStartDate.value) {
        fetchAppointmentsByDate(currentStartDate.value, currentEndDate.value)
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao atualizar agendamento:', error)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  function updateLocalStatus(appointmentId, newStatus) {
    const todayIndex = todayAppointments.value.findIndex(a => a._id === appointmentId)
    if (todayIndex !== -1) {
      todayAppointments.value[todayIndex].status = newStatus
    }

    const index = appointments.value.findIndex(a => a._id === appointmentId)
    if (index !== -1) {
      appointments.value[index].status = newStatus
    }
  }

  async function updateAppointmentStatus(appointmentId, status) {
    try {
      await apiUpdateAppointment(appointmentId, { status })
      const dashboardStore = useDashboardStore()
      dashboardStore.fetchDashboardStats()

      if (currentStartDate.value) {
        fetchAppointmentsByDate(currentStartDate.value, currentEndDate.value)
      }

      return { success: true }
    } catch (error) {
      console.error('Erro ao atualizar status do agendamento:', error)
      return { success: false, error }
    }
  }

  async function fetchAppointmentsByPatient(patientId) {
    this.isLoading = true
    try {
      const response = await apiClient.get(`/appointments/patient/${patientId}`)
      this.patientAppointments = response.data
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao buscar atendimentos do paciente:', error)
      this.patientAppointments = []
      return { success: false, error }
    } finally {
      this.isLoading = false
    }
  }

  async function deleteAppointment(appointmentId) {
    isLoading.value = true
    try {
      await apiDeleteAppointment(appointmentId)

      // Remove from lists
      todayAppointments.value = todayAppointments.value.filter(a => a._id !== appointmentId)
      appointments.value = appointments.value.filter(a => a._id !== appointmentId)

      const dashboardStore = useDashboardStore()
      dashboardStore.fetchDashboardStats()

      return { success: true }
    } catch (error) {
      console.error('Erro ao excluir agendamento:', error)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  return {
    isLoading,
    appointments,
    // State e funções dedicadas para agendamentos do dia
    todayAppointments,
    isTodayLoading,
    fetchTodayAppointments,
    // Funções existentes
    fetchAppointmentsByDate,
    fetchAppointmentById,
    createAppointment,
    updateAppointment,
    updateAppointmentStatus,
    updateLocalStatus,
    fetchAppointmentsByPatient,
    deleteAppointment,
  }
})
