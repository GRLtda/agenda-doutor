import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import * as Sentry from '@sentry/vue'
import {
  register as apiRegister,
  login as apiLogin,
  getMe,
  forgotPassword as apiForgotPassword,
  resetPassword as apiResetPassword,
} from '@/api/auth'
import { createCheckoutSession } from '@/api/subscriptions/subscriptions.service'
import apiClient from '@/api/index'
import { useClinicStore } from './clinic'
import router from '@/router'

export const useAuthStore = defineStore('auth', () => {
  const storedUser = localStorage.getItem('user')
  const user = ref(storedUser ? JSON.parse(storedUser) : null)
  const token = ref(localStorage.getItem('token') || null)

  const isAuthenticated = computed(() => !!token.value)
  const hasClinic = computed(() => !!user.value?.clinic)

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('token', newToken)
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
  }

  function setUser(newUser) {
    user.value = newUser
    // Apenas salva no localStorage se o usuário não for nulo
    if (newUser) {
      if (newUser.planDetails) {
        // Ensure nested objects are reactive safe if needed, though JSON.parse/stringify handles it.
      }
      localStorage.setItem('user', JSON.stringify(newUser))
      Sentry.setUser({
        id: newUser.id,
        email: newUser.email,
        username: newUser.name,
      })
    } else {
      localStorage.removeItem('user')
      Sentry.setUser(null)
    }

    if (newUser?.clinic) {
      const clinicStore = useClinicStore()
      clinicStore.setClinic(newUser.clinic)
    }
  }

  async function fetchUser() {
    if (!token.value) return null
    try {
      const response = await getMe()
      setUser(response.data)
      return response.data
    } catch (error) {
      if (error.response && error.response.status === 403) {
        return user.value
      } else {
        logout()
        console.error('Erro ao buscar usuário, token pode ser inválido:', error)
        router.push({ name: 'login' })
        return null
      }
    }
  }

  async function login(credentials) {
    logout()
    try {
      const response = await apiLogin(credentials)
      const { token: authToken } = response.data // 1. Pegamos apenas o token

      setToken(authToken) // 2. Configuramos o token na API

      // 3. Buscamos os dados completos do usuário. A função fetchUser já vai chamar a setUser com os dados corretos.
      const fullUserData = await fetchUser()

      return { success: true, user: fullUserData }
    } catch (error) {
      console.error('Erro no login:', error)
      const message = error.response?.data?.message || 'Erro ao realizar login. Tente novamente.'
      return { success: false, error: message }
    }
  }

  async function register(userData) {
    logout()
    try {
      const response = await apiRegister(userData)
      const { token: authToken } = response.data // 1. Pegamos apenas o token

      setToken(authToken) // 2. Configuramos o token

      // 3. Buscamos o usuário recém-criado.
      const newUser = await fetchUser()

      return { success: true, user: newUser }
    } catch (error) {
      console.error('Erro no registro:', error)
      const message = error.response?.data?.message || 'Erro ao realizar cadastro.'
      return { success: false, error: message }
    }
  }

  function logout() {
    // Limpa o estado da store
    user.value = null
    token.value = null

    // Limpa o localStorage
    localStorage.removeItem('user')
    localStorage.removeItem('token')
    Sentry.setUser(null)

    // Limpa o cabeçalho da API e a store da clínica
    delete apiClient.defaults.headers.common['Authorization']
    const clinicStore = useClinicStore()
    clinicStore.setClinic(null)
  }

  async function checkAuth() {
    const storedToken = localStorage.getItem('token')
    if (storedToken) {
      setToken(storedToken)
      await fetchUser() // Usamos await para garantir que os dados sejam carregados
    }
  }

  // --- ✨ NOVAS FUNÇÕES ADICIONADAS ---

  /**
   * Etapa 1: Solicita o código de reset para o backend.
   */
  async function requestPasswordReset(emailOrPhone) {
    try {
      const response = await apiForgotPassword(emailOrPhone)
      // API sempre retorna 200 OK (mesmo se não achar) por segurança
      return { success: true, message: response.data.message }
    } catch (error) {
      // Ex: 429 Too Many Requests
      console.error('Erro ao solicitar reset de senha:', error)
      const message = error.response?.data?.message || 'Erro ao solicitar o código.'
      return { success: false, error: message }
    }
  }

  /**
   * Etapa 2: Envia o código e a nova senha para o backend.
   */
  async function performPasswordReset(data) {
    try {
      const response = await apiResetPassword(data)
      // API retorna 200 OK com token e dados básicos do usuário
      const { token: authToken } = response.data

      setToken(authToken) // 1. Configura o token

      // 2. Busca os dados completos (incluindo clínica) para logar
      const fullUserData = await fetchUser()

      return { success: true, user: fullUserData }
    } catch (error) {
      // Ex: 400 Bad Request (Código inválido/expirado)
      console.error('Erro ao redefinir senha:', error)
      const message = error.response?.data?.message || 'Código inválido ou expirado.'
      return { success: false, error: message }
    }
  }

  /**
   * Inicia o processo de assinatura via Stripe.
   */
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
      console.error('Erro ao iniciar assinatura:', error)
      return { success: false, error }
    }
  }

  /**
   * Atualiza o perfil do usuário
   */
  async function updateProfile(data) {
    try {
      const response = await apiClient.put('/auth/me', data)

      // Merge com o estado atual para preservar a clínica se ela não vier na resposta
      const currentUserState = user.value || {}
      const updatedUser = {
        ...currentUserState,
        ...response.data,
        clinic: response.data.clinic || currentUserState.clinic
      }

      setUser(updatedUser)
      return { success: true, user: updatedUser }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      return { success: false, error: error.response?.data?.message || 'Erro ao atualizar.' }
    }
  }

  return {
    user,
    token,
    isAuthenticated,
    hasClinic,
    register,
    login,
    logout,
    checkAuth,
    fetchUser,
    requestPasswordReset,
    performPasswordReset,
    subscribe,
    updateProfile,
  }
})
