import apiClient from './index'

/**
 * Faz upload de uma imagem genérica para a clínica.
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

/**
 * Faz upload do logo da clínica (atualiza direto na clínica).
 * Rota: POST /api/clinics/logo
 * @param {FormData} formData - O FormData contendo o arquivo de imagem com a chave 'image'.
 */
export const uploadClinicLogo = (formData) => {
  return apiClient.post('/clinics/logo', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
