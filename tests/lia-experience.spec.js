import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import LiaChatDrawer from '@/components/lia/LiaChatDrawer.vue'
import LiaConversationHistory from '@/components/lia/LiaConversationHistory.vue'
import LiaAvatar from '@/components/lia/LiaAvatar.vue'
import LiaChatShell from '@/components/lia/LiaChatShell.vue'
import { buildLiaChart } from '@/components/lia/liaChart'

const mocks = vi.hoisted(() => ({ store: null, auth: null, page: null }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/lia', () => ({ useLiaStore: () => mocks.store }))
vi.mock('@/composables/useLiaPageContext', () => ({ useLiaPageContext: () => mocks.page }))
let wrappers
beforeEach(() => {
  wrappers = []
  vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  mocks.auth = reactive({ user: { _id: 'synthetic-user', name: 'Guilherme Exemplo', role: 'owner' } })
  mocks.page = ref(null)
  mocks.store = reactive({ isAvailable: true, isLoading: false, isLoadingMore: false, isSending: false, error: null, messages: [], conversations: [], activeConversationId: null, messagesCursor: null, nextCursor: null,
    initialize: vi.fn().mockResolvedValue(), sendMessage: vi.fn().mockResolvedValue(), retryMessage: vi.fn().mockResolvedValue(),
    selectConversation: vi.fn().mockImplementation(async id => { mocks.store.activeConversationId = id }),
    startNewConversation: vi.fn().mockImplementation(() => { mocks.store.messages = []; mocks.store.activeConversationId = null }),
    deleteConversation: vi.fn().mockResolvedValue(), confirmAction: vi.fn(), cancelAction: vi.fn(), loadMore: vi.fn(), loadMessages: vi.fn().mockResolvedValue(), loadOlderMessages: vi.fn(),
  })
})
afterEach(() => { for (const wrapper of wrappers) wrapper.unmount(); document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.restoreAllMocks() })
function chat() {
  const wrapper = mount(LiaChatDrawer, { props: { open: true }, attachTo: document.body,
    global: { stubs: { Teleport: true, LiaAvatar: { template: '<span class="avatar-stub" />' } } } })
  wrappers.push(wrapper); return wrapper
}
function history() { const wrapper = mount(LiaConversationHistory); wrappers.push(wrapper); return wrapper }

it('entrada usa o nome do usuário e sugestões editáveis, sem disparar consulta automaticamente', async () => {
  const wrapper = chat(); await flushPromises()
  expect(wrapper.text()).toContain('Guilherme'); expect(wrapper.text()).toContain('O que vamos')
  await wrapper.findAll('.suggestions button')[0].trigger('click')
  expect(wrapper.get('textarea').element.value).toBe('Como está minha agenda hoje?')
  expect(mocks.store.sendMessage).not.toHaveBeenCalled()
  expect(document.activeElement).toBe(wrapper.get('textarea').element)
})
it('expandir e recolher preservam rascunho e mensagens, exibindo histórico lateral', async () => {
  mocks.store.messages = [{ id: 'one', role: 'assistant', content: 'Resposta sintética' }]
  const wrapper = chat(); await flushPromises(); await wrapper.get('textarea').setValue('Meu rascunho')
  await wrapper.get('[aria-label="Expandir conversa"]').trigger('click')
  expect(wrapper.find('.lia-workspace.expanded').exists()).toBe(true)
  expect(wrapper.find('.lia-history.sidebar').exists()).toBe(true)
  expect(wrapper.get('textarea').element.value).toBe('Meu rascunho'); expect(wrapper.text()).toContain('Resposta sintética')
  await wrapper.get('[aria-label="Recolher conversa"]').trigger('click')
  expect(wrapper.get('textarea').element.value).toBe('Meu rascunho'); expect(mocks.store.startNewConversation).not.toHaveBeenCalled()
})
it('histórico vazio oferece nova conversa e volta ao chat com foco no campo', async () => {
  const wrapper = chat(); await flushPromises(); await wrapper.get('[aria-label="Histórico de conversas"]').trigger('click')
  expect(wrapper.find('.lia-chat').isVisible()).toBe(false)
  expect(wrapper.text()).toContain('Sua primeira conversa começa aqui')
  await wrapper.get('.new-conversation').trigger('click'); await flushPromises()
  expect(mocks.store.startNewConversation).toHaveBeenCalledTimes(1)
  expect(wrapper.find('.lia-chat').isVisible()).toBe(true)
  expect(document.activeElement).toBe(wrapper.get('textarea').element)
})
it('navegar no histórico preserva o rascunho até selecionar outra conversa', async () => {
  mocks.store.conversations = [{ id: 'another', title: 'Agenda de amanhã', updatedAt: new Date().toISOString() }]
  const wrapper = chat(); await flushPromises(); await wrapper.get('textarea').setValue('Rascunho antigo')
  await wrapper.get('[aria-label="Histórico de conversas"]').trigger('click')
  await wrapper.get('.back-button').trigger('click')
  expect(wrapper.get('textarea').element.value).toBe('Rascunho antigo')
  await wrapper.get('[aria-label="Histórico de conversas"]').trigger('click'); await wrapper.get('.history-select').trigger('click')
  expect(mocks.store.selectConversation).toHaveBeenCalledWith('another'); expect(wrapper.get('textarea').element.value).toBe('')
})
it('fechar e reabrir preservam o rascunho da sessão', async () => {
  const wrapper = chat(); await flushPromises(); await wrapper.get('textarea').setValue('Continuar depois')
  await wrapper.setProps({ open: false }); await wrapper.setProps({ open: true }); await flushPromises()
  expect(wrapper.get('textarea').element.value).toBe('Continuar depois')
})
it('Enter envia uma vez com contexto validável; Shift+Enter e composição de teclado não enviam', async () => {
  mocks.page.value = { type: 'patient', entityId: 'synthetic-patient' }
  const wrapper = chat(); await flushPromises(); const field = wrapper.get('textarea')
  await field.setValue('Ver atendimentos'); await field.trigger('keydown', { key: 'Enter', shiftKey: true }); await field.trigger('keydown', { key: 'Enter', isComposing: true })
  expect(mocks.store.sendMessage).not.toHaveBeenCalled()
  await field.trigger('keydown', { key: 'Enter' }); await flushPromises()
  expect(mocks.store.sendMessage).toHaveBeenCalledExactlyOnceWith('Ver atendimentos', { pageContext: { type: 'patient', entityId: 'synthetic-patient' } })
})
it('envio em andamento bloqueia duplicação e permite expansão sem perder a pergunta', async () => {
  mocks.store.isSending = true; mocks.store.messages = [{ id: 'q', role: 'user', content: 'Pergunta sintética' }]
  const wrapper = chat(); await flushPromises()
  expect(wrapper.get('textarea').element.disabled).toBe(true)
  expect(wrapper.get('[aria-label="Enviar mensagem"]').element.disabled).toBe(true)
  await wrapper.get('[aria-label="Expandir conversa"]').trigger('click')
  expect(wrapper.text()).toContain('Pergunta sintética'); expect(wrapper.text()).toContain('Preparando a resposta')
  expect(mocks.store.sendMessage).not.toHaveBeenCalled()
})
it('sugestão financeira respeita permissões explícitas do usuário', async () => {
  mocks.auth.user.permissions = ['patients.read']
  const wrapper = chat(); await flushPromises()
  expect(wrapper.text()).not.toContain('Explorar resultados'); expect(wrapper.text()).toContain('Conhecer minha clínica')
})
it('escolha de horário em outra data usa a data completa retornada', async () => {
  mocks.store.messages = [{ id: 'one', role: 'assistant', content: 'Horários', metadata: { availabilityAlternatives: { professionalId: 'professional', patientId: 'patient', durationMinutes: 30, times: [{ date: '2030-01-16', time: '00:30', startAt: '2030-01-16T03:30:00Z' }] } } }]
  const wrapper = chat(); await flushPromises(); await wrapper.get('.time-alternatives button').trigger('click'); await flushPromises()
  expect(mocks.store.sendMessage).toHaveBeenCalledWith('Pode ser em 2030-01-16 às 00:30.', expect.objectContaining({ selectedAlternative: { date: '2030-01-16', time: '00:30', professionalId: 'professional', durationMinutes: 30 } }))
})
it('histórico busca sem acentos e não exclui antes da confirmação', async () => {
  mocks.store.conversations = [{ id: 'one', title: 'Reunião da clínica', updatedAt: new Date().toISOString() }, { id: 'two', title: 'Outra conversa', updatedAt: new Date().toISOString() }]
  const wrapper = history(); await wrapper.get('input').setValue('reuniao')
  expect(wrapper.findAll('.history-item')).toHaveLength(1)
  await wrapper.get('.delete-button').trigger('click'); expect(mocks.store.deleteConversation).not.toHaveBeenCalled()
  await wrapper.get('.delete-confirmation .destructive').trigger('click'); await flushPromises()
  expect(mocks.store.deleteConversation).toHaveBeenCalledExactlyOnceWith('one')
})
it('falha ao excluir mantém o histórico e mostra erro recuperável', async () => {
  mocks.store.conversations = [{ id: 'one', title: 'Conversa', updatedAt: new Date().toISOString() }]
  mocks.store.deleteConversation.mockRejectedValueOnce(new Error('offline'))
  const wrapper = history(); await wrapper.get('.delete-button').trigger('click'); await wrapper.get('.destructive').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Não foi possível excluir'); expect(wrapper.findAll('.history-item')).toHaveLength(1)
})
it('gráfico mantém apenas pontos fornecidos, ordena datas e não altera o ranking original', () => {
  const items = [{ name: '2026-11-04', value: 20 }, { name: '2026-11-01', value: 5 }]
  const chart = buildLiaChart(items)
  expect(chart.temporal).toBe(true); expect(chart.points.map(point => point.name)).toEqual(['2026-11-01', '2026-11-04'])
  expect(chart.points).toHaveLength(2); expect(items[0].name).toBe('2026-11-04')
})
it('ranking de pessoas usa barras e valores negativos não produzem larguras negativas', () => {
  const chart = buildLiaChart([{ name: 'Pessoa A', value: 12000 }, { name: 'Pessoa B', value: -3000 }], 'BRL_CENTS')
  expect(chart.temporal).toBe(false); expect(chart.points.map(point => point.width)).toEqual([100, 25])
  expect(buildLiaChart([{ name: '2026-02-30', value: 5 }, { name: '2026-03-01', value: 6 }]).temporal).toBe(false)
  expect(buildLiaChart([{ name: 'inválido', value: NaN }]).points).toEqual([])
})
it('avatares não compartilham IDs e respeitam redução de movimento sem loops', async () => {
  const listener = vi.fn(), removed = vi.fn()
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: listener, removeEventListener: removed }))
  const raf = vi.spyOn(window, 'requestAnimationFrame')
  const wrapper = mount({ components: { LiaAvatar }, template: '<div><LiaAvatar /><LiaAvatar thinking /></div>' }); wrappers.push(wrapper)
  const ids = wrapper.findAll('[id]').map(node => node.attributes('id'))
  expect(new Set(ids).size).toBe(ids.length); expect(raf).not.toHaveBeenCalled()
  expect(Number(wrapper.findAll('[data-part="lia"]')[0].attributes('opacity'))).toBe(1)
  wrapper.unmount(); wrappers = []; expect(removed).toHaveBeenCalledTimes(2)
})
it('modal expandido bloqueia rolagem, fecha com Escape e devolve foco ao botão de origem', async () => {
  const opener = document.createElement('button'); document.body.append(opener); opener.focus()
  const wrapper = mount(LiaChatShell, { props: { open: true, expanded: true }, slots: { default: '<button>Conteúdo</button>' }, global: { stubs: { Teleport: true } }, attachTo: document.body }); wrappers.push(wrapper)
  await flushPromises(); expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true'); expect(document.body.style.overflow).toBe('hidden')
  await wrapper.get('[role="dialog"]').trigger('keydown', { key: 'Escape' }); expect(wrapper.emitted('close')).toHaveLength(1)
  await wrapper.setProps({ open: false }); expect(document.activeElement).toBe(opener); expect(document.body.style.overflow).not.toBe('hidden')
})

