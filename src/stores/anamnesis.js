import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useToast } from 'vue-toastification'
import {
  assignAnamnesis as apiAssignAnamnesis,
  createAnamnesisTemplate as apiCreateTemplate,
  createIdempotencyKey,
  deleteAnamnesisTemplate as apiDeleteTemplate,
  downloadAnamnesisPdf as apiDownloadPdf,
  getAnamnesisForPatient as apiGetForPatient,
  getAnamnesisResponse as apiGetResponse,
  getAnamnesisResponses as apiGetResponses,
  getAnamnesisTemplateById as apiGetTemplateById,
  getAnamnesisTemplates as apiGetTemplates,
  getPublicAnamnesis as apiGetPublic,
  revokeAnamnesisPublicAccess as apiRevokePublicAccess,
  rotateAnamnesisPublicAccess as apiRotatePublicAccess,
  submitPublicAnamnesis as apiSubmitPublic,
  updateAnamnesisResponse as apiUpdateResponse,
  updateAnamnesisTemplate as apiUpdateTemplate,
} from '@/api/anamnesis'
import { getAnamnesisBlobError, getAnamnesisError } from '@/utils/anamnesis-error'

const STATUS_TO_UI = {
  PENDING: 'Pendente',
  COMPLETED: 'Preenchido',
  EXPIRED: 'Expirado',
  REVOKED: 'Revogado',
}

const STATUS_TO_API = {
  Ativos: 'ACTIVE',
  Todos: 'ALL',
  Pendente: 'PENDING',
  Preenchido: 'COMPLETED',
  Expirado: 'EXPIRED',
  Revogado: 'ALL',
}

function unwrap(response) {
  return response?.data?.data ?? {}
}

function normalizeResponse(item) {
  if (!item || typeof item !== 'object') return item

  const id = item.id || item._id
  const patient = item.patient || null
  const statusCode = item.statusCode || item.status

  return {
    ...item,
    id,
    _id: id,
    statusCode,
    status: STATUS_TO_UI[statusCode] || item.status,
    templateName: item.template?.name || item.templateName || 'Anamnese',
    patient,
    patientId: patient?.id || patient?._id || item.patientId || null,
    patientName: patient?.name || item.patientName || null,
    patientPhone: patient?.phone || item.patientPhone || null,
    assignedDate: item.createdAt || item.assignedDate,
    expirationDate: item.expiresAt || item.expirationDate,
    patientAccessTokenExpires: item.expiresAt || item.patientAccessTokenExpires,
    whatsappNotified: item.notificationSent ?? item.whatsappNotified ?? false,
  }
}

function payloadSignature(payload) {
  return JSON.stringify(payload)
}

