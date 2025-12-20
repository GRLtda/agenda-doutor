<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { User, Mail, Briefcase, Building2, MapPin, Shield, Crown, UserCircle, Calendar, Pencil, Check, X } from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import { useToast } from 'vue-toastification'

const authStore = useAuthStore()
const toast = useToast()
const isLoading = ref(false)
const isSaving = ref(false)
const isEditing = ref(false)

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
  <div class="profile-container">
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
    </div>

    <div v-else class="profile-content">
      <!-- Header Section -->
      <div class="profile-header">
        <div class="avatar-section">
          <div class="avatar-wrapper">
            <div class="avatar">
              {{ getInitials(user?.name) }}
            </div>
          </div>
          <h1 class="user-name">{{ user?.name || 'Usuário' }}</h1>
          <p class="user-email">{{ user?.email || 'email@exemplo.com' }}</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="profile-body">
        <!-- Personal Information Section -->
        <section class="profile-section">
          <div class="section-header">
             <div>
                <h2 class="section-title">Informações Pessoais</h2>
                <p class="section-description">Suas informações básicas de perfil.</p>
             </div>
             <button v-if="!isEditing" @click="startEditing" class="btn-icon" title="Editar Perfil">
                <Pencil :size="18" />
             </button>
             <div v-else class="edit-actions">
                <button @click="cancelEditing" class="btn-icon btn-cancel" title="Cancelar">
                  <X :size="18" />
                </button>
                <button @click="saveProfile" class="btn-icon btn-save" title="Salvar" :disabled="isSaving">
                  <Check :size="18" />
                </button>
             </div>
          </div>

          <div class="info-grid">
            <div class="info-field">
              <label class="field-label">Nome completo</label>
              <div v-if="!isEditing" class="field-value">
                <User :size="18" class="field-icon" />
                <span>{{ user?.name || 'Não informado' }}</span>
              </div>
              <FormInput 
                v-else 
                v-model="formData.name" 
                placeholder="Seu nome completo"
                class="edit-input"
              />
            </div>

            <div class="info-field">
              <label class="field-label">Email</label>
              <div v-if="!isEditing" class="field-value">
                <Mail :size="18" class="field-icon" />
                <span>{{ user?.email || 'Não informado' }}</span>
              </div>
              <FormInput 
                v-else 
                v-model="formData.email" 
                placeholder="Seu email"
                type="email"
                class="edit-input"
              />
            </div>

            <div class="info-field">
              <label class="field-label">Função</label>
              <div class="field-value">
                <Briefcase :size="18" class="field-icon" />
                <span>{{ roleLabels[user?.role] || 'Não informado' }}</span>
              </div>
            </div>

            <div class="info-field">
              <label class="field-label">Membro desde</label>
              <div class="field-value">
                <Calendar :size="18" class="field-icon" />
                <span>{{ formatDate(clinic?.createdAt) }}</span>
              </div>
            </div>
          </div>
        </section>

        <!-- Clinic Information Section -->
        <section v-if="clinic" class="profile-section">
          <h2 class="section-title">Informações da Clínica</h2>
          <p class="section-description">Detalhes da instituição vinculada ao seu perfil.</p>

          <div class="clinic-header">
            <div class="clinic-logo-container">
              <img 
                v-if="clinic.logoUrl" 
                :src="clinic.logoUrl" 
                :alt="clinic.name"
                class="clinic-logo"
              />
              <div v-else class="clinic-logo-placeholder">
                <Building2 :size="28" />
              </div>
            </div>
            <div class="clinic-info">
              <h3 class="clinic-name">{{ clinic.name }}</h3>
              <span class="clinic-plan" :class="`plan-${clinic.plan}`">
                {{ planLabels[clinic.plan] || clinic.plan }}
              </span>
            </div>
          </div>

          <div class="info-grid">
            <div class="info-field">
              <label class="field-label">CNPJ</label>
              <div class="field-value">
                <Building2 :size="18" class="field-icon" />
                <span>{{ clinic.cnpj || 'Não informado' }}</span>
              </div>
            </div>

            <div class="info-field">
              <label class="field-label">Responsável</label>
              <div class="field-value">
                <User :size="18" class="field-icon" />
                <span>{{ clinic.responsibleName || 'Não informado' }}</span>
              </div>
            </div>

            <div v-if="clinic.address?.city" class="info-field">
              <label class="field-label">Localização</label>
              <div class="field-value">
                <MapPin :size="18" class="field-icon" />
                <span>{{ clinic.address.city }}{{ clinic.address.state ? `, ${clinic.address.state}` : '' }}</span>
              </div>
            </div>

            <div class="info-field">
              <label class="field-label">Membros da equipe</label>
              <div class="field-value">
                <UserCircle :size="18" class="field-icon" />
                <span>{{ clinic.staff?.length || 0 }} membro(s)</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: #f9fafb;
  padding: 2rem 0;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.profile-content {
  width: 100%;
}

/* Header Section */
.profile-header {
  background: white;
  border-radius: 12px;
  padding: 3rem 2rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}


.user-name {
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.user-email {
  font-size: 1rem;
  color: #6b7280;
  margin: 0;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

/* Body Section */
.profile-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  align-items: start;
}

.profile-section {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-width: 0; /* Prevents grid blowout */
}

.section-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
}

.section-description {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0 0 2rem 0;
}

/* Clinic Header */
.clinic-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding-bottom: 2rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e5e7eb;
  min-width: 0; /* Allows children to truncate */
}

.clinic-logo-container {
  flex-shrink: 0;
}

.clinic-logo {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.clinic-logo-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 12px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.clinic-info {
  flex: 1;
  min-width: 0; /* Allows truncation */
}

.clinic-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0 0 0.5rem 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.clinic-plan {
  display: inline-block;
  padding: 0.375rem 0.875rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.clinic-plan.plan-basic {
  background: #dbeafe;
  color: #1e40af;
}

.clinic-plan.plan-premium {
  background: #fef3c7;
  color: #92400e;
}

.clinic-plan.plan-enterprise,
.clinic-plan.plan-lifetime {
  background: #fef3c7;
  color: #92400e;
}

/* Info Grid */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0; /* Allows children to truncate */
}

.field-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.field-value {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.9375rem;
  color: #111827;
  transition: all 0.2s ease;
  min-width: 0; /* Allows children to truncate */
}

.field-value span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.field-value:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.field-icon {
  color: #6b7280;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .profile-container {
    padding: 1rem;
  }

  .profile-header {
    padding: 2rem 1.5rem;
  }

  .avatar {
    width: 100px;
    height: 100px;
    font-size: 2.5rem;
  }

  .user-name {
    font-size: 1.5rem;
  }
  
  .profile-body {
    grid-template-columns: 1fr;
  }

  .profile-section {
    padding: 1.5rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .clinic-header {
    flex-direction: column;
    text-align: center;
  }
}

/* Edit Mode Styles */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.section-header .section-description {
  margin-bottom: 0;
}

.edit-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
  padding: 0.5rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-icon:hover {
  background: #f9fafb;
  color: #111827;
  border-color: #d1d5db;
}

.btn-save {
  background: #22c55e;
  color: white;
  border-color: #22c55e;
}

.btn-save:hover {
  background: #16a34a;
  border-color: #16a34a;
  color: white;
}

.btn-save:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-cancel {
  background: white;
  color: #ef4444;
  border-color: #fee2e2;
}

.btn-cancel:hover {
  background: #fef2f2;
  border-color: #ef4444;
}
</style>
