import apiClient from './index'
import { getApiErrorMessage } from './errors'

const LEGACY_VARIABLE_MAP = {
  paciente: 'patient.fullName',
  primeiro_nome: 'patient.firstName',
  telefone: 'patient.phone',
  clinica: 'clinic.name',
  nome_medico: 'doctor.name',
  data_consulta: 'appointment.date',
  hora_consulta: 'appointment.time',
  endereco_clinica: 'clinic.address',
  link_anamnese: 'custom.anamnesisLink',
  link_termos: 'custom.consentTermLink',
}

const AVAILABLE_TYPES = [
  'APPOINTMENT_CONFIRMATION',
  'APPOINTMENT_3_MINS_BEFORE',
  'APPOINTMENT_2_HOURS_BEFORE',
  'APPOINTMENT_1_DAY_BEFORE',
  'APPOINTMENT_RESCHEDULE_CONFLICT',
  'PATIENT_BIRTHDAY',
  'ANAMNESIS_ASSIGNMENT',
  'CONSENT_TERM_ASSIGNMENT',
  'WORKFLOW_AUTOMATION',
]

function normalizeProviderStatus(status) {
  const normalized = String(status || 'DISCONNECTED').toUpperCase()
  if (normalized === 'CONNECTED') return 'connected'
  if (normalized === 'CONNECTING' || normalized === 'REGISTERED') return 'qrcode_pending'
  if (normalized === 'ERROR') return 'disconnected'
  return 'disconnected'
}

function unwrap(response) {
  return response.data?.data ?? response.data
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '')
}

function makeIdempotencyKey(prefix) {
  const random = crypto.getRandomValues(new Uint32Array(4)).join('')
  return `${prefix}:${Date.now()}:${random}`
}

function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
}

function stableHash(input) {
  let hash = 2166136261
  const text = stableStringify(input)
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function makeStableOperationKey(prefix, payload) {
  return `${prefix}:${stableHash(payload)}`
}

function legacyToHandlebars(content = '') {
  return String(content).replace(/{\s*([a-zA-Z0-9_]+)\s*}/g, (_, key) => {
    return `{{${LEGACY_VARIABLE_MAP[key] || `custom.${key}`}}}`
  })
}

function handlebarsToLegacy(content = '') {
  const reverseMap = Object.fromEntries(Object.entries(LEGACY_VARIABLE_MAP).map(([legacy, modern]) => [modern, legacy]))
  return String(content).replace(/{{\s*([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*)\s*}}/g, (_, key) => {
    return `{${reverseMap[key] || key.replace(/^custom\./, '')}}`
  })
}

function extractVariableSchemaFromText(content = '') {
  const schema = {}
  const matches = legacyToHandlebars(content).matchAll(/{{\s*([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z0-9_]+)*)\s*}}/g)
  for (const match of matches) {
    schema[match[1]] = {
      type: 'string',
      required: true,
      maxLength: 4096,
    }
  }
  return schema
}

function mergeVariableSchemas(...contents) {
  return contents.reduce((schema, content) => ({
    ...schema,
    ...extractVariableSchemaFromText(content || ''),
  }), {})
}

function normalizeIdentifier(value, fallback) {
  return String(value || fallback)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._:-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80) || fallback
}

function normalizeButtons(buttons = []) {
  return buttons
    .filter((button) => button?.label)
    .slice(0, 3)
    .map((button, index) => ({
      id: normalizeIdentifier(button.id || button.label, `button_${index + 1}`),
      label: legacyToHandlebars(button.label).slice(0, 20),
    }))
}

function normalizeListSections(sections = []) {
  return sections
    .filter((section) => section?.title && Array.isArray(section.rows) && section.rows.length > 0)
    .slice(0, 10)
    .map((section, sectionIndex) => ({
      title: legacyToHandlebars(section.title).slice(0, 80),
      rows: section.rows
        .filter((row) => row?.title)
        .slice(0, 10)
        .map((row, rowIndex) => ({
          id: normalizeIdentifier(row.id || row.title, `row_${sectionIndex + 1}_${rowIndex + 1}`),
          title: legacyToHandlebars(row.title).slice(0, 80),
          description: row.description ? legacyToHandlebars(row.description).slice(0, 120) : undefined,
        })),
    }))
}

