import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { useLiaStore } from '@/stores/lia'
const mocks = vi.hoisted(() => ({ auth: null, list: vi.fn(), send: vi.fn(), messages: vi.fn(), create: vi.fn(), confirm: vi.fn(), cancel: vi.fn(), get: vi.fn(), remove: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/api/lia', () => ({ listLiaConversations: mocks.list, sendLiaMessage: mocks.send, getLiaMessages: mocks.messages, createLiaConversation: mocks.create, deleteLiaConversation: mocks.remove, getLiaConversation: mocks.get, confirmLiaAction: mocks.confirm, cancelLiaAction: mocks.cancel }))
let pinia
const deferred = () => { let resolve, reject; const promise = new Promise((done, fail) => { resolve = done; reject = fail }); return { promise, resolve, reject } }
const modelAnswer = (name = 'Resposta') => ({ data: { userMessage: { id: 'saved', role: 'user', content: 'Ver agenda' }, message: { id: 'assistant', role: 'assistant', content: name } } })
beforeEach(() => {
  pinia = createPinia(); setActivePinia(pinia); vi.resetAllMocks(); localStorage.clear()
  mocks.auth = reactive({ user: { _id: 'user', clinic: 'clinic', role: 'owner' } })
  mocks.list.mockResolvedValue({ data: { conversations: [], nextCursor: null } })
  mocks.messages.mockResolvedValue({ data: { messages: [], nextCursor: null } })
})
afterEach(() => disposePinia(pinia))

it('falha do provedor continua visível mesmo quando a pergunta já foi salva', async () => {
  const store = useLiaStore(); store.activeConversationId = 'old'
  mocks.send.mockImplementation(async (_id, content, options) => {
    mocks.messages.mockResolvedValue({ data: { messages: [{ id: 'saved', role: 'user', content, metadata: { clientMessageId: options.clientMessageId } }] } })
    throw { response: { status: 503, data: { message: 'Provedor indisponível' } } }
  })
  await expect(store.sendMessage('Ver agenda')).rejects.toBeTruthy()
  expect(store.error).toBe('Provedor indisponível')
  expect(store.messages).toHaveLength(1); expect(store.messages[0].status).toBe('failed')
})
it('resposta antiga não aparece depois de Nova conversa', async () => {
  const store = useLiaStore(); store.activeConversationId = 'old'; const pending = deferred(); mocks.send.mockReturnValue(pending.promise)
  const send = store.sendMessage('Ver agenda'); await Promise.resolve()
  store.startNewConversation(); pending.resolve(modelAnswer('Resposta antiga')); await send
  expect(store.messages).toEqual([]); expect(store.activeConversationId).toBeNull()
})
it('criação lenta de conversa não reabre conversa abandonada', async () => {
  const store = useLiaStore(); const pending = deferred(); mocks.create.mockReturnValue(pending.promise)
  const send = store.sendMessage('Ver agenda'); await Promise.resolve(); store.startNewConversation()
  pending.resolve({ data: { id: 'abandoned' } }); await send
  expect(store.activeConversationId).toBeNull(); expect(store.messages).toEqual([]); expect(mocks.send).not.toHaveBeenCalled()
})
it('trocar usuário limpa imediatamente mensagens, histórico, seleção e drawer', async () => {
  const store = useLiaStore(); store.messages = [{ id: 'private', content: 'Dado da sessão anterior' }]; store.isOpen = true; store.activeConversationId = 'old'
  mocks.auth.user = { _id: 'another', clinic: 'another-clinic', role: 'owner' }
  expect(store.messages).toEqual([]); expect(store.conversations).toEqual([]); expect(store.activeConversationId).toBeNull(); expect(store.isOpen).toBe(false)
})
it('logout e revogação de permissão limpam dados em memória', () => {
  const store = useLiaStore(); store.messages = [{ id: 'private' }]
  mocks.auth.user.permissions = []
  expect(store.messages).toEqual([])
  store.messages = [{ id: 'private-again' }]; mocks.auth.user = null
  expect(store.messages).toEqual([])
})
it('resposta de outra identidade não altera a sessão atual', async () => {
  const store = useLiaStore(); store.activeConversationId = 'old'; const pending = deferred(); mocks.send.mockReturnValue(pending.promise)
  const send = store.sendMessage('Ver agenda'); await Promise.resolve(); mocks.auth.user = { _id: 'other', clinic: 'other', role: 'owner' }
  pending.resolve(modelAnswer('Dado antigo')); await send
  expect(store.messages).toEqual([])
})
it('listagem antiga não repõe histórico de outra conta', async () => {
  const store = useLiaStore(); const pending = deferred(); mocks.list.mockReturnValueOnce(pending.promise)
  const request = store.loadConversations(); mocks.auth.user = { _id: 'other', clinic: 'other', role: 'owner' }
  pending.resolve({ data: { conversations: [{ id: 'private-old' }] } }); await request
  expect(store.conversations).toEqual([])
})
it('inicialização com erro pode ser repetida na mesma identidade', async () => {
  const store = useLiaStore(); mocks.list.mockRejectedValueOnce(new Error('offline'))
  await store.initialize(); expect(store.error).toBeTruthy()
  await store.initialize(); expect(mocks.list).toHaveBeenCalledTimes(2); expect(store.error).toBeNull()
})
it('reenvio preserva clientMessageId para evitar duplicação', async () => {
  const store = useLiaStore(); store.activeConversationId = 'old'; mocks.send.mockRejectedValueOnce(new Error('offline'))
  await expect(store.sendMessage('Ver agenda')).rejects.toBeTruthy()
  const failed = store.messages[0]; const requestId = mocks.send.mock.calls[0][2].clientMessageId
  mocks.send.mockResolvedValueOnce(modelAnswer()); await store.retryMessage(failed)
  expect(mocks.send.mock.calls[1][2].clientMessageId).toBe(requestId)
  expect(store.messages.filter(item => item.role === 'user')).toHaveLength(1)
})
it('perda da resposta HTTP reconhece resposta concluída pelo replyTo, não só pelo texto da pergunta', async () => {
  const store = useLiaStore(); store.activeConversationId = 'old'
  mocks.send.mockImplementation(async (_id, content, options) => {
    mocks.messages.mockResolvedValue({ data: { messages: [
      { id: 'saved', role: 'user', content, metadata: { clientMessageId: options.clientMessageId } },
      { id: 'assistant', role: 'assistant', content: 'Concluído', metadata: { replyTo: 'saved' } },
    ] } }); throw new Error('network')
  })
  expect((await store.sendMessage('Ver agenda')).content).toBe('Concluído'); expect(store.error).toBeNull()
})
it('erro da listagem não transforma uma resposta concluída em falha', async () => {
  const store = useLiaStore(); store.activeConversationId = 'old'; mocks.send.mockResolvedValue(modelAnswer()); mocks.list.mockRejectedValue(new Error('offline'))
  expect((await store.sendMessage('Ver agenda')).role).toBe('assistant'); expect(store.error).toBeNull()
})
it('confirmação que falha mostra erro e atualiza o card', async () => {
  const store = useLiaStore(); store.activeConversationId = 'old'
  const message = { id: 'card', metadata: { confirmation: { id: 'action', status: 'pending' } } }; store.messages = [message]
  mocks.confirm.mockRejectedValue({ response: { status: 409, data: { message: 'Card expirou' } } })
  mocks.messages.mockResolvedValue({ data: { messages: [{ ...message, metadata: { confirmation: { id: 'action', status: 'failed' } } }] } })
  await store.confirmAction(message)
  expect(store.error).toBe('Card expirou'); expect(store.messages[0].metadata.confirmation.status).toBe('failed')
})
it('carrega mensagens anteriores sem duplicar as já exibidas', async () => {
  const store = useLiaStore(); store.activeConversationId = 'old'; store.messages = [{ id: 'new' }]; store.messagesCursor = 'cursor'
  mocks.messages.mockResolvedValue({ data: { messages: [{ id: 'older' }, { id: 'new' }], nextCursor: null } })
  await store.loadOlderMessages()
  expect(store.messages.map(item => item.id)).toEqual(['older', 'new']); expect(mocks.messages.mock.calls[0][1].before).toBe('cursor')
})
