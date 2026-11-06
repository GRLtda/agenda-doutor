import { beforeEach, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ guard: null, auth: null }))
vi.mock('vue-router', () => ({
  createWebHistory: () => ({}),
  createRouter: () => ({ beforeEach: callback => { mocks.guard = callback }, onError: vi.fn() }),
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/composables/usePlanAccess', () => ({ checkPlanAccess: () => true, getRouteFeature: () => null }))
vi.mock('@/router/dashboard', () => ({ default: [] }))
vi.mock('@/views/pages/autenticacao/LoginView.vue', () => ({ default: {} }))
vi.mock('@/views/pages/autenticacao/RegisterView.vue', () => ({ default: {} }))
vi.mock('@/views/pages/onboarding/ClinicWizardView.vue', () => ({ default: {} }))
vi.mock('@/views/public/AnswerAnamnesisView.vue', () => ({ default: {} }))
vi.mock('@/views/NotFoundView.vue', () => ({ default: {} }))
await import('@/router/index.js')

const target = { name: 'calendario', path: '/calendario', fullPath: '/calendario?view=week', meta: { requiresAuth: true } }
beforeEach(() => {
  mocks.auth = {
    isAuthenticated: true, hasClinic: true, user: { clinic: { subscriptionStatus: 'active', plan: 'basic' } },
    sessionValidationUnavailable: true, fetchUser: vi.fn().mockResolvedValue(null),
  }
})
it('recarregar rota com perfil em cache e API fora do ar não redireciona', async () => {
  const next = vi.fn()
  await mocks.guard(target, { name: undefined, path: '/' }, next)
  expect(next).toHaveBeenCalledWith()
})
it('sem perfil em cache, mantém a URL para recuperação e não presume onboarding', async () => {
  mocks.auth.user = null
  mocks.auth.hasClinic = false
  const next = vi.fn()
  await mocks.guard(target, { path: '/' }, next)
  expect(next).toHaveBeenCalledWith()
})
it('reavalia autenticação após /me rejeitar a sessão', async () => {
  mocks.auth.fetchUser.mockImplementation(async () => {
    mocks.auth.isAuthenticated = false
    mocks.auth.hasClinic = false
    mocks.auth.user = null
  })
  const next = vi.fn()
  await mocks.guard(target, { path: '/' }, next)
  expect(next).toHaveBeenCalledWith({ name: 'login', query: { redirect: target.fullPath } })
})
it('preservar sessão não ignora as guardas existentes de assinatura', async () => {
  mocks.auth.user.clinic.subscriptionStatus = 'canceled'
  const next = vi.fn()
  await mocks.guard(target, { path: '/' }, next)
  expect(next).toHaveBeenCalledWith({ name: 'clinic-wizard' })
})