function contentDefinitionFromLegacy(templateData) {
  const type = templateData.type || 'TEXT'
  const text = legacyToHandlebars(templateData.content || templateData.text || '')
  const caption = templateData.caption ? legacyToHandlebars(templateData.caption) : undefined

  if (['IMAGE', 'VIDEO', 'AUDIO'].includes(type)) {
    return {
      type,
      media: { url: templateData.mediaUrl || templateData.url || '' },
      caption,
    }
  }

  if (type === 'DOCUMENT') {
    return {
      type,
      media: { url: templateData.mediaUrl || templateData.url || '' },
      filename: templateData.filename || 'documento.pdf',
      caption,
    }
  }

  if (type === 'BUTTONS') {
    return {
      type,
      body: { text },
      buttons: normalizeButtons(templateData.buttons),
    }
  }

  if (type === 'LIST') {
    return {
      type,
      body: { text },
      buttonText: templateData.buttonText || 'Ver opções',
      sections: normalizeListSections(templateData.sections),
    }
  }

  return { type: 'TEXT', body: { text } }
}

function variableSchemaFromTemplateData(templateData) {
  const definition = contentDefinitionFromLegacy(templateData)
  if (definition.type === 'TEXT') return mergeVariableSchemas(definition.body.text)
  if (['IMAGE', 'VIDEO', 'AUDIO'].includes(definition.type)) return mergeVariableSchemas(definition.caption)
  if (definition.type === 'DOCUMENT') return mergeVariableSchemas(definition.filename, definition.caption)
  if (definition.type === 'BUTTONS') return mergeVariableSchemas(definition.body.text, ...definition.buttons.map((button) => button.label))
  if (definition.type === 'LIST') {
    return mergeVariableSchemas(
      definition.body.text,
      definition.buttonText,
      ...definition.sections.flatMap((section) => [
        section.title,
        ...section.rows.flatMap((row) => [row.title, row.description]),
      ]),
    )
  }
  return {}
}

function legacyTemplateFromV2(template, version) {
  const contentDefinition = version?.contentDefinition
  const bodyText = contentDefinition?.body?.text || contentDefinition?.caption || contentDefinition?.filename || ''
  return {
    _id: template.id,
    id: template.id,
    name: template.name,
    content: handlebarsToLegacy(bodyText),
    type: contentDefinition?.type || 'TEXT',
    mediaUrl: contentDefinition?.media?.url || '',
    caption: handlebarsToLegacy(contentDefinition?.caption || ''),
    filename: contentDefinition?.filename || '',
    buttons: contentDefinition?.buttons || [],
    buttonText: contentDefinition?.buttonText || '',
    sections: contentDefinition?.sections || [],
    tags: [template.category, template.channel].filter(Boolean),
    category: template.category,
    channel: template.channel,
    status: template.status,
    currentVersionId: template.currentVersionId,
    contentDefinition,
    variableSchema: version?.variableSchema || {},
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  }
}

async function getPrimaryProviderInstance() {
  const response = await apiClient.get('/v2/messaging/providers/instances')
  const instances = unwrap(response) || []
  const connected = instances.find((instance) => instance.status === 'CONNECTED')
  return connected || instances[0] || null
}

async function ensureProviderInstance() {
  const existing = await getPrimaryProviderInstance()
  if (existing) return existing
  const response = await apiClient.post('/v2/messaging/providers/instances', { provider: 'WHATSZU' })
  return unwrap(response)
}

export const initiateWhatsAppConnection = async () => {
  const instance = await ensureProviderInstance()
  const qrResponse = await apiClient.get(`/v2/messaging/providers/${instance.providerInstanceId}/qr`)
  const qr = unwrap(qrResponse)
  const currentStatus = qr.status || instance.status
  return {
    data: {
      status: normalizeProviderStatus(currentStatus),
      qr: qr.qrCode,
      qrcodeImage: qr.qrCode,
      instance: { ...instance, status: currentStatus },
      sessionId: instance.providerInstanceId,
    },
  }
}

export const checkWhatsAppStatus = async () => {
  const instance = await getPrimaryProviderInstance()
  if (!instance) {
    return { data: { status: 'disconnected', message: 'WhatsApp desconectado.' } }
  }

  let qr = null
  let currentStatus = instance.status
  if (instance.status !== 'CONNECTED') {
    try {
      const qrResponse = await apiClient.get(`/v2/messaging/providers/${instance.providerInstanceId}/qr`)
      const qrPayload = unwrap(qrResponse)
      qr = qrPayload?.qrCode || null
      currentStatus = qrPayload?.status || currentStatus
    } catch {
      qr = null
    }
  }

  return {
    data: {
      status: normalizeProviderStatus(currentStatus),
      qr,
      qrcodeImage: qr,
      name: 'WhatsApp Principal',
      number: instance.providerInstanceId,
      instance: { ...instance, status: currentStatus },
      sessionId: instance.providerInstanceId,
      apiVersion: 'v2',
    },
  }
}

