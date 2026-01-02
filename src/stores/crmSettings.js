// src/stores/crmSettings.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
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

  // Busca configurações e tipos disponíveis (unificado em uma única requisição)
  async function fetchSettings() {
    error.value = null
    try {
      const response = await listMessageSettings()
      // A API agora retorna { availableTypes, settings }
      availableTypes.value = response.data.availableTypes || []
      currentSettings.value = response.data.settings || []
      return { success: true }
    } catch (err) {
      error.value = 'Erro ao carregar configurações.'
      console.error(err)
      toast.error(error.value)
      availableTypes.value = []
      currentSettings.value = []
      return { success: false, error: error.value }
    }
  }

  // Action combinada para buscar configurações e templates em paralelo
  async function fetchAllSettingsData() {
    isLoading.value = true
    error.value = null

    try {
      // Executa as 2 requisições em paralelo para otimizar o tempo de loading
      await Promise.all([
        fetchSettings(),
        templatesStore.fetchTemplates()
      ])
    } catch (err) {
      console.error('Erro ao carregar dados de configurações:', err)
    } finally {
      isLoading.value = false
    }
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
