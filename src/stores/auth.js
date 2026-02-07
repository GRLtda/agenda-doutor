import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as Sentry from '@sentry/vue'
import {
  register as apiRegister,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
} from '@/api/auth'
import {
  loginV2,
  refreshV2,
  logoutV2,
  logoutAllV2,
  getSessionsV2,
  getMeV2,
  revokeSessionV2,
  uploadProfilePhotoV2,
  deleteProfilePhotoV2,
} from '@/api/auth-v2'
import { createCheckoutSession } from '@/api/subscriptions/subscriptions.service'
import apiClient from '@/api/index'
import { useClinicStore } from './clinic'
// router import removed to avoid circular dependency

// Storage keys
const STORAGE_KEY_TOKENS = 'auth_tokens'
const STORAGE_KEY_USER = 'user'
const LEGACY_TOKEN_KEY = 'token' // V1 legacy

export const useAuthStore = defineStore('auth', () => {
  // --- Estado V2 ---
  const user = ref(null)
  const accessToken = ref(null)
  const refreshToken = ref(null)
  const expiresAt = ref(0)

  // Flag para evitar múltiplos refreshs simultâneos
  let refreshPromise = null

  // Inicialização: carrega tokens do localStorage
  _loadStoredTokens()
  _loadStoredUser()

  // --- Computed ---
  const isAuthenticated = computed(() => !!accessToken.value)
  const hasClinic = computed(() => !!user.value?.clinic)

  // Mantemos `token` como alias para compatibilidade com código existente
  const token = computed(() => accessToken.value)

  // --- Funções Privadas ---

  function _loadStoredTokens() {
    // Migração: limpa tokens V1 legados
    if (localStorage.getItem(LEGACY_TOKEN_KEY)) {
      console.log('[Auth V2] Detectado token V1 legado, removendo...')
      localStorage.removeItem(LEGACY_TOKEN_KEY)
      localStorage.removeItem(STORAGE_KEY_USER)
      return
    }

    // Carrega tokens V2
    const stored = localStorage.getItem(STORAGE_KEY_TOKENS)
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        accessToken.value = parsed.access_token || null
        refreshToken.value = parsed.refresh_token || null
        expiresAt.value = parsed.expires_at || 0

        // Configura header de autorização se tiver token válido
        if (accessToken.value) {
          apiClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken.value}`
        }
      } catch (e) {
        console.error('[Auth V2] Erro ao parsear tokens armazenados:', e)
        localStorage.removeItem(STORAGE_KEY_TOKENS)
      }
    }
  }

  function _loadStoredUser() {
    const stored = localStorage.getItem(STORAGE_KEY_USER)
    if (stored) {
      try {
        user.value = JSON.parse(stored)
        if (user.value) {
          Sentry.setUser({
            id: user.value.id,
            email: user.value.email,
            username: user.value.name,
          })
          if (user.value.clinic) {
            const clinicStore = useClinicStore()
            clinicStore.setClinic(user.value.clinic)
          }
        }
      } catch (e) {
        console.error('[Auth V2] Erro ao parsear usuário armazenado:', e)
        localStorage.removeItem(STORAGE_KEY_USER)
      }
    }
  }

  function _saveTokens(tokens) {
    accessToken.value = tokens.access_token
    refreshToken.value = tokens.refresh_token
    expiresAt.value = Date.now() + tokens.expires_in * 1000

    localStorage.setItem(STORAGE_KEY_TOKENS, JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.value,
    }))

    apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokens.access_token}`
  }

  function _clearTokens() {
    accessToken.value = null
    refreshToken.value = null
    expiresAt.value = 0
    localStorage.removeItem(STORAGE_KEY_TOKENS)
    delete apiClient.defaults.headers.common['Authorization']
  }

  function setUser(newUser) {
    user.value = newUser

    if (newUser) {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(newUser))
      Sentry.setUser({
        id: newUser.id,
        email: newUser.email,
        username: newUser.name,
      })
    } else {
      localStorage.removeItem(STORAGE_KEY_USER)
      Sentry.setUser(null)
    }

    if (newUser?.clinic) {
      const clinicStore = useClinicStore()
      clinicStore.setClinic(newUser.clinic)
    }
  }

  // --- Funções Públicas ---

  async function fetchUser() {
    if (!accessToken.value) return null
    try {
      const response = await getMeV2()
      // API V2 retorna { success: true, data: user }
      const userData = response.data.data
      setUser(userData)
      return userData
    } catch (error) {
      if (error.response && error.response.status === 403) {
        return user.value
      } else {
        logout()
        console.error('[Auth V2] Erro ao buscar usuário, token pode ser inválido:', error)

        const { default: router } = await import('@/router')
        router.push({ name: 'login' })
        return null
      }
    }
  }

  /**
   * Login via API V2
   * Retorna access_token + refresh_token
   */
  async function login(credentials) {
    logout() // Limpa estado anterior
    try {
      const response = await loginV2(credentials.email, credentials.password)
      const { data } = response.data // API V2 retorna { success, data: { access_token, ... } }

      _saveTokens(data)

      // Busca dados completos do usuário
      const fullUserData = await fetchUser()

      return { success: true, user: fullUserData }
    } catch (error) {
      console.error('[Auth V2] Erro no login:', error)

      // Tratamento de erros V2
      const errorData = error.response?.data
      let message = 'Erro ao realizar login. Tente novamente.'

      if (errorData?.error?.message) {
        message = errorData.error.message
      } else if (errorData?.message) {
        message = errorData.message
      }

      return {
        success: false,
        error: message,
        code: errorData?.error?.code,
        details: errorData?.error?.details
      }
    }
  }

  /**
   * Renova os tokens usando refresh_token
   * IMPORTANTE: O refresh_token também é renovado (rotação)
   */
  async function refreshTokens() {
    // Se já existe um refresh em andamento, espera ele terminar
    if (refreshPromise) {
      return refreshPromise
    }

    if (!refreshToken.value) {
      throw new Error('No refresh token available')
    }

    refreshPromise = (async () => {
      try {
        const response = await refreshV2(refreshToken.value)
        const { data } = response.data

        _saveTokens(data)
        return true
      } catch (error) {
        console.error('[Auth V2] Falha ao renovar tokens:', error)
        // Sessão expirada, força logout e redireciona
        logout()
        const { default: router } = await import('@/router')
        router.push({ name: 'login' })
        throw error
      } finally {
        refreshPromise = null
      }
    })()

    return refreshPromise
  }

  /**
   * Verifica se o token está próximo de expirar
   * @param {number} thresholdMs - Margem em ms antes da expiração (default: 60s)
   */
  function isTokenExpiringSoon(thresholdMs = 60000) {
    if (!expiresAt.value) return true
    return Date.now() > expiresAt.value - thresholdMs
  }

  /**
   * Registro de novo usuário (ainda usa V1 pois não há V2 para register)
   */
  async function register(userData) {
    logout()
    try {
      const response = await apiRegister(userData)
      const { token: authToken } = response.data

      // Registro ainda usa V1, então salvamos como token simples temporariamente
      // O usuário precisará fazer login após para ter tokens V2
      _saveTokens({
        access_token: authToken,
        refresh_token: null, // V1 não tem refresh
        expires_in: 86400, // 24h default para V1
      })

      const newUser = await fetchUser()
      return { success: true, user: newUser }
    } catch (error) {
      console.error('[Auth V2] Erro no registro:', error)
      const message = error.response?.data?.message || 'Erro ao realizar cadastro.'
      return { success: false, error: message }
    }
  }

  /**
   * Logout da sessão atual
   */
  async function logout() {
    // Tenta invalidar sessão no backend (fire and forget)
    if (refreshToken.value) {
      try {
        await logoutV2(refreshToken.value)
      } catch (e) {
        // Ignora erros de logout - token já pode estar inválido
        console.warn('[Auth V2] Erro ao invalidar sessão no backend:', e)
      }
    }

    // Limpa estado local
    user.value = null
    _clearTokens()
    localStorage.removeItem(STORAGE_KEY_USER)
    Sentry.setUser(null)

    const clinicStore = useClinicStore()
    clinicStore.setClinic(null)

    // Redireciona para login explicitamente
    const { default: router } = await import('@/router')
    router.push({ name: 'login' })
  }

  /**
   * Logout de TODAS as sessões do usuário
   */
  async function logoutAll() {
    try {
      const response = await logoutAllV2()
      const sessionsRevoked = response.data?.data?.sessions_revoked || 0

      // Limpa estado local
      user.value = null
      _clearTokens()
      localStorage.removeItem(STORAGE_KEY_USER)
      Sentry.setUser(null)

      const clinicStore = useClinicStore()
      clinicStore.setClinic(null)

      // Redireciona
      const { default: router } = await import('@/router')
      router.push({ name: 'login' })

      return { success: true, sessionsRevoked }
    } catch (error) {
      console.error('[Auth V2] Erro ao encerrar todas as sessões:', error)
      return { success: false, error: error.response?.data?.error?.message || 'Erro ao encerrar sessões' }
    }
  }

  /**
   * Lista sessões ativas do usuário
   */
  async function getSessions() {
    try {
      const response = await getSessionsV2()
      return { success: true, sessions: response.data?.data?.sessions || [] }
    } catch (error) {
      console.error('[Auth V2] Erro ao buscar sessões:', error)
      return { success: false, error: error.response?.data?.error?.message || 'Erro ao buscar sessões' }
    }
  }

  /**
   * Revoga uma sessão específica
   */
  async function revokeSession(sessionId) {
    try {
      await revokeSessionV2(sessionId)
      return { success: true }
    } catch (error) {
      console.error('[Auth V2] Erro ao revogar sessão:', error)
      return { success: false, error: error.response?.data?.error?.message || 'Erro ao revogar sessão' }
    }
  }

  /**
   * Verifica autenticação ao carregar a aplicação
   */
  async function checkAuth() {
    // Tokens já foram carregados no _loadStoredTokens()
    if (accessToken.value) {
      // Verifica se precisa renovar
      if (isTokenExpiringSoon()) {
        try {
          await refreshTokens()
        } catch (e) {
          // Sessão expirada, usuário precisa fazer login novamente
          return
        }
      }
      await fetchUser()
    }
  }

  // --- Funções de Recuperação de Senha (V1) ---

  async function requestPasswordReset(emailOrPhone) {
    try {
      const response = await apiForgotPassword(emailOrPhone)
      return { success: true, message: response.data.message }
    } catch (error) {
      console.error('[Auth] Erro ao solicitar reset de senha:', error)
      const message = error.response?.data?.message || 'Erro ao solicitar o código.'
      return { success: false, error: message }
    }
  }

  async function performPasswordReset(data) {
    try {
      const response = await apiResetPassword(data)
      const { token: authToken } = response.data

      // Reset ainda usa V1
      _saveTokens({
        access_token: authToken,
        refresh_token: null,
        expires_in: 86400,
      })

      const fullUserData = await fetchUser()
      return { success: true, user: fullUserData }
    } catch (error) {
      console.error('[Auth] Erro ao redefinir senha:', error)
      const message = error.response?.data?.message || 'Código inválido ou expirado.'
      return { success: false, error: message }
    }
  }

  // --- Funções de Assinatura ---

  async function subscribe() {
    try {
      const response = await createCheckoutSession()
      const { url } = response.data
      if (url) {
        window.location.href = url
        return { success: true }
      } else {
        return { success: false, error: 'URL de checkout não retornada.' }
      }
    } catch (error) {
      console.error('[Auth] Erro ao iniciar assinatura:', error)
      return { success: false, error }
    }
  }

  // --- Funções de Perfil ---

  async function updateProfile(data) {
    try {
      const response = await apiClient.put('/auth/me', data)

      const currentUserState = user.value || {}
      const updatedUser = {
        ...currentUserState,
        ...response.data,
        clinic: response.data.clinic || currentUserState.clinic
      }

      setUser(updatedUser)
      return { success: true, user: updatedUser }
    } catch (error) {
      console.error('[Auth] Erro ao atualizar perfil:', error)
      return { success: false, error: error.response?.data?.message || 'Erro ao atualizar.' }
    }
  }

  return {
    // Estado
    user,
    token, // Computed alias para accessToken
    accessToken,
    refreshToken,
    expiresAt,
    isAuthenticated,
    hasClinic,

    // Auth V2
    login,
    logout,
    logoutAll,
    refreshTokens,
    isTokenExpiringSoon,
    getSessions,
    revokeSession,

    // Auth comum
    register,
    checkAuth,
    fetchUser,

    // Password reset
    requestPasswordReset,
    performPasswordReset,

    // Outros
    subscribe,
    updateProfile,

    // Profile Photo
    uploadProfilePhoto: async (file) => {
      try {
        const response = await uploadProfilePhotoV2(file)
        if (response.data.success) {
          // Atualiza o user com a nova URL da foto
          if (user.value) {
            user.value.profilePhotoUrl = response.data.data.photoUrl
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user.value))
          }
          return { success: true, photoUrl: response.data.data.photoUrl }
        }
        return { success: false, error: 'Erro ao fazer upload' }
      } catch (error) {
        console.error('[Auth] Erro no upload da foto:', error)
        return { success: false, error: error.response?.data?.error?.message || 'Erro ao fazer upload' }
      }
    },

    deleteProfilePhoto: async () => {
      try {
        const response = await deleteProfilePhotoV2()
        if (response.data.success) {
          // Remove a URL da foto do user
          if (user.value) {
            user.value.profilePhotoUrl = null
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user.value))
          }
          return { success: true }
        }
        return { success: false, error: 'Erro ao remover foto' }
      } catch (error) {
        console.error('[Auth] Erro ao remover foto:', error)
        return { success: false, error: error.response?.data?.error?.message || 'Erro ao remover foto' }
      }
    },
  }
})