export const logoutWhatsAppConnection = async () => {
  const instance = await getPrimaryProviderInstance()
  if (!instance) return { data: { message: 'WhatsApp já estava desconectado.' } }
  await apiClient.delete(`/v2/messaging/providers/${instance.providerInstanceId}/disconnect`)
  return { data: { message: 'Sessão WhatsApp encerrada.' } }
}

export const sendMessage = async (data) => {
  const instance = await ensureProviderInstance()
  const idempotencyPayload = {
    recipient: normalizePhone(data.phone || data.recipientPhone || data.to),
    message: data.message || data.content || '',
    patientId: data.patientId || null,
  }
  const response = await apiClient.post(
    '/v2/messaging/messages',
    {
      provider: 'WHATSZU',
      providerInstanceId: instance.providerInstanceId,
      type: 'TEXT',
      recipient: {
        channel: 'whatsapp',
        address: normalizePhone(data.phone || data.recipientPhone || data.to),
        displayName: data.patientName,
      },
      content: {
        message: data.message || data.content || '',
      },
      metadata: {
        source: 'crm_manual_send',
        attributes: {
          patientId: data.patientId || null,
          actionType: 'MANUAL_SEND',
        },
      },
    },
    {
      headers: {
        'Idempotency-Key': data.idempotencyKey || makeStableOperationKey('crm-manual', idempotencyPayload),
      },
    },
  )
  return { data: unwrap(response) }
}

export const sendTestMessage = async (data) => {
  const instance = await ensureProviderInstance()
  const templateId = data.templateId || data.id
  const idempotencyPayload = {
    templateId,
    versionId: data.versionId || null,
    recipient: normalizePhone(data.phone || data.recipientPhone || data.to),
    variables: data.variables || {},
  }
  const response = await apiClient.post(
    `/v2/content/templates/${templateId}/send`,
    {
      recipient: {
        phone: normalizePhone(data.phone || data.recipientPhone || data.to),
      },
      providerInstanceId: instance.providerInstanceId,
      versionId: data.versionId,
      strategy: data.versionId ? 'PINNED_VERSION' : 'LATEST_ACTIVE',
      variables: data.variables || {},
    },
    {
      headers: {
        'Idempotency-Key': data.idempotencyKey || makeStableOperationKey('crm-test', idempotencyPayload),
      },
    },
  )
  return { data: unwrap(response) }
}

export const listMessageTemplates = async () => {
  const response = await apiClient.get('/v2/content/templates')
  const templates = unwrap(response) || []
  const mapped = await Promise.all(
    templates.map(async (template) => {
      if (!template.currentVersionId) return legacyTemplateFromV2(template)
      const versionResponse = await apiClient.get(`/v2/content/templates/${template.id}/versions/${template.currentVersionId}`)
      return legacyTemplateFromV2(template, unwrap(versionResponse))
    }),
  )
  return { data: mapped }
}

export const createMessageTemplate = async (templateData) => {
  const contentDefinition = contentDefinitionFromLegacy(templateData)
  const response = await apiClient.post('/v2/content/templates', {
    scope: 'CLINIC',
    key: `crm.${String(templateData.name || 'template').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80)}.${Date.now()}`,
    name: templateData.name,
    category: templateData.category || 'CUSTOM',
    channel: 'WHATSAPP',
    contentDefinition,
    variableSchema: variableSchemaFromTemplateData(templateData),
  })
  const result = unwrap(response)
  if (result.version?.id) {
    await apiClient.post(`/v2/content/templates/${result.template.id}/versions/${result.version.id}/publish`)
  }
  return { data: legacyTemplateFromV2(result.template, result.version) }
}

export const getMessageTemplateById = async (templateId) => {
  const templateResponse = await apiClient.get(`/v2/content/templates/${templateId}`)
  const template = unwrap(templateResponse)
  if (!template.currentVersionId) return { data: legacyTemplateFromV2(template) }
  const versionResponse = await apiClient.get(`/v2/content/templates/${templateId}/versions/${template.currentVersionId}`)
  return { data: legacyTemplateFromV2(template, unwrap(versionResponse)) }
}

