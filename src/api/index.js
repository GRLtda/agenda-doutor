import axios from 'axios'
import * as Sentry from '@sentry/vue'
import { useLayoutStore } from '@/stores/layout'
import { getApiAvailabilityRevision, isApiUnavailable, reportApiFailure, reportApiSuccess } from '@/services/apiAvailability'
import { isCanceledApiError, isTemporaryApiError } from '@/utils/apiErrors'

export const isGlobalOffline = isApiUnavailable

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// --- Auth V2: Controle de refresh ---
let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })
  failedQueue = []
}

// Lista de URLs que não devem passar pelo interceptor de refresh
const AUTH_URLS = ['/v2/auth/login', '/v2/auth/refresh', '/v2/auth/logout']

// --- Interceptador de Requisição ---
apiClient.interceptors.request.use(async (config) => {
  config._availabilityRevision = getApiAvailabilityRevision()
  // 1. Versionamento dinâmico (v1 default, override v2)
  const versionPrefixRegex = /^\/?v\d+(\/|$)/
  if (config.url && !versionPrefixRegex.test(config.url)) {
    const cleanUrl = config.url.startsWith('/') ? config.url : `/${config.url}`
    config.url = `/v1${cleanUrl}`
  }

  // Rotas públicas não devem depender da sessão que estiver salva no navegador.
  // Remove também o header herdado de apiClient.defaults para não enviar um token
  // expirado e fazer o backend interpretar a requisição como autenticada.
  if (config.skipAuth) {
    if (typeof config.headers?.delete === 'function') {
      config.headers.delete('Authorization')
    } else if (config.headers) {
      delete config.headers.Authorization
    }

    return config
  }

  // 2. Auth V2: Verifica expiração do token antes de cada requisição
  // Não faz refresh para rotas de autenticação (evita loop infinito)
  const isAuthRoute = AUTH_URLS.some((url) => config.url?.includes(url))
  if (!isAuthRoute) {
    // Importação dinâmica para evitar dependência circular
    const { useAuthStore } = await import('@/stores/auth')
    const authStore = useAuthStore()

    // Verifica se token expira em menos de 60 segundos
    if (authStore.accessToken && authStore.isTokenExpiringSoon()) {
      if (!isRefreshing) {
        isRefreshing = true
        try {
          if (!await authStore.refreshTokens()) throw new axios.CanceledError('Sessão alterada durante a renovação.')
          processQueue(null, authStore.accessToken)
        } catch (refreshError) {
          processQueue(refreshError, null)
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      } else {
        // Aguarda o refresh em andamento
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(() => {
          // authStore já está disponível no closure do interceptor
          config.headers.Authorization = `Bearer ${authStore.accessToken}`
          return config
        })
      }
    }

    // Garante que o header de autorização está atualizado
    if (authStore.accessToken) {
      config.headers.Authorization = `Bearer ${authStore.accessToken}`
    }
  }

  return config
})

// --- Interceptador de Resposta ---
apiClient.interceptors.response.use(
  (response) => {
    reportApiSuccess(response.config?._availabilityRevision)
    return response
  },
  async (error) => {
    const originalRequest = error.config

    if (isCanceledApiError(error)) return Promise.reject(error)

    // Rede, timeout, limite temporário e indisponibilidade do servidor não invalidam sessão.
    if (isTemporaryApiError(error)) {
      reportApiFailure(error)
      Sentry.captureException(error)
      return Promise.reject(error)
    }

    // Auth V2: Trata 401 - Token expirado ou inválido
    const isAuthRoute = AUTH_URLS.some((url) => originalRequest?.url?.includes(url))
    const errorCode = error.response?.data?.error?.code || error.response?.data?.code
    const confirmedInvalidSession =
      (error.response?.status === 401 && ['AUTH_INVALID_REFRESH_TOKEN', 'AUTH_SESSION_REVOKED'].includes(errorCode)) ||
      (error.response?.status === 403 && errorCode === 'USER_INACTIVE')

    if (confirmedInvalidSession && !isAuthRoute && !originalRequest?.skipAuth) {
      const { useAuthStore } = await import('@/stores/auth')
      await useAuthStore().invalidateSession()
      return Promise.reject(error)
    }
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute &&
      !originalRequest.skipAuth
    ) {
      originalRequest._retry = true

      // Tenta renovar o token
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const { useAuthStore } = await import('@/stores/auth')
          const authStore = useAuthStore()

          if (!await authStore.refreshTokens()) throw new axios.CanceledError('Sessão alterada durante a renovação.')
          processQueue(null, authStore.accessToken)

          // Atualiza o header e reenvia a requisição original
          originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`
          return apiClient(originalRequest)
        } catch (refreshError) {
          processQueue(refreshError, null)
          return Promise.reject(refreshError)
        } finally {
          isRefreshing = false
        }
      } else {
        // Aguarda o refresh em andamento e reenvia
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then(async () => {
          const { useAuthStore } = await import('@/stores/auth')
          const authStore = useAuthStore()
          originalRequest.headers.Authorization = `Bearer ${authStore.accessToken}`
          return apiClient(originalRequest)
        }).catch((err) => {
          return Promise.reject(err)
        })
      }
    }

    // Trata erro de assinatura
    if (error.response?.data?.code === 'SUBSCRIPTION_REQUIRED') {
      const layoutStore = useLayoutStore()
      layoutStore.openSubscriptionModal()
    }

    Sentry.captureException(error)
    return Promise.reject(error)
  }
)

export default apiClient
