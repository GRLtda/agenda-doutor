<script setup>
import { ref, computed, onMounted, onBeforeUnmount, reactive, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import {
  User,
  Pencil,
  Check,
  X,
  Shield,
  KeyRound,
  Monitor,
  Camera,
  Loader2,
  CreditCard,
  HardDrive,
  Link2,
  Clock,
  Smartphone,
  Info,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Circle,
} from 'lucide-vue-next'
import FormInput from '@/components/global/FormInput.vue'
import PasswordInput from '@/components/global/PasswordInput.vue'
import AppTabs from '@/components/global/AppTabs.vue'
import Switch from '@/components/global/Switch.vue'
import ActiveSessionsView from './profile/ActiveSessionsView.vue'
import SubscriptionView from './assinatura/SubscriptionView.vue'
import StorageUsage from '@/components/global/StorageUsage.vue'
import ConnectedExperiences from '@/components/profile/ConnectedExperiences.vue'
import SecurityAlertDot from '@/components/auth/SecurityAlertDot.vue'
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

// Tab state: 'personal' | 'security' | 'devices' | 'subscription'
const activeTab = ref(props.activeTab || 'personal')

watch(
  () => props.activeTab,
  (value) => {
    if (['personal', 'security', 'connected', 'devices', 'subscription', 'storage'].includes(value)) {
      activeTab.value = value
    }
  }
)

const setActiveTab = (value) => {
  activeTab.value = value
  emit('update:activeTab', value)
}

const user = computed(() => authStore.user)
const clinic = computed(() => authStore.user?.clinic)
const isOwner = computed(() => user.value?.role === 'owner')
const profileTabItems = computed(() => {
  const items = [
    { value: 'personal', label: 'Informações Pessoais', icon: User },
    { value: 'security', label: 'Segurança', icon: Shield },
    { value: 'connected', label: 'Experiências Conectadas', icon: Link2 },
    { value: 'devices', label: 'Dispositivos Conectados', icon: Monitor },
    { value: 'storage', label: 'Armazenamento', icon: HardDrive },
  ]

  if (isOwner.value) {
    items.push({ value: 'subscription', label: 'Assinatura', icon: CreditCard })
  }

  return items
})
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

const resetPasswordData = reactive({
  token: '',
  newPassword: '',
})

const isSendingResetCode = ref(false)
const isResettingPassword = ref(false)
const isSavingFinancialAlerts = ref(false)

const roleLabels = {
  owner: 'Proprietário',
  admin: 'Administrador',
  employee: 'Funcionário',
  staff: 'Equipe'
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

// ---------------------------------------------------------------- Segurança: definir / redefinir senha
const MIN_PASSWORD_LENGTH = 6 // mesma regra da API
const RESEND_SECONDS = 60

const codeSent = ref(false)
const cooldown = ref(0)
const codeError = ref('')
const passwordError = ref('')
const feedback = ref(null) // { type: 'error' | 'warning' | 'success', title, text }
let cooldownTimer = null

const cooldownLabel = computed(() => `${Math.floor(cooldown.value / 60)}:${String(cooldown.value % 60).padStart(2, '0')}`)
const passwordRules = computed(() => {
  const value = resetPasswordData.newPassword
  const met = value.length >= MIN_PASSWORD_LENGTH
  return [{ id: 'length', text: `Pelo menos ${MIN_PASSWORD_LENGTH} caracteres`, met, bad: Boolean(passwordError.value) && !met }]
})

watch(() => resetPasswordData.token, () => { codeError.value = '' })
watch(() => resetPasswordData.newPassword, () => { passwordError.value = '' })

const startCooldown = (seconds = RESEND_SECONDS) => {
  clearInterval(cooldownTimer)
  cooldown.value = seconds
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}
onBeforeUnmount(() => clearInterval(cooldownTimer))

// Falha geral (sem campo): conexão, limite de pedidos ou indisponibilidade. Sem termos técnicos.
const generalFailure = (result, { sending }) => {
  if (!result.status) {
    return {
      type: 'error',
      title: sending ? 'Não foi possível enviar o código.' : 'Não foi possível salvar a nova senha.',
      text: sending
        ? 'A conexão caiu antes do envio. Seus dados continuam aqui; tente enviar novamente.'
        : 'A conexão caiu. Sua senha atual continua valendo; tente novamente.',
    }
  }
  if (result.status === 429) {
    return { type: 'warning', title: 'Muitos pedidos.', text: 'Por segurança, aguarde um pouco antes de tentar de novo.' }
  }
  return {
    type: 'error',
    title: sending ? 'Não foi possível enviar o código para o WhatsApp.' : 'Não foi possível salvar a nova senha.',
    text: sending
      ? 'Confirme se o número do seu perfil está correto e tente de novo em alguns minutos.'
      : 'O servidor não respondeu. Sua senha atual continua valendo; tente novamente em alguns minutos.',
  }
}

const sendResetCode = async () => {
  const accountEmail = user.value?.email
  feedback.value = null
  if (!accountEmail) {
    feedback.value = { type: 'error', title: 'Não foi possível enviar o código.', text: 'Não encontramos o e-mail da sua conta. Entre de novo e tente outra vez.' }
    return
  }

  isSendingResetCode.value = true
  const result = await authStore.requestPasswordReset(accountEmail)
  isSendingResetCode.value = false

  if (result.success) {
    codeSent.value = true
    startCooldown()
  } else {
    feedback.value = generalFailure(result, { sending: true })
  }
}

const resetPassword = async () => {
  codeError.value = ''
  passwordError.value = ''
  feedback.value = null

  const token = resetPasswordData.token.trim()
  if (!token) codeError.value = 'Informe o código que enviamos para o seu WhatsApp.'
  if (!resetPasswordData.newPassword) passwordError.value = 'Informe a nova senha.'
  else if (resetPasswordData.newPassword.length < MIN_PASSWORD_LENGTH) passwordError.value = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
  if (codeError.value || passwordError.value) return

  const wasSettingPassword = !authStore.hasPassword
  isResettingPassword.value = true
  const result = await authStore.performPasswordReset({ token, newPassword: resetPasswordData.newPassword })
  isResettingPassword.value = false

  if (result.success) {
    resetPasswordData.token = ''
    resetPasswordData.newPassword = ''
    codeSent.value = false
    cooldown.value = 0
    clearInterval(cooldownTimer)
    feedback.value = wasSettingPassword
      ? { type: 'success', title: 'Senha definida.', text: 'Agora você pode entrar com e-mail e senha ou com o Google.' }
      : { type: 'success', title: 'Senha redefinida.', text: 'Use a nova senha no próximo acesso com e-mail e senha.' }
    // Atualiza o perfil: some a pendência (bolinha amarela) e o card volta ao modo "Redefinir senha".
    await authStore.fetchUser()
    return
  }

  // Erro de campo fica no campo; só falha geral vira aviso do cartão.
  if (result.status && result.status < 500 && result.status !== 429) {
    if (/senha/i.test(result.error || '') && !/c[óo]digo/i.test(result.error || '')) passwordError.value = result.error
    else codeError.value = 'O código está incorreto ou expirou. Confira o código recebido no WhatsApp ou peça um novo.'
    return
  }
  feedback.value = generalFailure(result, { sending: false })
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

  const result = await authStore.deleteProfilePhoto()

  isUploadingPhoto.value = false

  if (result.success) {
    toast.success('Foto removida com sucesso!')
  } else {
    toast.error(result.error || 'Erro ao remover foto')
  }
}

const updateFinancialAlerts = async (enabled) => {
  isSavingFinancialAlerts.value = true
  const result = await authStore.updateProfile({
    financialWhatsappAlertsEnabled: enabled
  })
  isSavingFinancialAlerts.value = false

  if (result.success) {
    toast.success('Preferência de alertas atualizada.')
  } else {
    toast.error(result.error || 'Não foi possível atualizar os alertas.')
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
      <header v-if="activeTab === 'personal'" class="profile-header">
        <div class="header-content">
          <div class="profile-identity">
            <div class="avatar-container">
              <div class="avatar" :class="{ 'has-photo': user?.profilePhotoUrl }">
                <img v-if="user?.profilePhotoUrl" :src="user.profilePhotoUrl" alt="Foto de perfil" class="avatar-image" />
                <span v-else>{{ getInitials(user?.name) }}</span>

                <!-- Loading overlay -->
                <div v-if="isUploadingPhoto" class="avatar-loading-overlay">
                  <Loader2 :size="28" class="animate-spin" />
                </div>
              </div>

              <button
                type="button"
                class="avatar-upload-btn"
                :disabled="isUploadingPhoto"
                @click="triggerPhotoUpload"
              >
                <Camera :size="14" />
                <span>{{ user?.profilePhotoUrl ? 'Alterar imagem' : 'Adicionar imagem' }}</span>
              </button>

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
          :items="profileTabItems"
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

            <section v-if="user?.role === 'owner'" class="content-card simple-section">
              <div class="card-header simple-header">
                <div class="header-text">
                  <h2>Alertas financeiros por WhatsApp</h2>
                  <p>Receba avisos de falha de pagamento, fim do teste e bloqueio de acesso.</p>
                </div>
              </div>

              <div class="financial-alert-row">
                <div>
                  <p class="financial-alert-title">Avisos da assinatura</p>
                  <p class="financial-alert-description">
                    Enviados para o seu número quando houver eventos importantes de cobrança.
                  </p>
                </div>
                <Switch
                  :model-value="user?.financialWhatsappAlertsEnabled !== false"
                  :disabled="isSavingFinancialAlerts"
                  @update:model-value="updateFinancialAlerts"
                />
              </div>
            </section>
          </div>

          <div v-else-if="activeTab === 'security'" class="security-layout">
            <!-- Autenticação em duas etapas (em desenvolvimento) -->
            <section class="content-card simple-section sec-card" aria-labelledby="sec-2fa-title">
              <div class="sec-card-head">
                <span class="sec-tile is-neutral" aria-hidden="true"><Shield :size="20" /></span>
                <div class="sec-head-text">
                  <h2 id="sec-2fa-title">Autenticação em duas etapas</h2>
                  <p>Adicione uma camada extra de proteção para sua conta.</p>
                </div>
                <span class="sec-pill"><Clock :size="13" aria-hidden="true" />Em breve</span>
              </div>

              <div class="sec-card-body">
                <div class="sec-option">
                  <Smartphone :size="20" aria-hidden="true" class="sec-option-icon" />
                  <div class="sec-option-text">
                    <strong>Aplicativo autenticador</strong>
                    <span>Gere um código de acesso no celular a cada entrada.</span>
                  </div>
                  <Switch :model-value="false" :disabled="true" aria-label="Autenticação em duas etapas (indisponível)" />
                </div>
                <div class="sec-banner is-info" role="status">
                  <Info :size="18" aria-hidden="true" />
                  <p>O 2FA ainda não está disponível nesta versão. Em breve você poderá ativar por aplicativo autenticador.</p>
                </div>
              </div>
            </section>

            <!-- Definir senha (conta criada pelo Google) / Redefinir senha -->
            <section class="content-card simple-section sec-card password-card" :data-mode="authStore.hasPassword ? 'reset' : 'set'" aria-labelledby="sec-password-title">
              <div class="sec-card-head">
                <span class="sec-tile" aria-hidden="true"><KeyRound :size="20" /></span>
                <div class="sec-head-text">
                  <h2 id="sec-password-title" class="password-title">
                    {{ authStore.hasPassword ? 'Redefinir senha' : 'Definir senha' }}
                    <SecurityAlertDot :alerts="authStore.securityAlerts" size="sm" />
                  </h2>
                  <p v-if="authStore.hasPassword">Envie um código de confirmação para o seu WhatsApp e cadastre uma nova senha.</p>
                  <p v-else class="password-set-note">
                    Defina uma senha para também poder entrar com e-mail e senha. Enviaremos um código de confirmação para o seu WhatsApp.
                  </p>
                </div>
                <button
                  type="button"
                  class="action-btn sec-send-btn"
                  :disabled="isSendingResetCode || cooldown > 0"
                  :aria-busy="isSendingResetCode ? 'true' : 'false'"
                  @click="sendResetCode"
                >
                  <Loader2 v-if="isSendingResetCode" :size="15" class="sec-spin" aria-hidden="true" />
                  <Clock v-else-if="cooldown > 0" :size="15" aria-hidden="true" />
                  <KeyRound v-else :size="15" aria-hidden="true" />
                  <span v-if="isSendingResetCode">Enviando código...</span>
                  <span v-else-if="cooldown > 0">Reenviar em {{ cooldownLabel }}</span>
                  <span v-else>{{ codeSent ? 'Reenviar código' : 'Enviar código' }}</span>
                </button>
              </div>

              <div class="sec-card-body">
                <div v-if="!authStore.hasPassword" class="sec-google-note">
                  <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true" focusable="false">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  <p>
                    <strong>Sua conta foi criada com o Google.</strong>
                    Ela ainda não tem senha. Seu acesso com o Google continua funcionando depois que você definir uma.
                  </p>
                </div>

                <!-- Avisos do cartão (sem toast: o usuário vê o aviso junto ao que está fazendo) -->
                <Transition name="sec-collapse">
                  <div v-if="feedback" :key="feedback.title" class="sec-banner" :class="`is-${feedback.type}`" :role="feedback.type === 'success' ? 'status' : 'alert'">
                    <CheckCircle2 v-if="feedback.type === 'success'" :size="18" aria-hidden="true" />
                    <AlertCircle v-else :size="18" aria-hidden="true" />
                    <p><strong>{{ feedback.title }}</strong> {{ feedback.text }}</p>
                  </div>
                </Transition>
                <Transition name="sec-collapse">
                  <div v-if="codeSent && !feedback" class="sec-banner is-info" role="status">
                    <MessageCircle :size="18" aria-hidden="true" />
                    <p><strong>Código enviado.</strong> Confira as mensagens do seu WhatsApp e digite o código abaixo.</p>
                  </div>
                </Transition>

                <div class="security-form-grid">
                  <div class="simple-info-item">
                    <span class="simple-label">Código de verificação</span>
                    <FormInput
                      v-model="resetPasswordData.token"
                      placeholder="Digite o código recebido"
                      autocomplete="one-time-code"
                      :error="codeError"
                    />
                  </div>

                  <div class="simple-info-item">
                    <span class="simple-label">Nova senha</span>
                    <PasswordInput
                      v-model="resetPasswordData.newPassword"
                      :show-validation="false"
                      :error="passwordError"
                      autocomplete="new-password"
                    />
                    <ul class="sec-rules" aria-label="Requisitos da senha">
                      <li v-for="rule in passwordRules" :key="rule.id" :class="{ 'is-met': rule.met, 'is-bad': rule.bad }">
                        <CheckCircle2 v-if="rule.met" :size="15" aria-hidden="true" />
                        <AlertCircle v-else-if="rule.bad" :size="15" aria-hidden="true" />
                        <Circle v-else :size="15" aria-hidden="true" />
                        <span>{{ rule.text }}<span v-if="rule.met" class="sec-sr-only"> (atendido)</span></span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div class="security-actions">
                  <button type="button" class="action-btn save-btn" :disabled="isResettingPassword" :aria-busy="isResettingPassword ? 'true' : 'false'" @click="resetPassword">
                    <Loader2 v-if="isResettingPassword" :size="15" class="sec-spin" aria-hidden="true" />
                    <span>{{ isResettingPassword ? (authStore.hasPassword ? 'Redefinindo...' : 'Definindo...') : (authStore.hasPassword ? 'Redefinir senha' : 'Definir senha') }}</span>
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div v-else-if="activeTab === 'connected'" class="connected-tab-wrapper">
            <ConnectedExperiences @go-security="setActiveTab('security')" />
          </div>

          <div v-else-if="activeTab === 'devices'" class="devices-tab-wrapper">
            <ActiveSessionsView />
          </div>

          <div v-else-if="activeTab === 'storage'" class="storage-tab-wrapper">
            <StorageUsage detailed />
          </div>

          <div v-else-if="activeTab === 'subscription' && isOwner" class="subscription-tab-wrapper">
            <SubscriptionView />
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
  padding: 1rem;
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
  align-items: flex-start;
  gap: 1.25rem;
}

.avatar-container {
  position: relative;
  flex-shrink: 0;
  width: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.avatar {
  width: 92px;
  height: 92px;
  background: #eef2ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: var(--azul-principal);
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
.avatar-loading-overlay {
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

.avatar-upload-btn {
  width: 100%;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid #dbe1e8;
  border-radius: 8px;
  background: #fff;
  color: #374151;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.1;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.avatar-upload-btn:hover {
  border-color: var(--azul-principal);
  color: var(--azul-principal);
  background: #f8fbff;
}

.avatar-upload-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.user-info {
  min-width: 0;
  flex: 1;
}

.financial-alert-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.financial-alert-title {
  margin: 0 0 0.25rem;
  color: #0f172a;
  font-weight: 600;
}

.financial-alert-description {
  margin: 0;
  color: #64748b;
  font-size: 0.875rem;
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

.user-name,
.user-email,
.user-location {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

.security-layout {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.24rem 0.75rem;
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.status-pill.disabled {
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid #e5e7eb;
}

.security-message p {
  margin: 0;
  font-size: 0.9rem;
  color: #4b5563;
  line-height: 1.45;
}

.security-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.1rem 1.25rem;
}

/* Card de senha: marca amarela discreta ao lado do título (modo Definir senha). */
.password-title {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}
.password-card[data-mode="set"] .password-set-note {
  max-width: 60ch;
  line-height: 1.5;
}

.security-actions {
  margin-top: 0.25rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.devices-tab-wrapper,
.subscription-tab-wrapper {
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

  .header-content {
    align-items: flex-start;
  }

  .profile-identity {
    width: 100%;
    gap: 1rem;
  }

  .avatar-container {
    width: 128px;
  }

  .avatar {
    width: 82px;
    height: 82px;
    font-size: 1.75rem;
  }

  .avatar-upload-btn {
    flex-wrap: wrap;
    min-height: 32px;
    padding: 0.35rem 0.45rem;
    font-size: 0.68rem;
  }

  .simple-info-grid {
    grid-template-columns: 1fr;
  }

  .security-form-grid {
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

/* ---- Aba Segurança (2FA + definir/redefinir senha) ---- */
.sec-card {
  padding: 0;
  overflow: hidden;
  transition: box-shadow var(--ds-duration-base) var(--ds-ease);
}
.sec-card-head {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1.35rem 1.5rem;
  border-bottom: 1px solid var(--ds-border-subtle, #eceff3);
}
.sec-card-body {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.35rem 1.5rem 1.5rem;
}
.sec-tile {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: #eef2ff;
  color: var(--azul-principal);
}
.sec-tile.is-neutral {
  background: #f1f5f9;
  color: #475569;
}
.sec-head-text {
  flex: 1;
  min-width: 0;
}
.sec-head-text h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: #111827;
}
.sec-head-text p {
  margin: 0.2rem 0 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: #6b7280;
}
.sec-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border: 1px solid #e2e8f0;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
}
.sec-option {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.85rem 1rem;
  border: 1px solid #edf2f7;
  border-radius: 12px;
  background: #f8fafc;
}
.sec-option-icon {
  flex: none;
  color: #64748b;
}
.sec-option-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}
.sec-option-text strong {
  color: #334155;
  font-size: 0.9rem;
  font-weight: 500;
}
.sec-option-text span {
  color: #64748b;
  font-size: 0.8125rem;
}

/* Avisos do cartão: informação, atenção, erro e sucesso (sempre com ícone e texto) */
.sec-banner {
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  padding: 0.75rem 0.9rem;
  border: 1px solid;
  border-radius: 10px;
  font-size: 0.875rem;
  line-height: 1.45;
  overflow: hidden;
}
.sec-banner p {
  margin: 0;
}
.sec-banner svg {
  flex: none;
  margin-top: 1px;
}
.sec-banner.is-info { background: #eff6ff; border-color: #dbeafe; color: #1d4ed8; }
.sec-banner.is-success { background: #ecfdf5; border-color: #a7f3d0; color: #047857; }
.sec-banner.is-warning { background: #fffbeb; border-color: #fde68a; color: #92400e; }
.sec-banner.is-error { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }

.sec-google-note {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border: 1px solid #edf2f7;
  border-radius: 12px;
  background: #f8fafc;
}
.sec-google-note svg {
  flex: none;
  margin-top: 1px;
}
.sec-google-note p {
  margin: 0;
  color: #334155;
  font-size: 0.875rem;
  line-height: 1.5;
}
.sec-google-note strong {
  color: #0f172a;
  font-weight: 600;
}

/* Requisitos da senha */
.sec-rules {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sec-rules li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.8125rem;
  transition: color var(--ds-duration-base) var(--ds-ease);
}
.sec-rules li.is-met { color: #047857; }
.sec-rules li.is-bad { color: #dc2626; }
.sec-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* Botões: transições suaves e spinner */
.sec-card .action-btn {
  min-height: 40px;
  transition:
    background-color var(--ds-duration-base) var(--ds-ease),
    border-color var(--ds-duration-base) var(--ds-ease),
    box-shadow var(--ds-duration-base) var(--ds-ease),
    transform var(--ds-duration-fast) var(--ds-ease),
    opacity var(--ds-duration-base) var(--ds-ease);
}
.sec-card .action-btn:active:not(:disabled) {
  transform: scale(0.98);
}
.sec-card .action-btn:focus-visible {
  outline: 2px solid var(--ds-border-focus, var(--azul-principal));
  outline-offset: 2px;
}
.sec-card .action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
.sec-card .action-btn[aria-busy='true'] {
  cursor: progress;
}
.sec-card .save-btn {
  background: var(--azul-principal);
  border-color: var(--azul-principal);
  color: #fff;
}
.sec-card .save-btn:hover:not(:disabled) {
  background: #1b69ff;
  border-color: #1b69ff;
}
.sec-spin {
  animation: sec-spin 0.9s linear infinite;
}
@keyframes sec-spin {
  to { transform: rotate(360deg); }
}

/* Entrada e saída dos avisos (altura + opacidade) */
.sec-collapse-enter-active,
.sec-collapse-leave-active {
  transition:
    max-height var(--ds-duration-slow) var(--ds-ease-out),
    opacity var(--ds-duration-base) var(--ds-ease),
    transform var(--ds-duration-base) var(--ds-ease),
    padding var(--ds-duration-slow) var(--ds-ease-out),
    margin var(--ds-duration-slow) var(--ds-ease-out);
}
.sec-collapse-enter-from,
.sec-collapse-leave-to {
  max-height: 0;
  margin-block: -0.55rem;
  padding-block: 0;
  opacity: 0;
  transform: translateY(-6px);
}
.sec-collapse-enter-to,
.sec-collapse-leave-from {
  max-height: 160px;
}

@media (max-width: 767px) {
  .sec-card-head {
    flex-wrap: wrap;
    padding: 1.1rem;
  }
  .sec-card-body {
    padding: 1.1rem;
  }
  .sec-head-text {
    flex-basis: calc(100% - 40px - 0.9rem);
  }
  .sec-card .action-btn {
    width: 100%;
    min-height: 48px;
    justify-content: center;
  }
  .sec-send-btn {
    flex-basis: 100%;
  }
  .sec-pill {
    margin-left: 52px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .sec-spin {
    animation: none;
  }
  .sec-collapse-enter-active,
  .sec-collapse-leave-active,
  .sec-card .action-btn,
  .sec-rules li {
    transition: none;
  }
  .sec-collapse-enter-from,
  .sec-collapse-leave-to {
    transform: none;
  }
}
</style>
