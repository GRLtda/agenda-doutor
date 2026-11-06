import api from '@/api'

const patientPath = (patientId) => `/gallery/patient/${patientId}`
export const galleryError = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error?.message ||
  error?.message ||
  'Não foi possível concluir a operação.'
export const listGalleryFiles = (patientId, params = {}, signal) =>
  api.get(`${patientPath(patientId)}/files`, { params, signal }).then((response) => response.data)
export const listGalleryFolders = (patientId) =>
  api.get(`${patientPath(patientId)}/custom-folders`).then((response) => response.data.folders)
export const listAppointmentFolders = (patientId) =>
  api
    .get(`${patientPath(patientId)}/folders`)
    .then((response) => response.data.filter((folder) => folder.folderId !== 'all'))
export const listGalleryTags = (patientId) =>
  api.get(`${patientPath(patientId)}/tags`).then((response) => response.data.tags)
export const createGalleryFolder = (patientId, name) =>
  api
    .post(`${patientPath(patientId)}/custom-folders`, { name })
    .then((response) => response.data.folder)
export const renameGalleryFolder = (patientId, folderId, name) =>
  api.patch(`${patientPath(patientId)}/custom-folders/${folderId}`, { name })
export const deleteGalleryFolder = (patientId, folderId) =>
  api.delete(`${patientPath(patientId)}/custom-folders/${folderId}`)
export const moveGalleryFiles = (patientId, uploadIds, folderId) =>
  api.patch(`${patientPath(patientId)}/files/folder`, { uploadIds, folderId: folderId || null })
export const getGalleryItem = (uploadId) =>
  api.get(`/gallery/item/${uploadId}`).then((response) => response.data)
export const deleteGalleryFile = (uploadId) => api.delete(`/uploads/${uploadId}`)

export function galleryDateRange(from, to) {
  const params = {}
  if (from) params.from = new Date(`${from}T00:00:00`).toISOString()
  if (to) {
    const end = new Date(`${to}T00:00:00`)
    end.setDate(end.getDate() + 1)
    params.to = end.toISOString()
  }
  return params
}

export function uploadPatientPhoto(patientId, photo, folderId, onUploadProgress) {
  const body = new FormData()
  body.append('image', photo.file)
  body.append('patientId', patientId)
  body.append('category', 'imagens')
  body.append('description', photo.description || '')
  body.append('tags', JSON.stringify(photo.tags || []))
  if (folderId) body.append('galleryFolder', folderId)
  return api.post('/uploads/image', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  })
}
