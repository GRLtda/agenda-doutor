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

const cachedUser = { id: 'user', name: 'Usuário de teste', clinic: { _id: 'clinic', subscriptionStatus: 'active', plan: 'basic' } }
const tokens = { access_token: 'access-old', refresh_token: 'refresh-old', expires_at: Date.now() + 3600000 }
const httpError = status => ({ response: { status, data: { error: { code: status === 401 ? 'AUTH_INVALID_REFRESH_TOKEN' : 'INTERNAL_ERROR' } } } })
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('auth_tokens', JSON.stringify(tokens))
  localStorage.setItem('user', JSON.stringify(cachedUser))
  mocks.logout.mockResolvedValue({})
  mocks.replace.mockResolvedValue(undefined)
  isApiUnavailable.value = false
  setActivePinia(createPinia())
})

it.each([{ code: 'ERR_NETWORK' }, { code: 'ECONNABORTED' }, httpError(500), httpError(502), httpError(503), httpError(504)])('preserva tokens, perfil e clínica ao falhar /me: %o', async error => {
  mocks.me.mockRejectedValue(error)
  const store = useAuthStore()
  expect(await store.fetchUser()).toEqual(cachedUser)
  expect(store.isAuthenticated).toBe(true)
  expect(store.sessionValidationUnavailable).toBe(true)
  expect(localStorage.getItem('auth_tokens')).toBe(JSON.stringify(tokens))
  expect(localStorage.getItem('user')).toBe(JSON.stringify(cachedUser))
  expect(mocks.setClinic).not.toHaveBeenCalledWith(null)
  expect(mocks.replace).not.toHaveBeenCalled()
  expect(mocks.logout).not.toHaveBeenCalled()
  expect(isApiUnavailable.value).toBe(true)
  // Recarregar a aplicação reidrata a mesma sessão, mesmo durante a falha.
  setActivePinia(createPinia())
  const reloaded = useAuthStore()
  expect(reloaded.accessToken).toBe(tokens.access_token)
  expect(reloaded.user).toEqual(cachedUser)
})

it('refresh indisponível no reload preserva sessão e permite renovar após recuperação', async () => {
  localStorage.setItem('auth_tokens', JSON.stringify({ ...tokens, expires_at: 1 }))
  mocks.refresh.mockRejectedValueOnce(httpError(503)).mockResolvedValueOnce({ data: { data: { access_token: 'new-access', refresh_token: 'new-refresh', expires_in: 900 } } })
  mocks.me.mockResolvedValue({ data: { data: cachedUser } })
  const store = useAuthStore()
  expect(await store.checkAuth()).toBe(false)
  expect(store.accessToken).toBe('access-old')
  expect(store.refreshToken).toBe('refresh-old')
  expect(mocks.replace).not.toHaveBeenCalled()
  expect(await store.checkAuth()).toBe(true)
  expect(store.accessToken).toBe('new-access')
  expect(store.refreshToken).toBe('new-refresh')
  expect(store.sessionValidationUnavailable).toBe(false)
})

it('compartilha refresh e consulta de perfil entre chamadas simultâneas', async () => {
  let resolveRefresh
  mocks.refresh.mockImplementation(() => new Promise(resolve => { resolveRefresh = resolve }))
  const store = useAuthStore()
  const first = store.refreshTokens()
  const second = store.refreshTokens()
  await Promise.resolve()
  expect(mocks.refresh).toHaveBeenCalledOnce()
  resolveRefresh({ data: { data: { access_token: 'new', refresh_token: 'rotated', expires_in: 900 } } })
  await Promise.all([first, second])
  mocks.me.mockResolvedValue({ data: { data: cachedUser } })
  await Promise.all([store.fetchUser(), store.fetchUser()])
  expect(mocks.me).toHaveBeenCalledOnce()
})

it.each(['profile', 'refresh'])('sessão comprovadamente inválida em %s continua encerrando acesso', async target => {
  const store = useAuthStore()
  if (target === 'profile') {
    mocks.me.mockRejectedValue(httpError(401))
    await store.fetchUser()
  } else {
    mocks.refresh.mockRejectedValue(httpError(401))
    await expect(store.refreshTokens()).rejects.toEqual(httpError(401))
  }
  expect(store.isAuthenticated).toBe(false)
  expect(store.user).toBeNull()
  expect(localStorage.getItem('auth_tokens')).toBeNull()
  expect(localStorage.getItem('user')).toBeNull()
  expect(mocks.replace).toHaveBeenCalledWith({ name: 'login' })
  expect(isApiUnavailable.value).toBe(false)
})

it('cancelamento não dispara aviso nem encerra sessão', async () => {
  mocks.me.mockRejectedValue({ code: 'ERR_CANCELED' })
  const store = useAuthStore()
  await store.fetchUser()
  expect(store.isAuthenticated).toBe(true)
  expect(store.sessionValidationUnavailable).toBe(false)
  expect(isApiUnavailable.value).toBe(false)
})

it('sair explicitamente limpa o estado sem aguardar a API', async () => {
  mocks.logout.mockReturnValue(new Promise(() => {}))
  const store = useAuthStore()
  await store.logout()
  expect(store.user).toBeNull()
  expect(store.isAuthenticated).toBe(false)
  expect(mocks.replace).toHaveBeenCalledWith({ name: 'login' })
})

it('resposta antiga de perfil não repõe usuário depois de sair', async () => {
  let resolve
  mocks.me.mockImplementation(() => new Promise(done => { resolve = done }))
  const store = useAuthStore()
  const request = store.fetchUser()
  await Promise.resolve()
  await store.logout()
  resolve({ data: { data: cachedUser } })
  await request
  expect(store.user).toBeNull()
  expect(localStorage.getItem('user')).toBeNull()
})

it('sem perfil em cache, indisponibilidade preserva tokens sem inventar identidade', async () => {
  localStorage.removeItem('user')
  mocks.me.mockRejectedValue(httpError(503))
  const store = useAuthStore()
  await store.checkAuth()
  expect(store.isAuthenticated).toBe(true)
  expect(store.user).toBeNull()
  expect(store.hasClinic).toBe(false)
  expect(store.sessionValidationUnavailable).toBe(true)
  expect(mocks.replace).not.toHaveBeenCalled()
})
