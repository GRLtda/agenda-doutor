import api from './index'

export const getNotesByPatient = (patientId, params = {}) => {
    return api.get(`/patients/${patientId}/notes`, { params })
}

export const createNote = (patientId, noteData) => {
    return api.post(`/patients/${patientId}/notes`, noteData)
}

export const updateNote = (noteId, noteData) => {
    return api.patch(`/patients/notes/${noteId}`, noteData)
}

export const deleteNote = (noteId) => {
    return api.delete(`/patients/notes/${noteId}`)
}
