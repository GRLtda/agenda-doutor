import { toast as sonnerToast } from 'vue-sonner'

const DEFAULT_DURATION = 4000

function normalizeMessage(message) {
  if (message == null) return ''
  if (typeof message === 'string') return message
  if (message instanceof Error) return message.message
  if (typeof message === 'object' && 'message' in message) return message.message
  return String(message)
}

function normalizeOptions(options = {}) {
  const normalized = { ...options }

  if ('timeout' in normalized) {
    normalized.duration = normalized.timeout === false ? Infinity : normalized.timeout
    delete normalized.timeout
  }

  if (!('duration' in normalized)) {
    normalized.duration = DEFAULT_DURATION
  }

  if ('closeButton' in normalized) {
    normalized.dismissible = normalized.closeButton !== false
    delete normalized.closeButton
  }

  if ('onClose' in normalized) {
    normalized.onDismiss = normalized.onClose
    normalized.onAutoClose = normalized.onClose
    delete normalized.onClose
  }

  delete normalized.hideProgressBar
  delete normalized.pauseOnFocusLoss
  delete normalized.pauseOnHover
  delete normalized.draggable
  delete normalized.draggablePercent
  delete normalized.showCloseButtonOnHover
  delete normalized.icon
  delete normalized.rtl
  delete normalized.transition
  delete normalized.maxToasts
  delete normalized.newestOnTop

  return normalized
}

function showToast(type, message, options) {
  const normalizedMessage = normalizeMessage(message)
  const normalizedOptions = normalizeOptions(options)

  if (type && typeof sonnerToast[type] === 'function') {
    return sonnerToast[type](normalizedMessage, normalizedOptions)
  }

  return sonnerToast(normalizedMessage, normalizedOptions)
}

function createToastApi() {
  const api = (message, options) => showToast(null, message, options)

  api.success = (message, options) => showToast('success', message, options)
  api.error = (message, options) => showToast('error', message, options)
  api.info = (message, options) => showToast('info', message, options)
  api.warning = (message, options) => showToast('warning', message, options)
  api.warn = api.warning
  api.loading = (message, options) => showToast('loading', message, {
    ...normalizeOptions(options),
    duration: Infinity,
  })
  api.dismiss = (id) => sonnerToast.dismiss(id)
  api.clear = () => sonnerToast.dismiss()
  api.update = (id, options = {}) => {
    const type = options.type || null
    const message = options.content || options.message || options.title || ''

    return showToast(type, message, {
      ...options,
      id,
    })
  }

  return api
}

const toast = createToastApi()

export function useToast() {
  return toast
}

export default {
  install(app) {
    app.config.globalProperties.$toast = toast
    app.provide('toast', toast)
  },
}
