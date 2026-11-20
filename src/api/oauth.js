/**
 * API de login/vínculo com provedores externos (Google e futuros).
 * Contrato e erros: api-clinic/docs/auth/OAUTH_PROVEDORES.md
 */
import apiClient from './index'

/** Provedores configurados + estado: [{ id, name, status: 'available' | 'degraded' }] */
export const getOAuthProviders = () => apiClient.get('/v2/auth/oauth/providers')

/** Início do login/cadastro (público). Resposta: { authorization_url } */
export const startOAuth = (provider, body) => apiClient.post(`/v2/auth/oauth/${provider}/start`, body)

/** Início do vínculo/confirmação com usuário logado. Resposta: { authorization_url } */
export const startOAuthLink = (provider, body) => apiClient.post(`/v2/auth/oauth/${provider}/link/start`, body)

/** Troca o código de uso único do callback pelo resultado (sessão ou etapa de cadastro). */
export const exchangeOAuthCode = (code, binding) => apiClient.post('/v2/auth/oauth/exchange', { code, binding })

/**
 * Conclui o vínculo (`link`) ou a confirmação de identidade pelo provedor (`reauth`).
 * Exige usuário logado (Bearer) e o binding do navegador que iniciou o fluxo.
 */
export const finalizeOAuthLink = (code, binding) => apiClient.post('/v2/auth/oauth/link/exchange', { code, binding })

/** Conclui o cadastro de conta nova (telefone e aceite dos termos). */
export const completeOAuthSignup = (payload) => apiClient.post('/v2/auth/oauth/complete', payload)

/** Confirma a identidade com a senha atual (exigido para conectar/desconectar). */
export const reauthWithPassword = (password) => apiClient.post('/v2/auth/oauth/reauth/password', { password })

/** Desconecta um provedor. */
export const unlinkOAuthProvider = (provider) => apiClient.delete(`/v2/auth/oauth/${provider}`)
