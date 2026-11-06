import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { reactive } from 'vue'
import Dashboard from '@/views/pages/estoque/EstoqueDashboardView.vue'

const mocks = vi.hoisted(() => ({ store: null, push: vi.fn(), fetch: vi.fn() }))
vi.mock('@/stores/estoque', () => ({ useEstoqueStore: () => mocks.store }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('vue-chartjs', () => ({ Bar: { name: 'Bar', props: ['data', 'options'], template: '<div class="chart" />' } }))
const wrappers = []
beforeEach(() => {
  vi.resetAllMocks()
  mocks.fetch.mockResolvedValue({ success: true })
  mocks.store = reactive({
    stats: { totalProdutos: 12, totalLotesAtivos: 24 }, healthScore: 84,
    chartData: { trends: [], categorias: [{ _id: 'Anestésico', count: 3 }, { _id: 'Descartáveis', count: 9 }] },
    alertasEstoqueMinimo: [], alertasVencimentos: [], loadingAlertas: false,
    fetchDashboardSummary: mocks.fetch,
  })
})
afterEach(() => wrappers.splice(0).forEach(wrapper => wrapper.unmount()))
function render() {
  const wrapper = mount(Dashboard, {
    global: { stubs: {
      RouterLink: { props: ['to'], template: '<a><slot /></a>' },
      FinanceSummaryCard: { props: ['label', 'value', 'loading'], template: '<div>{{ label }}<span v-if="!loading">{{ value }}</span></div>' },
    } },
  })
  wrappers.push(wrapper)
  return wrapper
}

it('carregamento não apresenta saúde ou alertas fictícios; erro oferece nova tentativa', async () => {
  let resolve
  mocks.fetch.mockReturnValueOnce(new Promise(done => { resolve = done }))
  const wrapper = render()
  expect(wrapper.attributes('aria-busy')).toBe('true')
  expect(wrapper.find('[role="meter"]').exists()).toBe(false)
  expect(wrapper.text()).not.toContain('Estoque em dia')
  resolve({ success: false, error: 'Falha de conexão' })
  await flushPromises()
  expect(wrapper.get('[role="alert"]').text()).toContain('Falha de conexão')
  expect(wrapper.find('.summary-grid').exists()).toBe(false)
  await wrapper.get('[role="alert"] button').trigger('click')
  await flushPromises()
  expect(wrapper.find('[role="alert"]').exists()).toBe(false)
  expect(wrapper.get('[role="meter"]').attributes('aria-valuenow')).toBe('84')
})

it('preserva período, atualização e navegação para produtos', async () => {
  const wrapper = render()
  await flushPromises()
  expect(mocks.fetch).toHaveBeenCalledWith(30)
  const select = wrapper.findComponent({ name: 'StyledSelect' })
  select.vm.$emit('update:modelValue', 60)
  await flushPromises()
  expect(mocks.fetch).toHaveBeenLastCalledWith(60)
  await wrapper.get('.summary-link').trigger('click')
  expect(mocks.push).toHaveBeenCalledWith({ name: 'estoque-produtos' })
  expect(wrapper.get('.header-tools').text()).not.toContain('Kits e receitas')
  expect(wrapper.get('.expiry-prefix').text()).toBe('Vencimento')
  expect(select.props('options').map(option => option.label)).toEqual(['30 dias', '60 dias', '90 dias'])
  expect(wrapper.find('.stock-shortcuts').exists()).toBe(false)
  expect(wrapper.get('.movement-panel .section-header').text()).toContain('Ver todas')
})

it('sem produtos não mostra excelente; categorias são proporções reais e vazios não têm emojis', async () => {
  mocks.store.stats.totalProdutos = 0
  const wrapper = render()
  await flushPromises()
  expect(wrapper.text()).toContain('Sem dados')
  expect(wrapper.text()).not.toContain('Excelente')
  expect(wrapper.text()).not.toMatch(/✅|📦|🎉/u)
  expect(wrapper.get('.category-track > div').attributes('style')).toContain('25%')
  expect(wrapper.text()).toContain('Nenhuma movimentação')
})

it('agrega entradas e todos os tipos de saída do gráfico, preservando alertas e links', async () => {
  const day = new Date().toISOString().split('T')[0]
  mocks.store.chartData.trends = [
    { _id: { day, tipo: 'ENTRADA' }, total: 10 },
    { _id: { day, tipo: 'SAIDA_CONSUMO' }, total: 4 },
    { _id: { day, tipo: 'SAIDA_PERDA' }, total: 2 },
  ]
  mocks.store.alertasEstoqueMinimo = [{ produtoId: 'product', nomeProduto: 'Luva', saldoTotal: 2, quantidadeMinima: 10 }]
  mocks.store.alertasVencimentos = [{ loteId: 'batch', nomeProduto: 'Luva', numeroLote: 'L01', dataValidade: '2026-11-01' }]
  const wrapper = render()
  await flushPromises()
  const chart = wrapper.findComponent({ name: 'Bar' }).props('data')
  expect(chart.datasets[0].data.at(-1)).toBe(10)
  expect(chart.datasets[1].data.at(-1)).toBe(6)
  expect(wrapper.get('.alert-list').text()).toContain('Saldo: 2 · Mínimo: 10')
  await wrapper.get('.alert-list button').trigger('click')
  expect(mocks.push).toHaveBeenCalledWith({ name: 'estoque-produto-detalhe', params: { id: 'product' } })
})
