/**
 * Login com provedores externos: estado dos provedores, início do fluxo e mensagens de erro.
 *
 * - O navegador gera um `binding` aleatório (sessionStorage) enviado no início e na troca do código:
 *   só o navegador que começou o fluxo consegue concluí-lo (proteção contra login CSRF).
 * - Nada sensível passa pela URL: o callback traz só um código de uso único.
 */
import { ref, readonly } from 'vue'
import { getOAuthProviders, startOAuth, startOAuthLink } from '@/api/oauth'

const BINDING_KEY = 'oauth_binding'
const CAMPAIGN_KEY = 'signupCampaignCode' // mesma chave usada pelo cadastro

// ---------------------------------------------------------------- mensagens
// Espelha o catálogo do backend (GET /v2/auth/oauth/errors). O backend devolve a mensagem pronta nas
// respostas JSON; aqui ficam as mensagens do redirecionamento (?oauth_error=<codigo>) e o fallback.
export const OAUTH_ERROR_MESSAGES = {
  provider_unavailable: 'O Google está instável agora e não conseguimos concluir o login. Você pode tentar de novo em alguns minutos ou entrar com seu e-mail e senha.',
  provider_timeout: 'O Google demorou a responder. Tente novamente.',
  provider_not_configured: 'Este tipo de login não está disponível no momento. Entre com seu e-mail e senha.',
  unknown_provider: 'Este tipo de login não está disponível no momento. Entre com seu e-mail e senha.',
  user_cancelled: 'O login com Google foi cancelado. Nada foi alterado na sua conta.',
  consent_denied: 'Precisamos de acesso ao seu nome e e-mail do Google para continuar.',
  email_not_verified: 'O Google informou que o e-mail dessa conta ainda não foi confirmado. Confirme-o no Google e tente de novo.',
  state_invalid_or_expired: 'Essa tentativa de login expirou. Por segurança, comece de novo.',
  account_disabled: 'Sua conta está desativada. Fale com o administrador da clínica ou com o suporte.',
  identity_already_linked: 'Essa conta Google já está conectada a outro usuário. Use outra conta Google ou entre com o usuário original.',
  provider_already_connected: 'Sua conta já está conectada ao Google.',
  last_login_method: 'Defina uma senha antes de desconectar o Google, para você não perder o acesso.',
  identity_not_found: 'Essa conexão não existe ou já foi removida.',
  reauth_required: 'Por segurança, confirme sua identidade antes de continuar.',
  reauth_invalid_password: 'A senha informada está incorreta. Confira e tente novamente.',
  reauth_identity_mismatch: 'Essa conta Google não é a que está conectada ao seu usuário. Entre com a conta Google correta.',
  password_login_unavailable: 'Essa conta foi criada com o Google e ainda não tem senha. Entre com o Google ou use "Esqueci minha senha" para criar uma.',
  invite_email_mismatch: 'Esse convite foi enviado para outro e-mail. Entre com a conta Google desse e-mail.',
  invite_invalid: 'Esse convite não é mais válido. Peça um novo ao administrador da clínica.',
  phone_invalid: 'Informe um telefone com DDD.',
  terms_required: 'Aceite os termos de uso e a política de privacidade para continuar.',
  validation_error: 'Confira os campos informados.',
  rate_limited: 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente de novo.',
  security_blocked: 'Por segurança, não conseguimos concluir o login agora. Tente novamente mais tarde ou entre com e-mail e senha.',
  unknown: 'Não conseguimos concluir o login agora. Tente novamente em instantes. Se continuar, fale com o suporte.',
}

/** Ação sugerida por código (para o design decidir botões: tentar de novo, usar senha, etc.). */
export const OAUTH_ERROR_ACTIONS = {
  provider_unavailable: 'retry_or_use_password',
  provider_timeout: 'retry',
  user_cancelled: 'retry',
  consent_denied: 'retry',
  state_invalid_or_expired: 'retry',
  email_not_verified: 'use_password',
  provider_not_configured: 'use_password',
  unknown_provider: 'use_password',
  account_disabled: 'contact_support',
  security_blocked: 'contact_support',
  identity_already_linked: 'use_other_account',
  reauth_identity_mismatch: 'use_other_account',
  invite_email_mismatch: 'use_other_account',
  last_login_method: 'set_password',
  reauth_required: 'reauthenticate',
  rate_limited: 'wait',
}

