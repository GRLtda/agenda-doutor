// Store de auth: abertura de sessão com tokens do login por provedor externo (Google...).
import { beforeEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { isApiUnavailable } from '@/services/apiAvailability'

const mocks = vi.hoisted(() => ({
  me: vi.fn(), refresh: vi.fn(), logout: vi.fn(), login: vi.fn(), replace: vi.fn(), setClinic: vi.fn(),
  client: { defaults: { headers: { common: {} } } },
}))
vi.mock('@/api/auth-v2', () => ({ getMeV2: mocks.me, refreshV2: mocks.refresh, logoutV2: mocks.logout, loginV2: mocks.login }))
vi.mock('@/api/index', () => ({ default: mocks.client }))
vi.mock('@/router', () => ({ default: { replace: mocks.replace } }))
vi.mock('@/stores/clinic', () => ({ useClinicStore: () => ({ setClinic: mocks.setClinic }) }))
vi.mock('@/services/firebase', () => ({ messaging: null, getToken: vi.fn(), onMessage: vi.fn() }))
vi.mock('@/services/clarity', () => ({ trackClarityEvent: vi.fn() }))
vi.mock('@sentry/vue', () => ({ setUser: vi.fn() }))

const tokens = { access_token: 'access-novo', refresh_token: 'refresh-novo', expires_in: 900 }

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mocks.logout.mockResolvedValue({})
  isApiUnavailable.value = false
  setActivePinia(createPinia())
})

it('conta nova sem clínica (/me = CLINIC_NOT_FOUND) abre a sessão normalmente para seguir ao onboarding', async () => {
  mocks.me.mockRejectedValue({ response: { status: 404, data: { error: { code: 'CLINIC_NOT_FOUND' } } } })
  const store = useAuthStore()

  const result = await store.loginWithTokens(tokens)

  expect(result.success).toBe(true)
  expect(store.isAuthenticated).toBe(true)
  expect(store.hasClinic).toBe(false)
  expect(JSON.parse(localStorage.getItem('auth_tokens')).access_token).toBe('access-novo')
})

it('conta com perfil completo expõe os dados de segurança do /me', async () => {
  mocks.me.mockResolvedValue({
    data: { data: { _id: 'u', name: 'Ana', clinic: { _id: 'c' }, hasPassword: false, securityAlerts: [{ code: 'no_password' }], identities: [{ provider: 'google', email: 'ana@clinica.com' }] } },
  })
  const store = useAuthStore()

  expect((await store.loginWithTokens(tokens)).success).toBe(true)
  expect(store.hasPassword).toBe(false)
  expect(store.hasSecurityAlert).toBe(true)
  expect(store.connectedIdentities).toHaveLength(1)
})

it('sessão invalidada pelo servidor durante o carregamento do perfil conta como falha', async () => {
  mocks.me.mockRejectedValue({ response: { status: 401, data: { error: { code: 'AUTH_UNAUTHORIZED' } } } })
  const store = useAuthStore()

  const result = await store.loginWithTokens(tokens)

  expect(result.success).toBe(false)
  expect(store.isAuthenticated).toBe(false)
})
