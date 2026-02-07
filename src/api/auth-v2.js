/**
 * API Auth V2 - Endpoints de autenticação com Refresh Token
 * 
 * Novo sistema de autenticação:
 * - Access Token: JWT de curta duração (15 min)
 * - Refresh Token: UUID para renovação (7 dias)
 * - Rotação automática de refresh tokens
 */
import apiClient from './index'

/**
 * Login do usuário
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{success: boolean, data: {access_token, refresh_token, expires_in, token_type}}>}
 */
export const loginV2 = (email, password) => {
    return apiClient.post('/v2/auth/login', { email, password })
}

/**
 * Renova os tokens usando o refresh_token
 * IMPORTANTE: O refresh_token também é renovado (rotação)
 * @param {string} refreshToken
 * @returns {Promise<{success: boolean, data: {access_token, refresh_token, expires_in, token_type}}>}
 */
export const refreshV2 = (refreshToken) => {
    return apiClient.post('/v2/auth/refresh', { refresh_token: refreshToken })
}

/**
 * Logout da sessão atual
 * @param {string} refreshToken
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const logoutV2 = (refreshToken) => {
    return apiClient.post('/v2/auth/logout', { refresh_token: refreshToken })
}

/**
 * Logout de TODAS as sessões do usuário
 * Requer autenticação via Bearer token
 * @returns {Promise<{success: boolean, data: {message: string, sessions_revoked: number}}>}
 */
export const logoutAllV2 = () => {
    return apiClient.post('/v2/auth/logout-all')
}

/**
 * Lista todas as sessões ativas do usuário
 * Requer autenticação via Bearer token
 * @returns {Promise<{success: boolean, data: {sessions: Array, count: number}}>}
 */
export const getSessionsV2 = () => {
    return apiClient.get('/v2/auth/sessions')
}

/**
 * Obtém dados do usuário logado (V2)
 * @returns {Promise<{success: boolean, data: UserData}>}
 */
export const getMeV2 = () => {
    return apiClient.get('/v2/auth/me')
}

/**
 * Revoga uma sessão específica pelo ID
 * Requer autenticação via Bearer token
 * @param {string} sessionId
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const revokeSessionV2 = (sessionId) => {
    return apiClient.delete(`/v2/auth/sessions/${sessionId}`)
}

/**
 * Upload de foto de perfil
 * @param {File} file - Arquivo de imagem
 * @returns {Promise<{success: boolean, data: {message: string, photoUrl: string}}>}
 */
export const uploadProfilePhotoV2 = (file) => {
    const formData = new FormData()
    formData.append('photo', file)
    return apiClient.post('/v2/auth/me/photo', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    })
}

/**
 * Remove foto de perfil
 * @returns {Promise<{success: boolean, data: {message: string}}>}
 */
export const deleteProfilePhotoV2 = () => {
    return apiClient.delete('/v2/auth/me/photo')
}
