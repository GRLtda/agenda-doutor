import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fullRetrospective } from './fixtures/retrospective'

const api = vi.hoisted(() => ({
  fetchCurrentRetrospective: vi.fn(),
  postRetrospectiveView: vi.fn(),
  postRetrospectiveShare: vi.fn(),
}))
vi.mock('@/features/retrospective/api/retrospective.api', () => api)

import { useRetrospectiveStore } from '@/features/retrospective/stores/retrospective.store'
import { getDesign, getLatestDesign, hasDesign, LATEST_DESIGN_KEY } from '@/features/retrospective/designs'

beforeEach(() => setActivePinia(createPinia()))

describe('store da retrospectiva', () => {
  it('carrega a retrospectiva publicada e fica disponível', async () => {
    api.fetchCurrentRetrospective.mockResolvedValue(fullRetrospective())
    const store = useRetrospectiveStore()
    await store.fetchCurrent()
    expect(store.status).toBe('ready')
    expect(store.available).toBe(true)
    await store.fetchCurrent()
    expect(api.fetchCurrentRetrospective).toHaveBeenCalledTimes(1) // cache
  })

  it('sem retrospectiva (404) fica vazio, sem erro', async () => {
    api.fetchCurrentRetrospective.mockResolvedValue(null)
    const store = useRetrospectiveStore()
    await store.fetchCurrent()
    expect(store.status).toBe('empty')
    expect(store.available).toBe(false)
  })

  it('designKey desconhecido nunca é exibido', async () => {
    api.fetchCurrentRetrospective.mockResolvedValue({ ...fullRetrospective(), designKey: '2099-v9' })
    const store = useRetrospectiveStore()
    await store.fetchCurrent()
    expect(store.available).toBe(false)
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
