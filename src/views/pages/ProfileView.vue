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
  <div class="profile-page">
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <div class="spinner"></div>
      <p>Carregando informações...</p>
    </div>

    <div v-else>
      <!-- Header with Avatar - ResumoView Style -->
      <header class="page-header">
        <div class="header-left">
          <div class="avatar-wrapper">
            <div class="avatar">
              {{ getInitials(user?.name) }}
            </div>
          </div>
          <div class="header-text">
            <h1 class="title">{{ user?.name || 'Usuário' }}</h1>
            <p class="subtitle">{{ user?.email || 'email@exemplo.com' }}</p>
          </div>
        </div>
      </header>

      <!-- Main Content Grid - ResumoView lists-grid Style -->
      <div class="lists-grid">
        <!-- Personal Information Section -->
        <div class="table-card">
          <div class="card-header">
            <div class="card-header-text">
              <h3 class="card-title">Informações Pessoais</h3>
              <p class="card-subtitle">Suas informações básicas de perfil.</p>
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

          <div class="card-content">
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
          </div>
        </div>

        <!-- Clinic Information Section -->
        <div v-if="clinic" class="table-card">
          <div class="card-header">
            <div class="card-header-text">
              <h3 class="card-title">Informações da Clínica</h3>
              <p class="card-subtitle">Detalhes da instituição vinculada ao seu perfil.</p>
            </div>
          </div>

          <div class="card-content">
            <!-- Clinic Header -->
            <div class="clinic-header">
              <div class="clinic-logo-wrapper">
                <img 
                  v-if="clinic.logoUrl" 
                  :src="clinic.logoUrl" 
                  :alt="clinic.name"
                  class="clinic-logo"
                />
                <div v-else class="clinic-logo-placeholder">
                  <Building2 :size="24" />
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
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  font-family: var(--fonte-principal);
  color: var(--preto);
}

/* Header - ResumoView Style */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.avatar-wrapper {
  flex-shrink: 0;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 700;
  color: white;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25);
}

.header-text {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.1rem;
  color: var(--preto);
  line-height: 1.2;
}

.subtitle {
  color: var(--cinza-texto);
  font-size: 0.875rem;
}

/* Grid Layout - ResumoView Style */
.lists-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

@media (max-width: 1024px) {
  .lists-grid {
    grid-template-columns: 1fr;
  }
}

/* Table Card / Panels - ResumoView Style */
.table-card {
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.3rem;
  flex-shrink: 0;
}

.card-header-text {
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--preto);
  margin: 0;
  line-height: 1.2;
}

.card-subtitle {
  font-size: 0.8rem;
  color: var(--cinza-texto);
  margin-top: 0.25rem;
  line-height: 1.2;
}

.card-content {
  padding: 0 1.3rem 1.3rem;
  flex: 1;
}

/* Clinic Header */
.clinic-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding-bottom: 1.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  min-width: 0;
}

.clinic-logo-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  flex-shrink: 0;
}

.clinic-logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.clinic-logo-placeholder {
  color: var(--azul-principal);
}

.clinic-info {
  flex: 1;
  min-width: 0;
}

.clinic-name {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--preto);
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
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.info-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.field-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--cinza-texto);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.field-value {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--preto);
  transition: all 0.2s ease;
  min-width: 0;
}

.field-value span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.field-value:hover {
  background: #f1f5f9;
  border-color: #d1d5db;
}

.field-icon {
  color: #6b7280;
  flex-shrink: 0;
}

/* Edit Mode Styles */
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

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem;
  background: var(--branco);
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  gap: 1rem;
  color: var(--cinza-texto);
}

.spinner {
  border: 3px solid #f1f5f9;
  border-top: 3px solid var(--azul-principal);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Responsive */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  .title {
    font-size: 1.25rem;
  }

  .subtitle {
    font-size: 0.8rem;
  }

  .lists-grid {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .card-header {
    padding: 1rem;
  }

  .card-content {
    padding: 0 1rem 1rem;
  }

  .clinic-header {
    flex-direction: column;
    text-align: center;
  }
}
</style>
