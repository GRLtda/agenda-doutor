// Tela de retorno do checkout (PaymentSuccess.vue).
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))
vi.mock('@/components/global/ClinicLogo.vue', () => ({ default: { template: '<span />' } }))
const { default: PaymentSuccess } = await import('@/components/pages/onboarding/PaymentSuccess.vue')
const confetti = (await import('canvas-confetti')).default

const trial = { label: 'Posicionamento Digital', trialDays: 30, startedAt: '2026-11-07T12:00:00.000Z', endsAt: '2026-12-07T12:00:00.000Z' }

beforeEach(() => {
  vi.useFakeTimers()
  window.matchMedia = vi.fn(() => ({ matches: false }))
})
afterEach(() => vi.useRealTimers())

it('confirmando: mostra as etapas e consulta de novo a cada 3 s', async () => {
  const wrapper = mount(PaymentSuccess, { props: { confirmed: false } })
  expect(wrapper.text()).toContain('Confirmando sua assinatura')
  expect(wrapper.text()).toContain('Confirmando com a Stripe')
  await vi.advanceTimersByTimeAsync(3000)
  await vi.advanceTimersByTimeAsync(3000)
  expect(wrapper.emitted('refresh')).toHaveLength(2)
})

it('depois de 10 consultas sem confirmação oferece "Verificar novamente"', async () => {
  const wrapper = mount(PaymentSuccess, { props: { confirmed: false } })
  await vi.advanceTimersByTimeAsync(3000 * 12)
  expect(wrapper.emitted('refresh')).toHaveLength(10)
  const retry = wrapper.find('button')
  expect(retry.text()).toContain('Verificar novamente')
  await retry.trigger('click')
  expect(wrapper.emitted('refresh')).toHaveLength(11)
})

it('ao confirmar, para de consultar e celebra', async () => {
  const wrapper = mount(PaymentSuccess, { props: { confirmed: false } })
  await vi.advanceTimersByTimeAsync(3000)
  await wrapper.setProps({ confirmed: true, campaignTrial: trial, trialing: true, userName: 'GSkzin Silva' })
  await vi.advanceTimersByTimeAsync(10000)
  expect(wrapper.emitted('refresh')).toHaveLength(1)
  expect(confetti).toHaveBeenCalled()
})

it('campanha: título com primeiro nome, prazo e selo do evento', async () => {
  const wrapper = mount(PaymentSuccess, { props: { confirmed: true, campaignTrial: trial, trialing: true, userName: '  GSkzin Silva ' } })
  expect(wrapper.find('h1').text()).toBe('GSkzin, seu 1 mês grátis está ativo!')
  expect(wrapper.text()).toContain('Nada foi cobrado hoje')
  expect(wrapper.text()).toContain('Posicionamento Digital')
  expect(wrapper.text()).toContain('30 dias grátis')
  expect(wrapper.text()).toMatch(/dezembro/)
})

it('sem campanha: confirmação da assinatura sem selo', () => {
  const wrapper = mount(PaymentSuccess, { props: { confirmed: true, campaignTrial: null, trialing: false, userName: '' } })
  expect(wrapper.find('h1').text()).toBe('Tudo pronto!')
  expect(wrapper.find('.pass').exists()).toBe(false)
})

it('atalhos navegam para as rotas reais e o botão vai para o painel', async () => {
  const wrapper = mount(PaymentSuccess, { props: { confirmed: true } })
  const actions = wrapper.findAll('.action')
  expect(actions).toHaveLength(3)
  await actions[0].trigger('click')
  await actions[1].trigger('click')
  await actions[2].trigger('click')
  expect(wrapper.emitted('navigate').map(([route]) => route.name)).toEqual(['calendario', 'novo-paciente', 'marketing-conexao'])
  await wrapper.find('.btn-dashboard').trigger('click')
  expect(wrapper.emitted('dashboard')).toHaveLength(1)
})

it('com movimento reduzido não solta confete', async () => {
  window.matchMedia = vi.fn(() => ({ matches: true }))
  confetti.mockClear()
  mount(PaymentSuccess, { props: { confirmed: true } })
  await vi.advanceTimersByTimeAsync(1000)
  expect(confetti).not.toHaveBeenCalled()
})
