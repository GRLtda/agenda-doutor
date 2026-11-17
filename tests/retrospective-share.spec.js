// Fluxo de compartilhar: Web Share API com arquivo (mobile) e fallback de download (desktop/sem suporte).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { fullRetrospective } from './fixtures/retrospective'

const api = vi.hoisted(() => ({ fetchRetrospectiveLogoDataUrl: vi.fn() }))
const share = vi.hoisted(() => ({ renderCardPng: vi.fn(), inlineImage: vi.fn() }))
vi.mock('@/features/retrospective/composables/useShareCard', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, renderCardPng: share.renderCardPng, inlineImage: share.inlineImage }
})
vi.mock('@/features/retrospective/api/retrospective.api', () => ({
  fetchRetrospectiveLogoDataUrl: api.fetchRetrospectiveLogoDataUrl,
  fetchCurrentRetrospective: vi.fn(),
  postRetrospectiveView: vi.fn(),
  postRetrospectiveShare: vi.fn(),
}))

import Player from '@/features/retrospective/designs/2026-v1/Player.vue'
import { canShareFiles, shareFile } from '@/features/retrospective/composables/useShareCard'

const png = () => new Blob(['png'], { type: 'image/png' })
let originalWidth

function setViewport(width, height = 844) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height })
}

async function mountPlayer() {
  localStorage.setItem('agenda-doutor:retrospectiva:dica-vista', '1')
  const w = mount(Player, { props: { retrospective: { ...fullRetrospective(), clinic: { name: 'Clínica Aurora', logoUrl: 'https://cdn.test/logo.webp' } } }, attachTo: document.body })
  await flushPromises()
  return w
}

beforeEach(() => {
  originalWidth = window.innerWidth
  share.renderCardPng.mockResolvedValue(png())
  share.inlineImage.mockResolvedValue(null)
  api.fetchRetrospectiveLogoDataUrl.mockResolvedValue('data:image/png;base64,bG9nbw==')
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:preview')
  globalThis.URL.revokeObjectURL = vi.fn()
})
afterEach(() => {
  setViewport(originalWidth)
  delete navigator.share
  delete navigator.canShare
  document.body.innerHTML = ''
  localStorage.clear()
})

describe('compartilhar o story', () => {
  it('mobile com Web Share: abre o menu (D2), compartilha o PNG e registra o share', async () => {
    setViewport(390)
    navigator.canShare = vi.fn(() => true)
    navigator.share = vi.fn().mockResolvedValue(undefined)
    const w = await mountPlayer()
    w.vm.go(1)
    await w.vm.$nextTick()
    await w.find('button.share').trigger('click')
    await flushPromises()
    expect(w.find('[role="dialog"][aria-label="Compartilhar story"]').exists()).toBe(true)
    expect(share.renderCardPng).toHaveBeenCalledWith(expect.any(HTMLElement), expect.objectContaining({ outWidth: 1080, outHeight: 1920 }))
    // Logo do cartão vem da API (bytes), não da URL assinada do CloudFront (sem CORS).
    expect(api.fetchRetrospectiveLogoDataUrl).toHaveBeenCalledTimes(1)
    expect(share.inlineImage).not.toHaveBeenCalled()

    await w.findAll('.opt')[0].trigger('click')
    await flushPromises()
    expect(navigator.share).toHaveBeenCalledTimes(1)
    const payload = navigator.share.mock.calls[0][0]
    expect(payload.files[0].name).toBe('retrospectiva-2026-total.png')
    expect(payload.files[0].type).toBe('image/png')
    expect(w.emitted('shared')).toEqual([['total']])
    expect(w.find('[role="status"]').text()).toContain('Imagem pronta!')
    w.unmount()
  })

  it('cancelar a folha do sistema não registra share', async () => {
    setViewport(390)
    navigator.canShare = vi.fn(() => true)
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }))
    const w = await mountPlayer()
    await w.find('button.share').trigger('click')
    await flushPromises()
    await w.findAll('.opt')[0].trigger('click')
    await flushPromises()
    expect(w.emitted('shared')).toBeUndefined()
    w.unmount()
  })

  it('sem Web Share: modal "Baixar imagem" (D3), baixa o PNG e registra o share', async () => {
    setViewport(1280, 800)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const w = await mountPlayer()
    w.vm.go(9)
    await w.vm.$nextTick()
    await w.find('button.hshare').trigger('click')
    await flushPromises()
    expect(w.text()).toContain('Baixar imagem')
    expect(w.text()).toContain('O Instagram não deixa postar Stories pelo computador.')
    await w.find('button.primary').trigger('click')
    await flushPromises()
    expect(click).toHaveBeenCalledTimes(1)
    expect(w.emitted('shared')).toEqual([['resumo']])
    expect(w.find('[role="status"]').text()).toContain('Imagem baixada!')
    click.mockRestore()
    w.unmount()
  })

  it('falha ao gerar a imagem mostra o toast de erro com "Tentar"', async () => {
    setViewport(1280, 800)
    share.renderCardPng.mockRejectedValueOnce(new Error('canvas'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const w = await mountPlayer()
    await w.find('button.hshare').trigger('click')
    await flushPromises()
    expect(w.find('[role="alert"]').text()).toContain('Não foi possível gerar a imagem')
    await w.find('[role="alert"] button').trigger('click')
    await flushPromises()
    expect(share.renderCardPng).toHaveBeenCalledTimes(2)
    expect(w.vm.card.status).toBe('ready')
    w.unmount()
  })
})

