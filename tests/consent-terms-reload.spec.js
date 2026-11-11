import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import PatientConsentTermsTab from '@/components/pages/pacientes/PatientConsentTermsTab.vue'
import ViewConsentTermModal from '@/components/pages/pacientes/modals/ViewConsentTermModal.vue'

const mocks = vi.hoisted(() => ({ store: null }))
vi.mock('@/stores/consent-terms', () => ({ useConsentTermsStore: () => mocks.store }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ info: vi.fn(), error: vi.fn() }) }))

let resolveFetch
beforeEach(() => {
  mocks.store = reactive({
    isLoading: false,
    patientTerms: [{ _id: 't1', status: 'Pendente', createdAt: '2026-11-11', template: { name: 'Termo A' } }],
    fetchTermsForPatient: vi.fn(() => {
      mocks.store.isLoading = true
      return new Promise((resolve) => {
        resolveFetch = (value) => { mocks.store.isLoading = false; resolve(value) }
      })
    }),
    fetchTermById: vi.fn(() => new Promise((resolve) => { resolveFetch = resolve })),
  })
})

const stubs = { AssignConsentTermModal: true, ViewConsentTermModal: true }
const skeleton = '[aria-label="Carregando termos"]'

describe('recarregar termos do paciente', () => {
  it('mostra skeleton durante a recarga e bloqueia cliques repetidos até terminar', async () => {
    const wrapper = mount(PatientConsentTermsTab, { props: { patientId: 'p1' }, global: { stubs } })
    mocks.store.fetchTermsForPatient.mockClear()
    const reload = wrapper.find('button[aria-label="Recarregar termos"]')

    await reload.trigger('click')
    expect(mocks.store.fetchTermsForPatient).toHaveBeenCalledWith('p1', { keepList: true })
    expect(wrapper.find(skeleton).exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Termo A')
    expect(reload.element.disabled).toBe(true)

    await reload.trigger('click')
    expect(mocks.store.fetchTermsForPatient).toHaveBeenCalledTimes(1)

    resolveFetch()
    await flushPromises()
    expect(wrapper.find(skeleton).exists()).toBe(false)
    expect(wrapper.text()).toContain('Termo A')
    expect(reload.element.disabled).toBe(false)
  })
})

describe('ver termo', () => {
  it('mostra skeleton (sem texto "Carregando") até o termo chegar', async () => {
    const wrapper = mount(ViewConsentTermModal, {
      props: { patientId: 'p1', termId: 't1' },
      global: { stubs: { SideDrawer: { template: '<div><slot name="header" /><slot /></div>' } } },
    })
    await flushPromises()
    expect(wrapper.find('[aria-label="Carregando termo"]').exists()).toBe(true)
    expect(wrapper.text()).not.toMatch(/Carregando/)

    resolveFetch({ status: 'Pendente', template: { name: 'Termo A' }, renderedContent: '<p>Texto do termo</p>' })
    await flushPromises()
    expect(wrapper.find('[aria-label="Carregando termo"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Texto do termo')
    expect(wrapper.text()).toContain('Termo A')
  })
})
