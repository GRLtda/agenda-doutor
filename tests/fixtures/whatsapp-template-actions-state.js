import { reactive } from 'vue'
const store = reactive({
  isLoading: false,
  availableVariables: [{ variable: '{primeiro_nome}', description: 'Primeiro nome' }],
  fetchVariables: async () => {},
  getTemplateById: async () => ({ success: true, data: {
    name: 'Lembrete de consulta — demonstração', content: 'Olá {primeiro_nome}! Sua consulta é amanhã às 14:30. Toque no botão abaixo para confirmar.',
    interactive: { enabled: true, type: 'buttons', buttons: [{ type: 'reply', displayText: 'Confirmar consulta', action: 'none', id: 'resposta' }] },
  } }),
  updateTemplate: async (_id, payload) => { window.__savedTemplate = payload; return { success: true } },
})
export const useCrmTemplatesStore = () => store
export const useAuthStore = () => ({ user: null })
export const useClinicStore = () => ({ currentClinic: { name: 'Clínica de demonstração' } })
