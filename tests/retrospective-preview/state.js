// API e autenticação simuladas para a prévia.
import { fullRetrospective, reducedRetrospective } from '../fixtures/retrospective'

const params = new URLSearchParams(location.search)
const build = () => {
  const retro = params.get('seq') === 'reduced' ? reducedRetrospective() : fullRetrospective()
  if (params.get('copy')) retro.copyVariant = Number(params.get('copy'))
  if (params.get('logo')) retro.clinic.logoUrl = params.get('logo')
  return retro
}
export const calls = []
const delay = (ms) => new Promise((r) => setTimeout(r, ms))

export default {
  async get(url) {
    calls.push(['GET', url])
    await delay(Number(params.get('delay') || 400))
    if (params.get('view') === 'error') throw new Error('offline')
    return { data: build() }
  },
  async post(url, body) {
    calls.push(['POST', url, body])
    window.__retroCalls = calls
    return { data: { ok: true } }
  },
}

export const useAuthStore = () => ({ user: { role: 'owner', name: 'Dona' } })
