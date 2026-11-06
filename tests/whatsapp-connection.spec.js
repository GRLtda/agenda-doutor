import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import Connection from '@/views/pages/marketing/pages/ConnectionTab.vue'
const mocks = vi.hoisted(() => ({ store: null }))
vi.mock('@/stores/crm', () => ({ useCrmStore: () => mocks.store }))
let wrapper
beforeEach(() => {
  mocks.store = reactive({
    status: 'disconnected',
    connections: [],
    qrCode: null,
    isLoading: false,
    isLoadingQrImage: false,
    connectionError: null,
    getInitialStatus: vi.fn().mockResolvedValue(),
    stopPolling: vi.fn(),
    initiateOrResetConnection: vi.fn(),
    logoutConnection: vi.fn(),
  })
})
afterEach(() => wrapper?.unmount())
it('oferece pareamento sem logs, horários e dados de conta simulados', async () => {
  wrapper = mount(Connection)
  await flushPromises()
  expect(mocks.store.getInitialStatus).toHaveBeenCalledWith({ showToast: false })
  expect(wrapper.text()).toContain('Vincule o WhatsApp da clínica')
  expect(wrapper.findAll('.guidance > section h2').map(heading => heading.text())).toEqual([
    'Como conectar', 'Não conseguiu conectar?', 'Sobre suas mensagens',
  ])
  expect(wrapper.text()).not.toMatch(
    /Logs de Conexão|Pessoal|API Version|Session ID|24\/7|há 1 min/,
  )
  await wrapper
    .findAll('button')
    .find((button) => button.text().includes('Gerar QR Code'))
    .trigger('click')
  expect(mocks.store.initiateOrResetConnection).toHaveBeenCalledOnce()
})
it('usa skeleton até terminar a verificação inicial', async () => {
  let finish
  mocks.store.getInitialStatus = vi.fn(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  wrapper = mount(Connection)
  expect(wrapper.find('.skeleton-state').exists()).toBe(true)
  expect(wrapper.find('.disconnected-state').exists()).toBe(false)
  finish()
  await flushPromises()
  expect(wrapper.find('.disconnected-state').exists()).toBe(true)
})
it('mostra QR real e substitui o código pela conta quando conecta', async () => {
  mocks.store.status = 'qrcode_pending'
  mocks.store.qrCode = 'data:image/png;base64,example'
  wrapper = mount(Connection)
  await flushPromises()
  expect(wrapper.get('.qr-frame img').attributes('src')).toBe(mocks.store.qrCode)
  mocks.store.status = 'connected'
  mocks.store.connections = [
    { username: 'Clínica Exemplo', number: '5511999991234@s.whatsapp.net', instance: {} },
  ]
  await flushPromises()
  expect(wrapper.find('.qr-frame').exists()).toBe(false)
  expect(wrapper.text()).toContain('+55 (11) 99999-1234')
  expect(wrapper.text()).not.toContain('Pessoal')
  await wrapper
    .findAll('button')
    .find((button) => button.text() === 'Desconectar')
    .trigger('click')
  expect(mocks.store.logoutConnection).toHaveBeenCalledOnce()
})
it('erro permite consultar novamente sem iniciar uma nova sessão', async () => {
  mocks.store.status = 'api_error'
  wrapper = mount(Connection)
  await flushPromises()
  expect(wrapper.get('[role="status"]').text()).toContain('Verificação indisponível')
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(mocks.store.getInitialStatus).toHaveBeenCalledTimes(2)
  expect(mocks.store.initiateOrResetConnection).not.toHaveBeenCalled()
})

it('apresenta foto, número, biografia e identificação comercial; foto quebrada usa iniciais', async () => {
  mocks.store.status = 'connected'
  mocks.store.connections = [{
    username: 'Clínica Exemplo', number: '5511999991234:56@s.whatsapp.net',
    profileImage: 'https://example.com/avatar.jpg', bio: 'Atendimento com hora marcada.\nSegunda a sexta.',
    instance: { isBusiness: true },
  }]
  wrapper = mount(Connection)
  await flushPromises()
  expect(wrapper.get('.avatar img').attributes('src')).toBe('https://example.com/avatar.jpg')
  expect(wrapper.get('.phone').text()).toBe('+55 (11) 99999-1234')
  expect(wrapper.get('.account-bio').text()).toContain('Segunda a sexta.')
  expect(wrapper.get('.account-type').text()).toBe('Conta comercial')
  await wrapper.get('.avatar img').trigger('error')
  expect(wrapper.get('.avatar-initials').text()).toBe('CE')
  mocks.store.connections[0].profileImage = 'https://example.com/new-avatar.jpg'
  await flushPromises()
  expect(wrapper.get('.avatar img').attributes('src')).toContain('new-avatar.jpg')
})

it('explica dados ausentes e renderiza biografia como texto', async () => {
  mocks.store.status = 'connected'
  mocks.store.connections = [{ username: 'Clínica Exemplo', instance: { isBusiness: null } }]
  wrapper = mount(Connection)
  await flushPromises()
  expect(wrapper.get('.phone').text()).toBe('Número não informado')
  expect(wrapper.get('.account-bio').text()).toBe('Biografia não informada')
  expect(wrapper.get('.account-type').text()).toBe('Não informado pelo WhatsApp')
  mocks.store.connections[0].bio = '<img src=x onerror=alert(1)>'
  await flushPromises()
  expect(wrapper.get('.account-bio').text()).toBe('<img src=x onerror=alert(1)>')
  expect(wrapper.find('.account-bio img').exists()).toBe(false)
})

it('preserva a idade do vínculo e substitui os blocos removidos por informações reais de privacidade', async () => {
  mocks.store.status = 'connected'
  mocks.store.connections = [{
    username: 'Clínica Exemplo', linkedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    instance: { sending: { rateLimitPerMinute: 20, minDelayMs: 1500, maxDelayMs: 6000, pausedUntil: null } },
  }]
  wrapper = mount(Connection)
  await flushPromises()
  expect(wrapper.get('.linked-age').text()).toBe('Há 2 dias')
  expect(wrapper.text()).not.toMatch(/Criação da conta no WhatsApp|Risco de suspensão|Alertas de envio|mensagens\/min/)
  expect(wrapper.findAll('.privacy-panel')).toHaveLength(2)
  expect(wrapper.text()).toContain('Esta tela não exibe suas conversas.')
  expect(wrapper.text()).toContain('A integração recebe e armazena mensagens')
  expect(wrapper.text()).toContain('Sem espelhamento do celular')
  expect(wrapper.text()).not.toMatch(/não podemos ler|não temos acesso às mensagens/i)
})

it('mantém os cards de privacidade com data do vínculo ausente ou inválida', async () => {
  mocks.store.status = 'connected'
  mocks.store.connections = [{ linkedAt: 'invalid', instance: {} }]
  wrapper = mount(Connection)
  await flushPromises()
  expect(wrapper.get('.linked-date').text()).toBe('Data não informada')
  expect(wrapper.find('.linked-age').exists()).toBe(false)
  expect(wrapper.findAll('.privacy-panel')).toHaveLength(2)
})
