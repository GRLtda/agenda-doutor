import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  initiateWhatsAppConnection,
  checkWhatsAppStatus,
  getWhatsAppQrCode,
  logoutWhatsAppConnection,
  sendMessage,
  sendTestMessage,
} from '@/api/crm'
import { useToast } from 'vue-toastification'

function normalizeProviderStatus(providerStatus) {
  const status = String(providerStatus || 'DISCONNECTED').toUpperCase()

  if (status === 'ACTIVE' || status === 'CONNECTED') return 'connected'
  if (status === 'PENDING' || status === 'QRCODE' || status === 'QRCODE_PENDING') return 'qrcode_pending'
  if (status === 'CREATING_QR' || status === 'INITIALIZING') return status.toLowerCase()

  return 'disconnected'
}

function normalizeResponse(payload) {
  const raw = payload?.success && payload?.data ? payload.data : payload || {}
  const qrFromObject = typeof raw.qr === 'object' ? raw.qr?.base64 : null
  const qrCode = qrFromObject || raw.qrcodeImage || (typeof raw.qr === 'string' ? raw.qr : null) || null
  const profile = raw.profile?.profile || raw.profile || null
  const business = profile?.business || null
  const internalStatus = normalizeProviderStatus(raw.status)
  const displayName =
    profile?.verifiedName ||
    profile?.pushName ||
    profile?.name ||
    raw.name ||
    'WhatsApp Principal'

  const number =
    profile?.jid ||
    (profile?.phoneNumber ? `${profile.phoneNumber}@s.whatsapp.net` : null) ||
    raw.number ||
    raw.phoneNumber ||
    'Desconhecido'

  return {
    status: internalStatus,
    providerStatus: raw.status || 'DISCONNECTED',
    message: raw.message,
    qrCode,
    connection: {
      id: raw.instanceId || raw.sessionId || 1,
      name: displayName,
      username: displayName,
      number,
      profileImage: profile?.profilePictureUrl || raw.profileImage || null,
      status: internalStatus,
      instance: {
        provider: raw.provider || 'whatszu',
        status: raw.status || 'DISCONNECTED',
        isBusiness: Boolean(business),
        platform: 'md',
        email: business?.email || null,
        websites: business?.websites || [],
        description: business?.description || null,
        category: business?.category || null,
        address: business?.address || null,
        sending: raw.sending || null,
      },
      apiVersion: raw.provider === 'whatszu' || raw.instanceId ? 'whatszu-v1' : raw.apiVersion || 'v1.0.0',
      sessionId: raw.instanceId || raw.sessionId || null,
    },
  }
}

function getApiErrorMessage(error, fallback) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error?.message ||
    error.response?.data?.error ||
    fallback
  )
}

