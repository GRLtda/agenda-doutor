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
