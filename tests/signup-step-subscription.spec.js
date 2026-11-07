// Escolha do plano no onboarding (StepSubscription.vue): resumo com e sem campanha.
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ user: null, createCheckoutSession: null }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: mocks.user }) }))
vi.mock('@/api/subscriptions/subscriptions.service', () => ({ createCheckoutSession: (...args) => mocks.createCheckoutSession(...args) }))
const { default: StepSubscription } = await import('@/components/pages/onboarding/steps/StepSubscription.vue')

const mountStep = (props = {}) => mount(StepSubscription, {
  props,
  global: {
    stubs: { ClinicLogo: true, UserDropdown: true },
    directives: { 'click-outside': {} },
  },
})
const summary = (wrapper) => wrapper.find('.checkout-summary').text()

beforeEach(() => {
  mocks.user = { name: 'Ana', signupCampaignOffer: null }
  mocks.createCheckoutSession = vi.fn().mockResolvedValue({ data: { url: 'https://checkout.stripe.test/1' } })
})

it('com campanha: total hoje R$ 0,00, taxa sem data e primeira cobrança com data', () => {
  mocks.user.signupCampaignOffer = { label: 'Posicionamento Digital', trialDays: 30 }
  const wrapper = mountStep()
  const text = summary(wrapper)
  expect(text).toMatch(/Total hoje\s*R\$\s*0,00/)
  expect(text).toContain('Taxa de instalação')
  expect(text).not.toMatch(/Taxa de instalação \(em/)
  expect(text).toMatch(/Primeira cobrança em \d{2}\/\d{2}\/\d{4}/)
  expect(wrapper.text()).toContain('30 dias grátis · Posicionamento Digital')
  expect(wrapper.text()).toContain('Começar 30 dias grátis')
})

it('sem campanha: total hoje = mensalidade + taxa e sem primeira cobrança', () => {
  const wrapper = mountStep()
  const text = summary(wrapper)
  expect(text).toMatch(/Total hoje\s*R\$\s*199,90/)
  expect(text).not.toContain('Primeira cobrança')
  expect(wrapper.text()).toContain('Escolher plano')
})

it('taxa já paga ou isenta aparece como isenta', () => {
  const wrapper = mountStep({ installationFeeCharged: true })
  expect(summary(wrapper)).toContain('Isenta')
})

it('escolher plano abre o checkout do onboarding e trata erro da API', async () => {
  const assign = vi.fn()
  Object.defineProperty(window, 'location', { value: { set href(value) { assign(value) } }, configurable: true })
  const wrapper = mountStep()
  await wrapper.findAll('.plan-button')[0].trigger('click')
  await flushPromises()
  expect(mocks.createCheckoutSession).toHaveBeenCalledWith({ plan: 'premium', context: 'onboarding' })
  expect(assign).toHaveBeenCalledWith('https://checkout.stripe.test/1')

  mocks.createCheckoutSession.mockRejectedValue({ response: { data: { message: 'Plano inválido.' } } })
  await wrapper.findAll('.plan-button')[1].trigger('click')
  await flushPromises()
  expect(wrapper.find('.error-message').text()).toBe('Plano inválido.')
})