export function getOAuthErrorMessage(code) {
  return OAUTH_ERROR_MESSAGES[code] || OAUTH_ERROR_MESSAGES.unknown
}

/** Lê o erro de uma resposta da API de OAuth: { code, message, action, fields }. Nunca devolve texto técnico. */
export function parseOAuthApiError(error) {
  const data = error?.response?.data?.error
  if (!error?.response) {
    return {
      code: 'network',
      message: 'Não conseguimos falar com o sistema agora. Confira sua conexão e tente novamente em instantes.',
      action: 'retry',
      fields: {},
    }
  }
  const code = data?.code || 'unknown'
  return {
    code,
    message: data?.message || getOAuthErrorMessage(code),
    action: data?.details?.action || OAUTH_ERROR_ACTIONS[code] || 'retry',
    fields: data?.details?.fields || {},
  }
}

// ---------------------------------------------------------------- binding
export function getOAuthBinding({ create = false } = {}) {
  try {
    let binding = sessionStorage.getItem(BINDING_KEY)
    if (!binding && create) {
      const bytes = new Uint8Array(24)
      crypto.getRandomValues(bytes)
      binding = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
      sessionStorage.setItem(BINDING_KEY, binding)
    }
    return binding
  } catch {
    return null
  }
}

export function clearOAuthBinding() {
  try {
    sessionStorage.removeItem(BINDING_KEY)
  } catch {
    // sessionStorage indisponível: nada a limpar
  }
}

// ---------------------------------------------------------------- provedores (estado compartilhado)
const providers = ref([])
const providersLoaded = ref(false)
let providersPromise = null

/** Carrega os provedores disponíveis. Falha silenciosa: sem provedores o login por senha segue normal. */
export async function loadOAuthProviders({ force = false } = {}) {
  if (providersLoaded.value && !force) return providers.value
  if (providersPromise && !force) return providersPromise
  providersPromise = getOAuthProviders()
    .then((response) => {
      providers.value = response.data?.data?.providers || []
    })
    .catch(() => {
      providers.value = []
    })
    .finally(() => {
      providersLoaded.value = true
      providersPromise = null
    })
  await providersPromise
  return providers.value
}

export function useOAuthProviders() {
  return { providers: readonly(providers), loaded: readonly(providersLoaded), load: loadOAuthProviders }
}

// ---------------------------------------------------------------- início do fluxo
/**
 * Inicia o login/cadastro (público) e navega para o provedor.
 * Retorna { ok: true } (a página será trocada) ou { ok: false, error: { code, message, action } }.
 */
export async function beginOAuthLogin(providerId, { intent = 'login', returnTo, invitationToken } = {}) {
  const binding = getOAuthBinding({ create: true })
  if (!binding) {
    return { ok: false, error: { code: 'unknown', message: getOAuthErrorMessage('unknown'), action: 'retry', fields: {} } }
  }

  let campaignCode
  try {
    campaignCode = sessionStorage.getItem(CAMPAIGN_KEY) || undefined
  } catch {
    campaignCode = undefined
  }

  try {
    const response = await startOAuth(providerId, {
      intent,
      binding,
      return_to: returnTo,
      campaign_code: campaignCode,
      invitation_token: invitationToken,
    })
    window.location.assign(response.data.data.authorization_url)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: parseOAuthApiError(error) }
  }
}

/** Inicia o vínculo (intent 'link') ou a confirmação pelo provedor (intent 'reauth') com o usuário logado. */
export async function beginOAuthLink(providerId, { intent = 'link', returnTo } = {}) {
  const binding = getOAuthBinding({ create: true })
  try {
    const response = await startOAuthLink(providerId, { intent, binding, return_to: returnTo })
    window.location.assign(response.data.data.authorization_url)
    return { ok: true }
  } catch (error) {
    return { ok: false, error: parseOAuthApiError(error) }
  }
}
