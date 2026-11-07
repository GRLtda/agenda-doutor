import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import axios from 'axios'
import { consumeLiaStream, streamAdapter } from '@/api/liaStream'
import LiaResponseFeedback from '@/components/lia/LiaResponseFeedback.vue'
const mocks = vi.hoisted(() => ({ post: vi.fn(), feedback: vi.fn() }))
vi.mock('@/api/index', () => ({ default: { post: mocks.post } }))
vi.mock('@/api/lia', () => ({ submitLiaFeedback: mocks.feedback }))
let wrappers
beforeEach(() => { wrappers = []; vi.resetAllMocks(); mocks.feedback.mockResolvedValue({ data: { feedback: { kind: 'rating', vote: 'negative', status: 'new' } } }) })
afterEach(() => { wrappers.forEach(wrapper => wrapper.unmount()); vi.unstubAllGlobals(); vi.restoreAllMocks() })
const event = (type, data) => `event: ${type}\r\ndata: ${JSON.stringify(data)}\r\n\r\n`
const complete = { conversationId: 'one', userMessage: { id: 'q' }, message: { id: 'a', role: 'assistant', content: 'Resposta validada' } }
function body(text, fragment = true) {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream({ start(controller) { if (fragment) for (const byte of bytes) controller.enqueue(new Uint8Array([byte])); else controller.enqueue(bytes); controller.close() } })
}
it('cliente preserva UTF-8 em frames fragmentados e só conclui com evento final', async () => {
  const receive = vi.fn()
  const result = await consumeLiaStream(body(': keepalive\r\n\r\n' + event('status', { phase: 'tool', label: 'Consultando os pacientes' }) + event('text', { content: 'Olá, clínica 👋' }) + event('complete', complete)), receive)
  expect(receive).toHaveBeenCalledWith({ type: 'text', content: 'Olá, clínica 👋' })
  expect(result.data.message.content).toBe('Resposta validada')
})
it('cliente rejeita EOF incompleto, frame inválido e erro do servidor', async () => {
  await expect(consumeLiaStream(body(event('text', { content: 'Parcial' })), vi.fn())).rejects.toThrow('antes de concluir')
  await expect(consumeLiaStream(body('event: text\ndata: {bad}\n\n'), vi.fn())).rejects.toThrow()
  await expect(consumeLiaStream(body(event('error', { code: 'LIA_ACCESS_CHANGED', status: 403, message: 'Acesso alterado' })), vi.fn())).rejects.toMatchObject({ response: { status: 403, data: { code: 'LIA_ACCESS_CHANGED' } } })
})
it('cancelamento não transforma uma resposta incompleta em sucesso', async () => {
  const controller = new AbortController(); controller.abort()
  await expect(consumeLiaStream(body(event('complete', complete)), vi.fn(), controller.signal)).rejects.toMatchObject({ code: 'ERR_CANCELED' })
})
it('abort interrompe uma leitura pendente e libera o leitor', async () => {
  const cancel = vi.fn(), controller = new AbortController()
  const pendingBody = new ReadableStream({ cancel })
  const reading = consumeLiaStream(pendingBody, vi.fn(), controller.signal)
  controller.abort()
  await expect(reading).rejects.toMatchObject({ code: 'ERR_CANCELED' })
  expect(cancel).toHaveBeenCalled(); expect(pendingBody.locked).toBe(false)
})
it('erros HTTP viram JSON antes dos interceptores de autenticação', async () => {
  vi.spyOn(axios, 'getAdapter').mockReturnValue(async () => { throw { response: { status: 401, data: body(JSON.stringify({ code: 'AUTH_SESSION_REVOKED', message: 'Sessão revogada' })) } } })
  const config = { url: '/lia', responseType: 'stream' }
  await expect(streamAdapter(config)).rejects.toMatchObject({ response: { status: 401, data: { code: 'AUTH_SESSION_REVOKED' } } })
})
function feedback() {
  const wrapper = mount(LiaResponseFeedback, { props: { message: { id: 'answer', metadata: {} }, conversationId: 'conversation' } }); wrappers.push(wrapper); return wrapper
}
it('não gostei tem quatro motivos e outro personalizado; sem compartilhar contexto por padrão', async () => {
  const wrapper = feedback(); await wrapper.get('[aria-label="Não gostei da resposta"]').trigger('click')
  expect(wrapper.findAll('input[type=radio]')).toHaveLength(5)
  await wrapper.get('input[value=other]').setValue(true)
  expect(wrapper.get('[type=submit]').element.disabled).toBe(true)
  await wrapper.get('textarea').setValue('Minha sugestão de melhoria')
  await wrapper.get('form').trigger('submit'); await flushPromises()
  expect(mocks.feedback).toHaveBeenCalledExactlyOnceWith('conversation', 'answer', { kind: 'rating', vote: 'negative', reason: 'other', note: 'Minha sugestão de melhoria', shareContext: false })
  expect(wrapper.text()).toContain('Avaliação recebida')
})
it('denúncia é separada da avaliação e contexto exige escolha explícita', async () => {
  const wrapper = feedback(); await wrapper.get('[aria-label="Denunciar resposta"]').trigger('click')
  await wrapper.get('input[value=privacy]').setValue(true); await wrapper.get('input[type=checkbox]').setValue(true)
  mocks.feedback.mockResolvedValue({ data: { feedback: { kind: 'report' } } })
  await wrapper.get('form').trigger('submit'); await flushPromises()
  expect(mocks.feedback.mock.calls[0][2]).toEqual({ kind: 'report', reason: 'privacy', note: '', shareContext: true })
  expect(wrapper.text()).toContain('Denúncia recebida')
})
it('agora não não envia avaliação; falha preserva o texto para tentar novamente', async () => {
  const wrapper = feedback(); await wrapper.get('[aria-label="Gostei da resposta"]').trigger('click')
  await wrapper.get('.feedback-actions button[type=button]').trigger('click'); expect(mocks.feedback).not.toHaveBeenCalled()
  await wrapper.get('[aria-label="Gostei da resposta"]').trigger('click'); await wrapper.get('textarea').setValue('Comentário mantido')
  mocks.feedback.mockRejectedValueOnce(new Error('offline'))
  await wrapper.get('form').trigger('submit'); await flushPromises()
  expect(wrapper.get('textarea').element.value).toBe('Comentário mantido'); expect(wrapper.text()).toContain('Não foi possível enviar')
})
