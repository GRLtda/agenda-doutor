import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import LiaChatDrawer from '@/components/lia/LiaChatDrawer.vue'
import LiaConversationHistory from '@/components/lia/LiaConversationHistory.vue'
import LiaAvatar from '@/components/lia/LiaAvatar.vue'
import LiaChatShell from '@/components/lia/LiaChatShell.vue'
import LiaLauncher from '@/components/lia/LiaLauncher.vue'
import LiaConversationSearch from '@/components/lia/LiaConversationSearch.vue'
import { buildLiaChart } from '@/components/lia/liaChart'

const mocks = vi.hoisted(() => ({ store: null, auth: null, page: null, transcribe: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/lia', () => ({ useLiaStore: () => mocks.store }))
vi.mock('@/composables/useLiaPageContext', () => ({ useLiaPageContext: () => mocks.page }))
vi.mock('@/api/lia', () => ({ transcribeLiaAudio: mocks.transcribe, submitLiaFeedback: vi.fn() }))
vi.mock('@/components/lia/liaAudio', async original => ({ ...await original(), recordingToWav: vi.fn().mockResolvedValue(new Blob(['synthetic'], { type: 'audio/wav' })) }))
let wrappers
beforeEach(() => {
  wrappers = []
  mocks.transcribe.mockReset()
  vi.stubGlobal('matchMedia', vi.fn(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
  mocks.auth = reactive({ user: { _id: 'synthetic-user', name: 'Guilherme Exemplo', role: 'owner' } })
  mocks.page = ref(null)
  mocks.store = reactive({ isAvailable: true, isLoading: false, isLoadingMore: false, isSending: false, error: null, messages: [], conversations: [], activeConversationId: null, messagesCursor: null, nextCursor: null,
    initialize: vi.fn().mockResolvedValue(), sendMessage: vi.fn().mockResolvedValue(), retryMessage: vi.fn().mockResolvedValue(),
    selectConversation: vi.fn().mockImplementation(async id => { mocks.store.activeConversationId = id }),
    startNewConversation: vi.fn().mockImplementation(() => { mocks.store.messages = []; mocks.store.activeConversationId = null }),
    deleteConversation: vi.fn().mockResolvedValue(), confirmAction: vi.fn(), cancelAction: vi.fn(), loadMore: vi.fn(), loadMessages: vi.fn().mockResolvedValue(), loadOlderMessages: vi.fn(),
    updateConversation: vi.fn().mockResolvedValue(), searchConversations: vi.fn().mockResolvedValue({ conversations: [], nextCursor: null }),
  })
})
afterEach(() => { for (const wrapper of wrappers) wrapper.unmount(); document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.restoreAllMocks() })
function chat() {
  const wrapper = mount(LiaChatDrawer, { props: { open: true }, attachTo: document.body,
    global: { stubs: { Teleport: true, LiaAvatar: { template: '<span class="avatar-stub" />' } } } })
  wrappers.push(wrapper); return wrapper
}
function history() { const wrapper = mount(LiaConversationHistory, { attachTo: document.body }); wrappers.push(wrapper); return wrapper }
async function askDelete(wrapper) {
  await wrapper.get('.conversation-options').trigger('click'); await flushPromises()
  await wrapper.get('.conversation-menu .destructive').trigger('click'); await flushPromises()
}

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
  const wrapper = chat(); await flushPromises(); await wrapper.get('button[aria-label="Abrir histórico"]').trigger('click')
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
  await wrapper.get('button[aria-label="Abrir histórico"]').trigger('click')
  await wrapper.get('.back-button').trigger('click')
  expect(wrapper.get('textarea').element.value).toBe('Rascunho antigo')
  await wrapper.get('button[aria-label="Abrir histórico"]').trigger('click'); await wrapper.get('.history-select').trigger('click')
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
it('voz fica ao lado de enviar: pausar preenche o campo e enviar durante a fala envia direto', async () => {
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) } })
  vi.stubGlobal('AudioContext', class {})
  vi.stubGlobal('OfflineAudioContext', class {})
  vi.stubGlobal('MediaRecorder', class {
    state = 'inactive'; mimeType = 'audio/webm'
    static isTypeSupported() { return true }
    start() { this.state = 'recording' }
    stop() { this.state = 'inactive'; this.ondataavailable?.({ data: new Blob(['synthetic']) }); this.onstop?.() }
  })
  mocks.transcribe.mockResolvedValueOnce({ data: { text: 'Pergunta para revisar' } }).mockResolvedValueOnce({ data: { text: 'Pergunta para enviar direto' } })
  const wrapper = chat(); await flushPromises()
  expect(wrapper.get('.microphone').element.nextElementSibling).toBe(wrapper.get('[aria-label="Enviar mensagem"]').element)
  await wrapper.get('.microphone').trigger('click'); await flushPromises()
  expect(wrapper.get('textarea').isVisible()).toBe(false)
  expect(wrapper.find('.voice-waveform').exists()).toBe(true)
  expect(wrapper.get('[aria-label="Enviar mensagem"]').element.disabled).toBe(false)
  await wrapper.get('.pause-recording').trigger('click'); await flushPromises()
  expect(wrapper.get('textarea').element.value).toBe('Pergunta para revisar')
  expect(wrapper.get('textarea').isVisible()).toBe(true)
  expect(document.activeElement).toBe(wrapper.get('textarea').element)
  expect(mocks.store.sendMessage).not.toHaveBeenCalled()
  await wrapper.get('[aria-label="Enviar mensagem"]').trigger('click'); await flushPromises()
  expect(mocks.store.sendMessage).toHaveBeenCalledWith('Pergunta para revisar', {})
  await wrapper.get('.microphone').trigger('click'); await flushPromises()
  await wrapper.get('[aria-label="Enviar mensagem"]').trigger('click'); await flushPromises()
  expect(mocks.store.sendMessage).toHaveBeenLastCalledWith('Pergunta para enviar direto', {})
  expect(mocks.store.sendMessage).toHaveBeenCalledTimes(2)
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
  expect(wrapper.text()).not.toContain('Resultados da clínica'); expect(wrapper.text()).toContain('Movimento da clínica')
})
it('sugestões vêm da resposta, preenchem o campo e não abrem outro assunto', async () => {
  mocks.store.messages = [{ id: 'one', role: 'assistant', content: 'Veja sua agenda.', metadata: { suggestions: [{ label: 'Preparar consulta', prompt: 'Quero preparar um agendamento.' }, { label: 'Ver amanhã', prompt: 'Mostre minha agenda de amanhã.' }] } }]
  const wrapper = chat(); await flushPromises()
  expect(wrapper.findAll('.followups button')).toHaveLength(2); expect(wrapper.text()).not.toContain('Outro assunto')
  await wrapper.get('.followups button').trigger('click')
  expect(wrapper.get('textarea').element.value).toBe('Quero preparar um agendamento.')
  expect(mocks.store.sendMessage).not.toHaveBeenCalled()
})
it('abertura da conversa apresenta skeleton discreto em vez de mensagens antigas', async () => {
  mocks.store.isLoading = true
  const wrapper = chat(); await flushPromises()
  expect(wrapper.find('.conversation-skeleton').exists()).toBe(true)
  expect(wrapper.find('.welcome').exists()).toBe(false)
  expect(wrapper.get('textarea').element.disabled).toBe(true)
})
it('escolha de horário em outra data usa a data completa retornada', async () => {
  mocks.store.messages = [{ id: 'one', role: 'assistant', content: 'Horários', metadata: { availabilityAlternatives: { professionalId: 'professional', patientId: 'patient', durationMinutes: 30, times: [{ date: '2030-01-16', time: '00:30', startAt: '2030-01-16T03:30:00Z' }] } } }]
  const wrapper = chat(); await flushPromises(); await wrapper.get('.time-alternatives button').trigger('click'); await flushPromises()
  expect(mocks.store.sendMessage).toHaveBeenCalledWith('Pode ser em 2030-01-16 às 00:30.', expect.objectContaining({ selectedAlternative: { date: '2030-01-16', time: '00:30', professionalId: 'professional', durationMinutes: 30 } }))
})
it('histórico mostra só títulos e oferece exclusão apenas pelo menu e confirmação', async () => {
  mocks.store.conversations = [{ id: 'one', title: 'Reunião da clínica', updatedAt: new Date().toISOString() }, { id: 'two', title: 'Outra conversa', updatedAt: new Date().toISOString() }]
  const wrapper = history()
  expect(wrapper.findAll('.history-item')).toHaveLength(2)
  expect(wrapper.find('.history-select small').exists()).toBe(false)
  expect(wrapper.find('.delete-button').exists()).toBe(false)
  await askDelete(wrapper); expect(mocks.store.deleteConversation).not.toHaveBeenCalled()
  await wrapper.get('.lia-confirm .destructive').trigger('click'); await flushPromises()
  expect(mocks.store.deleteConversation).toHaveBeenCalledExactlyOnceWith('one')
})
it('falha ao excluir mantém o histórico e mostra erro recuperável', async () => {
  mocks.store.conversations = [{ id: 'one', title: 'Conversa', updatedAt: new Date().toISOString() }]
  mocks.store.deleteConversation.mockRejectedValueOnce(new Error('offline'))
  const wrapper = history(); await askDelete(wrapper); await wrapper.get('.lia-confirm .destructive').trigger('click'); await flushPromises()
  expect(wrapper.text()).toContain('Não foi possível excluir'); expect(wrapper.findAll('.history-item')).toHaveLength(1)
})
it('Recentes recolhe e reabre a lista sem perder a conversa selecionada', async () => {
  mocks.store.conversations = [{ id: 'one', title: 'Conversa', updatedAt: new Date().toISOString() }]
  mocks.store.activeConversationId = 'one'
  const wrapper = history()
  expect(wrapper.get('.recent-toggle').text()).toBe('Recentes')
  await wrapper.get('.recent-toggle').trigger('click')
  expect(wrapper.get('#lia-recent-conversations').isVisible()).toBe(false)
  expect(mocks.store.activeConversationId).toBe('one')
  await wrapper.get('.recent-toggle').trigger('click')
  expect(wrapper.get('#lia-recent-conversations').isVisible()).toBe(true)
})
it('lateral fecha por completo e busca abre em diálogo preservando o rascunho', async () => {
  const wrapper = chat(); await flushPromises(); await wrapper.get('textarea').setValue('Meu rascunho')
  expect(wrapper.find('.lia-history').exists()).toBe(false)
  expect(wrapper.find('.history-search').exists()).toBe(false)
  expect(wrapper.find('.lia-identity').exists()).toBe(false)
  await wrapper.get('[aria-label="Abrir histórico"]').trigger('click')
  expect(wrapper.get('.history-shortcuts').text()).toContain('Nova conversa')
  await wrapper.get('button[aria-label="Conversas recentes"]').trigger('click'); await flushPromises()
  expect(wrapper.get('dialog[aria-label="Buscar conversas recentes"]').exists()).toBe(true)
  expect(document.activeElement).toBe(wrapper.get('[aria-label="Pesquisar conversas"]').element)
  expect(mocks.store.searchConversations).toHaveBeenCalledWith('', undefined, expect.any(AbortSignal))
  await wrapper.get('[aria-label="Fechar busca"]').trigger('click')
  await wrapper.get('[aria-label="Recolher histórico"]').trigger('click')
  expect(wrapper.find('.lia-history').exists()).toBe(false)
  expect(wrapper.get('textarea').element.value).toBe('Meu rascunho')
  await wrapper.get('[aria-label="Expandir conversa"]').trigger('click')
  await wrapper.get('[aria-label="Recolher histórico"]').trigger('click')
  expect(wrapper.get('.lia-chat').isVisible()).toBe(true)
  expect(wrapper.find('.lia-history').exists()).toBe(false)
})
it('exclusão abre diálogo com cancelar em foco; Escape cancela sem fechar a Lia', async () => {
  mocks.store.conversations = [{ id: 'one', title: 'Conversa', updatedAt: new Date().toISOString() }]
  const wrapper = chat(); await flushPromises()
  await wrapper.get('[aria-label="Abrir histórico"]').trigger('click')
  const opener = wrapper.get('.conversation-options'); opener.element.focus(); await askDelete(wrapper)
  expect(wrapper.get('[role="alertdialog"]').attributes('aria-modal')).toBe('true')
  expect(document.activeElement.textContent).toBe('Cancelar')
  await wrapper.get('[role="alertdialog"]').trigger('keydown', { key: 'Escape' }); await flushPromises()
  expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
  expect(mocks.store.deleteConversation).not.toHaveBeenCalled()
  expect(wrapper.emitted('close')).toBeUndefined()
  expect(document.activeElement).toBe(opener.element)
})
it('confirmação em andamento bloqueia duplicação e cancelamento', async () => {
  mocks.store.conversations = [{ id: 'one', title: 'Conversa' }]
  let finish
  mocks.store.deleteConversation.mockReturnValue(new Promise(resolve => { finish = resolve }))
  const wrapper = history(); await askDelete(wrapper)
  await wrapper.get('.lia-confirm .destructive').trigger('click')
  expect(wrapper.findAll('.dialog-actions button').every(button => button.element.disabled)).toBe(true)
  await wrapper.get('[role="alertdialog"]').trigger('keydown', { key: 'Escape' })
  expect(wrapper.find('[role="alertdialog"]').exists()).toBe(true)
  expect(mocks.store.deleteConversation).toHaveBeenCalledTimes(1)
  finish(); await flushPromises()
  expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false)
})
it('botão flutuante acompanha processamento e avisa sobre resposta sem mostrar conteúdo', async () => {
  const wrapper = mount(LiaLauncher, { global: { stubs: { LiaAvatar: { template: '<span class="avatar-stub" />' } } } }); wrappers.push(wrapper)
  mocks.store.isSending = true; await flushPromises()
  expect(wrapper.get('.launcher-character').attributes('state')).toBe('thinking')
  mocks.store.streamText = 'Texto privado'; await flushPromises()
  expect(wrapper.get('.launcher-character').attributes('state')).toBe('responding')
  mocks.store.isSending = false; mocks.store.backgroundNotice = 'answer'; await flushPromises()
  expect(wrapper.text()).toContain('Resposta pronta'); expect(wrapper.text()).not.toContain('Texto privado')
  expect(wrapper.find('.notice-dot').exists()).toBe(true)
  mocks.store.backgroundNotice = 'error'; await flushPromises()
  expect(wrapper.get('.launcher-character').attributes('state')).toBe('error')
  await wrapper.get('button').trigger('click')
  expect(mocks.store.isOpen).toBe(true)
  expect(wrapper.find('button').exists()).toBe(false)
})
it('menu renomeia com persistência e fixa ou desafixa sem selecionar a conversa', async () => {
  mocks.store.conversations = [{ id: 'one', title: 'Original' }]
  const wrapper = history()
  await wrapper.get('.conversation-options').trigger('click'); await flushPromises()
  await wrapper.get('.conversation-menu button').trigger('click'); await flushPromises()
  const field = wrapper.get('[aria-label="Novo título"]')
  expect(document.activeElement).toBe(field.element)
  await field.setValue('Novo nome'); await wrapper.get('form').trigger('submit'); await flushPromises()
  expect(mocks.store.updateConversation).toHaveBeenCalledWith('one', { title: 'Novo nome' })
  await wrapper.get('.conversation-options').trigger('click'); await flushPromises()
  await wrapper.findAll('.conversation-menu button')[1].trigger('click'); await flushPromises()
  expect(mocks.store.updateConversation).toHaveBeenCalledWith('one', { pinned: true })
  mocks.store.conversations[0].pinnedAt = '2026-11-01'; await flushPromises()
  expect(wrapper.text()).toContain('Fixadas')
  await wrapper.get('.conversation-options').trigger('click'); await flushPromises()
  expect(wrapper.findAll('.conversation-menu button')[1].text()).toContain('Desafixar')
  await wrapper.findAll('.conversation-menu button')[1].trigger('click'); await flushPromises()
  expect(mocks.store.updateConversation).toHaveBeenCalledWith('one', { pinned: false })
  expect(wrapper.emitted('select')).toBeUndefined()
})
it('falha ao renomear preserva o título digitado e permite tentar de novo', async () => {
  mocks.store.conversations = [{ id: 'one', title: 'Original' }]
  mocks.store.updateConversation.mockRejectedValueOnce(new Error('offline'))
  const wrapper = history(); await wrapper.get('.conversation-options').trigger('click'); await flushPromises()
  await wrapper.get('.conversation-menu button').trigger('click'); await flushPromises()
  await wrapper.get('input').setValue('Manter rascunho'); await wrapper.get('form').trigger('submit'); await flushPromises()
  expect(wrapper.get('input').element.value).toBe('Manter rascunho')
  expect(wrapper.text()).toContain('Não foi possível renomear')
})
it('busca ignora retorno antigo, pagina e seleciona sem expor previews', async () => {
  let oldResult
  mocks.store.searchConversations.mockReturnValueOnce(new Promise(resolve => { oldResult = resolve }))
  const wrapper = mount(LiaConversationSearch, { attachTo: document.body }); wrappers.push(wrapper)
  await wrapper.get('input').setValue('Retornos')
  mocks.store.searchConversations.mockResolvedValueOnce({ conversations: [{ id: 'found', title: 'Retornos', lastMessagePreview: 'Não mostrar preview' }], nextCursor: 'more' })
  await new Promise(resolve => setTimeout(resolve, 280)); await flushPromises()
  oldResult({ conversations: [{ id: 'old', title: 'Antiga' }], nextCursor: null }); await flushPromises()
  expect(wrapper.text()).not.toContain('Antiga'); expect(wrapper.text()).not.toContain('Não mostrar preview')
  mocks.store.searchConversations.mockResolvedValueOnce({ conversations: [{ id: 'second', title: 'Outro retorno' }], nextCursor: null })
  await wrapper.get('.load-more').trigger('click'); await flushPromises()
  expect(mocks.store.searchConversations).toHaveBeenLastCalledWith('Retornos', 'more', expect.any(AbortSignal))
  expect(wrapper.findAll('.search-result')).toHaveLength(2)
  await wrapper.get('.search-result').trigger('click')
  expect(wrapper.emitted('select')).toEqual([['found']])
})
it('celular sempre abre tela cheia, sem botão de ampliar, e acompanha o teclado', async () => {
  const viewport = new EventTarget()
  Object.assign(viewport, { height: 740, offsetTop: 0, scale: 1 })
  vi.stubGlobal('visualViewport', viewport)
  vi.stubGlobal('matchMedia', query => ({ matches: query.includes('max-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const wrapper = chat(); await flushPromises()
  expect(wrapper.get('.lia-workspace').classes()).toEqual(expect.arrayContaining(['mobile', 'expanded']))
  expect(wrapper.find('.view-mode').exists()).toBe(false)
  expect(wrapper.get('.lia-workspace').element.style.height).toBe('740px')
  viewport.height = 400; viewport.offsetTop = 20; viewport.dispatchEvent(new Event('resize')); await flushPromises()
  expect(wrapper.get('.lia-workspace').element.style.height).toBe('400px')
  expect(wrapper.get('.lia-workspace').element.style.getPropertyValue('--lia-viewport-top')).toBe('20px')
  expect(wrapper.get('[aria-label="Lia, assistente da clínica"]').attributes('aria-modal')).toBe('true')
})
it('no celular bloqueia o documento atrás do chat e restaura os estilos ao fechar', async () => {
  vi.stubGlobal('matchMedia', query => ({ matches: query.includes('max-width'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const wrapper = chat(); await flushPromises()
  expect(document.documentElement.style.overflow).toBe('hidden')
  expect(document.body.style.position).toBe('fixed')
  expect(document.body.style.overflow).toBe('hidden')
  await wrapper.setProps({ open: false }); await flushPromises()
  expect(document.documentElement.style.overflow).toBe('')
  expect(document.body.style.position).toBe('')
  expect(document.body.style.overflow).toBe('')
})
it('celular deitado mantém tela cheia e não oferece reduzir a janela', async () => {
  vi.stubGlobal('matchMedia', query => ({ matches: query.includes('(max-height: 500px) and (pointer: coarse)'), media: query, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  const wrapper = chat(); await flushPromises()
  expect(wrapper.get('.lia-workspace').classes()).toContain('mobile')
  expect(wrapper.find('.view-mode').exists()).toBe(false)
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
  expect(wrapper.get('.welcome-character').attributes('state')).toBe('thinking')
  mocks.store.streamText = 'Resposta sendo transmitida'; await flushPromises()
  expect(wrapper.get('.welcome-character').attributes('state')).toBe('responding')
  mocks.store.isSending = false; mocks.store.error = 'Falha no envio'; await flushPromises()
  expect(wrapper.get('.welcome-character').attributes('state')).toBe('error')
})

