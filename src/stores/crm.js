import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  initiateWhatsAppConnection,
  checkWhatsAppStatus,
  logoutWhatsAppConnection,
  sendMessage,
  sendTestMessage,
} from '@/api/crm'
import { useToast } from 'vue-toastification'

export const useCrmStore = defineStore('crm', () => {
  const toast = useToast()

  const status = ref('disconnected')
  const qrCode = ref(null) // Armazena a string base64 atual
  const isLoading = ref(false) // Loading geral da store/ações
  const isPolling = ref(false)
  const connections = ref([])
  let statusPollingInterval = null
  let currentPollingIntervalDuration = 0
  let isFetchingQrCodeApi = false // Renomeado para clareza: buscando da API
  let initializingDisconnectRetryCount = 0
  const isLoadingQrImage = ref(false) // Novo: controla o loading da imagem

  function stopPolling() {
    if (statusPollingInterval) {
      clearInterval(statusPollingInterval)
      statusPollingInterval = null
      isPolling.value = false
      currentPollingIntervalDuration = 0
    }
  }

  function startPolling(interval = 5000) {
    stopPolling()
    if (interval <= 0) return

    currentPollingIntervalDuration = interval
    isPolling.value = true
    setTimeout(checkStatus, 500) // Chama checkStatus imediatamente após iniciar o polling
    statusPollingInterval = setInterval(checkStatus, interval)
  }

  // Modificado para usar isLoadingQrImage
  // Função fetchQrCode removida pois o /status já retorna o QR Code

  async function checkStatus() {

    try {
      const response = await checkWhatsAppStatus()
      const newApiStatus = response.data.status ? response.data.status.toLowerCase() : 'disconnected'
      const previousInternalStatus = status.value

      // Lógica para lidar com desconexão durante inicialização (mantida)
      if (
        previousInternalStatus === 'initializing' &&
        newApiStatus === 'disconnected' &&
        initializingDisconnectRetryCount < 3 // Tenta 3 vezes antes de desistir
      ) {
        initializingDisconnectRetryCount++
        return // Continua esperando, não atualiza o status ainda
      }
      // Reseta a contagem se o status mudou ou não é mais desconectado
      if (previousInternalStatus === 'initializing' && newApiStatus !== 'disconnected') {
        initializingDisconnectRetryCount = 0
      }

      status.value = newApiStatus

      // Se a resposta trouxer o QR Code, atualiza imediatamente
      if (response.data.qrcodeImage || response.data.qr) {
        qrCode.value = response.data.qrcodeImage || response.data.qr
        isLoadingQrImage.value = false
      }

      switch (newApiStatus) {
        case 'connected':
          qrCode.value = null // Limpa QR code
          isLoadingQrImage.value = false // Garante que não está carregando imagem

          // Só mostra toast se o status anterior não era 'connected'
          if (previousInternalStatus !== 'connected') {
            toast.success(response.data.message || 'WhatsApp conectado!')
          }

          connections.value = [
            {
              id: 1,
              name: response.data.name || 'WhatsApp Principal',
              username: response.data.username || null,
              number: response.data.number || 'Desconhecido',
              profileImage: response.data.profileImage || null,
              status: 'connected',
              instance: response.data.instance || {},
              apiVersion: response.data.apiVersion || 'v1.0.0',
              sessionId: response.data.sessionId || null
            }
          ]
          stopPolling() // Para o polling quando conectado
          initializingDisconnectRetryCount = 0 // Reseta contagem
          break;

        case 'disconnected':
          qrCode.value = null // Limpa QR code
          isLoadingQrImage.value = false // Garante que não está carregando imagem

          // Lógica anterior ajustada para incluir a checagem do getInitialStatus
          if (
            previousInternalStatus !== 'initializing' ||
            initializingDisconnectRetryCount >= 3 ||
            previousInternalStatus === 'disconnected' // <-- Chave para o getInitialStatus funcionar
          ) {
            // Só mostra toast se o status realmente mudou
            if (previousInternalStatus !== 'disconnected') {
              toast.info(response.data.message || 'WhatsApp desconectado.')
            }
            connections.value = [] // Limpa a lista de conexões
            stopPolling() // Para o polling quando desconectado
            initializingDisconnectRetryCount = 0 // Reseta contagem
          }
          break;

        case 'creating_qr':
        case 'initializing':
          qrCode.value = null // Limpa QR code
          isLoadingQrImage.value = false // Garante que não está carregando imagem
          initializingDisconnectRetryCount = 0 // Reseta contagem
          if (currentPollingIntervalDuration !== 2000) {
            startPolling(2000)
          }
          break;

        case 'qrcode_pending':
        case 'qrcode':
          initializingDisconnectRetryCount = 0 // Reseta contagem
          status.value = 'qrcode_pending'; // Define como pendente primeiro
          isLoadingQrImage.value = !qrCode.value; // Loading se não tiver QR

          if (currentPollingIntervalDuration !== 4000) {
            startPolling(4000)
          }
          // fetchQrCode removido - o QR code virá pelo checkStatus
          break;

        default:
          isLoadingQrImage.value = false // Garante limpeza
          initializingDisconnectRetryCount = 0 // Reseta contagem
          if (currentPollingIntervalDuration !== 5000) {
            startPolling(5000)
          }
      }

    } catch (error) {
      initializingDisconnectRetryCount = 0 // Reseta contagem no erro
      isLoadingQrImage.value = false // Garante que não está carregando imagem
      if (error.response?.status !== 404) {
        toast.error('Erro ao verificar status da conexão.')
      }
      if (status.value !== 'disconnected') {
        status.value = 'disconnected'
        qrCode.value = null // Limpa QR code
        connections.value = [] // Limpa conexões
      }
      stopPolling() // Para o polling em caso de erro
    }
  }


  async function initiateOrResetConnection() {
    if (isLoading.value) return // Evita múltiplas chamadas
    isLoading.value = true // Indica início da ação principal
    qrCode.value = null // Limpa QR code antigo
    isLoadingQrImage.value = false // Garante que não está carregando imagem
    status.value = 'initializing' // Define status inicial
    stopPolling() // Para qualquer polling anterior
    initializingDisconnectRetryCount = 0 // Reseta a contagem de retentativas

    try {
      // 1. Verifica o status atual ANTES de tentar iniciar
      const statusResponse = await checkWhatsAppStatus()
      const currentStatus = statusResponse.data.status ? statusResponse.data.status.toLowerCase() : 'disconnected'

      // Se já estiver conectado, apenas atualiza o estado e informa
      if (currentStatus === 'connected') {
        status.value = 'connected'
        toast.info('WhatsApp já está conectado.')
        connections.value = [
          {
            id: 1,
            name: statusResponse.data.name || 'WhatsApp Principal',
            username: statusResponse.data.username || null,
            number: statusResponse.data.number || 'Desconhecido',
            profileImage: statusResponse.data.profileImage || null,
            status: 'connected',
            instance: statusResponse.data.instance || {},
            apiVersion: statusResponse.data.apiVersion || 'v1.0.0',
            sessionId: statusResponse.data.sessionId || null
          },
        ]
        // Não inicia polling aqui
      }
      // Se já existe um QR pendente ou sendo criado, apenas ajusta o polling
      else if (currentStatus === 'qrcode_pending' || currentStatus === 'qrcode') {
        status.value = 'qrcode_pending' // Define como pendente
        isLoadingQrImage.value = true // Assume que vai carregar um novo QR
        startPolling(4000) // Inicia polling para QR code
        // O fetchQrCode será chamado pelo checkStatus dentro do startPolling
      } else if (currentStatus === 'creating_qr' || currentStatus === 'initializing') {
        status.value = currentStatus // Mantém o status da API
        startPolling(2000) // Inicia polling rápido
      }
      // Se estiver desconectado ou em outro estado, TENTA iniciar uma nova conexão
      else {
        const initiateResponse = await initiateWhatsAppConnection()
        const initialStatusFromInitiate = initiateResponse.data.status ? initiateResponse.data.status.toLowerCase() : 'initializing';
        status.value = initialStatusFromInitiate; // Atualiza o status com a resposta do initiate

        // Se a resposta trouxer o QR Code, atualiza imediatamente
        if (initiateResponse.data.qrcodeImage || initiateResponse.data.qr) {
          qrCode.value = initiateResponse.data.qrcodeImage || initiateResponse.data.qr
          isLoadingQrImage.value = false
        }

        // Se a resposta for criando/inicializando, polling rápido
        if (initialStatusFromInitiate === 'creating_qr' || initialStatusFromInitiate === 'initializing') {
          startPolling(2000)
        } else {
          // Se for qrcode_pending (ou qrcode direto), polling para QR
          isLoadingQrImage.value = true // Assume que vai carregar
          startPolling(4000)
          // fetchQrCode removido
        }
      }

    } catch (error) {
      toast.error(error.response?.data?.message || 'Falha ao iniciar conexão com WhatsApp.')
      status.value = 'disconnected' // Volta para desconectado em caso de erro
      isLoadingQrImage.value = false // Garante que não está carregando imagem
      stopPolling() // Para o polling
    } finally {
      isLoading.value = false // Indica fim da ação principal
    }
  }

  async function logoutConnection() {
    if (isLoading.value) return
    isLoading.value = true
    stopPolling() // Para o polling antes de desconectar
    initializingDisconnectRetryCount = 0 // Reseta contagem
    try {
      const response = await logoutWhatsAppConnection()
      status.value = 'disconnected' // Define como desconectado
      qrCode.value = null // Limpa QR code
      isLoadingQrImage.value = false // Garante que não está carregando imagem
      connections.value = [] // Limpa lista de conexões
      toast.success(response.data.message || 'Sessão WhatsApp encerrada.')
    } catch (error) {
      toast.error(error.response?.data?.message || 'Falha ao desconectar do WhatsApp.')
      // Mesmo em erro, força o estado para desconectado
      status.value = 'disconnected'
      qrCode.value = null
      isLoadingQrImage.value = false
      connections.value = []
    } finally {
      isLoading.value = false
    }
  }

  async function getInitialStatus() {
    stopPolling() // Garante que não há polling rodando
    initializingDisconnectRetryCount = 0 // Reseta contagem
    isLoading.value = true // Define loading geral
    isLoadingQrImage.value = false // Reset inicial
    try {
      await checkStatus() // Chama a função que busca o status da API
    } catch (e) {
      if (status.value !== 'disconnected') {
        status.value = 'disconnected' // Garante que o status seja 'disconnected'
        qrCode.value = null
        isLoadingQrImage.value = false
        connections.value = []
      }
    } finally {
      isLoading.value = false // Finaliza o loading geral
    }
  }

  async function sendWhatsappMessage(payload) {
    try {
      isLoading.value = true
      const response = await sendMessage(payload)
      toast.success('Mensagem enviada com sucesso!')
      return response.data
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erro ao enviar mensagem.')
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
      toast.error(error.response?.data?.message || 'Erro ao enviar teste.')
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
    isLoadingQrImage, // Expor novo estado
    initiateOrResetConnection,
    logoutConnection,
    getInitialStatus, // ✨ Expor a nova action ✨
    stopPolling, // Expor stopPolling se necessário em outros lugares
    sendWhatsappMessage,
    sendWhatsappTestMessage,
  }
})