export const useAnamnesisStore = defineStore('anamnesis', () => {
  const toast = useToast()
  const templates = ref([])
  const publicTemplate = ref(null)
  const patientAnamneses = ref([])
  const isLoading = ref(false)
  const isFetchingTemplates = ref(false)

  const pendingAnamnesesList = ref([])
  const pendingTotal = ref(0)
  const pendingPage = ref(1)
  const pendingPages = ref(1)
  const pendingLimit = ref(20)

  const allAnamnesesList = ref([])
  const allTotal = ref(0)
  const allPage = ref(1)
  const allPages = ref(1)
  const allLimit = ref(20)

  // Mantida somente em memória. A mesma chave é reutilizada quando o mesmo envio é repetido.
  const submissionIntents = new Map()

  function errorResult(error, answers = []) {
    return { success: false, error: getAnamnesisError(error, answers) }
  }

  function showError(prefix, error) {
    const detail = error?.message || 'Não foi possível concluir a solicitação.'
    toast.error(prefix ? `${prefix}: ${detail}` : detail)
  }

  function getSubmissionIntent(scope, payload) {
    const signature = payloadSignature(payload)
    const previous = submissionIntents.get(scope)
    if (previous?.signature === signature) return previous

    const intent = { key: createIdempotencyKey(), signature }
    submissionIntents.set(scope, intent)
    return intent
  }

  async function fetchTemplates() {
    isFetchingTemplates.value = true
    try {
      const firstResponse = await apiGetTemplates(1, 100)
      const firstData = unwrap(firstResponse)
      const loaded = [...(firstData.templates || [])]
      const pages = firstData.pagination?.pages || 1

      for (let page = 2; page <= pages; page += 1) {
        const pageData = unwrap(await apiGetTemplates(page, 100))
        loaded.push(...(pageData.templates || []))
      }

      templates.value = loaded
      return { success: true, data: loaded }
    } catch (error) {
      const result = errorResult(error)
      templates.value = []
      showError('Erro ao buscar modelos', result.error)
      return result
    } finally {
      isFetchingTemplates.value = false
    }
  }

  async function createTemplate(payload) {
    isLoading.value = true
    try {
      const template = unwrap(await apiCreateTemplate(payload)).template
      templates.value.push(template)
      return template
    } catch (error) {
      error.anamnesis = getAnamnesisError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function deleteTemplate(templateId) {
    isLoading.value = true
    try {
      await apiDeleteTemplate(templateId)
      templates.value = templates.value.filter((template) => template._id !== templateId)
      return { success: true }
    } catch (error) {
      const result = errorResult(error)
      showError('Erro ao arquivar modelo', result.error)
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function fetchTemplateById(templateId) {
    isLoading.value = true
    try {
      return unwrap(await apiGetTemplateById(templateId)).template
    } catch (error) {
      const result = errorResult(error)
      showError('Erro ao carregar modelo', result.error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  async function updateTemplate(templateId, payload) {
    isLoading.value = true
    try {
      const template = unwrap(await apiUpdateTemplate(templateId, payload)).template
      const index = templates.value.findIndex((item) => item._id === templateId)
      if (index !== -1) templates.value[index] = template
      return template
    } catch (error) {
      error.anamnesis = getAnamnesisError(error)
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function fetchPublicAnamnesis(token) {
    isLoading.value = true
    try {
      publicTemplate.value = unwrap(await apiGetPublic(token))
      return { success: true, data: publicTemplate.value }
    } catch (error) {
      publicTemplate.value = null
      return errorResult(error)
    } finally {
      isLoading.value = false
    }
  }

  async function submitPublicAnamnesis(token, payload) {
    isLoading.value = true
    const scope = `public:${token}`
    const intent = getSubmissionIntent(scope, payload)
    try {
      const data = unwrap(await apiSubmitPublic(token, payload, intent.key))
      submissionIntents.delete(scope)
      return { success: true, data }
    } catch (error) {
      return errorResult(error, payload.answers)
    } finally {
      isLoading.value = false
    }
  }

  async function assignAnamnesis(patientId, payload) {
    isLoading.value = true
    try {
      const data = unwrap(await apiAssignAnamnesis(patientId, payload))
      if (data.response) patientAnamneses.value.unshift(normalizeResponse(data.response))
      return { success: true, data }
    } catch (error) {
      return errorResult(error)
    } finally {
      isLoading.value = false
    }
  }

  async function assignAnamnesisToPatient(patientId, templateId) {
    return assignAnamnesis(patientId, {
      templateId,
      mode: 'PATIENT',
      tokenTtlDays: 7,
      sendNotification: true,
    })
  }

  async function fetchAnamnesisForPatient(patientId) {
    isLoading.value = true
    patientAnamneses.value = []
    try {
      const firstData = unwrap(await apiGetForPatient(patientId, 1, 100, 'ALL'))
      const loaded = [...(firstData.responses || [])]
      const pages = firstData.pagination?.pages || 1

      for (let page = 2; page <= pages; page += 1) {
        const pageData = unwrap(await apiGetForPatient(patientId, page, 100, 'ALL'))
        loaded.push(...(pageData.responses || []))
      }

      patientAnamneses.value = loaded.map(normalizeResponse)
      return { success: true, data: patientAnamneses.value }
    } catch (error) {
      const result = errorResult(error)
      showError('Erro ao buscar anamneses do paciente', result.error)
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function fetchAnamnesisResponse(patientId, responseId) {
    isLoading.value = true
    try {
      const response = normalizeResponse(unwrap(await apiGetResponse(patientId, responseId)).response)
      const index = patientAnamneses.value.findIndex((item) => item._id === responseId)
      if (index !== -1) patientAnamneses.value[index] = response
      return { success: true, data: response }
    } catch (error) {
      const result = errorResult(error)
      showError('Erro ao carregar a anamnese', result.error)
      return result
    } finally {
      isLoading.value = false
    }
  }

  async function updateAnamnesisResponse(patientId, responseId, payload) {
    isLoading.value = true
    const scope = `professional:${patientId}:${responseId}`
    const intent = getSubmissionIntent(scope, payload)
    try {
      const data = unwrap(await apiUpdateResponse(patientId, responseId, payload, intent.key))
      submissionIntents.delete(scope)
      const index = patientAnamneses.value.findIndex((item) => item._id === responseId)
      if (index !== -1) {
        patientAnamneses.value[index] = normalizeResponse({
          ...patientAnamneses.value[index],
          status: data.status,
          statusCode: data.status,
          answeredAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      }
      return { success: true, data: { ...data, _id: data.responseId } }
    } catch (error) {
      return errorResult(error, payload.answers)
    } finally {
      isLoading.value = false
    }
  }

  async function fetchResponsePage(target, page, limit, status, search = '') {
    isLoading.value = true
    try {
      const data = unwrap(await apiGetResponses(page, limit, status, search))
      const responses = (data.responses || []).map(normalizeResponse)
      target.list.value = responses
      target.total.value = data.pagination?.total || 0
      target.page.value = data.pagination?.page || page
      target.pages.value = data.pagination?.pages || 1
      target.limit.value = data.pagination?.limit || limit
      return { success: true, data: responses }
    } catch (error) {
      const result = errorResult(error)
      target.list.value = []
      showError('Erro ao buscar anamneses', result.error)
      return result
    } finally {
      isLoading.value = false
    }
  }

  function fetchPendingAnamneses(page = 1, limit = 20) {
    return fetchResponsePage(
      {
        list: pendingAnamnesesList,
        total: pendingTotal,
        page: pendingPage,
        pages: pendingPages,
        limit: pendingLimit,
      },
      page,
      limit,
      'PENDING',
    )
  }

  function fetchAllAnamneses(page = 1, limit = 20, status = 'Todos', search = '') {
    return fetchResponsePage(
      {
        list: allAnamnesesList,
        total: allTotal,
        page: allPage,
        pages: allPages,
        limit: allLimit,
      },
      page,
      limit,
      STATUS_TO_API[status] || status || 'ACTIVE',
      search.trim().slice(0, 64),
    )
  }

  async function rotatePublicAccess(patientId, responseId, payload = {}) {
    isLoading.value = true
    try {
      const data = unwrap(
        await apiRotatePublicAccess(patientId, responseId, {
          tokenTtlDays: payload.tokenTtlDays ?? 7,
          sendNotification: payload.sendNotification ?? false,
        }),
      )
      return { success: true, data: data.publicAccess }
    } catch (error) {
      return errorResult(error)
    } finally {
      isLoading.value = false
    }
  }

  async function revokePublicAccess(patientId, responseId) {
    isLoading.value = true
    try {
      await apiRevokePublicAccess(patientId, responseId)
      return { success: true }
    } catch (error) {
      return errorResult(error)
    } finally {
      isLoading.value = false
    }
  }

  async function downloadPdf(patientId, responseId, templateName = 'anamnese') {
    isLoading.value = true
    try {
      const response = await apiDownloadPdf(patientId, responseId)
      const blob = new Blob([response.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${templateName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      return { success: true }
    } catch (error) {
      const normalized = await getAnamnesisBlobError(error)
      showError('Erro ao baixar PDF', normalized)
      return { success: false, error: normalized }
    } finally {
      isLoading.value = false
    }
  }

  const answeredAnamneses = computed(() =>
    patientAnamneses.value.filter((item) => item.statusCode === 'COMPLETED'),
  )
  const pendingAnamneses = computed(() =>
    patientAnamneses.value.filter((item) => item.statusCode === 'PENDING'),
  )
  const expiredAnamneses = computed(() =>
    patientAnamneses.value.filter((item) => item.statusCode === 'EXPIRED'),
  )

  return {
    templates,
    publicTemplate,
    patientAnamneses,
    isLoading,
    isFetchingTemplates,
    answeredAnamneses,
    pendingAnamneses,
    expiredAnamneses,
    pendingAnamnesesList,
    pendingTotal,
    pendingPage,
    pendingPages,
    pendingLimit,
    allAnamnesesList,
    allTotal,
    allPage,
    allPages,
    allLimit,
    fetchTemplates,
    createTemplate,
    deleteTemplate,
    fetchTemplateById,
    updateTemplate,
    fetchPublicAnamnesis,
    submitPublicAnamnesis,
    assignAnamnesisToPatient,
    assignAnamnesis,
    fetchAnamnesisForPatient,
    fetchAnamnesisResponse,
    updateAnamnesisResponse,
    fetchPendingAnamneses,
    fetchAllAnamneses,
    rotatePublicAccess,
    revokePublicAccess,
    downloadPdf,
  }
})
