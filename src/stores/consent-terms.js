import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
    getConsentTermTemplates as apiGetTemplates,
    createConsentTermTemplate as apiCreateTemplate,
    getConsentTermTemplateById as apiGetTemplateById,
    updateConsentTermTemplate as apiUpdateTemplate,
    deleteConsentTermTemplate as apiDeleteTemplate,
    duplicateConsentTermTemplate as apiDuplicateTemplate,
    assignConsentTerm as apiAssignTerm,
    getConsentTermsForPatient as apiGetForPatient,
    getConsentTermById as apiGetTermById,
    getPendingConsentTerms as apiGetPending,
    getPublicConsentTerm as apiGetPublic,
    submitConsentTermSignature as apiSubmitSignature,
} from '@/api/consent-terms'
import { useToast } from 'vue-toastification'

export const useConsentTermsStore = defineStore('consentTerms', () => {
    const toast = useToast()

    // Estado para templates
    const templates = ref([])
    const isFetchingTemplates = ref(false)
    const isLoading = ref(false)

    // Estado para termos do paciente
    const patientTerms = ref([])

    // Estado para termo público
    const publicTerm = ref(null)

    // Estado para termos pendentes da clínica
    const pendingTermsList = ref([])
    const pendingTotal = ref(0)
    const pendingPage = ref(1)
    const pendingPages = ref(1)

    // --- Ações para Templates ---

    async function fetchTemplates() {
        isFetchingTemplates.value = true
        try {
            const response = await apiGetTemplates()
            templates.value = response.data
        } catch (error) {
            console.error('Erro ao buscar modelos de termos:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao buscar modelos: ${errorMessage}`)
            templates.value = []
        } finally {
            isFetchingTemplates.value = false
        }
    }

    async function createTemplate(payload) {
        isLoading.value = true
        try {
            const response = await apiCreateTemplate(payload)
            templates.value.push(response.data)
            return response.data
        } catch (error) {
            console.error('Erro ao criar modelo:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    async function fetchTemplateById(templateId) {
        isLoading.value = true
        try {
            const response = await apiGetTemplateById(templateId)
            return response.data
        } catch (error) {
            console.error('Erro ao buscar modelo por ID:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao carregar modelo: ${errorMessage}`)
            return null
        } finally {
            isLoading.value = false
        }
    }

    async function updateTemplate(templateId, payload) {
        isLoading.value = true
        try {
            const response = await apiUpdateTemplate(templateId, payload)
            const index = templates.value.findIndex((t) => t._id === templateId)
            if (index !== -1) {
                templates.value[index] = response.data
            }
            return response.data
        } catch (error) {
            console.error('Erro ao atualizar modelo:', error)
            throw error
        } finally {
            isLoading.value = false
        }
    }

    async function deleteTemplate(templateId) {
        isLoading.value = true
        try {
            await apiDeleteTemplate(templateId)
            templates.value = templates.value.filter((t) => t._id !== templateId)
            return { success: true }
        } catch (error) {
            console.error('Erro ao excluir modelo:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao excluir modelo: ${errorMessage}`)
            return { success: false, error }
        } finally {
            isLoading.value = false
        }
    }

    async function duplicateTemplate(templateId) {
        isLoading.value = true
        try {
            const response = await apiDuplicateTemplate(templateId)
            templates.value.push(response.data)
            toast.success('Modelo duplicado com sucesso!')
            return { success: true, data: response.data }
        } catch (error) {
            console.error('Erro ao duplicar modelo:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao duplicar modelo: ${errorMessage}`)
            return { success: false, error }
        } finally {
            isLoading.value = false
        }
    }

    // --- Ações para Termos do Paciente ---

    async function assignTermToPatient(patientId, payload) {
        isLoading.value = true
        try {
            const response = await apiAssignTerm(patientId, payload)
            if (response.data?._id) {
                patientTerms.value.unshift(response.data)
            }
            return { success: true, data: response.data }
        } catch (error) {
            console.error('Erro ao atribuir termo:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao atribuir termo: ${errorMessage}`)
            return { success: false, error }
        } finally {
            isLoading.value = false
        }
    }

    async function fetchTermsForPatient(patientId) {
        isLoading.value = true
        patientTerms.value = []
        try {
            const response = await apiGetForPatient(patientId)
            if (Array.isArray(response.data)) {
                patientTerms.value = response.data
            } else if (response.data?.data) {
                patientTerms.value = response.data.data
            }
        } catch (error) {
            console.error('Erro ao buscar termos do paciente:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao buscar termos: ${errorMessage}`)
            patientTerms.value = []
        } finally {
            isLoading.value = false
        }
    }

    async function fetchTermById(patientId, termId) {
        isLoading.value = true
        try {
            const response = await apiGetTermById(patientId, termId)
            return response.data
        } catch (error) {
            console.error('Erro ao buscar termo:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao carregar termo: ${errorMessage}`)
            return null
        } finally {
            isLoading.value = false
        }
    }

    async function fetchPendingTerms(page = 1, limit = 20) {
        isLoading.value = true
        try {
            const response = await apiGetPending(page, limit)
            pendingTermsList.value = response.data.data || []
            pendingTotal.value = response.data.total || 0
            pendingPage.value = response.data.page || 1
            pendingPages.value = response.data.pages || 1
            return { success: true }
        } catch (error) {
            console.error('Erro ao buscar termos pendentes:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao buscar termos pendentes: ${errorMessage}`)
            pendingTermsList.value = []
            return { success: false, error }
        } finally {
            isLoading.value = false
        }
    }

    // --- Ações Públicas (Paciente com link) ---

    async function fetchPublicTerm(token) {
        isLoading.value = true
        try {
            const response = await apiGetPublic(token)
            publicTerm.value = response.data
            return { success: true }
        } catch (error) {
            console.error('Erro ao buscar termo público:', error)
            publicTerm.value = null
            return { success: false }
        } finally {
            isLoading.value = false
        }
    }

    async function submitSignature(token, payload) {
        isLoading.value = true
        try {
            const response = await apiSubmitSignature(token, payload)
            toast.success(response.data.message || 'Termo assinado com sucesso!')
            return { success: true }
        } catch (error) {
            console.error('Erro ao submeter assinatura:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao assinar termo: ${errorMessage}`)
            return { success: false, error }
        } finally {
            isLoading.value = false
        }
    }

    // Computed
    const signedTerms = computed(() => patientTerms.value.filter((t) => t.status === 'Assinado'))
    const pendingPatientTerms = computed(() => patientTerms.value.filter((t) => t.status === 'Pendente'))

    return {
        // Estado
        templates,
        isLoading,
        isFetchingTemplates,
        patientTerms,
        publicTerm,
        pendingTermsList,
        pendingTotal,
        pendingPage,
        pendingPages,

        // Computed
        signedTerms,
        pendingPatientTerms,

        // Ações de Templates
        fetchTemplates,
        createTemplate,
        fetchTemplateById,
        updateTemplate,
        deleteTemplate,
        duplicateTemplate,

        // Ações de Termos do Paciente
        assignTermToPatient,
        fetchTermsForPatient,
        fetchTermById,
        fetchPendingTerms,

        // Ações Públicas
        fetchPublicTerm,
        submitSignature,
    }
})
