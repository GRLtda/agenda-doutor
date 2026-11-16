// Fontes do design 2026-v1, servidas pelo próprio app (embutidas no PNG do cartão).
import sans400 from '@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff2?url'
import sans500 from '@fontsource/dm-sans/files/dm-sans-latin-500-normal.woff2?url'
import sans600 from '@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff2?url'
import sans700 from '@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff2?url'
import mono400 from '@fontsource/dm-mono/files/dm-mono-latin-400-normal.woff2?url'
import mono500 from '@fontsource/dm-mono/files/dm-mono-latin-500-normal.woff2?url'
import type { FontSource } from '../../composables/useShareCard'

export const CARD_FONTS: FontSource[] = [
  { family: 'DM Sans', weight: 400, url: sans400 },
  { family: 'DM Sans', weight: 500, url: sans500 },
  { family: 'DM Sans', weight: 600, url: sans600 },
  { family: 'DM Sans', weight: 700, url: sans700 },
  { family: 'DM Mono', weight: 400, url: mono400 },
  { family: 'DM Mono', weight: 500, url: mono500 },
]

/** Cartão: canvas 390x694 exportado em 1080x1920 (9:16), conforme Nota-zonas-seguras. */
export const CARD_SIZE = { width: 390, height: 694, outWidth: 1080, outHeight: 1920 }
