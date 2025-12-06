import apiClient from './index'

export const verifyInvitationToken = (token) => {
  return apiClient.get(`/auth/verify-invitation/${token}`)
}

// Função para buscar os dados do usuário logado
export const getMe = () => {
  return apiClient.get('/auth/me')
}

// Função para registrar um novo usuário
export const register = (userData) => {
  return apiClient.post('/auth/register', userData)
}

// Função para fazer login
export const login = (credentials) => {
  return apiClient.post('/auth/login', credentials)
}

// Função para solicitar o código de reset via email/telefone
export const forgotPassword = (emailOrPhone) => {
  return apiClient.post('/auth/forgot-password', { emailOrPhone })
}

// Função para redefinir a senha com o código
export const resetPassword = (data) => {
  return apiClient.post('/auth/reset-password', data)
}
