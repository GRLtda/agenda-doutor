import apiClient from './index'

const mapWhatsAppV2Status = (status) => {
  const normalized = String(status || '').toUpperCase()

  if (normalized === 'ACTIVE') return 'connected'
  if (normalized === 'PENDING') return 'qrcode_pending'
  if (normalized === 'SUSPENDED') return 'disconnected'
  if (normalized === 'CANCELLED') return 'disconnected'
  if (normalized === 'NOT_CONFIGURED') return 'disconnected'

  return 'disconnected'
}

const unwrapWhatsAppV2Data = (response) => response.data?.data || response.data || {}

const normalizeWhatsAppV2Status = (response) => {
  const data = unwrapWhatsAppV2Data(response)
  const instance = data.instance || {}
  const status = mapWhatsAppV2Status(data.status || instance.status)

  return {
    ...response,
    data: {
      provider: data.provider || 'whatszu',
      instanceId: data.instanceId || instance.id || null,
      status,
      rawStatus: data.status || instance.status || null,
      phoneNumber: data.phoneNumber || instance.phoneNumber || null,
      number: data.phoneNumber || instance.phoneNumber || null,
      name: instance.name || 'WhatsApp Principal',
      username: instance.phoneNumber || data.phoneNumber || null,
      instance,
      apiVersion: 'whatszu-v2',
      message:
        status === 'connected'
          ? 'WhatsApp conectado!'
          : status === 'qrcode_pending'
            ? 'Escaneie o QR Code para conectar o WhatsApp.'
            : 'WhatsApp desconectado.',
    },
  }
}

const normalizeWhatsAppV2Qr = (response) => {
  const data = unwrapWhatsAppV2Data(response)
  const state = data.state || {}
  const qr = data.qr || {}
  const status = mapWhatsAppV2Status(qr.status || state.status)

  return {
    ...response,
    data: {
      provider: state.provider || 'whatszu',
      instanceId: state.instanceId || null,
      status,
      rawStatus: qr.status || state.status || null,
      phoneNumber: state.phoneNumber || null,
      number: state.phoneNumber || null,
      base64: qr.base64 || null,
      qr: qr.base64 || null,
      qrcodeImage: qr.base64 || null,
      apiVersion: 'whatszu-v2',
      message:
        status === 'connected'
          ? 'WhatsApp conectado!'
          : qr.base64
            ? 'QR Code gerado. Escaneie para conectar.'
            : 'Preparando QR Code do WhatsApp.',
    },
  }
}

// --- Funções de Conexão WhatsApp (existentes) ---
export const initiateWhatsAppConnection = () => {
  return apiClient.get('/v2/whatsapp/qr').then(normalizeWhatsAppV2Qr)
}

export const checkWhatsAppStatus = () => {
  return apiClient.get('/v2/whatsapp/status').then(normalizeWhatsAppV2Status)
}

export const logoutWhatsAppConnection = () => {
  return apiClient.post('/v2/whatsapp/disconnect').then(normalizeWhatsAppV2Status)
}

/**
 * Envia uma mensagem avulsa.
 * Rota: POST /api/crm/send-message
 */
export const sendMessage = (data) => {
  return apiClient.post('/crm/send-message', data)
}

/**
 * Envia uma mensagem de teste (Template).
 * Rota: POST /api/crm/send-test
 */
export const sendTestMessage = (data) => {
  return apiClient.post('/crm/send-test', data)
}

// --- 🚀 NOVAS Funções para Modelos de Mensagem ---

/**
 * Lista todos os modelos de mensagem da clínica.
 * Rota: GET /api/crm/templates
 */
export const listMessageTemplates = () => {
  return apiClient.get('/crm/templates')
}

/**
 * Cria um novo modelo de mensagem.
 * Rota: POST /api/crm/templates
 * @param {object} templateData - Dados do modelo { name, content, tags? }.
 */
export const createMessageTemplate = (templateData) => {
  return apiClient.post('/crm/templates', templateData)
}

/**
 * Busca um modelo de mensagem específico por ID.
 * Rota: GET /api/crm/templates/:id
 * @param {string} templateId - O ID do modelo.
 */
export const getMessageTemplateById = (templateId) => {
  return apiClient.get(`/crm/templates/${templateId}`)
}

/**
 * Atualiza um modelo de mensagem existente.
 * Rota: PUT /api/crm/templates/:id
 * @param {string} templateId - O ID do modelo.
 * @param {object} templateData - Dados a serem atualizados { name?, content?, tags? }.
 */
export const updateMessageTemplate = (templateId, templateData) => {
  return apiClient.put(`/crm/templates/${templateId}`, templateData)
}

/**
 * Deleta um modelo de mensagem.
 * Rota: DELETE /api/crm/templates/:id
 * @param {string} templateId - O ID do modelo.
 */
export const deleteMessageTemplate = (templateId) => {
  return apiClient.delete(`/crm/templates/${templateId}`)
}

/**
 * Busca a lista de variáveis suportadas (opcional).
 * Rota: GET /api/crm/templates/variables
 */
export const getTemplateVariables = () => {
  return apiClient.get('/crm/templates/variables')
}

/**
 * Obtém os tipos de gatilhos de mensagem disponíveis.
 * Rota: GET /api/crm/settings/types
 */
export const getAvailableMessageTypes = () => {
  return apiClient.get('/crm/settings/types')
}

/**
 * Cria ou atualiza uma configuração de gatilho de mensagem (Upsert).
 * Rota: POST /api/crm/settings
 * @param {object} settingData - Dados da configuração { type, templateId, isActive? }.
 */
export const upsertMessageSetting = (settingData) => {
  return apiClient.post('/crm/settings', settingData)
}

/**
 * Lista todas as configurações de gatilho salvas para a clínica.
 * Rota: GET /api/crm/settings
 */
export const listMessageSettings = () => {
  return apiClient.get('/crm/settings')
}

/**
 * Exclui uma configuração de gatilho específica.
 * Rota: DELETE /api/crm/settings/:type
 * @param {string} messageType - O tipo de gatilho a ser excluído (ex: "APPOINTMENT_1_DAY_BEFORE").
 */
export const deleteMessageSetting = (messageType) => {
  // O tipo vai na URL, então precisamos formatar a string
  return apiClient.delete(`/crm/settings/${encodeURIComponent(messageType)}`)
}

// --- 🚀 NOVAS Funções para Logs de Mensagens ---

/**
 * Obtém os status e tipos de ação disponíveis para filtros de log.
 * Rota: GET /api/crm/logs/status
 */
export const getLogFiltersOptions = () => {
  return apiClient.get('/crm/logs/status')
}

/**
 * Lista os logs de mensagens com filtros e paginação.
 * Rota: GET /api/crm/logs
 * @param {object} params - Parâmetros de query (limit, page, status, patientId, actionType).
 */
export const listMessageLogs = (params = {}) => {
  // Garante que apenas parâmetros definidos sejam enviados
  const validParams = Object.entries(params).reduce((acc, [key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      acc[key] = value;
    }
    return acc;
  }, {});
  return apiClient.get('/crm/logs', { params: validParams })
}
