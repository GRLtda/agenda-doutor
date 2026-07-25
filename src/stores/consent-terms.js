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
    getConsentTermsForAppointment as apiGetForAppointment,
    getConsentTermById as apiGetTermById,
    getPendingConsentTerms as apiGetPending,
    getAllConsentTerms as apiGetAll,
    downloadConsentTermPdf as apiDownloadPdf,
    sendConsentTermPdf as apiSendPdf,
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

    // Estado para TODOS os termos da clÃ­nica
    const allTermsList = ref([])
    const allTotal = ref(0)
    const allPage = ref(1)
    const allPages = ref(1)
    const allLimit = ref(20)

    // Estado para termos do atendimento
    const appointmentTerms = ref([])

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

    // --- Ações para Termos do Atendimento ---

    async function fetchAllTerms(page = 1, limit = 20, status = 'Todos', search = '') {
        isLoading.value = true
        try {
            const response = await apiGetAll(page, limit, status, search)
            allTermsList.value = response.data.data || []
            allTotal.value = response.data.total || 0
            allPage.value = response.data.page || 1
            allPages.value = response.data.pages || 1
            allLimit.value = response.data.limit || 20
            return { success: true }
        } catch (error) {
            console.error('Erro ao buscar todos os termos:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao buscar termos: ${errorMessage}`)
            allTermsList.value = []
            return { success: false, error }
        } finally {
            isLoading.value = false
        }
    }

    async function downloadPdf(patientId, termId, templateName = 'termo') {
        isLoading.value = true
        try {
            const response = await apiDownloadPdf(patientId, termId)
            const blob = new Blob([response.data], { type: 'application/pdf' })
            const url = window.URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.href = url
            link.download = `${templateName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            window.URL.revokeObjectURL(url)
            toast.success('PDF baixado com sucesso!')
            return { success: true }
        } catch (error) {
            console.error('Erro ao baixar PDF do termo:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro ao baixar PDF.'
            toast.error(errorMessage)
            return { success: false, error }
        } finally {
            isLoading.value = false
        }
    }

    async function sendPdfToPatient(patientId, termId) {
        isLoading.value = true
        try {
            await apiSendPdf(patientId, termId)
            toast.success('PDF enviado para o paciente via WhatsApp!')
            return { success: true }
        } catch (error) {
            console.error('Erro ao enviar PDF do termo:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro ao enviar PDF.'
            toast.error(errorMessage)
            return { success: false, error }
        } finally {
            isLoading.value = false
        }
    }

    async function fetchTermsForAppointment(appointmentId) {
        isLoading.value = true
        appointmentTerms.value = []
        try {
            const response = await apiGetForAppointment(appointmentId)
            if (Array.isArray(response.data)) {
                appointmentTerms.value = response.data
            } else if (response.data?.data) {
                appointmentTerms.value = response.data.data
            }
        } catch (error) {
            console.error('Erro ao buscar termos do atendimento:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Erro desconhecido'
            toast.error(`Erro ao buscar termos: ${errorMessage}`)
            appointmentTerms.value = []
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
        allTermsList,
        allTotal,
        allPage,
        allPages,
        allLimit,
        appointmentTerms,

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
        fetchAllTerms,
        downloadPdf,
        sendPdfToPatient,
        fetchTermsForAppointment,

        // Ações Públicas
        fetchPublicTerm,
        submitSignature,
    }
})
