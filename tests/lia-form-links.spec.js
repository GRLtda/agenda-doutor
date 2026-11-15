import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { reactive } from 'vue'
import ConsentTermsTemplates from '@/views/pages/configuracoes/tabs/ConsentTermsTemplates.vue'
import AnamnesisTemplates from '@/views/pages/configuracoes/tabs/AnamnesisTemplates.vue'
import UnitsSettings from '@/views/pages/configuracoes/tabs/UnitsSettings.vue'

const mocks = vi.hoisted(() => ({ consent: null, anamnesis: null, auth: null, units: vi.fn(), save: vi.fn() }))
vi.mock('@/stores/consent-terms', () => ({ useConsentTermsStore: () => mocks.consent }))
vi.mock('@/stores/anamnesis', () => ({ useAnamnesisStore: () => mocks.anamnesis }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/api/units', () => ({ listUnits: mocks.units, saveUnit: mocks.save, deleteUnit: vi.fn(), formatUnitAddress: () => '' }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }))
let wrapper, router
const originalScroll = Element.prototype.scrollIntoView
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn()
  mocks.consent = reactive({ templates: [], fetchTemplates: vi.fn(), createTemplate: vi.fn() })
  mocks.anamnesis = reactive({ templates: [], fetchTemplates: vi.fn(), createTemplate: vi.fn() })
  mocks.auth = reactive({ user: { role: 'medico' } })
  mocks.units.mockReset().mockResolvedValue({ data: { units: [], legacyAddress: null } })
  mocks.save.mockReset()
})
afterEach(() => {
  wrapper?.unmount()
  wrapper = null
  if (originalScroll) Element.prototype.scrollIntoView = originalScroll
  else delete Element.prototype.scrollIntoView
})
async function open(component, tab) {
  router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<div />' } }] })
  await router.push({ path: '/', query: { settings: '1', tab, create: '1' } })
  await router.isReady()
  wrapper = shallowMount(component, { global: { plugins: [router], stubs: { Teleport: true } } })
  await flushPromises()
}

it.each([
  [ConsentTermsTemplates, 'termos', 'CreateConsentTermModal'],
  [AnamnesisTemplates, 'anamnese', 'CreateAnamnesisModal'],
])('o link abre o formulário existente e o fechamento permite reabrir pelo mesmo link', async (component, tab, modal) => {
  await open(component, tab)
  expect(wrapper.findComponent({ name: modal }).exists()).toBe(true)
  expect(router.currentRoute.value.query).toEqual({ settings: '1', tab })
  await wrapper.getComponent({ name: modal }).vm.$emit('close')
  await flushPromises()
  expect(wrapper.findComponent({ name: modal }).exists()).toBe(false)
  await router.push({ query: { settings: '1', tab, create: '1' } })
  await flushPromises()
  expect(wrapper.findComponent({ name: modal }).exists()).toBe(true)
  expect(mocks.consent.createTemplate).not.toHaveBeenCalled()
  expect(mocks.anamnesis.createTemplate).not.toHaveBeenCalled()
})

it('endereço aguarda a carga antes de abrir o rascunho', async () => {
  let finish
  mocks.units.mockReturnValue(new Promise(resolve => { finish = resolve }))
  await open(UnitsSettings, 'unidades')
  expect(wrapper.find('form').exists()).toBe(false)
  finish({ data: { units: [], legacyAddress: null } })
  await flushPromises()
  expect(wrapper.find('form').exists()).toBe(true)
  expect(mocks.save).not.toHaveBeenCalled()
})

it('recepção não abre criação de endereço por parâmetro de navegação', async () => {
  mocks.auth.user.role = 'recepcionista'
  await open(UnitsSettings, 'unidades')
  expect(wrapper.find('form').exists()).toBe(false)
  expect(mocks.save).not.toHaveBeenCalled()
})
