// A tela de retorno decide o estado pelo código recebido na URL (ver Preview.vue).
const profile = { name: 'Ana Souza', email: 'ana.souza@gmail.com' }
export const exchangeOAuthCode = (code) => {
  if (code === 'preview-loading') return new Promise(() => {})
  return Promise.resolve({ data: { data: { kind: 'complete', profile } } })
}
export const completeOAuthSignup = () => new Promise(() => {})
export const finalizeOAuthLink = () => new Promise(() => {})
export const getOAuthProviders = () => Promise.resolve({ data: { data: { providers: [] } } })
export const startOAuth = () => new Promise(() => {})
export const startOAuthLink = () => new Promise(() => {})
export const reauthWithPassword = () => Promise.reject({ response: { data: { error: { code: 'reauth_invalid_password', message: 'Senha incorreta. Confira e tente novamente.', details: { fields: { password: 'Senha incorreta. Confira e tente novamente.' } } } } } })
export const unlinkOAuthProvider = () => Promise.resolve()
