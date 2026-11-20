// Login com provedores externos (Google...): mensagens, botão nativo, bolinha de alerta e tela de retorno.
// Rodar: npm run test:oauth
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// Mantém em sincronia com OAUTH_ERRORS (api-clinic/src/v2/auth/oauth/oauth.errors.ts).
const BACKEND_ERROR_CODES = [
  'provider_unavailable', 'provider_timeout', 'provider_not_configured', 'unknown_provider', 'user_cancelled',
  'consent_denied', 'email_not_verified', 'state_invalid_or_expired', 'account_disabled', 'identity_already_linked',
  'provider_already_connected', 'last_login_method', 'identity_not_found', 'reauth_required', 'reauth_invalid_password',
  'reauth_identity_mismatch', 'password_login_unavailable', 'invite_email_mismatch', 'invite_invalid', 'phone_invalid',
  'terms_required', 'validation_error', 'rate_limited', 'security_blocked', 'unknown',
]

const apiMocks = vi.hoisted(() => ({
  getOAuthProviders: vi.fn(),
  startOAuth: vi.fn(),
  startOAuthLink: vi.fn(),
  exchangeOAuthCode: vi.fn(),
  finalizeOAuthLink: vi.fn(),
  completeOAuthSignup: vi.fn(),
}))
vi.mock('@/api/oauth', () => apiMocks)

const routerMocks = vi.hoisted(() => ({ replace: vi.fn(() => Promise.resolve()), push: vi.fn(), query: {} }))
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routerMocks.query, fullPath: '/app' }),
  useRouter: () => ({ replace: routerMocks.replace, push: routerMocks.push }),
}))

const authStoreMock = vi.hoisted(() => ({ loginWithTokens: vi.fn(), fetchUser: vi.fn() }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => authStoreMock }))

import {
  OAUTH_ERROR_MESSAGES, getOAuthErrorMessage, parseOAuthApiError, loadOAuthProviders,
} from '@/composables/useOAuth'
import SocialLoginButton from '@/components/auth/SocialLoginButton.vue'
import SocialLoginSection from '@/components/auth/SocialLoginSection.vue'
import SecurityAlertDot from '@/components/auth/SecurityAlertDot.vue'
import OAuthCallbackView from '@/views/pages/autenticacao/OAuthCallbackView.vue'

const stubs = {
  PasswordInput: { props: ['modelValue', 'label', 'error'], template: '<div class="pw" :data-label="label"><input class="pw-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" /><span class="pw-error">{{ error }}</span></div>' },
  AuthCard: { template: '<div><slot name="title" /><slot /></div>' },
  ClinicLogo: true,
  FormInput: { props: ['modelValue', 'error', 'label'], template: '<div class="fi"><span>{{ label }}</span><span class="fi-error">{{ error }}</span></div>' },
  AppButton: { template: '<button type="button" @click="$emit(\'click\')"><slot /></button>' },
}

beforeEach(() => {
  sessionStorage.clear()
  routerMocks.query = {}
  Object.values(apiMocks).forEach((fn) => fn.mockReset())
  authStoreMock.loginWithTokens.mockReset()
  authStoreMock.fetchUser.mockReset()
})

describe('mensagens de erro', () => {
  it('cobre todos os códigos do catálogo do backend, em português e sem termos técnicos', () => {
    const technical = /\b(http|token|state|timeout|payload|undefined|null|stack|500|404|oauth)\b/i
    for (const code of BACKEND_ERROR_CODES) {
      expect(OAUTH_ERROR_MESSAGES[code], code).toBeTruthy()
      expect(OAUTH_ERROR_MESSAGES[code], code).not.toMatch(technical)
    }
  })

  it('código desconhecido cai na mensagem genérica amigável', () => {
    expect(getOAuthErrorMessage('qualquer-coisa')).toBe(OAUTH_ERROR_MESSAGES.unknown)
  })

  it('erro de resposta da API usa mensagem, ação e campos do backend', () => {
    const parsed = parseOAuthApiError({
      response: { data: { error: { code: 'phone_invalid', message: 'Informe um telefone com DDD.', details: { action: 'none', fields: { phone: 'Informe um telefone com DDD.' } } } } },
    })
    expect(parsed).toMatchObject({ code: 'phone_invalid', action: 'none', fields: { phone: 'Informe um telefone com DDD.' } })
  })

  it('sem resposta (rede caiu) vira mensagem amigável para tentar de novo, sem texto técnico', () => {
    const parsed = parseOAuthApiError(new Error('Network Error'))
    expect(parsed.code).toBe('network')
    expect(parsed.action).toBe('retry')
    expect(parsed.message).not.toMatch(/network error/i)
  })
})

