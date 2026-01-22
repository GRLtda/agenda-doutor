<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  Monitor, Smartphone, Globe, Clock, Shield, AlertTriangle 
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()
const toast = useToast()
const isLoading = ref(false)

const devices = computed(() => {
  // O backend retorna connectedDevices no objeto user
  // Vamos garantir que seja um array e ordenar pelo login mais recente
  const list = authStore.user?.connectedDevices || []
  return [...list].sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
})

const currentDeviceIp = ref('') // Idealmente, o backend poderia retornar qual é o IP atual na resposta do /me, 
                                // ou o frontend infere se tiver essa info. 
                                // Por simplicidade, vamos destacar o primeiro da lista se o backend ordenar, 
                                // ou apenas listar todos.

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
  const ua = userAgent.toLowerCase()
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return Smartphone
  }
  return Monitor
}

const getBrowserName = (userAgent) => {
  const ua = userAgent.toLowerCase()
  if (ua.includes('chrome')) return 'Google Chrome'
  if (ua.includes('firefox')) return 'Firefox'
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari'
  if (ua.includes('edge')) return 'Microsoft Edge'
  return 'Navegador Desconhecido'
}

const getOSName = (userAgent) => {
  const ua = userAgent.toLowerCase()
  if (ua.includes('windows')) return 'Windows'
  if (ua.includes('mac')) return 'macOS'
  if (ua.includes('linux')) return 'Linux'
  if (ua.includes('android')) return 'Android'
  if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) return 'iOS'
  return 'Sistema Desconhecido'
}

const refreshDevices = async () => {
  isLoading.value = true
  try {
    await authStore.fetchUser()
  } catch (error) {
    console.error('Erro ao buscar dispositivos:', error)
    toast.error('Erro ao atualizar lista de dispositivos')
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  refreshDevices()
})
</script>

<template>
  <div class="content-card">
    <div class="card-header">
      <div class="header-text">
        <h2>Dispositivos Conectados</h2>
        <p>Gerencie as sessões ativas na sua conta</p>
      </div>
    </div>

    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else-if="devices.length > 0" class="devices-list">
      <div v-for="(device, index) in devices" :key="index" class="device-item">
        <div class="device-icon-wrapper">
          <component :is="getDeviceIcon(device.userAgent)" :size="24" />
        </div>
        
        <div class="device-info">
          <div class="device-name">
            {{ getBrowserName(device.userAgent) }} no {{ getOSName(device.userAgent) }}
            <span v-if="index === 0" class="current-badge">Atual</span>
          </div>
          <div class="device-meta">
            <div class="meta-item">
              <Globe :size="14" />
              <span>{{ device.ip }}</span>
            </div>
            <div class="meta-item">
              <Clock :size="14" />
              <span>{{ formatDate(device.lastLogin) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty-state">
      <AlertTriangle :size="32" />
      <p>Nenhuma informação de dispositivo encontrada.</p>
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
  /* max-width removed to fit container */
  height: fit-content;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f1f5f9;
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

.devices-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1rem;
  max-height: 300px;
  overflow-y: auto;
  padding-right: 0.5rem; /* Space for scrollbar */
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
}

.device-info {
  flex: 1;
}

.device-name {
  font-weight: 600;
  color: #0f172a;
  margin-bottom: 0.25rem;
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
  gap: 1rem;
  font-size: 0.8rem;
  color: #64748b;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
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
  .device-meta {
    flex-direction: column;
    gap: 0.25rem;
  }
}
</style>
