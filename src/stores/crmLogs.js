// src/stores/crmLogs.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { getLogFiltersOptions, listMessageLogs } from '@/api/crm'
import { useToast } from 'vue-toastification'

// Mapeamento para nomes amigáveis de status
const logStatusDescriptions = {
  PENDING: 'Pendente',
  SENT_ATTEMPT: 'Tentativa Envio',
  DELIVERED: 'Entregue',
  READ: 'Lida',
  ERROR_WHATSAPP: 'Erro WhatsApp',
  ERROR_SYSTEM: 'Erro Sistema',
  ERROR_INVALID_NUMBER: 'Erro Número'
}

// Mapeamento para nomes amigáveis de tipos de ação
const actionTypeDescriptions = {
    MANUAL_SEND: 'Envio Manual',
    AUTOMATIC_REMINDER: 'Lembrete Automático',
    AUTOMATIC_BIRTHDAY: 'Aniversário Automático',
}

export const useCrmLogsStore = defineStore('crmLogs', () => {
  const toast = useToast()

  const logs = ref([])
  const availableLogStatus = ref([])
  const availableActionTypes = ref([])
  const pagination = ref({
    total: 0,
    page: 1,
    limit: 25,
    pages: 1,
  })
  const isLoading = ref(false)
  const error = ref(null)

  async function fetchFilterOptions() {
    try {
      const response = await getLogFiltersOptions()
      availableLogStatus.value = response.data.logStatus || []
      availableActionTypes.value = response.data.actionTypes || []
      return { success: true }
    } catch (err) {
      console.error('Erro ao buscar opções de filtro de logs:', err)
      toast.error('Não foi possível carregar as opções de filtro.')
      return { success: false }
    }
  }

  async function fetchLogs(page = 1, filters = {}) {
    isLoading.value = true
    error.value = null
    try {
      const params = {
        page,
        limit: pagination.value.limit,
        ...filters,
      }
      const response = await listMessageLogs(params)
      logs.value = response.data.logs || []
      pagination.value = {
        total: response.data.total || 0,
        page: response.data.page || 1,
        limit: response.data.limit || 25,
        pages: Math.ceil((response.data.total || 0) / (response.data.limit || 25)),
      }
      return { success: true }
    } catch (err) {
      error.value = 'Erro ao carregar histórico de mensagens.'
      console.error(err)
      toast.error(error.value)
      logs.value = []
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  function getStatusDescription(status) {
      return logStatusDescriptions[status] || status;
  }

  function getActionTypeDescription(actionType) {
      return actionTypeDescriptions[actionType] || actionType;
  }

  // Retorna o nome do template ou a descrição do tipo de ação
  function getTriggerOrTemplateName(log) {
     if (log.template?.name) {
         return log.template.name;
     }
     if (log.actionType) {
         return getActionTypeDescription(log.actionType);
     }
     return 'N/A';
  }
  // Retorna a descrição detalhada do gatilho/ação
  function getTriggerDetails(log) {
     if (log.settingType) {
         // Se tiver settingType (automático), mostra Action(Setting)
          return `${getActionTypeDescription(log.actionType)} (${log.settingType})`;
     }
     // Se for manual ou não tiver settingType, mostra só a Action
     return getActionTypeDescription(log.actionType);
  }


  return {
    logs,
    availableLogStatus,
    availableActionTypes,
    pagination,
    isLoading,
    error,
    fetchFilterOptions,
    fetchLogs,
    getStatusDescription,
    getActionTypeDescription,
    getTriggerOrTemplateName, // ✨ Expor nova função
    getTriggerDetails,      // ✨ Expor nova função
  }
})
