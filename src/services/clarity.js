const IS_DEVELOPMENT = import.meta.env.DEV || ['dev', 'development', 'test'].includes(import.meta.env.MODE)
const CLARITY_PROJECT_ID = (import.meta.env.VITE_CLARITY_PROJECT_ID || 'w1lc3ih72u').trim()

let clarityInitialized = false

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function ensureClarityQueue() {
  if (typeof window.clarity === 'function') return

  window.clarity = function clarity() {
    ;(window.clarity.q = window.clarity.q || []).push(arguments)
  }
}

function sanitizeEventName(eventName) {
  return String(eventName || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function initClarity() {
  if (IS_DEVELOPMENT || !isBrowser() || !CLARITY_PROJECT_ID || clarityInitialized) return false

  ensureClarityQueue()

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.clarity.ms/tag/${CLARITY_PROJECT_ID}`
  script.referrerPolicy = 'strict-origin-when-cross-origin'
  document.head.appendChild(script)

  clarityInitialized = true
  return true
}

export function trackClarityEvent(eventName) {
  const safeEventName = sanitizeEventName(eventName)
  if (IS_DEVELOPMENT || !safeEventName || !isBrowser() || typeof window.clarity !== 'function') return

  window.clarity('event', safeEventName)
}
