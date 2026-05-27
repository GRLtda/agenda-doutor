// src/stores/crmTemplates.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  listMessageTemplates,
  createMessageTemplate,
  getMessageTemplateById,
  updateMessageTemplate,
  deleteMessageTemplate,
  getTemplateVariables,
  publishMessageTemplate,
  deprecateMessageTemplateVersion,
  previewMessageTemplate,
  sendTestMessage,
  getApiErrorMessage,
} from '@/api/crm'
import { useToast } from 'vue-toastification'

export const useCrmTemplatesStore = defineStore('crmTemplates', () => {
  const toast = useToast()

  // --- STATE ---
  const templates = ref([])
  const availableVariables = ref([ // Fallback caso a API falhe ou não seja usada
    { variable: '{paciente}', description: 'Nome completo do paciente.' },
    { variable: '{nome_medico}', description: 'Nome do médico logado.' },
    { variable: '{clinica}', description: 'Nome da clínica.' },
    { variable: '{data_consulta}', description: 'Data do próximo agendamento.' },
    { variable: '{hora_consulta}', description: 'Hora do próximo agendamento.' },
    { variable: '{link_anamnese}', description: 'Link para preenchimento da anamnese.' },
    { variable: '{link_termos}', description: 'Link para assinatura do termo de consentimento.' },
  ])
  const isLoading = ref(false)
  const error = ref(null)

  // --- ACTIONS ---

  async function fetchTemplates() {
    isLoading.value = true
    error.value = null
    try {
      const response = await listMessageTemplates()
      templates.value = response.data
      return { success: true }
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Erro ao carregar modelos.')
      console.error(err)
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchVariables() {
    // Não bloqueia a interface se falhar, usa o fallback
    try {
      const response = await getTemplateVariables()
      if (response.data?.variables && Array.isArray(response.data.variables)) {
        // A API agora retorna objetos { value, description }
        // O componente espera { variable, description }, então fazemos o map
        availableVariables.value = response.data.variables.map(v => ({
          variable: v.value,
          description: v.description
        }))
      }
    } catch (err) {
      console.warn('Erro ao buscar variáveis da API, usando fallback:', err)
    }
  }

  async function createTemplate(templateData) {
    isLoading.value = true
    error.value = null
    try {
      await createMessageTemplate(templateData)
      await fetchTemplates() // Atualiza a lista
      toast.success('Modelo criado com sucesso!')
      return { success: true }
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Erro ao criar modelo.')
      console.error(err)
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function getTemplateById(id) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await getMessageTemplateById(id);
      return { success: true, data: response.data };
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Erro ao buscar modelo.');
      console.error(err);
      toast.error(error.value);
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
    }
  }


  async function updateTemplate(id, templateData) {
    isLoading.value = true
    error.value = null
    try {
      await updateMessageTemplate(id, templateData)
      await fetchTemplates() // Atualiza a lista
      toast.success('Modelo atualizado com sucesso!')
      return { success: true }
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Erro ao atualizar modelo.')
      console.error(err)
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function deleteTemplate(id) {
    isLoading.value = true
    error.value = null
    try {
      await deleteMessageTemplate(id)
      await fetchTemplates() // Atualiza a lista
      toast.success('Modelo excluído com sucesso!')
      return { success: true }
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Erro ao arquivar modelo.')
      console.error(err)
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function publishTemplate(templateId, versionId) {
    isLoading.value = true
    error.value = null
    try {
      await publishMessageTemplate(templateId, versionId)
      await fetchTemplates()
      toast.success('Modelo publicado.')
      return { success: true }
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Erro ao publicar modelo.')
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function deprecateVersion(templateId, versionId) {
    isLoading.value = true
    error.value = null
    try {
      await deprecateMessageTemplateVersion(templateId, versionId)
      await fetchTemplates()
      toast.success('Versão descontinuada.')
      return { success: true }
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Erro ao descontinuar versão.')
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function previewTemplate(templateId, payload) {
    try {
      const response = await previewMessageTemplate(templateId, payload)
      return { success: true, data: response.data }
    } catch (err) {
      const message = getApiErrorMessage(err, 'Erro ao gerar preview.')
      toast.error(message)
      return { success: false, error: message }
    }
  }

  async function sendTemplateTest(payload) {
    isLoading.value = true
    error.value = null
    try {
      const response = await sendTestMessage(payload)
      toast.success('Teste enfileirado para envio.')
      return { success: true, data: response.data }
    } catch (err) {
      error.value = getApiErrorMessage(err, 'Erro ao enviar teste.')
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // --- RETURN ---
  return {
    templates,
    availableVariables,
    isLoading,
    error,
    fetchTemplates,
    fetchVariables, // Expor
    createTemplate,
    getTemplateById, // Expor
    updateTemplate,
    deleteTemplate,
    publishTemplate,
    deprecateVersion,
    previewTemplate,
    sendTemplateTest,
  }
})