export const useCrmStore = defineStore('crm', () => {
  const toast = useToast()

  const status = ref('disconnected')
  const qrCode = ref(null)
  const isLoading = ref(false)
  const isPolling = ref(false)
  const connections = ref([])
  const isLoadingQrImage = ref(false)

  let statusPollingInterval = null
  let currentPollingIntervalDuration = 0
  let initializingDisconnectRetryCount = 0
  let isFetchingQrCodeApi = false

  function stopPolling() {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval)
      statusPollingInterval = null
    }

    isPolling.value = false
    currentPollingIntervalDuration = 0
  }

  function startPolling(interval = 5000) {
    stopPolling()
    if (interval <= 0) return

    currentPollingIntervalDuration = interval
    isPolling.value = true
    setTimeout(checkStatus, 500)
    statusPollingInterval = setInterval(checkStatus, interval)
  }

  function applyConnectedState(state, previousStatus, showToast = true) {
    status.value = 'connected'
    qrCode.value = null
    isLoadingQrImage.value = false
    connections.value = [state.connection]
    initializingDisconnectRetryCount = 0
    stopPolling()

    if (showToast && previousStatus !== 'connected') {
      toast.success(state.message || 'WhatsApp conectado!')
    }
  }

  function applyDisconnectedState(state, previousStatus, showToast = true) {
    status.value = 'disconnected'
    qrCode.value = null
    isLoadingQrImage.value = false
    connections.value = []
    stopPolling()
    initializingDisconnectRetryCount = 0

    if (showToast && previousStatus !== 'disconnected') {
      toast.info(state.message || 'WhatsApp desconectado.')
    }
  }

  async function fetchQrCode() {
    if (isFetchingQrCodeApi) return null

    isFetchingQrCodeApi = true
    try {
      const response = await getWhatsAppQrCode()
      const state = normalizeResponse(response.data)

      if (state.qrCode) {
        qrCode.value = state.qrCode
        isLoadingQrImage.value = false
      }

      return state
    } finally {
      isFetchingQrCodeApi = false
    }
  }

  async function checkStatus() {
    try {
      const response = await checkWhatsAppStatus()
      const state = normalizeResponse(response.data)
      const previousStatus = status.value

      if (
        previousStatus === 'initializing' &&
        state.status === 'disconnected' &&
        initializingDisconnectRetryCount < 3
      ) {
        initializingDisconnectRetryCount++
        return
      }

      if (previousStatus === 'initializing' && state.status !== 'disconnected') {
        initializingDisconnectRetryCount = 0
      }

      if (state.qrCode) {
        qrCode.value = state.qrCode
        isLoadingQrImage.value = false
      }

      switch (state.status) {
        case 'connected':
          applyConnectedState(state, previousStatus)
          break

        case 'disconnected':
          if (
            previousStatus !== 'initializing' ||
            initializingDisconnectRetryCount >= 3 ||
            previousStatus === 'disconnected'
          ) {
            applyDisconnectedState(state, previousStatus)
          }
          break

        case 'creating_qr':
        case 'initializing':
          status.value = state.status
          qrCode.value = null
          isLoadingQrImage.value = false
          initializingDisconnectRetryCount = 0
          if (currentPollingIntervalDuration !== 2000) startPolling(2000)
          break

        case 'qrcode_pending':
          status.value = 'qrcode_pending'
          initializingDisconnectRetryCount = 0
          isLoadingQrImage.value = !qrCode.value
          if (!qrCode.value) await fetchQrCode()
          if (currentPollingIntervalDuration !== 4000) startPolling(4000)
          break

        default:
          isLoadingQrImage.value = false
          initializingDisconnectRetryCount = 0
          if (currentPollingIntervalDuration !== 5000) startPolling(5000)
      }
    } catch (error) {
      initializingDisconnectRetryCount = 0
      isLoadingQrImage.value = false

      if (error.response?.status !== 404) {
        toast.error('Erro ao verificar status da conexao.')
      }

      if (status.value !== 'disconnected') {
        status.value = 'disconnected'
        qrCode.value = null
        connections.value = []
      }

      stopPolling()
    }
  }

  async function initiateOrResetConnection() {
    if (isLoading.value) return

    isLoading.value = true
    qrCode.value = null
    isLoadingQrImage.value = false
    status.value = 'initializing'
    stopPolling()
    initializingDisconnectRetryCount = 0

    try {
      const statusResponse = await checkWhatsAppStatus()
      const currentState = normalizeResponse(statusResponse.data)

      if (currentState.status === 'connected') {
        applyConnectedState(currentState, status.value, false)
        toast.info('WhatsApp ja esta conectado.')
        return
      }

      if (currentState.status === 'qrcode_pending') {
        status.value = 'qrcode_pending'
        if (currentState.qrCode) {
          qrCode.value = currentState.qrCode
          isLoadingQrImage.value = false
        } else {
          isLoadingQrImage.value = true
          await fetchQrCode()
        }
        startPolling(4000)
        return
      }

      if (currentState.status === 'creating_qr' || currentState.status === 'initializing') {
        status.value = currentState.status
        startPolling(2000)
        return
      }

      const initiateResponse = await initiateWhatsAppConnection()
      const initiatedState = normalizeResponse(initiateResponse.data)
      status.value = initiatedState.status

      if (initiatedState.qrCode) {
        qrCode.value = initiatedState.qrCode
        isLoadingQrImage.value = false
      }

      if (initiatedState.status === 'connected') {
        applyConnectedState(initiatedState, 'initializing', false)
        return
      }

      if (initiatedState.status === 'creating_qr' || initiatedState.status === 'initializing') {
        startPolling(2000)
        return
      }

      isLoadingQrImage.value = !qrCode.value
      if (!qrCode.value) await fetchQrCode()
      startPolling(4000)
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Falha ao iniciar conexao com WhatsApp.'))
      status.value = 'disconnected'
      isLoadingQrImage.value = false
      stopPolling()
    } finally {
      isLoading.value = false
    }
  }

  async function logoutConnection() {
    if (isLoading.value) return

    isLoading.value = true
    stopPolling()
    initializingDisconnectRetryCount = 0

    try {
      const response = await logoutWhatsAppConnection()
      const state = normalizeResponse(response.data)
      applyDisconnectedState(state, status.value, false)
      toast.success(response.data?.message || 'Sessao WhatsApp encerrada.')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Falha ao desconectar do WhatsApp.'))
      status.value = 'disconnected'
      qrCode.value = null
      isLoadingQrImage.value = false
      connections.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function getInitialStatus() {
    stopPolling()
    initializingDisconnectRetryCount = 0
    isLoading.value = true
    isLoadingQrImage.value = false

    try {
      await checkStatus()
    } catch (e) {
      if (status.value !== 'disconnected') {
        status.value = 'disconnected'
        qrCode.value = null
        isLoadingQrImage.value = false
        connections.value = []
      }
    } finally {
      isLoading.value = false
    }
  }

  async function sendWhatsappMessage(payload) {
    try {
      isLoading.value = true
      const response = await sendMessage(payload)
      toast.success('Mensagem enviada com sucesso!')
      return response.data
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao enviar mensagem.'))
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function sendWhatsappTestMessage(payload) {
    try {
      isLoading.value = true
      const response = await sendTestMessage(payload)
      toast.success('Mensagem de teste enviada!')
      return response.data
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Erro ao enviar teste.'))
      throw error
    } finally {
      isLoading.value = false
    }
  }

  return {
    status,
    qrCode,
    isLoading,
    isPolling,
    connections,
    isLoadingQrImage,
    initiateOrResetConnection,
    logoutConnection,
    getInitialStatus,
    stopPolling,
    sendWhatsappMessage,
    sendWhatsappTestMessage,
  }
})
