import axios from 'axios'
import * as Sentry from '@sentry/vue'
import { ref } from 'vue'
import { useLayoutStore } from '@/stores/layout'

export const isGlobalOffline = ref(false)

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
  // 1. Versionamento dinâmico (v1 default, override v2)
  const versionPrefixRegex = /^\/?v\d+(\/|$)/
  if (config.url && !versionPrefixRegex.test(config.url)) {
    const cleanUrl = config.url.startsWith('/') ? config.url : `/${config.url}`
    config.url = `/v1${cleanUrl}`
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
          await authStore.refreshTokens()
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
        }).then(async () => {
          // Atualiza o header com o novo token
          const { useAuthStore } = await import('@/stores/auth')
          const authStore = useAuthStore()
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
    if (isGlobalOffline.value) {
      isGlobalOffline.value = false
    }
    return response
  },
  async (error) => {
    const originalRequest = error.config

    // Trata erros de rede
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('⚠️ Conexão perdida com a API.')
      isGlobalOffline.value = true
      Sentry.captureException(error)
      return Promise.reject(error)
    } else {
      isGlobalOffline.value = false
    }

    // Auth V2: Trata 401 - Token expirado ou inválido
    const isAuthRoute = AUTH_URLS.some((url) => originalRequest?.url?.includes(url))
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true

      const errorCode = error.response?.data?.error?.code

      // Se o refresh token é inválido, força logout
      if (errorCode === 'AUTH_INVALID_REFRESH_TOKEN') {
        const { useAuthStore } = await import('@/stores/auth')
        const authStore = useAuthStore()
        authStore.logout()

        const router = (await import('@/router')).default
        router.push({ name: 'login' })
        return Promise.reject(error)
      }

      // Tenta renovar o token
      if (!isRefreshing) {
        isRefreshing = true
        try {
          const { useAuthStore } = await import('@/stores/auth')
          const authStore = useAuthStore()

          await authStore.refreshTokens()
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