describe('posição do botão de compartilhar', () => {
  it('computador: botão do Instagram no cabeçalho, ao lado do X, sem botão no rodapé', async () => {
    setViewport(1280, 800)
    const w = await mountPlayer()
    const header = w.find('.header')
    expect(header.find('button.hshare').attributes('aria-label')).toBe('Compartilhar no Instagram')
    expect(header.find('button.hshare + button.close').exists()).toBe(true)
    expect(w.find('button.share').exists()).toBe(false)
    w.unmount()
  })

  it('celular: botão grande no rodapé, sem botão no cabeçalho', async () => {
    setViewport(390)
    const w = await mountPlayer()
    expect(w.find('button.share').exists()).toBe(true)
    expect(w.find('button.hshare').exists()).toBe(false)
    w.unmount()
  })

  it('celular sem Web Share: menu do celular só com "Salvar imagem", nunca o aviso do computador', async () => {
    setViewport(390)
    const w = await mountPlayer()
    await w.find('button.share').trigger('click')
    await flushPromises()
    expect(w.find('[role="dialog"][aria-label="Compartilhar story"]').exists()).toBe(true)
    expect(w.text()).not.toContain('pelo computador')
    const opts = w.findAll('.opt')
    expect(opts).toHaveLength(1)
    expect(opts[0].text()).toContain('Salvar imagem')
    w.unmount()
  })
})

describe('navegação', () => {
  it('teclado: setas navegam e Esc fecha', async () => {
    setViewport(1280, 800)
    const w = await mountPlayer()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    await w.vm.$nextTick()
    expect(w.vm.index).toBe(1)
    expect(w.findAll('button[aria-label="Próximo story"]').length).toBeGreaterThan(0)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(w.emitted('close')).toHaveLength(1)
    w.unmount()
  })

  it('mostra a dica na primeira vez e some ao tocar', async () => {
    setViewport(390)
    const w = mount(Player, { props: { retrospective: { ...fullRetrospective(), clinic: { name: 'Clínica Aurora', logoUrl: 'https://cdn.test/logo.webp' } } }, attachTo: document.body })
    await flushPromises()
    expect(w.text()).toContain('Toque para avançar')
    await w.find('button.hint').trigger('click')
    expect(w.text()).not.toContain('Toque para avançar')
    expect(localStorage.getItem('agenda-doutor:retrospectiva:dica-vista')).toBe('1')
    w.unmount()
  })

  it('kinds desconhecidos são ignorados (uma barra por story existente)', async () => {
    setViewport(390)
    localStorage.setItem('agenda-doutor:retrospectiva:dica-vista', '1')
    const retro = fullRetrospective()
    retro.stories.splice(2, 0, { key: 'futuro', kind: 'kind-novo', data: {} })
    const w = mount(Player, { props: { retrospective: retro }, attachTo: document.body })
    await flushPromises()
    expect(w.findAll('.pb')).toHaveLength(10)
    w.unmount()
  })
})

describe('useShareCard', () => {
  it('canShareFiles depende de navigator.canShare com arquivo', () => {
    expect(canShareFiles()).toBe(false)
    navigator.share = vi.fn()
    navigator.canShare = vi.fn(() => false)
    expect(canShareFiles()).toBe(false)
    navigator.canShare = vi.fn(() => true)
    expect(canShareFiles()).toBe(true)
  })

  it('shareFile trata cancelamento como resultado, não como erro', async () => {
    const file = new File(['x'], 'a.png', { type: 'image/png' })
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error(), { name: 'AbortError' }))
    await expect(shareFile(file)).resolves.toBe('cancelled')
    navigator.share = vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'NotAllowedError' }))
    await expect(shareFile(file)).rejects.toThrow()
    navigator.share = vi.fn().mockResolvedValue(undefined)
    await expect(shareFile(file)).resolves.toBe('shared')
  })
})
