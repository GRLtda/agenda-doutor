// stores/documents.js

import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
    getDocuments as apiGetDocuments,
    getDocument as apiGetDocument,
    createDocument as apiCreateDocument,
    updateDocument as apiUpdateDocument,
    cancelDocument as apiCancelDocument,
    generatePdf as apiGeneratePdf,
    requestSignature as apiRequestSignature,
    submitSignedPdf as apiSubmitSignedPdf,
    getSignature as apiGetSignature,
    downloadDocument as apiDownloadDocument,
    sendDocument as apiSendDocument,
    getHistory as apiGetHistory,
    getVersions as apiGetVersions,
    getDocumentTypes as apiGetDocumentTypes,
    createDocumentType as apiCreateDocumentType,
} from '@/api/documents'

export const useDocumentsStore = defineStore('documents', () => {
    // State
    const documents = ref([])
    const selectedDocument = ref(null)
    const documentTypes = ref([])
    const isLoading = ref(false)
    const error = ref(null)
    const pagination = ref({
        total: 0,
        page: 1,
        pages: 1,
        limit: 20,
    })

    // ==================== DOCUMENT TYPES ====================

    async function fetchDocumentTypes(includeInactive = false) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiGetDocumentTypes(includeInactive)
            documentTypes.value = data
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao carregar tipos de documento'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function createDocumentType(typeData) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiCreateDocumentType(typeData)
            documentTypes.value.push(data)
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao criar tipo de documento'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // ==================== DOCUMENT CRUD ====================

    async function fetchDocuments(params = {}) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiGetDocuments(params)
            documents.value = data.documents
            pagination.value = data.pagination
            return { success: true, data: data.documents }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao carregar documentos'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function fetchDocument(id) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiGetDocument(id)
            selectedDocument.value = data
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao carregar documento'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function createDocument(documentData) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiCreateDocument(documentData)
            documents.value.unshift(data)
            selectedDocument.value = data
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao criar documento'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function updateDocument(id, documentData) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiUpdateDocument(id, documentData)

            // Atualiza na lista
            const index = documents.value.findIndex(doc => doc._id === id)
            if (index !== -1) {
                documents.value[index] = data
            }

            // Atualiza o selecionado
            if (selectedDocument.value?._id === id) {
                selectedDocument.value = data
            }

            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao atualizar documento'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function cancelDocument(id, reason) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiCancelDocument(id, reason)

            // Atualiza na lista
            const index = documents.value.findIndex(doc => doc._id === id)
            if (index !== -1) {
                documents.value[index] = data.document
            }

            // Atualiza o selecionado
            if (selectedDocument.value?._id === id) {
                selectedDocument.value = data.document
            }

            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao cancelar documento'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // ==================== PDF ====================

    async function generatePdf(id) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiGeneratePdf(id)
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao gerar PDF'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // ==================== DIGITAL SIGNATURE ====================

    async function requestSignature(id, signatureAppearance = 'invisible') {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiRequestSignature(id, signatureAppearance)

            // Atualiza status do documento selecionado
            if (selectedDocument.value?._id === id) {
                selectedDocument.value.status = 'awaiting_signature'
            }

            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao solicitar assinatura'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function submitSignedPdf(id, signedData) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiSubmitSignedPdf(id, signedData)

            // Atualiza status do documento
            if (selectedDocument.value?._id === id) {
                selectedDocument.value.status = 'signed'
                selectedDocument.value.signedPdfUrl = data.signedPdfUrl
            }

            // Atualiza na lista
            const index = documents.value.findIndex(doc => doc._id === id)
            if (index !== -1) {
                documents.value[index].status = 'signed'
                documents.value[index].signedPdfUrl = data.signedPdfUrl
            }

            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao enviar documento assinado'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function getSignatureInfo(id) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiGetSignature(id)
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao obter informações da assinatura'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // ==================== DOWNLOAD & SEND ====================

    async function downloadDocument(id) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiDownloadDocument(id)
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao baixar documento'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function sendDocument(id, sendData) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiSendDocument(id, sendData)
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao enviar documento'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // ==================== HISTORY & VERSIONS ====================

    async function fetchHistory(id) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiGetHistory(id)
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao carregar histórico'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function fetchVersions(id) {
        try {
            isLoading.value = true
            error.value = null
            const { data } = await apiGetVersions(id)
            return { success: true, data }
        } catch (err) {
            error.value = err.response?.data?.message || 'Erro ao carregar versões'
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    // ==================== HELPERS ====================

    function clearSelectedDocument() {
        selectedDocument.value = null
    }

    function clearError() {
        error.value = null
    }

    return {
        // State
        documents,
        selectedDocument,
        documentTypes,
        isLoading,
        error,
        pagination,

        // Document Types
        fetchDocumentTypes,
        createDocumentType,

        // CRUD
        fetchDocuments,
        fetchDocument,
        createDocument,
        updateDocument,
        cancelDocument,

        // PDF
        generatePdf,

        // Signature
        requestSignature,
        submitSignedPdf,
        getSignatureInfo,

        // Download & Send
        downloadDocument,
        sendDocument,

        // History & Versions
        fetchHistory,
        fetchVersions,

        // Helpers
        clearSelectedDocument,
        clearError,
    }
})