export const updateMessageTemplate = async (templateId, templateData) => {
  const hasVersionChanges = Boolean(
    templateData.content ||
    templateData.mediaUrl ||
    templateData.caption ||
    templateData.filename ||
    templateData.buttons ||
    templateData.sections,
  )
  const response = await apiClient.patch(`/v2/content/templates/${templateId}`, {
    name: templateData.name,
    category: templateData.category,
    contentDefinition: hasVersionChanges ? contentDefinitionFromLegacy(templateData) : undefined,
    variableSchema: hasVersionChanges ? variableSchemaFromTemplateData(templateData) : undefined,
  })
  const result = unwrap(response)
  if (result.version?.id) {
    await apiClient.post(`/v2/content/templates/${result.template.id}/versions/${result.version.id}/publish`)
  }
  return { data: legacyTemplateFromV2(result.template, result.version) }
}

export const deleteMessageTemplate = async (templateId) => {
  await apiClient.patch(`/v2/content/templates/${templateId}`, { status: 'ARCHIVED' })
  return { data: { success: true } }
}

export const publishMessageTemplate = async (templateId, versionId) => {
  const response = await apiClient.post(`/v2/content/templates/${templateId}/versions/${versionId}/publish`)
  return { data: unwrap(response) }
}

export const deprecateMessageTemplateVersion = async (templateId, versionId) => {
  const response = await apiClient.post(`/v2/content/templates/${templateId}/versions/${versionId}/deprecate`)
  return { data: unwrap(response) }
}

export const previewMessageTemplate = async (templateId, data = {}) => {
  const response = await apiClient.post(`/v2/content/templates/${templateId}/preview`, {
    versionId: data.versionId,
    channel: data.channel || 'WHATSAPP',
    variables: data.variables || {},
  })
  return { data: unwrap(response) }
}

export const getTemplateVariables = () => {
  return Promise.resolve({
    data: {
      variables: Object.entries(LEGACY_VARIABLE_MAP).map(([legacy, modern]) => ({
        value: `{${legacy}}`,
        description: `Variável V2: {{${modern}}}`,
      })),
    },
  })
}

export const getAvailableMessageTypes = () => {
  return Promise.resolve({ data: { availableTypes: AVAILABLE_TYPES } })
}

export const upsertMessageSetting = async (settingData) => {
  return Promise.resolve({
    data: {
      ...settingData,
      message: 'Configurações automáticas agora são gerenciadas por workflows V2.',
    },
  })
}

export const listMessageSettings = async () => {
  return { data: { availableTypes: AVAILABLE_TYPES, settings: [] } }
}

export const deleteMessageSetting = async (messageType) => {
  return Promise.resolve({ data: { type: messageType, removed: true } })
}

export const getLogFiltersOptions = () => {
  return Promise.resolve({
    data: {
      logStatus: ['QUEUED', 'PROCESSING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED', 'SCHEDULED', 'RETRYING', 'EXPIRED'],
      actionTypes: ['MANUAL_SEND', 'AUTOMATIC_REMINDER', 'AUTOMATIC_BIRTHDAY', 'AUTOMATIC_WORKFLOW'],
    },
  })
}

export const listMessageLogs = async (params = {}) => {
  const response = await apiClient.get('/v2/messaging/messages/logs', {
    params: {
      page: params.page,
      limit: params.limit,
      status: params.status,
      patientId: params.patientId,
      templateId: params.templateId,
      settingType: params.settingType,
      actionType: params.actionType,
      from: params.from || params.startDate,
      to: params.to || params.endDate,
    },
  })
  const data = unwrap(response)
  return {
    data: {
      logs: (data.logs || []).map((log) => ({
        _id: log.id,
        status: log.status,
        recipientPhone: log.recipient?.address,
        messageContent: log.contentPreview || log.status,
        actionType: log.actionType || 'AUTOMATIC_WORKFLOW',
        settingType: log.settingType,
        template: log.templateId
          ? { _id: log.templateId, name: 'Template V2', versionId: log.templateVersionId }
          : null,
        patient: log.patientId ? { _id: log.patientId } : null,
        errorMessage: log.failureReason,
        wwebjsMessageId: log.providerMessageId,
        createdAt: log.createdAt,
        updatedAt: log.updatedAt,
      })),
      total: data.total,
      page: data.page,
      limit: data.limit,
    },
  }
}

export { getApiErrorMessage }
