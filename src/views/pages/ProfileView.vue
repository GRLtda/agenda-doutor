<script setup>
import { ref, computed, onMounted, reactive, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  User, Building2, MapPin, 
  Pencil, Check, X, ShieldCheck, Monitor, Camera, Loader2, Trash2
} from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import AppTabs from '@/components/global/AppTabs.vue'
import ActiveSessionsView from './profile/ActiveSessionsView.vue'
import { useToast } from 'vue-toastification'

const props = defineProps({
  activeTab: {
    type: String,
    default: 'personal',
  },
  hideTabs: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:activeTab'])

const authStore = useAuthStore()
const toast = useToast()
const isLoading = ref(false)
const isSaving = ref(false)
const isEditing = ref(false)

// Photo upload state
const photoInput = ref(null)
const isUploadingPhoto = ref(false)
const showPhotoMenu = ref(false)

// Tab state: 'personal' | 'devices' | 'clinic'
const activeTab = ref(props.activeTab || 'personal')

watch(
  () => props.activeTab,
  (value) => {
    if (value === 'personal' || value === 'devices' || value === 'clinic') {
      activeTab.value = value
    }
  }
)

const setActiveTab = (value) => {
  activeTab.value = value
  emit('update:activeTab', value)
}

const goToDevices = () => {
  setActiveTab('devices')
}

const user = computed(() => authStore.user)
const clinic = computed(() => authStore.user?.clinic)
const userLocation = computed(() => {
  const city = clinic.value?.address?.city
  const state = clinic.value?.address?.state

  if (city && state) return `${city}, ${state}`
  if (city) return city
  if (state) return state
  return 'Localização não informada'
})

const formData = reactive({
  name: '',
  email: ''
})

const roleLabels = {
  owner: 'Proprietário',
  admin: 'Administrador',
  employee: 'Funcionário',
  staff: 'Equipe'
}

const planLabels = {
  basic: 'Básico',
  premium: 'Premium',
  enterprise: 'Enterprise',
  enterprise_plus: 'Enterprise Plus',
  lifetime: 'Vitalício'
}

const getInitials = (name) => {
  if (!name) return 'U'
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name[0].toUpperCase()
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: 'long', 
    year: 'numeric' 
  })
}

const startEditing = () => {
  formData.name = user.value?.name || ''
  formData.email = user.value?.email || ''
  isEditing.value = true
}

const cancelEditing = () => {
  isEditing.value = false
}

const saveProfile = async () => {
  if (!formData.name || !formData.email) {
    toast.error('Nome e email são obrigatórios')
    return
  }

  isSaving.value = true
  const result = await authStore.updateProfile({
    name: formData.name,
    email: formData.email
  })
  isSaving.value = false

  if (result.success) {
    toast.success('Perfil atualizado com sucesso!')
    isEditing.value = false
  } else {
    toast.error(result.error)
  }
}

const refreshUserData = async () => {
  isLoading.value = true
  try {
    await authStore.fetchUser()
  } catch (error) {
    console.error('Erro ao atualizar dados do usuário:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  refreshUserData()
})

// Photo upload handlers
function triggerPhotoUpload() {
  photoInput.value?.click()
}

async function handlePhotoUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    toast.error('Formato inválido. Use JPEG, PNG ou WebP.')
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    toast.error('Imagem muito grande. Máximo 5MB.')
    return
  }

  isUploadingPhoto.value = true
  showPhotoMenu.value = false

  const result = await authStore.uploadProfilePhoto(file)
  
  isUploadingPhoto.value = false
  
  if (result.success) {
    toast.success('Foto atualizada com sucesso!')
  } else {
    toast.error(result.error || 'Erro ao fazer upload')
  }

  if (photoInput.value) photoInput.value.value = ''
}

async function handlePhotoDelete() {
  if (!confirm('Tem certeza que deseja remover sua foto de perfil?')) return

  isUploadingPhoto.value = true
  showPhotoMenu.value = false

  const result = await authStore.deleteProfilePhoto()
  
  isUploadingPhoto.value = false
  
  if (result.success) {
    toast.success('Foto removida com sucesso!')
  } else {
    toast.error(result.error || 'Erro ao remover foto')
  }
}
</script>

