import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { fullRetrospective } from './fixtures/retrospective'

const api = vi.hoisted(() => ({
  fetchCurrentRetrospective: vi.fn(),
  postRetrospectiveView: vi.fn(),
  postRetrospectiveShare: vi.fn(),
}))
vi.mock('@/features/retrospective/api/retrospective.api', () => api)
const auth = vi.hoisted(() => ({ user: null }))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => auth }))

import { useRetrospectiveStore } from '@/features/retrospective/stores/retrospective.store'
import { getDesign, getLatestDesign, hasDesign, LATEST_DESIGN_KEY } from '@/features/retrospective/designs'

const owner = (retrospective) => reactive({ role: 'owner', clinic: { name: 'Clínica Aurora', marketingName: 'Aurora Estética', logoUrl: 'https://cdn/logo.png' }, retrospective })
beforeEach(() => {
  setActivePinia(createPinia())
  auth.user = owner({ id: '6a0000000000000000000001', year: 2026, designKey: '2026-v1', viewed: false })
  vi.clearAllMocks()
})

describe('disponibilidade vem do /auth/me', () => {
  it('sem retrospectiva publicada no /me, nada aparece e nenhuma requisição é feita', () => {
    auth.user = owner(null)
    const store = useRetrospectiveStore()
    expect(store.available).toBe(false)
    expect(store.summary).toBeNull()
    expect(api.fetchCurrentRetrospective).not.toHaveBeenCalled()
  })

  it('só o dono vê; designKey desconhecido nunca aparece', () => {
    auth.user = { ...owner({ id: 'x', year: 2026, designKey: '2026-v1', viewed: false }), role: 'recepcionista' }
    expect(useRetrospectiveStore().available).toBe(false)
    auth.user = owner({ id: 'x', year: 2026, designKey: '2099-v9', viewed: false })
    expect(useRetrospectiveStore().available).toBe(false)
  })

  it('resumo usa nome e logo do /me e não pede os stories', () => {
    const store = useRetrospectiveStore()
    expect(store.available).toBe(true)
    expect(store.summary.clinic).toEqual({ name: 'Aurora Estética', logoUrl: 'https://cdn/logo.png' })
    expect(api.fetchCurrentRetrospective).not.toHaveBeenCalled()
  })

  it('os stories só são pedidos ao abrir e herdam nome/logo do /me', async () => {
    const { clinic, ...payload } = fullRetrospective()
    api.fetchCurrentRetrospective.mockResolvedValue(payload)
    const store = useRetrospectiveStore()
    await store.fetchCurrent({ force: true })
    expect(store.current.clinic.logoUrl).toBe('https://cdn/logo.png')
    expect(store.ready).toBe(true)
  })

  it('ver a retrospectiva troca o banner pelo atalho sem recarregar o /me', async () => {
    api.fetchCurrentRetrospective.mockResolvedValue(fullRetrospective())
    const store = useRetrospectiveStore()
    expect(store.bannerHidden).toBe(false)
    await store.fetchCurrent({ force: true })
    await store.trackView()
    expect(store.bannerHidden).toBe(true)
  })
})

describe('store da retrospectiva', () => {
  it('carrega a retrospectiva publicada e fica disponível', async () => {
    api.fetchCurrentRetrospective.mockResolvedValue(fullRetrospective())
    const store = useRetrospectiveStore()
    await store.fetchCurrent()
    expect(store.status).toBe('ready')
    expect(store.ready).toBe(true)
    await store.fetchCurrent()
    expect(api.fetchCurrentRetrospective).toHaveBeenCalledTimes(1) // cache
  })

  it('sem retrospectiva (404) fica vazio, sem erro', async () => {
    api.fetchCurrentRetrospective.mockResolvedValue(null)
    const store = useRetrospectiveStore()
    await store.fetchCurrent()
    expect(store.status).toBe('empty')
    expect(store.ready).toBe(false)
  })

  it('designKey desconhecido nunca é exibido', async () => {
    api.fetchCurrentRetrospective.mockResolvedValue({ ...fullRetrospective(), designKey: '2099-v9' })
    const store = useRetrospectiveStore()
    await store.fetchCurrent()
    expect(store.ready).toBe(false)
  })

  it('falha de rede vira status de erro', async () => {
    api.fetchCurrentRetrospective.mockRejectedValue(new Error('offline'))
    const store = useRetrospectiveStore()
    await expect(store.fetchCurrent()).rejects.toThrow()
    expect(store.status).toBe('error')
  })

  it('rastreio de view e share engole erros e marca como vista', async () => {
    api.fetchCurrentRetrospective.mockResolvedValue(fullRetrospective())
    api.postRetrospectiveView.mockRejectedValue(new Error('500'))
    api.postRetrospectiveShare.mockRejectedValue(new Error('500'))
    const store = useRetrospectiveStore()
    await store.fetchCurrent()
    await expect(store.trackView()).resolves.toBeUndefined()
    await expect(store.trackShare('total')).resolves.toBeUndefined()
    expect(store.current.viewed).toBe(true)
    expect(api.postRetrospectiveView).toHaveBeenCalledWith(store.current.id, expect.any(String))
    expect(api.postRetrospectiveShare).toHaveBeenCalledWith(store.current.id, 'total')
  })
})

describe('registry de designs', () => {
  it('resolve pelo designKey', () => {
    expect(hasDesign('2026-v1')).toBe(true)
    expect(hasDesign('2099-v9')).toBe(false)
    expect(hasDesign(undefined)).toBe(false)
    expect(getDesign('2099-v9')).toBeNull()
    const design = getDesign('2026-v1')
    expect(design.Player).toBeTruthy()
    expect(design.Banner).toBeTruthy()
    expect(design.StatusScreen).toBeTruthy()
    expect(getLatestDesign().key).toBe(LATEST_DESIGN_KEY)
  })
})
