import apiClient from './index'

export const getStorageSummary = () => apiClient.get('/storage/summary')
export const getStorageDetails = () => apiClient.get('/storage/details')

export function storageUploadError(error) {
  const data = error?.response?.data
  if (data?.code !== 'STORAGE_QUOTA_EXCEEDED') return null
  const mb = (bytes) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(bytes / 1024 ** 2)
  return `Espaço insuficiente: ${mb(data.availableBytes || 0)} MB disponíveis; o arquivo precisa de ${mb(data.fileBytes || 0)} MB.`
}
