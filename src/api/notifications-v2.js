import apiClient from './index'

export const registerFcmToken = (token) => {
    return apiClient.post('/v2/notifications/token', { token })
}

export const unregisterFcmToken = (token) => {
    return apiClient.post('/v2/notifications/token/remove', { token })
}

export const markNotificationsAsRead = () => {
    return apiClient.post('/v2/notifications/read')
}
