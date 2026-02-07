<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  Monitor, Smartphone, Globe, Clock, Shield, AlertTriangle, LogOut, XCircle 
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const toast = useToast()
const router = useRouter()

const isLoading = ref(false)
const sessions = ref([])

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

const getDeviceIcon = (userAgent) => {
  if (!userAgent) return Monitor
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return Smartphone
  }
  return Monitor
}

const getBrowserName = (userAgent) => {
  if (!userAgent) return 'Dispositivo Desconhecido'
  const ua = userAgent.toLowerCase()
  if (ua.includes('chrome')) return 'Google Chrome'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
  if (ua.includes('edge')) return 'Microsoft Edge'
  return 'Navegador'
}

const getOSName = (userAgent) => {
  if (!userAgent) return ''
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('mac')) return 'macOS'
  if (ua.includes('linux')) return 'Linux'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
  return ''
}

const fetchSessions = async () => {
  isLoading.value = true
  try {
    const result = await authStore.getSessions()
    if (result.success) {
      sessions.value = result.sessions || []
    } else {
      toast.error(result.error || 'Erro ao carregar sessões')
    }
  } catch (error) {
    console.error('Erro ao buscar sessões:', error)
    toast.error('Erro ao atualizar lista de dispositivos')
  } finally {
    isLoading.value = false
  }
}

const handleRevokeSession = async (sessionId) => {
  if (!confirm('Tem certeza que deseja desconectar este dispositivo?')) return

  try {
    const result = await authStore.revokeSession(sessionId)
    if (result.success) {
      toast.success('Dispositivo desconectado com sucesso')
      await fetchSessions()
    } else {
      toast.error(result.error || 'Erro ao desconectar dispositivo')
    }
  } catch (error) {
    toast.error('Erro ao tentar desconectar')
  }
}

const handleLogoutAll = async () => {
  if (!confirm('Isso irá desconectar sua conta de TODOS os dispositivos, incluindo este. Deseja continuar?')) return

  try {
    const result = await authStore.logoutAll()
    if (result.success) {
      toast.info('Todas as sessões foram encerradas.')
      router.push({ name: 'login' })
    } else {
      toast.error(result.error || 'Erro ao encerrar sessões')
    }
  } catch (error) {
    toast.error('Erro crítico ao tentar sair de todos os dispositivos')
  }
}

onMounted(() => {
  fetchSessions()
})
</script>

<template>
  <div class="content-card">
    <div class="card-header">
      <div class="header-text">
        <h2>Dispositivos Conectados</h2>
        <p>Gerencie as sessões ativas na sua conta</p>
      </div>
      <button @click="handleLogoutAll" class="logout-all-btn" title="Sair de todos os dispositivos">
        <LogOut :size="16" />
        <span>Sair de todos</span>
      </button>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="sessions.length > 0" class="devices-list">
      <div v-for="session in sessions" :key="session.id" class="device-item" :class="{ 'current-device': session.is_current }">
        <div class="device-icon-wrapper">
          <component :is="getDeviceIcon(session.device?.user_agent)" :size="24" />
        </div>
        
        <div class="device-info">
          <div class="device-name">
            {{ getBrowserName(session.device?.user_agent) }} 
            <span v-if="getOSName(session.device?.user_agent)">
              no {{ getOSName(session.device?.user_agent) }}
            </span>
            <span v-if="session.is_current" class="current-badge">Atual</span>
          </div>
          <div class="device-meta">
            <div class="meta-item">
              <Globe :size="14" />
              <span>{{ session.device?.ip || 'IP não disponível' }}</span>
            </div>
            <div class="meta-item">
              <Clock :size="14" />
              <span>Último acesso: {{ formatDate(session.last_used_at || session.created_at) }}</span>
            </div>
          </div>
        </div>

        <button v-if="!session.is_current" @click="handleRevokeSession(session.id)" class="revoke-btn" title="Desconectar este dispositivo">
          <XCircle :size="20" />
        </button>
      </div>
    </div>

    <div v-else class="empty-state">
      <AlertTriangle :size="32" />
      <p>Nenhuma sessão ativa encontrada.</p>
    </div>
  </div>
</template>

<style scoped>
.content-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #f1f5f9;
  height: fit-content;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 1rem;
}

.header-text h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
}

.header-text p {
  color: #64748b;
  font-size: 0.875rem;
  margin: 0;
}

.logout-all-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background-color: #fee2e2;
  color: #ef4444;
  border: 1px solid #fecaca;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-all-btn:hover {
  background-color: #fecaca;
  border-color: #fca5a5;
}

.devices-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

/* Custom Scrollbar */
.devices-list::-webkit-scrollbar {
  width: 6px;
}

.devices-list::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 4px;
}

.devices-list::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}

.devices-list::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

.device-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  background: #f8fafc;
  transition: all 0.2s;
}

.device-item:hover {
  border-color: #cbd5e1;
  background: white;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
}

.current-device {
  border-color: #bbf7d0;
  background: #f0fdf4;
}

.device-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  border: 1px solid #e2e8f0;
  flex-shrink: 0;
}

.device-info {
  flex: 1;
  min-width: 0; /* Prevent overflow */
}

.device-name {
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.25rem;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-badge {
  font-size: 0.7rem;
  background: #dcfce7;
  color: #166534;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  font-weight: 700;
  text-transform: uppercase;
}

.device-meta {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
  color: #64748b;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.revoke-btn {
  background: transparent;
  border: none;
  color: #cbd5e1;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.revoke-btn:hover {
  background-color: #fee2e2;
  color: #ef4444;
}

.loading-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 0;
  gap: 1rem;
  color: #94a3b8;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 640px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .logout-all-btn {
    width: 100%;
    justify-content: center;
  }

  .device-meta {
    gap: 0.25rem;
  }
}
</style>
