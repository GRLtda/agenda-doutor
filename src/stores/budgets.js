// stores/budgets.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useBudgetsStore = defineStore('budgets', () => {
    const budgets = ref([])
    const selectedBudget = ref(null)
    const isLoading = ref(false)
    const error = ref(null)

    // Fetch budgets by patient
    async function fetchBudgetsByPatient(patientId) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.get(`/budgets/patient/${patientId}`)
            budgets.value = response.data.data || []
            return { success: true, data: budgets.value }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao buscar orçamentos.'
            console.error('[Budgets Store] fetchBudgetsByPatient error:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Fetch single budget by ID
    async function fetchBudgetById(id) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.get(`/budgets/${id}`)
            selectedBudget.value = response.data.data
            return { success: true, data: selectedBudget.value }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao buscar orçamento.'
            console.error('[Budgets Store] fetchBudgetById error:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Create budget
    async function createBudget(budgetData) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.post('/budgets', budgetData)
            const newBudget = response.data.data
            budgets.value.unshift(newBudget)
            return { success: true, data: newBudget }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao criar orçamento.'
            console.error('[Budgets Store] createBudget error:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Update budget
    async function updateBudget(id, budgetData) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.put(`/budgets/${id}`, budgetData)
            const updatedBudget = response.data.data
            const index = budgets.value.findIndex(b => b._id === id)
            if (index !== -1) {
                budgets.value[index] = updatedBudget
            }
            if (selectedBudget.value?._id === id) {
                selectedBudget.value = updatedBudget
            }
            return { success: true, data: updatedBudget }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao atualizar orçamento.'
            console.error('[Budgets Store] updateBudget error:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Delete budget
    async function deleteBudget(id) {
        isLoading.value = true
        error.value = null
        try {
            await api.delete(`/budgets/${id}`)
            budgets.value = budgets.value.filter(b => b._id !== id)
            if (selectedBudget.value?._id === id) {
                selectedBudget.value = null
            }
            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao excluir orçamento.'
            console.error('[Budgets Store] deleteBudget error:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Send budget via WhatsApp
    async function sendBudgetWhatsApp(id) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.post(`/budgets/${id}/send-whatsapp`)
            // Update local budget status
            const index = budgets.value.findIndex(b => b._id === id)
            if (index !== -1) {
                budgets.value[index].status = 'SENT'
                budgets.value[index].sentAt = new Date().toISOString()
            }
            return { success: true, message: response.data.message }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao enviar orçamento via WhatsApp.'
            console.error('[Budgets Store] sendBudgetWhatsApp error:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Download PDF with authentication
    async function downloadPdf(id, budgetName = 'orcamento') {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.get(`/budgets/${id}/pdf`, {
                responseType: 'blob'
            })

            // Create blob URL and trigger download
            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${budgetName}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)

            return { success: true }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao baixar PDF.'
            console.error('[Budgets Store] downloadPdf error:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Import budget to appointment
    async function importBudgetToAppointment(budgetId, appointmentId) {
        isLoading.value = true
        error.value = null
        try {
            const response = await api.post(`/budgets/${budgetId}/import`, { appointmentId })
            // Update local budget status
            const index = budgets.value.findIndex(b => b._id === budgetId)
            if (index !== -1) {
                budgets.value[index].status = 'IMPORTED'
                budgets.value[index].importedToAppointment = appointmentId
                budgets.value[index].importedAt = new Date().toISOString()
            }
            return { success: true, data: response.data.data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao importar orçamento.'
            console.error('[Budgets Store] importBudgetToAppointment error:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // Clear budgets (useful when changing patient)
    function clearBudgets() {
        budgets.value = []
        selectedBudget.value = null
        error.value = null
    }

    return {
        budgets,
        selectedBudget,
        isLoading,
        error,
        fetchBudgetsByPatient,
        fetchBudgetById,
        createBudget,
        updateBudget,
        deleteBudget,
        sendBudgetWhatsApp,
        downloadPdf,
        importBudgetToAppointment,
        clearBudgets,
    }
})
