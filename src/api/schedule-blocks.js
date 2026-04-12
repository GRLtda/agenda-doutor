import apiClient from './index'

export const getScheduleBlocks = ({ startDate, endDate, doctor } = {}) => {
  return apiClient.get('/schedule-blocks', {
    params: { startDate, endDate, doctor },
  })
}

export const createScheduleBlock = (payload) => {
  return apiClient.post('/schedule-blocks', payload)
}

export const updateScheduleBlock = (id, payload) => {
  return apiClient.put(`/schedule-blocks/${id}`, payload)
}

export const deleteScheduleBlock = (id) => {
  return apiClient.delete(`/schedule-blocks/${id}`)
}