<template>
  <div class="page-container">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else class="content-wrapper">
      <!-- Profile Header -->
      <header class="profile-header">
        <div class="header-content">
          <div class="profile-identity">
            <div class="avatar-container" @mouseenter="showPhotoMenu = true" @mouseleave="showPhotoMenu = false">
              <div class="avatar" :class="{ 'has-photo': user?.profilePhotoUrl }">
                <img v-if="user?.profilePhotoUrl" :src="user.profilePhotoUrl" alt="Foto de perfil" class="avatar-image" />
                <span v-else>{{ getInitials(user?.name) }}</span>
                
                <!-- Loading overlay -->
                <div v-if="isUploadingPhoto" class="avatar-loading-overlay">
                  <Loader2 :size="28" class="animate-spin" />
                </div>
                
                <!-- Hover overlay with actions -->
                <Transition name="fade">
                  <div v-if="showPhotoMenu && !isUploadingPhoto" class="avatar-hover-overlay">
                    <button type="button" class="avatar-action-btn" @click="triggerPhotoUpload" title="Alterar foto">
                      <Camera :size="20" />
                    </button>
                    <button v-if="user?.profilePhotoUrl" type="button" class="avatar-action-btn delete" @click="handlePhotoDelete" title="Remover foto">
                      <Trash2 :size="18" />
                    </button>
                  </div>
                </Transition>
              </div>
              <div class="online-status"></div>
              
              <!-- Hidden file input -->
              <input
                ref="photoInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style="display: none;"
                @change="handlePhotoUpload"
              />
            </div>

            <div class="user-info">
              <h1 class="user-name">{{ user?.name || 'Usuário' }}</h1>
              <p class="user-email">{{ user?.email || 'email@exemplo.com' }}</p>
              <p class="user-location">{{ userLocation }}</p>
              <div class="user-badges">
                <span class="badge role-badge">
                  {{ roleLabels[user?.role] || 'Membro' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Tabs Navigation -->
      <nav v-if="!hideTabs" class="tabs-container">
        <AppTabs 
          :model-value="activeTab" 
          @update:model-value="setActiveTab"
          :items="[
            { value: 'personal', label: 'Informações Pessoais', icon: User },
            { value: 'devices', label: 'Dispositivos Conectados', icon: Monitor },
            { value: 'clinic', label: 'Dados da Clínica', icon: Building2 }
          ]"
        />
      </nav>


      <!-- Tab Content Area -->
      <main class="tab-content">
        
        <!-- Personal Info Tab -->
        <transition name="fade" mode="out-in">
          <div v-if="activeTab === 'personal'" class="personal-layout">
            <section class="content-card simple-section">
              <div class="card-header simple-header">
                <div class="header-text">
                  <h2>Informações pessoais</h2>
                  <p>Dados básicos da sua conta</p>
                </div>
                
                <div class="header-actions">
                  <button v-if="!isEditing" @click="startEditing" class="action-btn edit-btn">
                    <Pencil :size="16" />
                    <span>Editar</span>
                  </button>
                  <div v-else class="edit-actions">
                    <button @click="cancelEditing" class="action-btn cancel-btn" title="Cancelar">
                      <X :size="16" />
                    </button>
                    <button @click="saveProfile" class="action-btn save-btn" title="Salvar" :disabled="isSaving">
                      <Check :size="16" />
                      <span>{{ isSaving ? 'Salvando...' : 'Salvar' }}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div class="simple-info-grid">
                <div class="simple-info-item">
                  <span class="simple-label">Nome completo</span>
                  <div v-if="!isEditing" class="simple-value">{{ user?.name || 'Não informado' }}</div>
                  <FormInput 
                    v-else 
                    v-model="formData.name" 
                    placeholder="Seu nome completo"
                  />
                </div>

                <div class="simple-info-item">
                  <span class="simple-label">Email de acesso</span>
                  <div v-if="!isEditing" class="simple-value">{{ user?.email || 'Não informado' }}</div>
                  <FormInput 
                    v-else 
                    v-model="formData.email" 
                    placeholder="Seu email"
                    type="email"
                  />
                </div>

                <div class="simple-info-item">
                  <span class="simple-label">Função no sistema</span>
                  <div class="simple-value">{{ roleLabels[user?.role] || 'Não informado' }}</div>
                </div>

                <div class="simple-info-item">
                  <span class="simple-label">Membro desde</span>
                  <div class="simple-value">{{ formatDate(clinic?.createdAt) }}</div>
                </div>
              </div>
            </section>

            <section class="content-card simple-section security-section">
              <div class="card-header simple-header">
                <div class="header-text">
                  <h2>Segurança</h2>
                  <p>Controle sessões ativas e acessos da sua conta</p>
                </div>
                <button type="button" class="action-btn edit-btn" @click="goToDevices">
                  Gerenciar dispositivos
                </button>
              </div>
            </section>
          </div>

          <div v-else-if="activeTab === 'devices'" class="devices-tab-wrapper">
            <ActiveSessionsView />
          </div>

          <!-- Clinic Info Tab -->
          <div v-else-if="activeTab === 'clinic'" class="content-card">
            <div class="card-header">
              <div class="header-text">
                <h2> {{ clinic?.name || 'Minha Clínica' }}</h2>
                <p>Informações institucionais e plano contratado</p>
              </div>
              <span class="plan-badge" :class="clinic?.plan">
                {{ planLabels[clinic?.plan] || clinic?.plan }}
              </span>
            </div>

            <div v-if="clinic" class="clinic-details">
              <!-- Clinic Branding -->
              <div class="branding-section">
                <div class="clinic-logo-wrapper">
                  <img 
                    v-if="clinic.logoUrl" 
                    :src="clinic.logoUrl" 
                    :alt="clinic.name"
                  />
                  <div v-else class="logo-placeholder">
                    <Building2 :size="32" />
                  </div>
                </div>
                <div class="branding-info">
                  <h3>Identidade Visual</h3>
                  <p>Logo utilizada em documentos e na área do paciente</p>
                </div>
              </div>

              <div class="fields-grid">
                <div class="field-group">
                  <label>CNPJ</label>
                  <div class="read-only-field">
                    <ShieldCheck :size="18" class="field-icon" />
                    <span>{{ clinic.cnpj || 'Não informado' }}</span>
                  </div>
                </div>

                <div class="field-group">
                  <label>Responsável Técnico</label>
                  <div class="read-only-field">
                    <User :size="18" class="field-icon" />
                    <span>{{ clinic.responsibleName || 'Não informado' }}</span>
                  </div>
                </div>

                <div class="field-group">
                  <label>Localização</label>
                  <div class="read-only-field">
                    <MapPin :size="18" class="field-icon" />
                    <span>
                      {{ clinic.address?.city || 'Cidade não informada' }}
                      {{ clinic.address?.state ? ` - ${clinic.address.state}` : '' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div v-else class="empty-state">
              <p>Nenhuma informação de clínica vinculada.</p>
            </div>
          </div>
        </transition>
      </main>
    </div>
  </div>
</template>

<style scoped>

.content-wrapper {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 50vh;
  width: 100%;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Header Styles */
.profile-header {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.profile-identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
  cursor: pointer;
}

.avatar {
  width: 68px;
  height: 68px;
  background: #f1f5f9;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a;
  border: 1px solid #dbe1e8;
  overflow: hidden;
  position: relative;
}

.avatar.has-photo {
  background: transparent;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Avatar overlay styles */
.avatar-loading-overlay,
.avatar-hover-overlay {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.avatar-loading-overlay {
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
}

.avatar-hover-overlay {
  background-color: rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.avatar-action-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background-color: white;
  color: #374151;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.avatar-action-btn:hover {
  background-color: #f3f4f6;
  color: #111827;
}

.avatar-action-btn.delete:hover {
  background-color: #fee2e2;
  color: #dc2626;
}

.user-info {
  min-width: 0;
}

.user-name {
  font-size: 1.15rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.user-email {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0.2rem 0 0;
}

.user-location {
  color: #9ca3af;
  font-size: 0.82rem;
  margin: 0.2rem 0 0.55rem;
}

.badge {
  display: inline-flex;
  padding: 0.2rem 0.65rem;
  border-radius: 9999px;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.role-badge {
  background: #f3f4f6;
  color: #4b5563;
  border: 1px solid #e5e7eb;
}

.online-status {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 11px;
  height: 11px;
  background: #22c55e;
  border: 2px solid white;
  border-radius: 50%;
}

.animate-spin {
  animation: spin 1s linear infinite;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Tabs Navigation */
.tabs-container {
  display: flex;
  justify-content: flex-start;
}


/* Content Area */
.personal-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  animation: slideIn 0.3s ease-out;
}

.simple-section {
  padding: 1.35rem 1.5rem;
}

.simple-header {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
}

.simple-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.2rem 1.8rem;
}

.simple-info-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.simple-label {
  font-size: 0.76rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #9ca3af;
  font-weight: 600;
}

.simple-value {
  color: #111827;
  font-size: 0.95rem;
  line-height: 1.4;
  word-break: break-word;
}

.security-section .simple-header {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.devices-tab-wrapper {
  animation: slideIn 0.3s ease-out;
}

.content-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  animation: slideIn 0.3s ease-out;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #eceff3;
  padding-bottom: 1rem;
}

.header-text h2 {
  font-size: 1.05rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.25rem 0;
}

.header-text p {
  color: #6b7280;
  font-size: 0.84rem;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

/* Action Buttons */
.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.46rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #d1d5db;
  background: white;
  font-weight: 500;
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #374151;
}

.action-btn:hover {
  background: #f9fafb;
  border-color: #c4c9d2;
}

.save-btn {
  background: #16a34a;
  border-color: #16a34a;
  color: white;
}

.save-btn:hover {
  background: #15803d;
  border-color: #15803d;
  color: white;
}

.save-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.cancel-btn {
  color: #ef4444;
  border-color: #fee2e2;
}

.cancel-btn:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

/* Fields Grid */
.fields-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.field-group label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.05em;
}

.read-only-field {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  color: #0f172a;
  font-size: 0.95rem;
}

.read-only-field.disabled {
  background: #f1f5f9;
  color: #64748b;
}

.field-icon {
  color: #94a3b8;
}

/* Clinic Branding Styles */
.branding-section {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding: 1rem;
  background: #f8fafc;
  border-radius: 12px;
  border: 1px dashed #cbd5e1;
}

.clinic-logo-wrapper img {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.logo-placeholder {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  border: 1px solid #e2e8f0;
}

.branding-info h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #0f172a;
  margin: 0 0 0.25rem 0;
}

.branding-info p {
  font-size: 0.875rem;
  color: #64748b;
  margin: 0;
}

.plan-badge {
  padding: 0.35rem 1rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
}

.plan-badge.basic { background: #e0f2fe; color: #0369a1; }
.plan-badge.premium { background: #fef3c7; color: #b45309; }
.plan-badge.enterprise { background: #f3e8ff; color: #7e22ce; }

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Responsive */
@media (max-width: 640px) {
  .page-container {
    padding: 1rem 0.5rem;
  }

  .header-content {
    align-items: flex-start;
  }

  .profile-identity {
    width: 100%;
  }

  .simple-info-grid {
    grid-template-columns: 1fr;
  }
  
  .fields-grid {
    grid-template-columns: 1fr;
  }
  
  .card-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .action-btn {
    width: 100%;
    justify-content: center;
  }
  
  .branding-section {
    flex-direction: column;
    text-align: center;
  }
}
</style>