it('em tela pequena o modo compacto se comporta como modal sem exigir expansão', async () => {
  vi.stubGlobal('matchMedia', query => ({ matches: query.includes('max-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const wrapper = mount(LiaChatShell, { props: { open: true, expanded: false }, global: { stubs: { Teleport: true } } }); wrappers.push(wrapper)
  await flushPromises()
  expect(wrapper.get('[role="dialog"]').attributes('aria-modal')).toBe('true')
  expect(document.body.style.overflow).toBe('hidden')
})

it('alternar redução de movimento não acumula bolinhas ou listeners da animação', async () => {
  let change
  const query = { matches: true, addEventListener: vi.fn((_name, handler) => { change = handler }), removeEventListener: vi.fn() }
  vi.stubGlobal('matchMedia', () => query)
  const wrapper = mount(LiaAvatar); wrappers.push(wrapper)
  const count = wrapper.findAll('circle').length
  change(); change()
  expect(wrapper.findAll('circle')).toHaveLength(count)
})

it('olhos acompanham o mouse fora da mascote dentro do chat e voltam ao sair', async () => {
  let frame
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { frame = callback; return 1 })
  const cancel = vi.spyOn(window, 'cancelAnimationFrame')
  const wrapper = mount({ components: { LiaAvatar }, template: '<section class="lia-window"><LiaAvatar /></section>' }); wrappers.push(wrapper)
  const area = wrapper.get('.lia-window'), avatar = wrapper.get('.lia-character')
  vi.spyOn(area.element, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 600, height: 600 })
  vi.spyOn(avatar.element, 'getBoundingClientRect').mockReturnValue({ left: 100, top: 100, width: 40, height: 40 })
  const eye = () => Number(wrapper.get('[data-l="eye-l"]').attributes('transform').match(/translate\(([-\d.]+)/)[1])
  const initial = eye()
  await area.trigger('pointermove', { clientX: 550, clientY: 550 }); frame(1000)
  expect(eye()).toBeGreaterThan(initial)
  const looking = eye(); await area.trigger('pointerleave'); frame(1016)
  expect(eye()).toBeLessThan(looking)
  wrapper.unmount(); wrappers = []; expect(cancel).toHaveBeenCalled()
})

it('estados de erro e sucesso exibem as expressões v3 sem movimento reduzido virar um loop', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const wrapper = mount(LiaAvatar, { props: { state: 'error' } }); wrappers.push(wrapper)
  expect(Number(wrapper.get('[data-l="x-eyes"]').attributes('opacity'))).toBe(1)
  await wrapper.setProps({ state: 'success' })
  expect(Number(wrapper.get('[data-l="arc-eyes"]').attributes('opacity'))).toBe(1)
  await wrapper.setProps({ state: 'responding' })
  expect(Number(wrapper.get('[data-l="x-eyes"]').attributes('opacity'))).toBe(0)
})

it('mascote do chat muda de pensar para responder e sinaliza falha real', async () => {
  const wrapper = chat(); await flushPromises()
  mocks.store.isSending = true; await flushPromises()
  expect(wrapper.get('.header-character').attributes('state')).toBe('thinking')
  mocks.store.streamText = 'Resposta sendo transmitida'; await flushPromises()
  expect(wrapper.get('.header-character').attributes('state')).toBe('responding')
  mocks.store.isSending = false; mocks.store.error = 'Falha no envio'; await flushPromises()
  expect(wrapper.get('.header-character').attributes('state')).toBe('error')
})
