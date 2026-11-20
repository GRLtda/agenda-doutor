// Tela de entrada (LoginView.vue): avisos por tipo de falha, bloqueio por tentativas e atributos de preenchimento.
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ login: null, push: vi.fn(), query: {} }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: mocks.query }),
  useRouter: () => ({ push: mocks.push, currentRoute: { value: { query: mocks.query } } }),
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ login: (...a) => mocks.login(...a), requestPasswordReset: vi.fn(), performPasswordReset: vi.fn() }) }))

const stubs = {
  SocialLoginSection: true,
  'router-link': { template: '<a><slot /></a>' },
  FormInput: {
    props: ['modelValue', 'label', 'error', 'name', 'autocomplete', 'inputAttrs'],
    emits: ['update:modelValue'],
    template: '<label :data-field="label"><input :name="name" :autocomplete="autocomplete" :inputmode="inputAttrs && inputAttrs.inputmode" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><span class="err">{{ error }}</span></label>',
  },
  PasswordInput: {
    props: ['modelValue', 'label', 'error', 'autocomplete'],
    emits: ['update:modelValue'],
    template: '<label data-field="Senha"><input type="password" :autocomplete="autocomplete" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><slot name="label-action" /></label>',
  },
  AppButton: { props: ['disabled'], template: '<button type="submit" :disabled="disabled"><slot /></button>' },
}
const { default: LoginView } = await import('@/views/pages/autenticacao/LoginView.vue')

async function submit(wrapper) {
  await wrapper.find('input[name=email]').setValue('ana@clinica.com')
  await wrapper.find('input[type=password]').setValue('segredo')
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  mocks.query = {}
  mocks.push.mockReset()
  mocks.login = vi.fn().mockResolvedValue({ success: false, code: 'AUTH_INVALID_CREDENTIALS', status: 401, error: 'x' })
})
afterEach(() => vi.useRealTimers())

it('campos têm os atributos que gerenciadores de senha e teclados reconhecem', () => {
  const wrapper = mount(LoginView, { global: { stubs } })
  expect(wrapper.find('input[name=email]').attributes('autocomplete')).toBe('username')
  expect(wrapper.find('input[name=email]').attributes('inputmode')).toBe('email')
  expect(wrapper.find('input[type=password]').attributes('autocomplete')).toBe('current-password')
  expect(wrapper.find('form').attributes('aria-label')).toBe('Entrar na sua conta')
})

it('credenciais incorretas: aviso genérico (não revela se o e-mail existe)', async () => {
  const wrapper = mount(LoginView, { global: { stubs } })
  await submit(wrapper)
  expect(wrapper.find('.auth-banner').text()).toContain('E-mail ou senha incorretos.')
  expect(wrapper.find('.auth-banner').attributes('role')).toBe('alert')
})

it('sem conexão: aviso com ação de tentar de novo, sem termos técnicos', async () => {
  mocks.login.mockResolvedValue({ success: false, error: 'x', status: undefined })
  const wrapper = mount(LoginView, { global: { stubs } })
  await submit(wrapper)
  const text = wrapper.find('.auth-banner').text()
  expect(text).toContain('Não foi possível entrar.')
  expect(text).toContain('Tentar novamente')
  expect(text).not.toMatch(/network|timeout|500|axios/i)
})

it('muitas tentativas: bloqueia o botão com contagem regressiva e libera no fim', async () => {
  mocks.login.mockResolvedValue({ success: false, code: 'AUTH_RATE_LIMITED', status: 429, error: 'x', details: { retry_after: 3 } })
  const wrapper = mount(LoginView, { global: { stubs } })
  await submit(wrapper)
  expect(wrapper.find('.auth-banner').text()).toContain('Muitas tentativas')
  expect(wrapper.find('button[type=submit]').attributes('disabled')).toBeDefined()
  expect(wrapper.find('button[type=submit]').text()).toContain('Aguarde 0:03')
  await vi.advanceTimersByTimeAsync(3100)
  expect(wrapper.find('button[type=submit]').attributes('disabled')).toBeUndefined()
  expect(wrapper.find('.auth-banner').exists()).toBe(false)
})

it('assinatura pausada: aviso de atenção com saída para o suporte', async () => {
  mocks.login.mockResolvedValue({ success: false, code: 'AUTH_SUBSCRIPTION_REQUIRED', status: 403, error: 'x' })
  const wrapper = mount(LoginView, { global: { stubs } })
  await submit(wrapper)
  expect(wrapper.find('.auth-banner').text()).toContain('acesso da clínica está pausado')
  expect(wrapper.find('.auth-banner').text()).toContain('Falar com o suporte')
})

it('chegou por link protegido: explica por que precisa entrar', () => {
  mocks.query = { redirect: '/calendario' }
  const wrapper = mount(LoginView, { global: { stubs } })
  expect(wrapper.find('.auth-banner').text()).toContain('continuar de onde parou')
})

it('login com sucesso volta para o caminho interno de origem', async () => {
  mocks.query = { redirect: '/calendario' }
  mocks.login.mockResolvedValue({ success: true })
  const wrapper = mount(LoginView, { global: { stubs } })
  await submit(wrapper)
  expect(mocks.push).toHaveBeenCalledWith('/calendario')
})
