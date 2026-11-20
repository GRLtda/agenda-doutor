import { reactive } from 'vue'
import { useScenario } from './scenario'
export const useAuthStore = () => {
  const scenario = useScenario()
  return scenario.auth || reactive({ hasPassword: true, connectedIdentities: [], fetchUser: async () => {}, loginWithTokens: async () => ({ success: true }) })
}
