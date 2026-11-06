const MAX_IMAGE_BYTES = 20 * 1024 * 1024
const REFRESHED = '__refreshed'
const SNIFFED = '__sniffed'

function isAllowedGalleryUrl(url) {
  if (/^https?:\/\//i.test(url)) return true
  if (/^blob:/i.test(url)) return true
  if (/^data:image\/(?:png|jpe?g|webp|gif);/i.test(url)) return true
  return /^\/(?!\/)/.test(url)
}

function uniqueUrls(values) {
  const seen = new Set()
  const urls = []
  for (const value of values) {
    if (typeof value !== 'string') continue
    const url = value.trim()
    if (!url || seen.has(url) || !isAllowedGalleryUrl(url)) continue
    seen.add(url)
    urls.push(url)
  }
  return urls
}

export function galleryImageCandidates(file, prefer = 'full') {
  const thumbFirst = [
    file?.thumbnailUrl,
    file?.previewUrl,
    file?.originalUrl,
    file?.url,
    file?.signedUrl,
  ]
  const fullFirst = [
    file?.originalUrl,
    file?.url,
    file?.signedUrl,
    file?.previewUrl,
    file?.thumbnailUrl,
  ]
  return uniqueUrls(prefer === 'thumb' ? thumbFirst : fullFirst)
}

export function sniffImageMime(bytes) {
  const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || 0)
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  if (
    data.length >= 8 &&
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  ) {
    return 'image/png'
  }
  if (
    data.length >= 6 &&
    data[0] === 0x47 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x38 &&
    (data[4] === 0x37 || data[4] === 0x39) &&
    data[5] === 0x61
  ) {
    return 'image/gif'
  }
  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return 'image/webp'
  }
  return ''
}

function canonicalImageMime(value) {
  const mime = String(value || '').split(';')[0].trim().toLowerCase()
  if (mime === 'image/jpg' || mime === 'image/pjpeg' || mime === 'image/x-jpeg') return 'image/jpeg'
  if (mime === 'image/x-png') return 'image/png'
  return mime
}

async function readLimited(response, maxBytes) {
  if (!response.body?.getReader) {
    const buffer = await response.arrayBuffer()
    return buffer.byteLength > maxBytes ? null : buffer
  }
  const reader = response.body.getReader()
  const chunks = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes.buffer
}

export async function objectUrlForMislabeledImage(url, fetchImpl = globalThis.fetch) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url) || typeof fetchImpl !== 'function') return ''
  let response
  try {
    response = await fetchImpl(url, { credentials: 'omit', mode: 'cors', redirect: 'follow' })
  } catch {
    return ''
  }
  if (!response?.ok) return ''
  const declaredLength = Number(response.headers?.get?.('content-length') || 0)
  if (Number.isFinite(declaredLength) && declaredLength > MAX_IMAGE_BYTES) return ''
  let buffer
  try {
    buffer = await readLimited(response, MAX_IMAGE_BYTES)
  } catch {
    return ''
  }
  if (!buffer) return ''
  const mime = sniffImageMime(buffer)
  const declared = canonicalImageMime(response.headers?.get?.('content-type'))
  if (!mime || declared === mime) return ''
  return URL.createObjectURL(new Blob([buffer], { type: mime }))
}

export function revokeGalleryObjectUrl(url) {
  if (typeof url === 'string' && url.startsWith('blob:')) {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* already revoked */
    }
  }
}

export function applyGalleryDelivery(target, source, createdAt) {
  if (!target || !source) return target
  for (const key of ['thumbnailUrl', 'previewUrl', 'originalUrl', 'url', 'signedUrl']) {
    if (typeof source[key] === 'string' && source[key].trim()) target[key] = source[key]
  }
  if (createdAt) target.createdAt = createdAt
  return target
}

export function preserveGalleryRecord(current, fresh) {
  const next = fresh && typeof fresh === 'object' ? fresh : {}
  return {
    ...current,
    thumbnailUrl: next.thumbnailUrl ?? current?.thumbnailUrl,
    previewUrl: next.previewUrl ?? current?.previewUrl,
    originalUrl: next.originalUrl ?? current?.originalUrl,
    url: next.url ?? current?.url,
    signedUrl: next.signedUrl ?? current?.signedUrl,
    createdAt: current?.createdAt || next.createdAt || null,
  }
}

export async function recoverGalleryImage({
  file,
  failed,
  prefer = 'full',
  refresh,
  fetchImpl,
  relabel = false,
} = {}) {
  const tried = failed instanceof Set ? failed : new Set()
  const immediate = galleryImageCandidates(file, prefer).find((url) => !tried.has(url))
  if (immediate) return { url: immediate, file }

  let latest = file
  let refreshError = null
  if (typeof refresh === 'function' && !tried.has(REFRESHED)) {
    tried.add(REFRESHED)
    try {
      latest = preserveGalleryRecord(file, await refresh())
    } catch (error) {
      refreshError = error
    }
    const renewed = galleryImageCandidates(latest, prefer).find((url) => !tried.has(url))
    if (renewed) return { url: renewed, file: latest }
  }

  if (relabel && !tried.has(SNIFFED)) {
    tried.add(SNIFFED)
    for (const url of [...tried]) {
      const relabeled = await objectUrlForMislabeledImage(url, fetchImpl)
      if (relabeled) return { url: relabeled, file: latest, relabeled: true }
    }
  }

  if (refreshError) return { error: refreshError, file: latest }
  const concrete = [...tried].filter((url) => typeof url === 'string' && !url.startsWith('__'))
  return { exhausted: true, stable: concrete.length <= 1, file: latest }
}