describe('SecurityAlertDot', () => {
  it('só aparece quando há pendência e tem texto acessível', () => {
    expect(mount(SecurityAlertDot, { props: { alerts: [] } }).find('.security-alert-dot').exists()).toBe(false)
    const dot = mount(SecurityAlertDot, { props: { alerts: [{ code: 'no_password' }] } }).find('.security-alert-dot')
    expect(dot.exists()).toBe(true)
    expect(dot.attributes('aria-label')).toBe('Defina uma senha para sua conta')
  })
})

describe('SocialLoginButton', () => {
  it('mostra o texto do modo e emite o clique com o provedor', async () => {
    const wrapper = mount(SocialLoginButton, { props: { provider: 'google', mode: 'signup' } })
    expect(wrapper.text()).toContain('Cadastrar com Google')
    await wrapper.trigger('click')
    expect(wrapper.emitted('click')[0]).toEqual(['google'])
  })

  it('bloqueia clique duplo enquanto carrega e quando o provedor está instável', async () => {
    const loading = mount(SocialLoginButton, { props: { provider: 'google', loading: true } })
    expect(loading.attributes('disabled')).toBeDefined()
    expect(loading.attributes('aria-busy')).toBe('true')
    await loading.trigger('click')
    expect(loading.emitted('click')).toBeUndefined()

    const degraded = mount(SocialLoginButton, { props: { provider: 'google', status: 'degraded' } })
    expect(degraded.attributes('disabled')).toBeDefined()
  })
})

