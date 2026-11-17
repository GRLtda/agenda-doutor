// Camada da retrospectiva: "Agora não" -> atalho, e a A2 sempre marca as 4 etapas antes do player.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
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
import StatusScreen from '@/features/retrospective/designs/2026-v1/StatusScreen.vue'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const withSummary = (extra = {}) => reactive({ role: 'owner', clinic: { name: 'Clínica Aurora', logoUrl: null }, retrospective: { id: '6a0000000000000000000001', year: 2026, designKey: '2026-v1', viewed: false, ...extra } })
beforeEach(() => {
  auth.user = withSummary()
  setActivePinia(createPinia())
  sessionStorage.clear()
})
afterEach(() => { document.body.innerHTML = '' })

describe('"Agora não" no banner', () => {
  it('esconde o banner e vale para a mesma retrospectiva ao recarregar', () => {
    const store = useRetrospectiveStore()
    expect(store.bannerHidden).toBe(false)
    store.dismissBanner()
    expect(store.bannerHidden).toBe(true)

    setActivePinia(createPinia())
    expect(useRetrospectiveStore().bannerHidden).toBe(true)
  })

  it('depois de ver os stories o banner sai (também ao recarregar, pelo viewed do /me)', async () => {
    api.fetchCurrentRetrospective.mockResolvedValue(fullRetrospective())
    const store = useRetrospectiveStore()
    await store.fetchCurrent()
    await store.trackView()
    expect(store.bannerHidden).toBe(true)
    expect(store.bannerDismissed).toBe(false)

    setActivePinia(createPinia())
    auth.user = withSummary({ viewed: true })
    expect(useRetrospectiveStore().bannerHidden).toBe(true)
  })

  it('uma retrospectiva nova volta a mostrar o banner', () => {
    const store = useRetrospectiveStore()
    store.dismissBanner()
    setActivePinia(createPinia())
    auth.user = withSummary({ id: 'outra-retro' })
    expect(useRetrospectiveStore().bannerHidden).toBe(false)
  })
})

describe('A2 "Montando o seu ano"', () => {
  it('com os dados já prontos, marca as 4 etapas rapidamente e então emite finished', async () => {
    const w = mount(StatusScreen, { props: { state: 'loading', ready: true }, attachTo: document.body })
    await wait(250)
    const early = w.findAll('.dot.done').length
    expect(early).toBeGreaterThanOrEqual(1)
    expect(early).toBeLessThan(4)
    expect(w.emitted('finished')).toBeUndefined()
    await wait(1100)
    expect(w.findAll('.dot.done')).toHaveLength(4)
    expect(w.emitted('finished')).toHaveLength(1)
    w.unmount()
  })

  it('sem dados, a última etapa espera e não emite finished', async () => {
    const w = mount(StatusScreen, { props: { state: 'loading', ready: false }, attachTo: document.body })
    await wait(400)
    await flushPromises()
    expect(w.findAll('.dot.done').length).toBeLessThan(4)
    expect(w.emitted('finished')).toBeUndefined()
    w.unmount()
  })
})

describe('classes CSS da retrospectiva', () => {
  // O app usa Tailwind v4, que gera utilitários para qualquer nome de classe encontrado no código.
  // Nomes como "ring" e "outline" desenham borda (o quadrado preto no gráfico de pacientes),
  // "grid" e "blur" mudam display e filtro. A retrospectiva não pode usar esses nomes soltos.
  it('não usa nomes de classe que viram utilitários do Tailwind', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const root = path.resolve(__dirname, '../src/features/retrospective')
    const banned = ['ring', 'outline', 'grid', 'blur', 'border', 'shadow', 'flex', 'hidden', 'block', 'inline', 'contents', 'container', 'filter', 'transform', 'truncate', 'underline', 'italic', 'uppercase', 'static', 'fixed', 'absolute', 'relative', 'sticky', 'invisible', 'visible', 'rounded']
    const files = []
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      const full = path.join(dir, e.name)
      if (e.isDirectory()) walk(full)
      else if (e.name.endsWith('.vue')) files.push(full)
    })
    walk(root)
    const offenders = []
    for (const file of files) {
      const src = fs.readFileSync(file, 'utf8')
      for (const match of src.matchAll(/\sclass="([^"]+)"/g)) {
        for (const name of match[1].split(/\s+/)) {
          if (banned.includes(name)) offenders.push(`${path.relative(root, file)}: ${name}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
