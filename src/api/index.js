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

// Interceptador de Requisição para Versionamento Dinâmico (v1 default, override v2)
apiClient.interceptors.request.use((config) => {
  const versionPrefixRegex = /^\/?v\d+(\/|$)/

  if (config.url && !versionPrefixRegex.test(config.url)) {
    const cleanUrl = config.url.startsWith('/') ? config.url : `/${config.url}`
    config.url = `/v1${cleanUrl}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => {
    if (isGlobalOffline.value) {
      isGlobalOffline.value = false
    }
    return response
  },
  (error) => {
    Sentry.captureException(error)
    console.error('Capturou erro')
    if (error.code === 'ERR_NETWORK' || !error.response) {
      console.error('⚠️ Conexão perdida com a API.')
      isGlobalOffline.value = true
    } else {
      isGlobalOffline.value = false
    }

    if (error.response && error.response.data && error.response.data.code === 'SUBSCRIPTION_REQUIRED') {
      const layoutStore = useLayoutStore()
      layoutStore.openSubscriptionModal()
    }

    return Promise.reject(error)
  }
)

export default apiClient
