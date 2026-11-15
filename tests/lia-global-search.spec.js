import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import TopBar from '@/components/layout/TopBar.vue'

const mocks = vi.hoisted(() => ({ lia: null, push: vi.fn(), auth: null }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push, replace: vi.fn() }), useRoute: () => ({ query: {} }) }))
vi.mock('@/stores/lia', () => ({ useLiaStore: () => mocks.lia }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => mocks.auth }))
vi.mock('@/stores/appointments', () => ({ useAppointmentsStore: () => ({ isLoading: false }) }))
vi.mock('@/stores/patients', () => ({ usePatientsStore: () => ({ isLoading: false, patients: [] }) }))
vi.mock('@/stores/records', () => ({ useRecordsStore: () => ({ isLoading: false }) }))
vi.mock('@/stores/anamnesis', () => ({ useAnamnesisStore: () => ({ isLoading: false }) }))
vi.mock('@/stores/employees', () => ({ useEmployeesStore: () => ({ isLoading: false }) }))
vi.mock('@/stores/dashboard', () => ({ useDashboardStore: () => ({ isLoading: false }) }))
let wrapper
beforeEach(() => {
  mocks.lia = reactive({ isAvailable: true, isSending: false, openWithPrompt: vi.fn().mockReturnValue(true) })
  mocks.auth = reactive({ user: { name: 'Profissional QA' }, unreadCount: 0, notifications: [] })
  vi.stubGlobal('matchMedia', () => ({ matches: false }))
  wrapper = mount(TopBar, { global: { stubs: { Teleport: true, UserDropdown: true }, directives: { 'click-outside': {} } } })
})
afterEach(() => { wrapper.unmount(); vi.unstubAllGlobals() })

it('oferece a busca com a Lia e passa o texto para revisão', async () => {
  await wrapper.get('.search-trigger').trigger('click')
  await wrapper.get('.palette-search-input').setValue('Como adiciono outro endereço?')
  await wrapper.get('.lia-search-action').trigger('click')
  expect(mocks.lia.openWithPrompt).toHaveBeenCalledWith('Como adiciono outro endereço?')
  expect(wrapper.find('.command-overlay').exists()).toBe(false)
})

it('Enter usa a Lia quando o texto não encontra um atalho ou paciente', async () => {
  await wrapper.get('.search-trigger').trigger('click')
  await wrapper.get('.palette-search-input').setValue('Como conecto o WhatsApp?')
  await wrapper.get('.palette-search-input').trigger('keydown', { key: 'Enter' })
  expect(mocks.lia.openWithPrompt).toHaveBeenCalledWith('Como conecto o WhatsApp?')
})

it('mantém a busca existente quando o piloto está indisponível', async () => {
  mocks.lia.isAvailable = false
  await wrapper.get('.search-trigger').trigger('click'); await flushPromises()
  expect(wrapper.find('.lia-search-action').exists()).toBe(false)
  expect(wrapper.text()).toContain('Novo paciente')
})
