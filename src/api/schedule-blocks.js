import apiClient from './index'

export const getScheduleBlocks = ({ startDate, endDate, doctor } = {}) => {
  return apiClient.get('/schedule-blocks', {
    params: { startDate, endDate, doctor },
  })
}

export const previewScheduleBlockConflicts = (payload) => {
  return apiClient.post('/schedule-blocks/preview-conflicts', payload)
}

export const createScheduleBlock = (payload) => {
  return apiClient.post('/schedule-blocks', payload)
}

export const updateScheduleBlock = (id, payload) => {
  return apiClient.put(`/schedule-blocks/${id}`, payload)
}

export const getScheduleBlockConflicts = (id) => {
  return apiClient.get(`/schedule-blocks/${id}/conflicts`)
}

export const deleteScheduleBlock = (id) => {
  return apiClient.delete(`/schedule-blocks/${id}`)
}
