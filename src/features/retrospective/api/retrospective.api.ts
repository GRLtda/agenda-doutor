import apiClient from '@/api/index'
import type { Retrospective } from '../types'

export const fetchCurrentRetrospective = async (): Promise<Retrospective | null> => {
  try {
    const { data } = await apiClient.get('/retrospectives/current')
    return data as Retrospective
  } catch (error: any) {
    // 404 = nenhuma retrospectiva publicada para a clínica. Não é erro para o usuário.
    if (error?.response?.status === 404) return null
    throw error
  }
}

export const postRetrospectiveView = (id: string, viewId: string) =>
  apiClient.post(`/retrospectives/${id}/view`, { viewId })

export const postRetrospectiveShare = (id: string, storyKey: string) =>
  apiClient.post(`/retrospectives/${id}/share`, { storyKey })

/**
 * Logo da clínica como data URL, baixado pela API (o CloudFront não envia CORS e o canvas do cartão PNG
 * não pode ler a URL assinada). Só é chamado ao gerar o cartão. null se não houver logo ou falhar.
 */
export const fetchRetrospectiveLogoDataUrl = async (): Promise<string | null> => {
  try {
    const { data } = await apiClient.get('/retrospectives/current/logo', { responseType: 'blob' })
    if (!(data instanceof Blob) || !data.size) return null
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(data)
    })
  } catch (error: any) {
    // Sem logo o cartão usa a inicial (404 = clínica sem logo, ou API sem esta rota: reinicie a api-clinic).
    console.warn('[Retrospectiva] Logo da clínica indisponível para o cartão', error?.response?.status ?? error)
    return null
  }
}
