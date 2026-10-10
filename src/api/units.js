import apiClient from './index'

export const listUnits = () => apiClient.get('/v2/units')
export const saveUnit = (id, data) => id
  ? apiClient.put(`/v2/units/${id}`, data)
  : apiClient.post('/v2/units', data)
export const formatUnitAddress = (address = {}) => [
  [address.street, address.number].filter(Boolean).join(', '),
  address.complement, address.district, [address.city, address.state].filter(Boolean).join('/'),
].filter(Boolean).join(' - ')

export const deleteUnit = id => apiClient.delete(`/v2/units/${id}`)
export const getUnit = id => apiClient.get(`/v2/units/${id}`)
