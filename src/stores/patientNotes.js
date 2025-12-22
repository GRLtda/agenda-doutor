import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
    getNotesByPatient as apiGetNotesByPatient,
    createNote as apiCreateNote,
    updateNote as apiUpdateNote,
    deleteNote as apiDeleteNote
} from '@/api/patientNotes'

export const usePatientNotesStore = defineStore('patientNotes', () => {
    const notes = ref([])
    const isLoading = ref(false)
    const isFetchingMore = ref(false)
    const error = ref(null)
    const pagination = ref({
        page: 1,
        limit: 10,
        totalCount: 0,
        totalPages: 0,
        hasMore: false
    })

    function sortNotes() {
        notes.value.sort((a, b) => {
            if (a.isPinned === b.isPinned) {
                return new Date(b.createdAt) - new Date(a.createdAt)
            }
            return b.isPinned ? 1 : -1
        })
    }

    async function fetchNotes(patientId, page = 1, limit = 10) {
        if (page === 1) {
            isLoading.value = true
        } else {
            isFetchingMore.value = true
        }

        error.value = null
        try {
            const response = await apiGetNotesByPatient(patientId, { page, limit })

            if (page === 1) {
                notes.value = response.data.notes
            } else {
                // Append unique notes only to avoid duplicates
                const existingIds = new Set(notes.value.map(n => n._id))
                const newNotes = response.data.notes.filter(n => !existingIds.has(n._id))
                notes.value.push(...newNotes)
            }

            pagination.value = response.data.pagination
            sortNotes()
            return { success: true }
        } catch (err) {
            error.value = 'Erro ao carregar anotações.'
            console.error('Falha em fetchNotes:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
            isFetchingMore.value = false
        }
    }

    async function fetchMoreNotes(patientId) {
        if (!pagination.value.hasMore || isFetchingMore.value) return
        return await fetchNotes(patientId, pagination.value.page + 1, pagination.value.limit)
    }

    async function createNote(patientId, content) {
        isLoading.value = true
        error.value = null
        try {
            const response = await apiCreateNote(patientId, { content })
            notes.value.unshift(response.data)
            sortNotes()
            return { success: true, data: response.data }
        } catch (err) {
            error.value = 'Erro ao criar anotação.'
            console.error('Falha em createNote:', err)
            return { success: false, error: error.value }
        } finally {
            isLoading.value = false
        }
    }

    async function togglePin(noteId, isPinned) {
        try {
            const response = await apiUpdateNote(noteId, { isPinned: !isPinned })
            const index = notes.value.findIndex(n => n._id === noteId)
            if (index !== -1) {
                notes.value[index] = response.data
                sortNotes()
            }
            return { success: true }
        } catch (err) {
            console.error('Falha em togglePin:', err)
            return { success: false }
        }
    }

    async function updateNoteContent(noteId, content) {
        try {
            const response = await apiUpdateNote(noteId, { content })
            const index = notes.value.findIndex(n => n._id === noteId)
            if (index !== -1) {
                notes.value[index] = response.data
            }
            return { success: true }
        } catch (err) {
            console.error('Falha em updateNoteContent:', err)
            return { success: false }
        }
    }

    async function deleteNote(noteId) {
        try {
            await apiDeleteNote(noteId)
            notes.value = notes.value.filter(n => n._id !== noteId)
            return { success: true }
        } catch (err) {
            console.error('Falha em deleteNote:', err)
            return { success: false }
        }
    }

    return {
        notes,
        isLoading,
        isFetchingMore,
        error,
        pagination,
        fetchNotes,
        fetchMoreNotes,
        createNote,
        togglePin,
        updateNoteContent,
        deleteNote
    }
})
