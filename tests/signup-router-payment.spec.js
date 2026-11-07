// Guarda de rota no retorno do checkout (/onboarding/clinic?payment=success).
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

const wizard = (query = {}) => ({ name: 'clinic-wizard', path: '/onboarding/clinic', fullPath: '/onboarding/clinic', query, meta: { requiresAuth: true } })
const withStatus = (subscriptionStatus) => {
  mocks.auth = {
    isAuthenticated: true,
    hasClinic: true,
    user: { clinic: { subscriptionStatus, plan: 'basic' } },
    sessionValidationUnavailable: false,
    fetchUser: vi.fn().mockResolvedValue(null),
  }
}
beforeEach(() => withStatus('trialing'))

it('retorno com payment=success e assinatura em teste mostra a tela de sucesso', async () => {
  const next = vi.fn()
  await mocks.guard(wizard({ payment: 'success' }), { path: '/' }, next)
  expect(next).toHaveBeenCalledWith()
})

it('com assinatura ativa e sem payment=success vai para o painel', async () => {
  withStatus('active')
  const next = vi.fn()
  await mocks.guard(wizard(), { path: '/' }, next)
  expect(next).toHaveBeenCalledWith({ name: 'resumo-dashboard' })
})

it('payment=canceled não libera o onboarding para quem já assinou', async () => {
  const next = vi.fn()
  await mocks.guard(wizard({ payment: 'canceled' }), { path: '/' }, next)
  expect(next).toHaveBeenCalledWith({ name: 'resumo-dashboard' })
})

it('sem assinatura, o retorno do checkout continua no onboarding (confirmação pendente)', async () => {
  withStatus(null)
  const next = vi.fn()
  await mocks.guard(wizard({ payment: 'success' }), { path: '/' }, next)
  expect(next).toHaveBeenCalledWith()
})

it('payment=success não abre rotas do painel sem assinatura', async () => {
  withStatus(null)
  const next = vi.fn()
  await mocks.guard({ name: 'calendario', path: '/calendario', fullPath: '/calendario?payment=success', query: { payment: 'success' }, meta: { requiresAuth: true } }, { path: '/' }, next)
  expect(next).toHaveBeenCalledWith({ name: 'clinic-wizard' })
})
