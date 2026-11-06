import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCrmStore } from '@/stores/crm'
import { checkWhatsAppStatus } from '@/api/crm'
vi.mock('@/api/crm', () => ({
  checkWhatsAppStatus: vi.fn(),
  initiateWhatsAppConnection: vi.fn(),
  getWhatsAppQrCode: vi.fn(),
  logoutWhatsAppConnection: vi.fn(),
  sendMessage: vi.fn(),
  sendTestMessage: vi.fn(),
}))
vi.mock('vue-toastification', () => ({
  useToast: () => ({ success: vi.fn(), info: vi.fn(), error: vi.fn(), warning: vi.fn() }),
}))
beforeEach(() => {
  setActivePinia(createPinia())
})
it.each([undefined, 500, 503])(
  'falha de consulta %s não afirma que a conta desconectou',
  async (status) => {
    checkWhatsAppStatus.mockRejectedValueOnce(
      status ? { response: { status } } : new Error('Network Error'),
    )
    const store = useCrmStore()
    await store.getInitialStatus({ showToast: false })
    expect(store.status).toBe('api_error')
    expect(store.connectionError).toContain('Não foi possível')
    expect(store.isLoading).toBe(false)
  },
)
it('404 mantém o contrato de conta ainda não vinculada', async () => {
  checkWhatsAppStatus.mockRejectedValueOnce({ response: { status: 404 } })
  const store = useCrmStore()
  await store.getInitialStatus({ showToast: false })
  expect(store.status).toBe('disconnected')
  expect(store.connectionError).toBeNull()
})
it('consulta bem-sucedida recupera a tela após indisponibilidade', async () => {
  checkWhatsAppStatus
    .mockRejectedValueOnce(new Error('Network Error'))
    .mockResolvedValueOnce({
      data: {
        status: 'CONNECTED',
        profile: { jid: '5511999991234@s.whatsapp.net', name: 'Clínica' },
      },
    })
  const store = useCrmStore()
  await store.getInitialStatus({ showToast: false })
  await store.getInitialStatus({ showToast: false })
  expect(store.status).toBe('connected')
  expect(store.connectionError).toBeNull()
})

it('normaliza o contrato v2 com telefone, foto e biografia sem inferir conta pessoal', async () => {
  checkWhatsAppStatus.mockResolvedValueOnce({ data: { success: true, data: {
    status: 'ACTIVE', name: 'Clínica Exemplo', phoneNumber: '5511999991234', createdAt: '2026-10-01T12:00:00Z',
    profile: {
      jid: '5511999991234:56@s.whatsapp.net', phoneNumber: '5511999991234',
      name: null, pushName: null, verifiedName: null,
      profilePictureUrl: 'https://example.com/avatar.jpg', status: { message: ' Atendimento com hora marcada. ' }, business: null,
    },
  } } })
  const store = useCrmStore()
  await store.getInitialStatus({ showToast: false })
  expect(store.connections[0]).toMatchObject({
    username: 'Clínica Exemplo', number: '5511999991234',
    profileImage: 'https://example.com/avatar.jpg', bio: 'Atendimento com hora marcada.',
    instance: { isBusiness: null },
    linkedAt: '2026-10-01T12:00:00Z',
  })
})

it.each([
  [{ phoneNumber: '5511999991234', profile: { jid: '5511999991234:56@s.whatsapp.net' } }, '5511999991234'],
  [{ profile: { jid: '5511999991234:56@s.whatsapp.net' } }, '5511999991234'],
  [{ number: '5511999991234@s.whatsapp.net' }, '5511999991234'],
  [{ profile: { jid: '123456789012345@lid' } }, null],
])('usa números válidos e remove o dispositivo do JID: %j', async (data, number) => {
  checkWhatsAppStatus.mockResolvedValueOnce({ data: { status: 'ACTIVE', ...data } })
  const store = useCrmStore()
  await store.getInitialStatus({ showToast: false })
  expect(store.connections[0].number).toBe(number)
})

it.each([
  [{ profile: { business: { description: 'Clínica' } } }, true],
  [{ profile: { business: null, isBusiness: false } }, false],
  [{ profile: { business: null, status: { message: null } } }, null],
])('preserva a classificação informada sem deduzi-la de dados ausentes: %j', async (data, expected) => {
  checkWhatsAppStatus.mockResolvedValueOnce({ data: { status: 'ACTIVE', ...data } })
  const store = useCrmStore()
  await store.getInitialStatus({ showToast: false })
  expect(store.connections[0].instance.isBusiness).toBe(expected)
  expect(store.connections[0].bio).toBeNull()
})
