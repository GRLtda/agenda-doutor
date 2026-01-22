<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { 
  User, Mail, Briefcase, Building2, MapPin, 
  Calendar, Pencil, Check, X, ShieldCheck, Monitor
} from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import AppTabs from '@/components/global/AppTabs.vue'
import ActiveSessionsView from './profile/ActiveSessionsView.vue'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()
const toast = useToast()
const isLoading = ref(false)
const isSaving = ref(false)
const isEditing = ref(false)

// Tab state: 'personal' | 'clinic'
const activeTab = ref('personal')

const user = computed(() => authStore.user)
const clinic = computed(() => authStore.user?.clinic)

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
          <div class="avatar-container">
            <div class="avatar">
              {{ getInitials(user?.name) }}
            </div>
            <div class="online-status"></div>
          </div>
          
          <div class="user-info">
            <h1 class="user-name">{{ user?.name || 'Usuário' }}</h1>
            <p class="user-email">{{ user?.email || 'email@exemplo.com' }}</p>
            <div class="user-badges">
              <span class="badge role-badge">
                {{ roleLabels[user?.role] || 'Membro' }}
              </span>
            </div>
          </div>
        </div>
      </header>

      <!-- Tabs Navigation -->
      <nav class="tabs-container">
        <AppTabs 
          :model-value="activeTab" 
          @update:model-value="activeTab = $event"
          :items="[
            { value: 'personal', label: 'Informações Pessoais', icon: User },
            { value: 'clinic', label: 'Dados da Clínica', icon: Building2 }
          ]"
        />
      </nav>


      <!-- Tab Content Area -->
      <main class="tab-content">
        
        <!-- Personal Info Tab -->
        <transition name="fade" mode="out-in">
          <div v-if="activeTab === 'personal'" class="cards-grid">
            <!-- Coluna da Esquerda: Dados do Perfil -->
            <div class="content-card">
              <div class="card-header">
                <div class="header-text">
                  <h2>Dados do Perfil</h2>
                <p>Gerencie suas informações de acesso e identificação</p>
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

            <div class="fields-grid">
              <div class="field-group">
                <label>Nome Completo</label>
                <div v-if="!isEditing" class="read-only-field">
                  <User :size="18" class="field-icon" />
                  <span>{{ user?.name || 'Não informado' }}</span>
                </div>
                <FormInput 
                  v-else 
                  v-model="formData.name" 
                  placeholder="Seu nome completo"
                />
              </div>

              <div class="field-group">
                <label>Email de Acesso</label>
                <div v-if="!isEditing" class="read-only-field">
                  <Mail :size="18" class="field-icon" />
                  <span>{{ user?.email || 'Não informado' }}</span>
                </div>
                <FormInput 
                  v-else 
                  v-model="formData.email" 
                  placeholder="Seu email"
                  type="email"
                />
              </div>

              <div class="field-group">
                <label>Função no Sistema</label>
                <div class="read-only-field disabled">
                  <Briefcase :size="18" class="field-icon" />
                  <span>{{ roleLabels[user?.role] || 'Não informado' }}</span>
                </div>
              </div>

              <div class="field-group">
                <label>Membro Desde</label>
                <div class="read-only-field disabled">
                  <Calendar :size="18" class="field-icon" />
                  <span>{{ formatDate(clinic?.createdAt) }}</span>
                </div>
              </div>
            </div>
            </div>
            
            <!-- Coluna da Direita: Dispositivos -->
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
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
}

.header-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1rem;
}

.avatar-container {
  position: relative;
}

.avatar {
  width: 96px;
  height: 96px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 700;
  color: white;
  border: 4px solid white;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}

.online-status {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 16px;
  height: 16px;
  background: #22c55e;
  border: 3px solid white;
  border-radius: 50%;
}

.user-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #0f172a; /* Slate 900 */
  margin: 0;
}

.user-email {
  color: #64748b; /* Slate 500 */
  font-size: 0.95rem;
  margin: 0.25rem 0 0.75rem 0;
}

.badge {
  display: inline-flex;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.role-badge {
  background: #eff6ff;
  color: #3b82f6;
  border: 1px solid #dbeafe;
}

/* Tabs Navigation */
.tabs-container {
  display: flex;
  justify-content: center; /* Center the tabs container */
}


/* Content Area */
.cards-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  animation: slideIn 0.3s ease-out;
}

.content-card {
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #e2e8f0;
  animation: slideIn 0.3s ease-out;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 1.5rem;
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
  padding: 0.5rem 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  background: white;
  font-weight: 600; /* Updated from 500 */
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  color: #0f172a; /* Updated from #475569 */
}

.action-btn:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.save-btn {
  background: #22c55e;
  border-color: #22c55e;
  color: white;
}

.save-btn:hover {
  background: #16a34a;
  border-color: #16a34a;
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

  .cards-grid {
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
