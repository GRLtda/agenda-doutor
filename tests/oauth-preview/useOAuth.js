import { ref } from 'vue'
import { useScenario } from './scenario'
export * from '../../src/composables/useOAuth.js'

// Provedores por cartão (não usam a API nem o estado compartilhado real).
export function useOAuthProviders() {
  const scenario = useScenario()
  const providers = ref(scenario.providers || [{ id: 'google', name: 'Google', status: 'available' }])
  const load = () => {
    if (scenario.resume) sessionStorage.setItem('oauth_result', JSON.stringify({ kind: scenario.resume, at: Date.now() }))
    return scenario.neverLoads ? new Promise(() => {}) : Promise.resolve()
  }
  return { providers, loaded: ref(true), load }
}

// Iniciar o fluxo sempre "falha" na prévia: serve para exibir o erro inline.
const failure = { ok: false, error: { code: 'provider_unavailable', message: 'O Google está instável agora. Tente de novo em alguns minutos ou entre com seu e-mail e senha.', action: 'retry_or_use_password', fields: {} } }
export const beginOAuthLogin = () => new Promise((resolve) => setTimeout(() => resolve(failure), 150))
export const beginOAuthLink = () => new Promise(() => {}) // fica em "carregando"

// Binding fixo: as várias telas de retorno da página não podem apagar a prova do navegador umas das outras.
export const getOAuthBinding = () => 'binding-de-previa-0123456789'
export const clearOAuthBinding = () => {}
