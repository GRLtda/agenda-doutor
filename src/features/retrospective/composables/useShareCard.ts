// Geração do cartão PNG no navegador e envio pela folha de compartilhamento do sistema.
// Nada aqui conhece o visual: o design entrega o elemento do cartão e a lista de fontes.
//
// Limitação real: o Instagram não abre o editor de Stories com imagem pronta a partir de uma
// página web. O caminho é a folha de compartilhamento (mobile) ou o download (desktop).
import { toBlob } from 'html-to-image'

export interface FontSource { family: string; weight: number; url: string }
export interface RenderOptions {
  width: number
  height: number
  outWidth: number
  outHeight: number
  fonts?: FontSource[]
  backgroundColor?: string
}

const fontCssCache = new Map<string, Promise<string>>()

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(reader.error)
  reader.readAsDataURL(blob)
})

/** CSS @font-face com as fontes embutidas (data URL), para o PNG sair com a fonte certa. */
export function buildFontEmbedCSS(fonts: FontSource[] = []): Promise<string> {
  const key = fonts.map((f) => `${f.family}:${f.weight}:${f.url}`).join('|')
  if (!fontCssCache.has(key)) {
    const job = Promise.all(fonts.map(async (f) => {
      const res = await fetch(f.url)
      if (!res.ok) throw new Error(`Fonte indisponível: ${f.family} ${f.weight}`)
      const data = await blobToDataUrl(await res.blob())
      return `@font-face{font-family:'${f.family}';font-style:normal;font-weight:${f.weight};font-display:block;src:url(${data}) format('woff2');}`
    })).then((rules) => rules.join('\n'))
    job.catch(() => fontCssCache.delete(key))
    fontCssCache.set(key, job)
  }
  return fontCssCache.get(key) as Promise<string>
}

/** Garante que as fontes estão carregadas no documento antes de renderizar. */
export async function ensureFontsLoaded(fonts: FontSource[] = []) {
  if (typeof document === 'undefined' || !document.fonts) return
  await Promise.all(fonts.map((f) => document.fonts.load(`${f.weight} 32px "${f.family}"`).catch(() => [])))
  await document.fonts.ready
}

async function readImageSize(blob: Blob): Promise<{ width: number; height: number; bitmap?: ImageBitmap }> {
  if (typeof createImageBitmap === 'function') {
    const bitmap = await createImageBitmap(blob)
    return { width: bitmap.width, height: bitmap.height, bitmap }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { width: img.naturalWidth, height: img.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** Redimensiona para o tamanho exato quando o navegador entregou outra escala. */
async function forceSize(blob: Blob, bitmap: ImageBitmap | undefined, width: number, height: number): Promise<Blob> {
  const source = bitmap || (await createImageBitmap(blob))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas indisponível')
  ctx.drawImage(source, 0, 0, width, height)
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao exportar PNG'))), 'image/png'))
}

/** Renderiza o elemento do cartão como PNG no tamanho final (ex.: 1080x1920) e confere as dimensões. */
export async function renderCardPng(node: HTMLElement, opts: RenderOptions): Promise<Blob> {
  await ensureFontsLoaded(opts.fonts)
  const fontEmbedCSS = opts.fonts?.length ? await buildFontEmbedCSS(opts.fonts) : undefined
  const options = {
    width: opts.width,
    height: opts.height,
    canvasWidth: opts.outWidth,
    canvasHeight: opts.outHeight,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: opts.backgroundColor,
    fontEmbedCSS,
    style: { transform: 'none', left: '0', top: '0', margin: '0' },
  }
  // Primeira passada aquece imagens e fontes no Safari (que às vezes omite na primeira).
  await toBlob(node, options).catch(() => null)
  const blob = await toBlob(node, options)
  if (!blob) throw new Error('Falha ao gerar a imagem do cartão')
  const size = await readImageSize(blob)
  if (size.width === opts.outWidth && size.height === opts.outHeight) return blob
  return forceSize(blob, size.bitmap, opts.outWidth, opts.outHeight)
}

/** Converte uma imagem remota em data URL para embutir no cartão (evita bloqueio de CORS). */
export async function inlineImage(url?: string | null): Promise<string | null> {
  if (!url) return null
  if (url.startsWith('data:')) return url
  try {
    const res = await fetch(url, { mode: 'cors', credentials: 'omit' })
    if (!res.ok) return null
    return await blobToDataUrl(await res.blob())
  } catch {
    return null
  }
}

export function canShareFiles(file?: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function' || typeof navigator.canShare !== 'function') return false
  try {
    const probe = file || new File([new Blob(['x'], { type: 'image/png' })], 'probe.png', { type: 'image/png' })
    return navigator.canShare({ files: [probe] })
  } catch {
    return false
  }
}

export type ShareResult = 'shared' | 'cancelled'

/** Abre a folha de compartilhamento do sistema. Cancelamento do usuário não é erro. */
export async function shareFile(file: File, text?: string): Promise<ShareResult> {
  try {
    await navigator.share({ files: [file], ...(text ? { title: text } : {}) })
    return 'shared'
  } catch (error: any) {
    if (error?.name === 'AbortError') return 'cancelled'
    throw error
  }
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function useShareCard() {
  return { renderCardPng, inlineImage, canShareFiles, shareFile, downloadBlob, buildFontEmbedCSS }
}
