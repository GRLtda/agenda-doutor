import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createRecord as apiCreateRecord,
  getByAppointmentId as apiGetByAppointmentId,
  updateRecord as apiUpdateRecord,
  uploadImageAttachment as apiUploadImageAttachment,
  removeAttachment as apiRemoveAttachment,
  removeAttachmentsBulk as apiRemoveAttachmentsBulk,
  addProcedureToRecord as apiAddProcedureToRecord,
  removeProcedureFromRecord as apiRemoveProcedureFromRecord,
} from '@/api/records'
import apiClient from '@/api'

export const useRecordsStore = defineStore('records', () => {
  const currentRecord = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  async function createRecord(recordData) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiCreateRecord(recordData)
      currentRecord.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao criar o prontuário.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function fetchRecordByAppointmentId(appointmentId) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiGetByAppointmentId(appointmentId)
      currentRecord.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      if (err.response?.status === 404) {
        currentRecord.value = null
        return { success: true, data: null }
      }
      error.value = err.response?.data?.message || 'Erro ao buscar o prontuário.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function updateRecord(recordId, recordData) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiUpdateRecord(recordId, recordData)
      currentRecord.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao atualizar o prontuário.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  async function uploadAttachmentImage(recordId, file, draftData, options = {}) {
    let currentRecordId = recordId
    if (!currentRecordId) {
      const { success, data: newRecord, error: createError } = await createRecord({
        ...draftData,
        content: '<p>Rascunho inicial.</p>',
      })
      if (!success) {
        return { success: false, error: createError }
      }
      currentRecordId = newRecord._id
    }
    const formData = new FormData()
    formData.append('image', file)

    if (options.wasCompressed) {
      formData.append('wasCompressed', 'true')
    }

    if (options.description) {
      formData.append('description', options.description)
    }

    if (options.tags && options.tags.length > 0) {
      formData.append('tags', JSON.stringify(options.tags))
    }

    try {
      const response = await apiClient.post(`/records/${currentRecordId}/attachments/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      currentRecord.value = response.data.record
      return { success: true, data: response.data }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro no upload do anexo.'
      return { success: false, error: errorMessage }
    }
  }

  // ✨ 2. Action corrigida para usar a função e os argumentos corretos
  async function deleteAttachment(uploadId) {
    if (!currentRecord.value?._id) {
      return { success: false, error: 'Prontuário atual não encontrado.' }
    }
    try {
      // Usa a função correta da API, passando o ID do prontuário e o ID do anexo
      await apiRemoveAttachment(currentRecord.value._id, uploadId)

      currentRecord.value.attachments = currentRecord.value.attachments.filter(
        (attachment) => attachment._id !== uploadId,
      )
      return { success: true }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro ao excluir o anexo.'
      return { success: false, error: errorMessage }
    }
  }

  // Add procedure to record
  async function addProcedureToRecord(procedureData) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiAddProcedureToRecord(procedureData)
      currentRecord.value = response.data
      return { success: true, data: response.data }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao adicionar procedimento.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // Remove procedure from record
  async function removeProcedureFromRecord(recordId, procedureId) {
    isLoading.value = true
    error.value = null
    try {
      const response = await apiRemoveProcedureFromRecord(recordId, procedureId)
      // Atualiza o record atual com a resposta (que deve ser o record atualizado)
      currentRecord.value = response.data
      return { success: true }
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao remover procedimento.'
      return { success: false, error: error.value }
    } finally {
      isLoading.value = false
    }
  }

  // ✨ Bulk delete action (Optimistic UI)
  async function deleteAttachmentsBulk(uploadIds) {
    if (!currentRecord.value?._id) return { success: false, error: 'Prontuário não encontrado.' }
    if (!uploadIds || uploadIds.length === 0) return { success: true }

    // Backup para rollback
    const originalAttachments = [...currentRecord.value.attachments]

    // 1. Otimista: Remove da UI imediatamente
    currentRecord.value.attachments = currentRecord.value.attachments.filter(
      (attachment) => !uploadIds.includes(attachment._id)
    )

    try {
      await apiRemoveAttachmentsBulk(currentRecord.value._id, uploadIds)
      return { success: true }
    } catch (err) {
      // 2. Fallback: Restaura estado original em caso de erro
      currentRecord.value.attachments = originalAttachments
      const errorMessage = err.response?.data?.message || 'Erro ao excluir anexos.'
      return { success: false, error: errorMessage }
    }
  }

  // ✨ Download attachment via Proxy
  async function downloadAttachment(uploadId) {
    if (!currentRecord.value?._id) {
      return { success: false, error: 'Prontuário não encontrado.' }
    }

    try {
      const downloadUrl = `/records/${currentRecord.value._id}/attachments/${uploadId}/download`
      const response = await apiClient.get(downloadUrl, {
        responseType: 'blob',
        timeout: 60000,
      })

      let filename = `imagem-${uploadId}.jpg`
      const contentDisposition = response.headers['content-disposition']
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/)
        if (match && match[1]) filename = match[1]
      } else {
        const attachment = currentRecord.value.attachments.find(a => a._id === uploadId)
        if (attachment?.metadata?.originalName) {
          filename = attachment.metadata.originalName
        }
      }

      return { success: true, blob: response.data, filename }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Erro ao baixar o anexo.'
      return { success: false, error: errorMessage }
    }
  }

  return {
    currentRecord,
    isLoading,
    error,
    createRecord,
    fetchRecordByAppointmentId,
    updateRecord,
    uploadAttachmentImage,
    deleteAttachment,
    deleteAttachmentsBulk,
    addProcedureToRecord,
    removeProcedureFromRecord,
    downloadAttachment,
  }
})
