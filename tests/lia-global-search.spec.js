import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import TopBar from '@/components/layout/TopBar.vue'

const mocks = vi.hoisted(() => ({ lia: null, push: vi.fn(), auth: null }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn() }), useRoute: () => ({ query: {}, name: 'dashboard', params: {} }) }))
vi.mock('@/stores/lia', () => ({ useLiaStore: () => mocks.lia }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/appointments', () => ({ useAppointmentsStore: () => ({ isLoading: false }) }))
vi.mock('@/stores/patients', () => ({ usePatientsStore: () => ({ isLoading: false, patients: [] }) }))
vi.mock('@/stores/records', () => ({ useRecordsStore: () => ({ isLoading: false }) }))
vi.mock('@/stores/anamnesis', () => ({ useAnamnesisStore: () => ({ isLoading: false }) }))
vi.mock('@/stores/employees', () => ({ useEmployeesStore: () => ({ isLoading: false }) }))
vi.mock('@/stores/dashboard', () => ({ useDashboardStore: () => ({ isLoading: false }) }))

const answer = {
  id: 'a1', role: 'assistant', content: 'Encontrei **3** atendimentos neste mês.',
  metadata: { navigation: [
    { id: 'appointments-period', label: 'Abrir atendimentos de 01/11/2026 a 30/11/2026', to: '/atendimentos?from=2026-11-01&to=2026-11-30&view=list' },
    { id: 'evil', label: 'Externo', to: 'https://exemplo.com' },
  ] },
}
let wrapper
beforeEach(() => {
  mocks.push.mockReset()
  mocks.lia = reactive({
    isAvailable: true, isSending: false, isOpen: false, error: null, backgroundNotice: 'answer', streamStatus: null,
    startNewConversation: vi.fn(), sendMessage: vi.fn().mockResolvedValue(answer),
  })
  mocks.auth = reactive({ user: { name: 'Profissional QA' }, unreadCount: 0, notifications: [] })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  wrapper = mount(TopBar, { global: { stubs: { Teleport: true, UserDropdown: true, LiaAvatar: true, RetrospectiveShortcut: true }, directives: { 'click-outside': {} } } })
})
afterEach(() => { wrapper.unmount(); vi.unstubAllGlobals() })

const openWith = async text => {
  await wrapper.get('.search-trigger').trigger('click')
  await wrapper.get('.palette-search-input').setValue(text)
}

it('sem texto o painel abre sem aurora; ao digitar a aurora aparece', async () => {
  await wrapper.get('.search-trigger').trigger('click')
  expect(wrapper.get('.command-palette-wrap').classes()).not.toContain('is-aura')
  await wrapper.get('.palette-search-input').setValue('Quais atendimentos deste mês?')
  expect(wrapper.get('.command-palette-wrap').classes()).toContain('is-aura')
})

it('pergunta à Lia na própria busca, grava a conversa pelo store e mostra a resposta com botões filtrados', async () => {
  await openWith('Quais atendimentos deste mês?')
  await wrapper.get('.lia-search-action').trigger('click')
  expect(mocks.lia.startNewConversation).toHaveBeenCalled()
  expect(mocks.lia.sendMessage).toHaveBeenCalledWith('Quais atendimentos deste mês?', {})
  await flushPromises()
  expect(wrapper.find('.command-overlay').exists()).toBe(true)
  expect(wrapper.get('.lia-answer-text').html()).toContain('<strong>3</strong>')
  expect(mocks.lia.backgroundNotice).toBeNull()
  const targets = wrapper.findAll('.lia-search-action').filter(item => item.text().includes('Abrir atendimentos'))
  expect(targets).toHaveLength(1)
  expect(wrapper.text()).not.toContain('Externo')
  expect(wrapper.text()).toContain('01/11/2026 a 30/11/2026')
  expect(wrapper.text()).toContain('Em lista')
  await targets[0].trigger('click')
  expect(mocks.push).toHaveBeenCalledWith('/atendimentos?from=2026-11-01&to=2026-11-30&view=list')
  expect(wrapper.find('.command-overlay').exists()).toBe(false)
})

it('mostra a Lia pensando enquanto a resposta não chega', async () => {
  let finish
  mocks.lia.sendMessage.mockReturnValue(new Promise(resolve => { finish = resolve }))
  await openWith('Como conecto o WhatsApp?')
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' })
  expect(wrapper.get('.lia-think').text()).toContain('Lia está pensando')
  expect(wrapper.get('.command-palette-wrap').classes()).toContain('is-thinking')
  finish(answer); await flushPromises()
  expect(wrapper.find('.lia-think').exists()).toBe(false)
  expect(wrapper.find('.lia-answer').exists()).toBe(true)
})

it('Enter na resposta abre o primeiro destino filtrado', async () => {
  await openWith('Como conecto o WhatsApp?')
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' }); await flushPromises()
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' })
  expect(mocks.push).toHaveBeenCalledWith('/atendimentos?from=2026-11-01&to=2026-11-30&view=list')
})

it('continua na conversa abrindo o painel da Lia', async () => {
  await openWith('Quais atendimentos deste mês?')
  await wrapper.get('.lia-search-action').trigger('click'); await flushPromises()
  const continueButton = wrapper.findAll('.lia-search-action').find(item => item.text().includes('Continuar na conversa'))
  await continueButton.trigger('click')
  expect(mocks.lia.isOpen).toBe(true)
  expect(wrapper.find('.command-overlay').exists()).toBe(false)
})

it('mostra a falha com mensagem clara e permite tentar de novo', async () => {
  mocks.lia.sendMessage.mockRejectedValueOnce(new Error('falhou'))
  mocks.lia.error = 'Não consegui consultar a agenda agora. Tente de novo em instantes.'
  await openWith('Quais atendimentos deste mês?')
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' }); await flushPromises()
  expect(wrapper.get('.lia-error').text()).toContain('Não consegui consultar a agenda agora')
  await wrapper.get('.lia-retry').trigger('click'); await flushPromises()
  expect(mocks.lia.sendMessage).toHaveBeenCalledTimes(2)
  expect(wrapper.find('.lia-answer').exists()).toBe(true)
})

it('Enter usa a Lia quando o texto não encontra um atalho ou paciente', async () => {
  await openWith('Como conecto o WhatsApp?')
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' })
  expect(mocks.lia.sendMessage).toHaveBeenCalledWith('Como conecto o WhatsApp?', {})
})

it('mantém a busca existente quando o piloto está indisponível', async () => {
  mocks.lia.isAvailable = false
  await wrapper.get('.search-trigger').trigger('click'); await flushPromises()
  expect(wrapper.find('.lia-search-action').exists()).toBe(false)
  expect(wrapper.text()).toContain('Novo paciente')
})

const withMetadata = metadata => ({ id: 'm2', role: 'assistant', content: 'Posso agendar para você.', metadata })

it('mostra o cartão de confirmação no painel e confirma sem abrir o chat', async () => {
  const confirmation = { id: 'c1', type: 'create_appointment', status: 'pending', patientName: 'Maria Souza', startAt: '2026-11-25T13:00:00.000Z', durationMinutes: 30 }
  mocks.lia.messages = [withMetadata({ confirmation, confirmations: [confirmation] })]
  mocks.lia.sendMessage.mockResolvedValue(mocks.lia.messages[0])
  mocks.lia.confirmAction = vi.fn().mockResolvedValue(undefined)
  await openWith('Agende a Maria amanhã às 10h')
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' }); await flushPromises()
  expect(wrapper.get('.lia-action-card').text()).toContain('Maria Souza')
  // Com uma decisão pendente, Enter não navega nem fecha o painel.
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' })
  expect(mocks.push).not.toHaveBeenCalled()
  const confirm = wrapper.findAll('.lia-action-card button').find(item => item.text().includes('Confirmar'))
  await confirm.trigger('click'); await flushPromises()
  expect(mocks.lia.confirmAction).toHaveBeenCalledWith(mocks.lia.messages[0], confirmation)
  expect(wrapper.find('.command-overlay').exists()).toBe(true)
  expect(mocks.lia.isOpen).toBe(false)
})

it('escolhe horário alternativo continuando a mesma conversa', async () => {
  const message = withMetadata({ availabilityAlternatives: { date: '2026-11-25', times: ['09:00', '10:30'], professionalId: 'p1', durationMinutes: 30 } })
  mocks.lia.messages = [message]
  mocks.lia.sendMessage.mockResolvedValueOnce(message)
  await openWith('Quero um horário amanhã')
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' }); await flushPromises()
  mocks.lia.startNewConversation.mockClear()
  const time = wrapper.findAll('.lia-times button').find(item => item.text() === '10:30')
  await time.trigger('click'); await flushPromises()
  expect(mocks.lia.startNewConversation).not.toHaveBeenCalled()
  expect(mocks.lia.sendMessage).toHaveBeenLastCalledWith('Pode ser em 2026-11-25 às 10:30.', expect.objectContaining({ selectedAlternative: { date: '2026-11-25', time: '10:30', professionalId: 'p1', durationMinutes: 30 } }))
})

it('sugestões da Lia continuam a conversa direto do painel', async () => {
  const message = withMetadata({ suggestions: [{ label: 'Ver amanhã', prompt: 'E amanhã?' }] })
  mocks.lia.messages = [message]
  mocks.lia.sendMessage.mockResolvedValueOnce(message)
  await openWith('Como está minha agenda hoje?')
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' }); await flushPromises()
  mocks.lia.startNewConversation.mockClear()
  await wrapper.get('.lia-followups button').trigger('click'); await flushPromises()
  expect(mocks.lia.startNewConversation).not.toHaveBeenCalled()
  expect(mocks.lia.sendMessage).toHaveBeenLastCalledWith('E amanhã?', {})
})
