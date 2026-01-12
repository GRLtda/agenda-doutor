import apiClient from './index'

/**
 * Faz upload de uma imagem para a clínica.
 * Rota: POST /api/uploads/image
 * @param {FormData} formData - O FormData contendo o arquivo de imagem com a chave 'image'.
 */
export const uploadImage = (formData) => {
  return apiClient.post('/uploads/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
