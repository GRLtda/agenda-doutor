import { beforeEach, expect, it, vi } from 'vitest'
import axios from 'axios'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import api from '@/api/index'
import { getApiAvailabilityRevision, isApiUnavailable, reportApiFailure, reportApiSuccess } from '@/services/apiAvailability'

const mocks = vi.hoisted(() => ({
  capture: vi.fn(), openSubscriptionModal: vi.fn(),
}))
vi.mock('@/services/firebase', () => ({ messaging: null, getToken: vi.fn(), onMessage: vi.fn() }))
vi.mock('@/services/clarity', () => ({ trackClarityEvent: vi.fn() }))
vi.mock('@/stores/clinic', () => ({ useClinicStore: () => ({ setClinic: vi.fn() }) }))
vi.mock('@/stores/layout', () => ({ useLayoutStore: () => ({ openSubscriptionModal: mocks.openSubscriptionModal }) }))
vi.mock('@sentry/vue', () => ({ captureException: mocks.capture, setUser: vi.fn() }))
let auth
const originalAdapter = api.defaults.adapter

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  localStorage.setItem('auth_tokens', JSON.stringify({ access_token: 'access', refresh_token: 'refresh', expires_at: Date.now() + 3600000 }))
  setActivePinia(createPinia())
  auth = useAuthStore()
  vi.spyOn(auth, 'refreshTokens')
  vi.spyOn(auth, 'invalidateSession').mockResolvedValue(undefined)
  isApiUnavailable.value = false
  api.defaults.adapter = originalAdapter
})
const ok = config => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config })
const fail = (config, status, data = {}) => new axios.AxiosError('API failure', 'ERR_BAD_RESPONSE', config, {}, { status, data, config })

it.each([408, 429, 500, 502, 503, 504])('HTTP %s mostra aviso sem renovar nem invalidar sessão', async status => {
  await expect(api.get('/appointments', { adapter: async config => { throw fail(config, status) } })).rejects.toBeInstanceOf(axios.AxiosError)
  expect(isApiUnavailable.value).toBe(true)
  expect(auth.refreshTokens).not.toHaveBeenCalled()
  expect(auth.invalidateSession).not.toHaveBeenCalled()
  await api.get('/v2/auth/me', { adapter: async config => ok(config) })
  expect(isApiUnavailable.value).toBe(false)
})

it('uma resposta antiga concorrente não esconde a falha mais recente', () => {
  const earlierRevision = getApiAvailabilityRevision()
  const error = { code: 'ERR_NETWORK' }
  reportApiFailure(error)
  reportApiFailure(error)
  expect(getApiAvailabilityRevision()).toBe(earlierRevision + 1)
  reportApiSuccess(earlierRevision)
  expect(isApiUnavailable.value).toBe(true)
  reportApiSuccess(getApiAvailabilityRevision())
  expect(isApiUnavailable.value).toBe(false)
})

it('400, 403 e cancelamento não viram indisponibilidade; skipAuth não renova sessão', async () => {
  for (const status of [400, 403, 401]) {
    await expect(api.get('/public', { skipAuth: true, adapter: async config => { throw fail(config, status) } })).rejects.toBeDefined()
    expect(isApiUnavailable.value).toBe(false)
  }
  const controller = new AbortController()
  controller.abort()
  await expect(api.get('/appointments', { signal: controller.signal })).rejects.toMatchObject({ code: 'ERR_CANCELED' })
  expect(isApiUnavailable.value).toBe(false)
  expect(auth.refreshTokens).not.toHaveBeenCalled()
  expect(auth.invalidateSession).not.toHaveBeenCalled()
})

it.each([
  { status: 401, code: 'AUTH_SESSION_REVOKED', retried: false },
  { status: 401, code: 'AUTH_SESSION_REVOKED', retried: true },
  { status: 403, code: 'USER_INACTIVE', retried: false },
])('sessão invalidada explicitamente encerra acesso: %o', async ({ status, code, retried }) => {
  await expect(api.get('/appointments', { _retry: retried, adapter: async config => { throw fail(config, status, { code }) } })).rejects.toBeDefined()
  expect(auth.invalidateSession).toHaveBeenCalledOnce()
  expect(isApiUnavailable.value).toBe(false)
})

it('401 simultâneos compartilham renovação e retomam ambos com token atualizado', async () => {
  let resolveRefresh
  auth.refreshTokens.mockImplementation(() => new Promise(resolve => { resolveRefresh = resolve }))
  const adapter = vi.fn(async config => {
    if (!config._retry) throw fail(config, 401)
    return ok(config)
  })
  const pending = Promise.all([api.get('/appointments', { adapter }), api.get('/patients', { adapter })])
  await vi.waitFor(() => expect(auth.refreshTokens).toHaveBeenCalledOnce())
  auth.accessToken = 'rotated'
  resolveRefresh(true)
  const responses = await pending
  expect(responses).toHaveLength(2)
  for (const response of responses) expect(response.config.headers.Authorization).toBe('Bearer rotated')
  expect(auth.invalidateSession).not.toHaveBeenCalled()
})

it('falha real do refresh libera toda a fila sem deslogar nem reenviar requisições', async () => {
  const adapter = vi.fn(async config => {
    if (config.url === '/v2/auth/refresh') throw fail(config, 503)
    throw fail(config, 401)
  })
  api.defaults.adapter = adapter
  const results = await Promise.allSettled([api.get('/appointments'), api.get('/patients')])
  expect(results.every(result => result.status === 'rejected')).toBe(true)
  expect(auth.refreshTokens).toHaveBeenCalledOnce()
  expect(auth.isAuthenticated).toBe(true)
  expect(auth.refreshToken).toBe('refresh')
  expect(auth.invalidateSession).not.toHaveBeenCalled()
  expect(isApiUnavailable.value).toBe(true)
  expect(adapter).toHaveBeenCalledTimes(3)
  api.defaults.adapter = originalAdapter
})
