import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, shallowMount } from '@vue/test-utils'
import Contas from '@/views/pages/financeiro/FinanceiroContasView.vue'

const mocks = vi.hoisted(() => ({ store: null, success: vi.fn(), error: vi.fn() }))
vi.mock('@/stores/financeiro', () => ({ useFinanceiroStore: () => mocks.store }))
vi.mock('@/stores/patients', () => ({
  usePatientsStore: () => ({ allPatients: [], fetchAllPatients: vi.fn() }),
}))
vi.mock('vue-toastification', () => ({ useToast: () => mocks }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ replace: vi.fn().mockResolvedValue() }),
}))

let wrapper
beforeEach(() => {
  mocks.store = {
    contas: [{ _id: 'conta', amountCents: 10000, remainingAmountCents: 10000, paidAmountCents: 0, status: 'OPEN' }],
    contasMeta: { total: 1, page: 1, totalPages: 1, limit: 20 },
    fetchCategorias: vi.fn(), fetchContas: vi.fn(),
    deleteConta: vi.fn().mockResolvedValue({ success: true }),
  }
  vi.spyOn(window, 'confirm').mockReturnValue(true)
})
afterEach(() => {
  wrapper?.unmount()
  vi.restoreAllMocks()
})

async function render() {
  wrapper = shallowMount(Contas, {
    props: { tipo: 'RECEIVABLE' },
    global: {
      directives: { 'auto-animate': {} },
      stubs: {
        AppDropdownActions: { template: '<div><slot :close="() => {}" /></div>' },
      },
    },
  })
  await flushPromises()
  return wrapper.findAll('button.delete')
}

it.each([
  ['aberta', { status: 'OPEN', paidAmountCents: 0 }],
  ['cancelada', { status: 'CANCELED', paidAmountCents: 0 }],
  ['sem saldo pago informado', { paidAmountCents: undefined }],
])('permite excluir conta %s no desktop e celular', async (_, conta) => {
  Object.assign(mocks.store.contas[0], conta)
  const actions = await render()
  expect(actions).toHaveLength(2)
  actions.forEach(action => expect(action.element.disabled).toBe(false))
})

it.each(['PAID', 'PARTIAL'])('permite excluir conta %s com confirmação do estorno automático', async status => {
  Object.assign(mocks.store.contas[0], { status, paidAmountCents: 5000 })
  const actions = await render()
  actions.forEach(action => {
    expect(action.element.disabled).toBe(false)
    expect(action.text()).toContain('Excluir')
  })
  await actions[0].trigger('click')
  expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('estornadas automaticamente'))
  expect(mocks.store.deleteConta).toHaveBeenCalledWith('conta')
})

it('cancelar a confirmação não exclui a conta', async () => {
  window.confirm.mockReturnValue(false)
  const actions = await render()
  await actions[0].trigger('click')
  expect(mocks.store.deleteConta).not.toHaveBeenCalled()
})

it('confirmar exclui e recarrega a listagem', async () => {
  const actions = await render()
  mocks.store.fetchContas.mockClear()
  await actions[0].trigger('click')
  await flushPromises()
  expect(mocks.store.deleteConta).toHaveBeenCalledWith('conta')
  expect(mocks.success).toHaveBeenCalledWith('Conta excluída.')
  expect(mocks.store.fetchContas).toHaveBeenCalledOnce()
})

it('falha da API informa erro sem anunciar sucesso', async () => {
  mocks.store.deleteConta.mockResolvedValue({ success: false, error: 'Falha ao excluir conta.' })
  const actions = await render()
  await actions[1].trigger('click')
  await flushPromises()
  expect(mocks.error).toHaveBeenCalledWith('Falha ao excluir conta.')
  expect(mocks.success).not.toHaveBeenCalled()
})

it('bloqueia exclusão durante uma operação financeira', async () => {
  mocks.store.loadingAcao = true
  const actions = await render()
  actions.forEach(action => expect(action.element.disabled).toBe(true))
})
