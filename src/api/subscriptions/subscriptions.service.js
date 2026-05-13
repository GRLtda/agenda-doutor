import apiClient from '@/api/index'

export const createCheckoutSession = (payload = {}) => {
    return apiClient.post('/subscriptions/create-checkout-session', payload)
}
