import { reactive, ref } from 'vue'
const now = () => new Date().toISOString()
const history = () => [
  { id: 'agenda', title: 'Minha agenda de hoje', lastMessagePreview: 'Vamos organizar os atendimentos de hoje.', updatedAt: now() },
  { id: 'retornos', title: 'Retornos dos pacientes', lastMessagePreview: 'Pacientes para acompanhamento administrativo.', updatedAt: now() },
  { id: 'resultados', title: 'Resultados da clínica', lastMessagePreview: 'Um panorama do período consultado.', updatedAt: new Date(Date.now() - 86400000).toISOString() },
]
const question = text => ({ id: 'q-' + Date.now(), role: 'user', content: text, createdAt: now() })
const answer = (content, metadata = {}) => ({ id: 'a-' + Date.now(), role: 'assistant', content, metadata, createdAt: now() })
const auth = reactive({ user: { _id: 'preview', name: 'Guilherme Exemplo', role: 'owner', clinic: 'preview' } })
const context = ref(null)
export const state = reactive({ isAvailable: true, isOpen: true, isSending: false, isLoading: false, isLoadingMore: false, error: null, messages: [], conversations: history(), activeConversationId: null, nextCursor: null, messagesCursor: null,
  async initialize() {},
  startNewConversation() { state.messages = []; state.activeConversationId = null; state.error = null },
  async selectConversation(id) { state.activeConversationId = id; state.messages = [question('Como está a minha agenda hoje?'), answer('Vamos organizar seu dia. Posso consultar sua agenda, buscar pacientes e ajudar com os resultados da clínica.\n\nEsta é uma **prévia com dados fictícios**.')] },
  async deleteConversation(id) { state.conversations = state.conversations.filter(item => item.id !== id); if (state.activeConversationId === id) state.startNewConversation() },
  async sendMessage(text) {
    state.messages.push(question(text)); state.isSending = true
    await new Promise(resolve => setTimeout(resolve, 1200))
    state.messages.push(answer('Tudo pronto para cuidar da sua rotina.\n\nNa versão integrada, consulto os dados da clínica de acordo com as suas permissões. Esta prévia é somente visual.'))
    state.isSending = false
  },
  async retryMessage() {}, async loadMore() {}, async loadMessages() {}, async loadOlderMessages() {},
  async confirmAction(message, confirmation) { confirmation.status = 'success' },
  async cancelAction(message, confirmation) { confirmation.status = 'cancelled' },
})
export const useAuthStore = () => auth
export const useLiaStore = () => state
export const useLiaPageContext = () => context
export const submitLiaFeedback = async (_conversationId, _messageId, feedback) => ({ data: { feedback: { kind: feedback.kind, vote: feedback.vote, status: 'new' } } })
export function scenario(name) {
  state.startNewConversation(); state.conversations = history(); state.isOpen = true
  if (name === 'empty-history') { state.conversations = []; return }
  if (name === 'conversation') { void state.selectConversation('agenda'); return }
  if (name === 'chart') state.messages = [question('Como foram os atendimentos neste período?'), answer('Aqui está a distribuição por data dos atendimentos retornados pela consulta.', { analyticsCards: [
    { type: 'ranking', title: 'Atendimentos realizados', total: 124, period: { from: '2026-11-01T03:00:00Z', to: '2026-11-07T02:59:59Z' }, items: [{ name: '2026-11-01', value: 12 }, { name: '2026-11-02', value: 24 }, { name: '2026-11-03', value: 18 }, { name: '2026-11-04', value: 30 }, { name: '2026-11-05', value: 17 }, { name: '2026-11-06', value: 23 }], source: 'Dados inteiramente fictícios para prévia visual.' },
    { type: 'ranking', title: 'Recebido por paciente', total: 1480000, unit: 'BRL_CENTS', period: { label: 'all_time' }, items: [{ id: '1', name: 'Paciente exemplo A', value: 650000 }, { id: '2', name: 'Paciente exemplo B', value: 480000 }, { id: '3', name: 'Paciente exemplo C', value: 350000 }] },
  ] })]
  if (name === 'action') state.messages = [question('Prepare um atendimento para a paciente exemplo.'), answer('Confira os detalhes. O atendimento só será criado depois da sua confirmação.', { confirmation: { id: 'preview-action', status: 'pending', type: 'create_appointment', patientName: 'Paciente de demonstração', professionalName: 'Profissional exemplo', startAt: '2030-01-15T17:00:00Z', timezone: 'America/Sao_Paulo' } })]
  if (name === 'error') { state.messages = [question('Ver minha agenda')]; state.error = 'Exemplo de indisponibilidade temporária. Tente novamente em instantes.' }
}