describe('SocialLoginSection', () => {
  const mountSection = (props = {}) => mount(SocialLoginSection, { props, global: { stubs } })

  async function withProviders(providers) {
    apiMocks.getOAuthProviders.mockResolvedValue({ data: { data: { providers } } })
    await loadOAuthProviders({ force: true })
  }

  it('não renderiza nada quando nenhum provedor está configurado (login por senha segue normal)', async () => {
    await withProviders([])
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.find('.social-login-section').exists()).toBe(false)
  })

  it('mostra um botão por provedor disponível', async () => {
    await withProviders([{ id: 'google', name: 'Google', status: 'available' }])
    const wrapper = mountSection({ intent: 'login' })
    await flushPromises()
    expect(wrapper.find('[data-provider="google"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Continuar com Google')
  })

  it('provedor instável: desabilita o botão e orienta a entrar com e-mail e senha', async () => {
    await withProviders([{ id: 'google', name: 'Google', status: 'degraded' }])
    const wrapper = mountSection()
    await flushPromises()
    expect(wrapper.find('[data-provider="google"]').attributes('disabled')).toBeDefined()
    expect(wrapper.find('.social-notice').text()).toMatch(/instável.*e-mail e senha/i)
  })

  it('falha ao iniciar: mostra a mensagem amigável inline e libera o botão para tentar de novo', async () => {
    await withProviders([{ id: 'google', name: 'Google', status: 'available' }])
    apiMocks.startOAuth.mockRejectedValue({
      response: { data: { error: { code: 'provider_unavailable', message: OAUTH_ERROR_MESSAGES.provider_unavailable, details: { action: 'retry_or_use_password' } } } },
    })
    const wrapper = mountSection()
    await flushPromises()
    await wrapper.find('[data-provider="google"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('.social-error').text()).toContain('O Google está instável agora')
    expect(wrapper.find('[data-provider="google"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.emitted('error')[0][0].code).toBe('provider_unavailable')
  })

  it('envia intenção, binding do navegador e convite no início do fluxo', async () => {
    await withProviders([{ id: 'google', name: 'Google', status: 'available' }])
    apiMocks.startOAuth.mockRejectedValue({ response: { data: { error: { code: 'unknown' } } } })
    const wrapper = mountSection({ intent: 'signup', invitationToken: 'convite-1', returnTo: '/app/agenda' })
    await flushPromises()
    await wrapper.find('[data-provider="google"]').trigger('click')
    await flushPromises()

    const [provider, body] = apiMocks.startOAuth.mock.calls[0]
    expect(provider).toBe('google')
    expect(body).toMatchObject({ intent: 'signup', invitation_token: 'convite-1', return_to: '/app/agenda' })
    expect(body.binding.length).toBeGreaterThanOrEqual(16)
    expect(sessionStorage.getItem('oauth_binding')).toBe(body.binding)
  })
})

describe('OAuthCallbackView', () => {
  const mountView = () => mount(OAuthCallbackView, { global: { stubs } })

  it('erro vindo do backend: mensagem amigável, sem expor o código, com saída para e-mail e senha', async () => {
    routerMocks.query = { oauth_error: 'provider_unavailable', intent: 'login' }
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('O Google está instável agora')
    expect(wrapper.text()).toContain('Tentar novamente')
    expect(wrapper.text()).toContain('Entrar com e-mail e senha')
    expect(routerMocks.replace).toHaveBeenCalledWith({ query: {} }) // limpa a URL
  })

  it('sem parâmetros válidos: nunca fica em branco, mostra que a tentativa expirou', async () => {
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('expirou')
  })

  it('código sem binding do navegador (outro navegador/aba): recusa sem chamar a API', async () => {
    routerMocks.query = { oauth: 'login', code: 'codigo-de-uso-unico' }
    const wrapper = mountView()
    await flushPromises()
    expect(apiMocks.exchangeOAuthCode).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('expirou')
  })

  it('login ok: troca o código, abre a sessão e vai para o destino seguro', async () => {
    sessionStorage.setItem('oauth_binding', 'binding-aleatorio-do-navegador-1')
    routerMocks.query = { oauth: 'login', code: 'codigo-de-uso-unico', intent: 'login', return: '/app/agenda' }
    apiMocks.exchangeOAuthCode.mockResolvedValue({ data: { data: { kind: 'login', access_token: 'a', refresh_token: 'r', expires_in: 900, return_to: '/app/agenda' } } })
    authStoreMock.loginWithTokens.mockResolvedValue({ success: true })
    mountView()
    await flushPromises()

    expect(apiMocks.exchangeOAuthCode).toHaveBeenCalledWith('codigo-de-uso-unico', 'binding-aleatorio-do-navegador-1')
    expect(authStoreMock.loginWithTokens).toHaveBeenCalled()
    expect(routerMocks.replace).toHaveBeenCalledWith('/app/agenda')
    expect(sessionStorage.getItem('oauth_binding')).toBeNull()
  })

  it('return com host externo é ignorado (open redirect)', async () => {
    sessionStorage.setItem('oauth_binding', 'binding-aleatorio-do-navegador-1')
    routerMocks.query = { oauth: 'login', code: 'codigo-de-uso-unico', return: '//evil.com' }
    apiMocks.exchangeOAuthCode.mockResolvedValue({ data: { data: { kind: 'login', access_token: 'a', refresh_token: 'r', expires_in: 900, return_to: 'https://evil.com' } } })
    authStoreMock.loginWithTokens.mockResolvedValue({ success: true })
    mountView()
    await flushPromises()
    expect(routerMocks.replace).toHaveBeenCalledWith({ name: 'resumo-dashboard' })
  })

  it('vínculo: conclui pela troca autenticada (nunca pela pública) e volta ao perfil', async () => {
    sessionStorage.setItem('oauth_binding', 'binding-aleatorio-do-navegador-1')
    routerMocks.query = { oauth: 'link', code: 'codigo-de-uso-unico', intent: 'link', return: '/app/perfil?profile=1' }
    apiMocks.finalizeOAuthLink.mockResolvedValue({ data: { data: { kind: 'linked', provider: 'google' } } })
    mountView()
    await flushPromises()

    expect(apiMocks.exchangeOAuthCode).not.toHaveBeenCalled()
    expect(apiMocks.finalizeOAuthLink).toHaveBeenCalledWith('codigo-de-uso-unico', 'binding-aleatorio-do-navegador-1')
    expect(authStoreMock.fetchUser).toHaveBeenCalled()
    expect(JSON.parse(sessionStorage.getItem('oauth_result')).kind).toBe('linked')
    expect(routerMocks.replace).toHaveBeenCalledWith('/app/perfil?profile=1')
  })

  it('vínculo recusado (ex.: conta Google de outro usuário): mensagem amigável e saída de volta ao perfil', async () => {
    sessionStorage.setItem('oauth_binding', 'binding-aleatorio-do-navegador-1')
    routerMocks.query = { oauth: 'link', code: 'codigo-de-uso-unico', intent: 'link', return: '/app/perfil' }
    apiMocks.finalizeOAuthLink.mockRejectedValue({
      response: { status: 409, data: { error: { code: 'identity_already_linked', message: OAUTH_ERROR_MESSAGES.identity_already_linked, details: { action: 'use_other_account' } } } },
    })
    const wrapper = mountView()
    await flushPromises()
    expect(wrapper.text()).toContain('já está conectada a outro usuário')
    expect(wrapper.text()).toContain('Voltar ao perfil')
  })

  it('conta nova: mostra a etapa de cadastro e valida telefone e termos no próprio campo', async () => {
    sessionStorage.setItem('oauth_binding', 'binding-aleatorio-do-navegador-1')
    routerMocks.query = { oauth: 'complete', code: 'codigo-de-uso-unico', intent: 'signup' }
    apiMocks.exchangeOAuthCode.mockResolvedValue({ data: { data: { kind: 'complete', profile: { name: 'Ana Souza', email: 'ana@clinica.com' } } } })
    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('Complete seu cadastro')
    expect(wrapper.text()).toContain('ana@clinica.com')

    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('.fi-error').map((e) => e.text()).join(' ')).toContain('telefone com DDD')
    expect(wrapper.text()).toContain('Aceite os termos')
    expect(apiMocks.completeOAuthSignup).not.toHaveBeenCalled()
  })

  async function mountComplete(profile = { name: 'Ana Souza', email: 'ana@clinica.com' }) {
    sessionStorage.setItem('oauth_binding', 'binding-aleatorio-do-navegador-1')
    routerMocks.query = { oauth: 'complete', code: 'codigo-de-uso-unico', intent: 'signup' }
    apiMocks.exchangeOAuthCode.mockResolvedValue({ data: { data: { kind: 'complete', profile } } })
    const wrapper = mountView()
    await flushPromises()
    return wrapper
  }
  const fillRequired = (wrapper) => {
    wrapper.vm.$.setupState.phone = '11999990000'
    wrapper.vm.$.setupState.termsAccepted = true
  }

  it('cadastro: mostra a foto do Google quando existe e cai para a inicial se a imagem falhar', async () => {
    const wrapper = await mountComplete({ name: 'Ana Souza', email: 'ana@clinica.com', picture: 'https://lh3.googleusercontent.com/a/foto=s96-c' })
    const img = wrapper.find('.oauth-avatar-img')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toContain('googleusercontent.com')
    expect(img.attributes('referrerpolicy')).toBe('no-referrer')

    await img.trigger('error')
    expect(wrapper.find('.oauth-avatar-img').exists()).toBe(false)
    expect(wrapper.find('.oauth-avatar').text()).toContain('A')
  })

  it('cadastro: senha é opcional, começa recolhida e abre com senha e confirmação', async () => {
    const wrapper = await mountComplete()
    expect(wrapper.findAll('.pw')).toHaveLength(0)
    const toggle = wrapper.find('.oauth-optional-toggle')
    expect(toggle.text()).toContain('Definir uma senha agora')
    expect(toggle.text()).toContain('opcional')

    await toggle.trigger('click')
    const labels = wrapper.findAll('.pw').map((field) => field.attributes('data-label'))
    expect(labels).toEqual(['Senha', 'Confirmar senha'])

    await wrapper.find('.oauth-optional-skip').trigger('click')
    expect(wrapper.findAll('.pw')).toHaveLength(0)
  })

  it('cadastro sem preencher a senha: segue sem senha (nada é enviado)', async () => {
    const wrapper = await mountComplete()
    apiMocks.completeOAuthSignup.mockResolvedValue({ data: { data: { access_token: 'a', refresh_token: 'r', expires_in: 900 } } })
    authStoreMock.loginWithTokens.mockResolvedValue({ success: true })
    fillRequired(wrapper)
    await wrapper.find('.oauth-optional-toggle').trigger('click') // abriu mas não digitou
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const payload = apiMocks.completeOAuthSignup.mock.calls[0][0]
    expect(payload).not.toHaveProperty('password')
    expect(payload).not.toHaveProperty('password_confirmation')
  })

  it('cadastro com senha: envia senha e confirmação', async () => {
    const wrapper = await mountComplete()
    apiMocks.completeOAuthSignup.mockResolvedValue({ data: { data: { access_token: 'a', refresh_token: 'r', expires_in: 900 } } })
    authStoreMock.loginWithTokens.mockResolvedValue({ success: true })
    fillRequired(wrapper)
    await wrapper.find('.oauth-optional-toggle').trigger('click')
    wrapper.vm.$.setupState.password = 'Senha@123'
    wrapper.vm.$.setupState.passwordConfirmation = 'Senha@123'
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(apiMocks.completeOAuthSignup.mock.calls[0][0]).toMatchObject({ password: 'Senha@123', password_confirmation: 'Senha@123', terms_accepted: true })
    expect(authStoreMock.loginWithTokens).toHaveBeenCalled()
  })

  it('cadastro com senha: confirmação diferente e senha curta aparecem no campo, sem chamar a API', async () => {
    const wrapper = await mountComplete()
    fillRequired(wrapper)
    await wrapper.find('.oauth-optional-toggle').trigger('click')

    wrapper.vm.$.setupState.password = 'Senha@123'
    wrapper.vm.$.setupState.passwordConfirmation = 'Senha@124'
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('.pw-error').map((e) => e.text()).join(' ')).toContain('As senhas não conferem')

    wrapper.vm.$.setupState.password = '123'
    wrapper.vm.$.setupState.passwordConfirmation = '123'
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.findAll('.pw-error').map((e) => e.text()).join(' ')).toContain('pelo menos 6 caracteres')
    expect(apiMocks.completeOAuthSignup).not.toHaveBeenCalled()
  })

  it('erro de senha devolvido pela API aparece no campo e mantém a seção aberta', async () => {
    const wrapper = await mountComplete()
    fillRequired(wrapper)
    wrapper.vm.$.setupState.wantsPassword = true
    wrapper.vm.$.setupState.password = 'Senha@123'
    wrapper.vm.$.setupState.passwordConfirmation = 'Senha@123'
    apiMocks.completeOAuthSignup.mockRejectedValue({
      response: { data: { error: { code: 'validation_error', message: 'Use no máximo 128 caracteres.', details: { fields: { password: 'Use no máximo 128 caracteres.' } } } } },
    })
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(wrapper.findAll('.pw-error').map((e) => e.text()).join(' ')).toContain('no máximo 128')
    expect(wrapper.findAll('.pw')).toHaveLength(2)
    expect(authStoreMock.loginWithTokens).not.toHaveBeenCalled()
  })

  it('erro de campo devolvido pela API aparece no campo, sem toast', async () => {
    sessionStorage.setItem('oauth_binding', 'binding-aleatorio-do-navegador-1')
    routerMocks.query = { oauth: 'complete', code: 'codigo-de-uso-unico' }
    apiMocks.exchangeOAuthCode.mockResolvedValue({ data: { data: { kind: 'complete', profile: { name: 'Ana', email: 'ana@clinica.com' } } } })
    apiMocks.completeOAuthSignup.mockRejectedValue({
      response: { data: { error: { code: 'phone_invalid', message: 'Informe um telefone com DDD.', details: { fields: { phone: 'Informe um telefone com DDD.' } } } } },
    })
    const wrapper = mountView()
    await flushPromises()
    wrapper.vm.$.setupState.phone = '11999990000'
    wrapper.vm.$.setupState.termsAccepted = true
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(apiMocks.completeOAuthSignup).toHaveBeenCalled()
    expect(wrapper.findAll('.fi-error').map((e) => e.text()).join(' ')).toContain('telefone com DDD')
    expect(authStoreMock.loginWithTokens).not.toHaveBeenCalled()
  })
})
