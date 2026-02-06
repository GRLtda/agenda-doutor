import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getAnamnesisTemplates as apiGetTemplates,
  createAnamnesisTemplate as apiCreateTemplate,
  deleteAnamnesisTemplate as apiDeleteTemplate,
  getAnamnesisTemplateById as apiGetTemplateById,
  updateAnamnesisTemplate as apiUpdateTemplate,
  getPublicAnamnesis as apiGetPublic,
  submitPublicAnamnesis as apiSubmitPublic,
  assignAnamnesis as apiAssignAnamnesis,
  getAnamnesisForPatient as apiGetForPatient,
  updateAnamnesisResponse as apiUpdateResponse,
  getPendingAnamneses as apiGetPendingAnamneses,
  downloadAnamnesisPdf as apiDownloadPdf,
} from '@/api/anamnesis'
import { useToast } from 'vue-toastification'

export const useAnamnesisStore = defineStore('anamnesis', () => {
  const toast = useToast()

  const templates = ref([])
  const publicTemplate = ref(null) // Para o formulário público
  const patientAnamneses = ref([]) // ✨ Sempre inicializado como um array
  const isLoading = ref(false)
  const isFetchingTemplates = ref(false) // Estado específico para carregamento da lista

  // Estado para anamneses pendentes da clínica
  const pendingAnamnesesList = ref([])
  const pendingTotal = ref(0)
  const pendingPage = ref(1)
  const pendingPages = ref(1)
  const pendingLimit = ref(20)

  // --- Ações para Templates de Anamnese ---

  async function fetchTemplates() {
    isFetchingTemplates.value = true
    try {
      const response = await apiGetTemplates()
      templates.value = response.data
    } catch (error) {
      console.error('Erro ao buscar modelos de anamnese:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido'
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
      // Propaga o erro para o modal tratar
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
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido'
      toast.error(`Erro ao excluir modelo: ${errorMessage}`)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchTemplateById(templateId) {
    isLoading.value = true
    try {
      const response = await apiGetTemplateById(templateId)
      return response.data // Retorna o template específico
    } catch (error) {
      console.error('Erro ao buscar modelo por ID:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido'
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
      // Propaga o erro para o modal tratar
      throw error
    } finally {
      isLoading.value = false
    }
  }

  // --- Ações para Respostas de Anamnese (Paciente e Médico) ---

  async function fetchPublicAnamnesis(token) {
    isLoading.value = true
    try {
      const response = await apiGetPublic(token)
      publicTemplate.value = response.data
      return { success: true }
    } catch (error) {
      console.error('Erro ao buscar anamnese pública:', error)
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Token inválido ou expirado'
      toast.error(`Erro ao carregar formulário: ${errorMessage}`)
      publicTemplate.value = null
      return { success: false }
    } finally {
      isLoading.value = false
    }
  }

  // Ação para o PACIENTE enviar o formulário público
  async function submitPublicAnamnesis(token, answersPayload) {
    isLoading.value = true
    try {
      // O payload é { answers: [...] }
      const response = await apiSubmitPublic(token, answersPayload)
      toast.success(response.data.message || 'Respostas enviadas com sucesso!')
      return { success: true }
    } catch (error) {
      console.error('Erro ao enviar respostas da anamnese:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido'
      toast.error(`Erro ao enviar respostas: ${errorMessage}`)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  // Ação para o MÉDICO atribuir uma anamnese a um paciente
  async function assignAnamnesisToPatient(patientId, templateId) {
    isLoading.value = true
    try {
      // Garante que o payload é { templateId }
      const response = await apiAssignAnamnesis(patientId, { templateId })
      if (response.data) {
        patientAnamneses.value.unshift(response.data) // Adiciona no início da lista
      }
      toast.success(response.data.message || 'Anamnese enviada ao paciente!')
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao atribuir anamnese:', error)
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        'Erro ao enviar para o paciente'
      toast.error(`Erro: ${errorMessage}`)
      return { success: false, error }
    }
  }

  async function assignAnamnesis(patientId, payload) {
    isLoading.value = true
    try {
      const response = await apiAssignAnamnesis(patientId, payload)

      if (response.data && response.data._id) {
        patientAnamneses.value.unshift(response.data)
      } else if (response.data.anamnesis) {
        patientAnamneses.value.push(response.data.anamnesis)
      }

      toast.success('Anamnese atribuída com sucesso!')

      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao atribuir anamnese:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido'
      toast.error(`Erro ao atribuir anamnese: ${errorMessage}`)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAnamnesisForPatient(patientId) {
    isLoading.value = true
    patientAnamneses.value = [] // Reseta para um array vazio antes da chamada
    try {
      const response = await apiGetForPatient(patientId)

      if (Array.isArray(response.data)) {
        patientAnamneses.value = response.data
      } else if (response.data && Array.isArray(response.data.data)) {
        patientAnamneses.value = response.data.data
      } else {
        console.warn(
          'API de anamnese do paciente não retornou um array:',
          response.data,
        )
        patientAnamneses.value = []
      }
    } catch (error) {
      console.error('Erro ao buscar anamneses do paciente:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido'
      toast.error(`Erro ao buscar anamneses do paciente: ${errorMessage}`)
      patientAnamneses.value = [] // Garante que seja um array no erro
    } finally {
      isLoading.value = false
    }
  }

  // AÇÃO para o MÉDICO salvar/atualizar o formulário
  async function updateAnamnesisResponse(patientId, responseId, answersPayload) {
    isLoading.value = true
    try {
      // O payload é { answers: [...] }
      const response = await apiUpdateResponse(
        patientId,
        responseId,
        answersPayload,
      )

      // Atualiza a resposta na lista local (patientAnamneses)
      const index = patientAnamneses.value.findIndex(
        (a) => a._id === responseId,
      )
      if (index !== -1) {
        // Mescla os dados para manter o template populado
        patientAnamneses.value[index] = {
          ...patientAnamneses.value[index],
          ...response.data, // response.data deve ser a AnamnesisResponse atualizada
        }
      }

      toast.success(response.data.message || 'Respostas atualizadas com sucesso!')
      return { success: true, data: response.data }
    } catch (error) {
      console.error('Erro ao atualizar respostas da anamnese:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecidu'
      toast.error(`Erro ao salvar respostas: ${errorMessage}`)
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  // Busca todas as anamneses pendentes da clínica com paginação
  async function fetchPendingAnamneses(page = 1, limit = 20) {
    isLoading.value = true
    try {
      const response = await apiGetPendingAnamneses(page, limit)
      pendingAnamnesesList.value = response.data.data || []
      pendingTotal.value = response.data.total || 0
      pendingPage.value = response.data.page || 1
      pendingPages.value = response.data.pages || 1
      pendingLimit.value = response.data.limit || 20
      return { success: true }
    } catch (error) {
      console.error('Erro ao buscar anamneses pendentes:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro desconhecido'
      toast.error(`Erro ao buscar anamneses pendentes: ${errorMessage}`)
      pendingAnamnesesList.value = []
      return { success: false, error }
    } finally {
      isLoading.value = false
    }
  }

  // Download do PDF de uma anamnese respondida
  async function downloadPdf(patientId, anamnesisId, templateName = 'anamnese') {
    isLoading.value = true
    try {
      const response = await apiDownloadPdf(patientId, anamnesisId)

      // Cria blob URL e dispara download
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
      console.error('[Anamnesis Store] downloadPdf error:', error)
      const errorMessage =
        error.response?.data?.message || error.message || 'Erro ao baixar PDF.'
      toast.error(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      isLoading.value = false
    }
  }

  // Computed properties
  const answeredAnamneses = computed(() =>
    // Esta linha agora é segura, pois 'patientAnamneses.value' é sempre um array
    patientAnamneses.value.filter((a) => a.status === 'Preenchido'),
  )
  const pendingAnamneses = computed(() =>
    // Esta linha agora é segura
    patientAnamneses.value.filter((a) => a.status === 'Pendente'),
  )

  return {
    templates,
    publicTemplate,
    isLoading,
    patientAnamneses,
    answeredAnamneses,
    pendingAnamneses,

    // Estado de anamneses pendentes da clínica
    pendingAnamnesesList,
    pendingTotal,
    pendingPage,
    pendingPages,
    pendingLimit,

    // Funções de Template
    fetchTemplates,
    createTemplate,
    assignAnamnesis,
    deleteTemplate,
    fetchTemplateById,
    updateTemplate,

    // Funções de Resposta
    fetchPublicAnamnesis,
    submitPublicAnamnesis,
    assignAnamnesisToPatient,
    fetchAnamnesisForPatient,
    updateAnamnesisResponse,
    fetchPendingAnamneses,
    downloadPdf,
    isFetchingTemplates,
  }
})
