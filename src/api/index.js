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
