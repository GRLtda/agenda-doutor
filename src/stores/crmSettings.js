// src/stores/crmSettings.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getAvailableMessageTypes,
  listMessageSettings,
  upsertMessageSetting,
  deleteMessageSetting,
} from '@/api/crm'
import { useToast } from 'vue-toastification'
import { useCrmTemplatesStore } from './crmTemplates' // Importa a store de templates

// Mapeamento para nomes amigáveis (pode ser expandido)
const triggerTypeDescriptions = {
  APPOINTMENT_3_MINS_BEFORE: 'Lembrete 1 Minuto Antes', // Apenas para teste, geralmente não usado
  APPOINTMENT_1_DAY_BEFORE: 'Lembrete 1 Dia Antes',
  APPOINTMENT_2_HOURS_BEFORE: 'Lembrete 2 Horas Antes',
  PATIENT_BIRTHDAY: 'Mensagem de Aniversário',
  ANAMNESIS_ASSIGNMENT: 'Envio de Anamnese',
  CONSENT_TERM_ASSIGNMENT: 'Envio de Termo de Consentimento',
  APPOINTMENT_CONFIRMATION: 'Confirmação de Agendamento'
}

export const useCrmSettingsStore = defineStore('crmSettings', () => {
  const toast = useToast()
  const templatesStore = useCrmTemplatesStore() // Instancia a store de templates

  // --- STATE ---
  const availableTypes = ref([]) // Lista de strings (ex: ['APPOINTMENT_1_DAY_BEFORE', ...])
  const currentSettings = ref([]) // Lista de objetos de configuração salvos
  const isLoading = ref(false)
  const error = ref(null)

  // --- GETTERS ---
  // Formata os tipos disponíveis com nomes amigáveis
  const availableTriggers = computed(() => {
    return availableTypes.value
      .map((type) => ({
        type: type,
        name: triggerTypeDescriptions[type] || type, // Usa o nome amigável ou o tipo original
      }))
      .sort((a, b) => a.name.localeCompare(b.name)) // Ordena alfabeticamente pelo nome
  })

  // Formata os modelos disponíveis para o <StyledSelect>
  const templateOptions = computed(() => {
    // Adiciona uma opção "Nenhum" no início
    return [
      { value: null, label: 'Nenhum (Desativado)' },
      ...templatesStore.templates.map((t) => ({ value: t._id, label: t.name })),
    ]
  })

  // --- ACTIONS ---

  async function fetchAvailableTypes() {
    isLoading.value = true
    error.value = null
    try {
      const response = await getAvailableMessageTypes()
      availableTypes.value = response.data.availableTypes || []
      return { success: true }
    } catch (err) {
      error.value = 'Erro ao carregar tipos de mensagem.'
      console.error(err)
      toast.error(error.value)
      availableTypes.value = [] // Garante array vazio em caso de erro
      return { success: false, error: error.value }
    } finally {
      // Não define isLoading false aqui se fetchSettings for chamado em seguida
    }
  }

  async function fetchSettings() {
    isLoading.value = true // Garante que isLoading está true
    error.value = null
    try {
      const response = await listMessageSettings()
      currentSettings.value = response.data || []
      // Busca os templates também, caso ainda não tenham sido carregados
      if (templatesStore.templates.length === 0) {
        await templatesStore.fetchTemplates()
      }
      return { success: true }
    } catch (err) {
      error.value = 'Erro ao carregar configurações.'
      console.error(err)
      toast.error(error.value)
      currentSettings.value = []
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false // Define isLoading false aqui
    }
  }

  // Action combinada para buscar tipos e configurações
  async function fetchAllSettingsData() {
    isLoading.value = true
    await fetchAvailableTypes()
    await fetchSettings() // fetchSettings definirá isLoading como false no final
  }

  async function saveSetting(type, templateId, isActive) {
    isLoading.value = true
    error.value = null
    try {
      // Se templateId for null, mas isActive for true, tratamos como desativar
      const finalIsActive = templateId ? isActive : false

      if (!templateId) {
        // Se não há template selecionado, tentamos deletar a configuração existente
        try {
          await deleteMessageSetting(type)
          toast.success(`Configuração para "${triggerTypeDescriptions[type] || type}" removida.`)
          // Atualiza a lista local para refletir a remoção
          currentSettings.value = currentSettings.value.filter((s) => s.type !== type)
        } catch (deleteErr) {
          // Se der erro 404 (não encontrado), ignora, pois não havia configuração
          if (deleteErr.response?.status !== 404) {
            throw deleteErr // Relança outros erros
          }
          console.log(`Nenhuma configuração para ${type} encontrada para deletar.`)
        }
      } else {
        // Se há template, faz upsert
        const payload = { type, templateId, isActive: finalIsActive }
        await upsertMessageSetting(payload)
        toast.success(`Configuração para "${triggerTypeDescriptions[type] || type}" salva!`)
        // Atualiza a lista local após salvar
        await fetchSettings() // Busca novamente para ter os dados mais recentes
      }

      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao salvar configuração.'
      console.error(err)
      toast.error(error.value)
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // --- RETURN ---
  return {
    availableTypes,
    currentSettings,
    isLoading,
    error,
    availableTriggers, // Getter
    templateOptions, // Getter
    fetchAllSettingsData, // Action combinada
    saveSetting,
  }
})
