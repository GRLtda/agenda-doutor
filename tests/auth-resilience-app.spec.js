import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import App from '@/App.vue'
import { isApiUnavailable } from '@/services/apiAvailability'

const mocks = vi.hoisted(() => ({ auth: null, route: { path: '/calendario', fullPath: '/calendario?view=week', query: { view: 'week' }, hash: '', meta: { requiresAuth: true } }, replace: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/seo', () => ({ useSeoStore: () => ({ setThemeColor: vi.fn() }) }))
vi.mock('@/router', () => ({ default: { replace: mocks.replace } }))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route, RouterView: { template: '<div class="protected-content">Página atual</div>' } }))
vi.mock('@/components/global/AppToaster.vue', () => ({ default: { template: '<div />' } }))

const wrappers = []
beforeEach(() => {
  mocks.auth = reactive({ isAuthenticated: true, user: { clinic: { _id: 'clinic' } }, sessionValidationUnavailable: true, checkAuth: vi.fn() })
  mocks.replace.mockResolvedValue(undefined)
  isApiUnavailable.value = true
})
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))

it('perfil em cache mantém a página montada durante a falha', () => {
  const wrapper = mount(App)
  wrappers.push(wrapper)
  expect(wrapper.get('.protected-content').text()).toBe('Página atual')
  expect(document.querySelectorAll('.api-availability-banner')).toHaveLength(1)
})
it('sem perfil, bloqueia montagem protegida até recuperar e revalidar a rota', async () => {
  mocks.auth.user = null
  let finishGuard
  mocks.replace.mockImplementation(() => new Promise(resolve => { finishGuard = resolve }))
  mocks.auth.checkAuth.mockImplementation(async () => {
    mocks.auth.user = { clinic: { _id: 'clinic' } }
    mocks.auth.sessionValidationUnavailable = false
    return true
  })
  const wrapper = mount(App)
  wrappers.push(wrapper)
  expect(wrapper.find('.protected-content').exists()).toBe(false)
  await wrapper.get('.session-recovery button').trigger('click')
  await flushPromises()
  expect(mocks.replace).toHaveBeenCalledWith({ path: '/calendario', query: { view: 'week' }, hash: '', force: true })
  expect(wrapper.find('.protected-content').exists()).toBe(false)
  finishGuard()
  await flushPromises()
  expect(wrapper.find('.protected-content').exists()).toBe(true)
})
