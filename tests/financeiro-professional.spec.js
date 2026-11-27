import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { shallowMount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import Contas from '@/views/pages/financeiro/FinanceiroContasView.vue'
import Caixa from '@/views/pages/financeiro/FinanceiroCaixaView.vue'
import Resumo from '@/views/pages/financeiro/FinanceiroResumoView.vue'

const mocks = vi.hoisted(() => ({ clinic: null, store: null, analytics: null, route: null, replace: vi.fn() }))
vi.mock('@/stores/clinic', () => ({ useClinicStore: () => mocks.clinic }))
vi.mock('@/stores/financeiro', () => ({ useFinanceiroStore: () => mocks.store }))
vi.mock('@/stores/finance', () => ({ useFinanceStore: () => mocks.analytics }))
vi.mock('@/stores/patients', () => ({ usePatientsStore: () => ({ allPatients: [], fetchAllPatients: vi.fn() }) }))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route, useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('vue-toastification', () => ({ useToast: () => ({}) }))

let wrapper
const owner = { _id: 'owner', name: 'Dra. Ana', role: 'owner' }
const doctor = { _id: 'doctor', name: 'Dr. Bruno', role: 'medico' }
beforeEach(() => {
  mocks.clinic = reactive({ currentClinic: { owner, staff: [owner, doctor, { _id: 'admin', role: 'admin' }] } })
  mocks.route = { query: {} }
  mocks.replace.mockResolvedValue()
  mocks.store = {
    contas: [], movimentosCaixa: [], lucratividadeProcedimentos: [],
    contasMeta: { total: 0, totalPages: 1 }, caixaMeta: { total: 0, totalPages: 1 },
    fetchCategorias: vi.fn(), fetchContas: vi.fn(), fetchCaixa: vi.fn(),
    fetchResumo: vi.fn(), fetchLucratividadeProcedimentos: vi.fn(),
  }
  mocks.analytics = {
    revenueSummary: {}, kpi: {}, comparison: {}, revenueByProcedure: [], dailyRevenue: [], previousDailyRevenue: [],
    topClientsPaginated: { data: [] }, topProceduresPaginated: { data: [] },
    fetchDashboardData: vi.fn(), fetchTopClients: vi.fn(), fetchTopProcedures: vi.fn(),
  }
})
afterEach(() => wrapper?.unmount())

async function render(component, props = {}) {
  wrapper = shallowMount(component, { props, global: { directives: { 'auto-animate': {} } } })
  await flushPromises()
  return wrapper.findComponent('.professional-filter')
}

it.each([['receber', Contas, { tipo: 'RECEIVABLE' }], ['pagar', Contas, { tipo: 'PAYABLE' }], ['caixa', Caixa, {}], ['resumo', Resumo, {}]])(
  'mostra profissionais sem duplicar o proprietário em %s e oculta com apenas um', async (_, component, props) => {
    const select = await render(component, props)
    expect(select.props('options')).toEqual([
      { value: '', label: 'Todos os profissionais' },
      { value: 'owner', label: 'Dra. Ana' }, { value: 'doctor', label: 'Dr. Bruno' },
    ])
    mocks.clinic.currentClinic.staff = [owner, { _id: 'admin', role: 'admin' }]
    await flushPromises()
    expect(wrapper.find('.professional-filter').exists()).toBe(false)
  }
)

it.each([['RECEIVABLE'], ['PAYABLE']])('filtra contas %s, reinicia página e permite limpar', async tipo => {
  mocks.route.query = { page: '3', status: 'OPEN', search: 'Consulta' }
  const select = await render(Contas, { tipo })
  select.vm.$emit('update:modelValue', 'doctor')
  await flushPromises()
  expect(mocks.store.fetchContas).toHaveBeenLastCalledWith(expect.objectContaining({ professionalId: 'doctor', page: '1', status: 'OPEN', search: 'Consulta', type: tipo }))
  expect(mocks.replace).toHaveBeenLastCalledWith({ query: expect.objectContaining({ professionalId: 'doctor' }) })
  await wrapper.find('.btn-clear').trigger('click')
  await flushPromises()
  expect(mocks.store.fetchContas.mock.lastCall[0]).not.toHaveProperty('professionalId')
})

it('restaura o profissional da URL no caixa e mantém o período ao trocar', async () => {
  mocks.route.query = { professionalId: 'owner', startDate: '2026-01-01', endDate: '2026-01-31', page: '2' }
  const select = await render(Caixa)
  expect(select.props('modelValue')).toBe('owner')
  select.vm.$emit('update:modelValue', 'doctor')
  await flushPromises()
  expect(mocks.store.fetchCaixa).toHaveBeenLastCalledWith(expect.objectContaining({ professionalId: 'doctor', page: '1', startDate: '2026-01-01', endDate: '2026-01-31' }))
  select.vm.$emit('update:modelValue', '')
  await flushPromises()
  expect(mocks.store.fetchCaixa.mock.lastCall[0]).not.toHaveProperty('professionalId')
})

it('atualiza todas as consultas do resumo com o mesmo profissional', async () => {
  const select = await render(Resumo)
  select.vm.$emit('update:modelValue', 'doctor')
  await flushPromises()
  for (const method of ['fetchResumo', 'fetchCaixa', 'fetchLucratividadeProcedimentos']) {
    expect(mocks.store[method]).toHaveBeenLastCalledWith(expect.objectContaining({ professionalId: 'doctor' }))
  }
  expect(mocks.analytics.fetchDashboardData).toHaveBeenLastCalledWith('custom', expect.any(String), expect.any(String), 'doctor')
  for (const method of ['fetchTopClients', 'fetchTopProcedures']) {
    expect(mocks.analytics[method]).toHaveBeenLastCalledWith(expect.objectContaining({ professionalId: 'doctor' }))
  }
  select.vm.$emit('update:modelValue', '')
  await flushPromises()
  expect(mocks.store.fetchResumo.mock.lastCall[0]).not.toHaveProperty('professionalId')
  expect(mocks.analytics.fetchDashboardData.mock.lastCall[3]).toBe(null)
})
