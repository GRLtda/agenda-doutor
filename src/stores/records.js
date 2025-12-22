import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  createRecord as apiCreateRecord,
  getByAppointmentId as apiGetByAppointmentId,
  updateRecord as apiUpdateRecord,
  uploadImageAttachment as apiUploadImageAttachment,
  removeAttachment as apiRemoveAttachment, // ✨ 1. Importa a função correta do lugar certo
  addProcedureToRecord as apiAddProcedureToRecord, // ✨ Import add procedure
  removeProcedureFromRecord as apiRemoveProcedureFromRecord, // ✨ Import remove procedure
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

  async function uploadAttachmentImage(recordId, file, draftData) {
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

  // ✨ Fetch records by patient
  async function fetchRecordsByPatient(patientId) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get(`/records/patient/${patientId}?limit=100`);
      return { success: true, data: response.data };
    } catch (err) {
      error.value = err.response?.data?.message || 'Erro ao buscar prontuários.';
      return { success: false, error: error.value };
    } finally {
      isLoading.value = false;
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
    addProcedureToRecord, // ✨ Export new function
    removeProcedureFromRecord, // ✨ Export remove function
    fetchRecordsByPatient, // ✨ Export new function
  }
})
