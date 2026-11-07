// Cadastro (RegisterView.vue): campanha pela URL e erros da API por campo.
import { beforeEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  route: { params: {}, query: {}, path: '/register', name: 'register' },
  register: null,
  getSignupCampaign: null,
}))
vi.mock('vue-router', () => ({ useRoute: () => mocks.route, useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ register: mocks.register }) }))
vi.mock('@/api/auth', () => ({ verifyInvitationToken: vi.fn(), getSignupCampaign: (...args) => mocks.getSignupCampaign(...args) }))
vi.mock('@/api/employees', () => ({ getInvitationDetails: vi.fn() }))
vi.mock('vue-toastification', () => ({ useToast: () => ({ info: vi.fn(), error: vi.fn() }) }))
vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

const field = (name) => ({
  name,
  props: ['modelValue', 'label', 'error', 'name', 'type', 'placeholder', 'autocomplete', 'required', 'disabled', 'phoneMask'],
  emits: ['update:modelValue'],
  template: `<label :data-field="label"><input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" /><span class="err">{{ error }}</span></label>`,
})
const stubs = {
  AuthCard: { template: '<div><slot name="title" /><slot /><slot name="footer" /></div>' },
  FormInput: field('FormInput'),
  PasswordInput: field('PasswordInput'),
  AppButton: { template: '<button type="submit"><slot /></button>' },
  ClinicLogo: true,
  'router-link': { template: '<a><slot /></a>' },
}
const { default: RegisterView } = await import('@/views/pages/autenticacao/RegisterView.vue')

async function fillAndSubmit(wrapper) {
  const inputs = wrapper.findAll('input:not([type=checkbox])')
  await inputs[0].setValue('Dra. Ana')
  await inputs[1].setValue('ana@clinica.com')
  await inputs[2].setValue('(11) 99999-0000')
  await inputs[3].setValue('segura123')
  await wrapper.find('input[type=checkbox]').setValue(true)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}
const errorOf = (wrapper, label) => wrapper.find(`[data-field="${label}"] .err`).text()

beforeEach(() => {
  sessionStorage.clear()
  mocks.route = { params: {}, query: {}, path: '/register', name: 'register' }
  mocks.register = vi.fn().mockResolvedValue({ success: true })
  mocks.getSignupCampaign = vi.fn().mockResolvedValue({ data: { data: { valid: true, label: 'Posicionamento Digital', trialDays: 30 } } })
})

it('campanha válida na URL: mostra a faixa e envia campaignCode no cadastro', async () => {
  mocks.route.query = { campanha: 'posicionamento-digital' }
  const wrapper = mount(RegisterView, { global: { stubs } })
  await flushPromises()
  expect(wrapper.text()).toContain('30 dias grátis')
  expect(wrapper.text()).toContain('Posicionamento Digital')
  expect(sessionStorage.getItem('signupCampaignCode')).toBe('posicionamento-digital')
  await fillAndSubmit(wrapper)
  expect(mocks.register.mock.calls[0][0].campaignCode).toBe('posicionamento-digital')
  expect(sessionStorage.getItem('signupCampaignCode')).toBeNull()
})

it('campanha inválida: sem faixa, sem campaignCode e o cadastro segue', async () => {
  mocks.route.query = { campanha: 'nao-existe' }
  mocks.getSignupCampaign.mockResolvedValue({ data: { data: { valid: false } } })
  const wrapper = mount(RegisterView, { global: { stubs } })
  await flushPromises()
  expect(wrapper.text()).not.toContain('dias grátis')
  await fillAndSubmit(wrapper)
  expect(mocks.register.mock.calls[0][0].campaignCode).toBeUndefined()
})

it('recarregar a página mantém a campanha guardada na sessão', async () => {
  sessionStorage.setItem('signupCampaignCode', 'posicionamento-digital')
  const wrapper = mount(RegisterView, { global: { stubs } })
  await flushPromises()
  expect(mocks.getSignupCampaign).toHaveBeenCalledWith('posicionamento-digital')
  expect(wrapper.text()).toContain('30 dias grátis')
})

it('erros de validação da API aparecem em cada campo e somem ao editar', async () => {
  mocks.register.mockResolvedValue({
    success: false,
    error: {
      code: 'AUTH_VALIDATION_ERROR',
      message: 'Informe um e-mail válido.',
      details: { fields: { email: 'Informe um e-mail válido.', password: 'A senha precisa ter pelo menos 6 caracteres.', phone: 'Informe um telefone com DDD.', name: 'Informe seu nome completo.' } },
    },
  })
  const wrapper = mount(RegisterView, { global: { stubs } })
  await fillAndSubmit(wrapper)
  expect(errorOf(wrapper, 'Email')).toBe('Informe um e-mail válido.')
  expect(errorOf(wrapper, 'Senha')).toBe('A senha precisa ter pelo menos 6 caracteres.')
  expect(errorOf(wrapper, 'Telefone')).toBe('Informe um telefone com DDD.')
  expect(errorOf(wrapper, 'Nome completo')).toBe('Informe seu nome completo.')
  expect(wrapper.find('.error-message').exists()).toBe(false)

  await wrapper.findAll('input:not([type=checkbox])')[1].setValue('ana@clinica.com.br')
  expect(errorOf(wrapper, 'Email')).toBe('')
  expect(errorOf(wrapper, 'Senha')).toBe('A senha precisa ter pelo menos 6 caracteres.')
})

it('e-mail já cadastrado aparece no campo e-mail', async () => {
  mocks.register.mockResolvedValue({ success: false, error: { code: 'AUTH_USER_EXISTS', message: 'Usuário com este e-mail já existe' } })
  const wrapper = mount(RegisterView, { global: { stubs } })
  await fillAndSubmit(wrapper)
  expect(errorOf(wrapper, 'Email')).toBe('Usuário com este e-mail já existe')
})

it('sem aceitar os termos não chama a API', async () => {
  const wrapper = mount(RegisterView, { global: { stubs } })
  await wrapper.find('form').trigger('submit')
  await flushPromises()
  expect(mocks.register).not.toHaveBeenCalled()
  expect(wrapper.text()).toContain('aceitar os termos')
})
