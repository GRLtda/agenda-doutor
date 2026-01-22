<script setup>
import { ref, onMounted, computed } from 'vue'
import { useEmployeesStore } from '@/stores/employees'
import { usePlanAccess } from '@/composables/usePlanAccess'
import { useToast } from 'vue-toastification'
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import { Copy, Check, Share2, CheckCircle, Mail, User, Calendar, Clock, X } from 'lucide-vue-next'
import SideDrawer from '@/components/global/SideDrawer.vue'

const emit = defineEmits(['close'])
const employeesStore = useEmployeesStore()
const { currentPlan } = usePlanAccess()
const toast = useToast()

const email = ref('')
const role = ref('recepcionista')
const validationError = ref(null)
const generatedLink = ref(null)
const linkCopied = ref(false)
const canShare = ref(false)

const roleOptions = computed(() => {
  const options = [
    { value: 'recepcionista', label: 'Recepcionista' },
    { value: 'medico', label: 'Médico' },
    { value: 'gerente', label: 'Gerente' },
  ]

  if (currentPlan.value === 'basic') {
    return options.filter((opt) => opt.value !== 'medico')
  }

  return options
})

onMounted(() => {
  if (typeof navigator !== 'undefined' && navigator.share) {
    canShare.value = true
  }
})

const expirationDate = computed(() => {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
})

const formattedRole = computed(() => {
  const selected = roleOptions.value.find((r) => r.value === role.value)
  return selected ? selected.label : role.value
})

function validateEmail(email) {
  const re =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
  return re.test(String(email).toLowerCase())
}

async function handleInvite() {
  validationError.value = null
  if (!email.value || !validateEmail(email.value)) {
    validationError.value = 'Por favor, insira um e-mail válido.'
    return
  }

  const { success, data, error } = await employeesStore.inviteEmployee({
    email: email.value,
    role: role.value,
  })

  // Tenta extrair o token de diferentes locais para garantir compatibilidade
  const token = data?.invitation?.token || data?.invitationToken || data?.token

  if (success && token) {
    const origin = window.location.origin
    generatedLink.value = `${origin}/register?invitationToken=${token}`
    toast.success('Convite gerado com sucesso!')
  } else {
    console.error('Erro ao criar convite: ', { success, data, error })
    toast.error(error || 'Não foi possível gerar o convite.')
  }
}

function copyLink() {
  if (!generatedLink.value) return

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(generatedLink.value)
      .then(() => {
        linkCopied.value = true
        setTimeout(() => (linkCopied.value = false), 2000)
        toast.info('Link copiado!')
      })
      .catch((err) => {
        console.error('Erro ao copiar o link com Clipboard API:', err)
        toast.error('Falha ao copiar o link.')
      })
  } else {
    // Fallback for browsers that do not support Clipboard API
    const textarea = document.createElement('textarea')
    textarea.value = generatedLink.value
    textarea.style.position = 'fixed' // Avoid scrolling to bottom
    textarea.style.opacity = '0' // Hide it
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    try {
      document.execCommand('copy')
      linkCopied.value = true
      setTimeout(() => (linkCopied.value = false), 2000)
      toast.info('Link copiado!')
    } catch (err) {
      console.error('Erro ao copiar o link com execCommand:', err)
      toast.error('Falha ao copiar o link. Por favor, copie manualmente.')
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

async function shareLink() {
  if (!generatedLink.value) return
  try {
    await navigator.share({
      title: 'Convite para a Clínica',
      text: `Olá! Você foi convidado como ${formattedRole.value}. Acesse o link para se cadastrar.`,
      url: generatedLink.value,
    })
  } catch (err) {
    console.error('Erro ao compartilhar:', err)
  }
}
</script>

<template>
  <SideDrawer @close="$emit('close')" size="lg">
    <template #header>
      <div class="drawer-header" :class="{ 'centered-header': generatedLink }">
        <div v-if="!generatedLink" class="header-content">
          <div>
            <h2>Convidar Novo Membro</h2>
            <p>Envie um convite para um novo funcionário.</p>
          </div>
          <button @click="$emit('close')" class="mobile-close-btn">
            <X :size="24" />
          </button>
        </div>
        <div v-else class="success-header">
          <div class="icon-circle">
            <CheckCircle :size="48" class="success-icon" />
          </div>
          <h2>Convite Criado!</h2>
          <p>O link de acesso foi gerado com sucesso.</p>
        </div>
      </div>
    </template>

    <div class="drawer-body-padded">
      <div v-if="!generatedLink">
        <FormInput
          v-model="email"
          label="E-mail do Convidado"
          type="email"
          placeholder="email@exemplo.com"
          :error="!!validationError"
        />
        <p v-if="validationError" class="error-message">{{ validationError }}</p>
        <div style="margin-top: 1.5rem">
          <StyledSelect v-model="role" :options="roleOptions" label="Cargo do Funcionário" />
        </div>
      </div>

      <div v-else class="success-body">
        <div class="details-card">
          <div class="detail-item">
            <div class="detail-icon"><Mail :size="20" /></div>
            <div class="detail-text">
              <span class="label">Enviado para</span>
              <span class="value">{{ email }}</span>
            </div>
          </div>

          <div class="detail-row">
            <div class="detail-item half">
              <div class="detail-icon"><User :size="20" /></div>
              <div class="detail-text">
                <span class="label">Cargo</span>
                <span class="value highlight">{{ formattedRole }}</span>
              </div>
            </div>
            <div class="detail-item half">
              <div class="detail-icon"><Calendar :size="20" /></div>
              <div class="detail-text">
                <span class="label">Válido até</span>
                <span class="value">{{ expirationDate }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="link-section">
          <label class="form-label">Link de Acesso</label>
          <div class="link-wrapper">
            <input type="text" :value="generatedLink" readonly class="link-input" @click="copyLink" />
            <div class="input-icon-right">
                <Copy :size="18" />
            </div>
          </div>
          <p class="info">
            <Clock :size="16" style="margin-right: 6px; vertical-align: middle" /> O link expira
            automaticamente em 7 dias.
          </p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer stacked-footer">
        <!-- Botões de Ação Principal -->
        <AppButton @click="$emit('close')" variant="default" class="btn-full">
          {{ generatedLink ? 'Fechar' : 'Cancelar' }}
        </AppButton>
        <template v-if="generatedLink">
          <AppButton @click="copyLink" variant="primary" class="btn-full">
            <Copy :size="20" /> Copiar Link
          </AppButton>
          
          <AppButton
            v-if="canShare"
            @click="shareLink"
            variant="default"
            class="btn-full"
          >
            <Share2 :size="20" /> Compartilhar
          </AppButton>
        </template>

        <!-- Botão de Ação Primária (Gerar) -->

        <AppButton
          v-if="!generatedLink"
          @click="handleInvite"
          variant="primary"
          class="btn-full"
          :loading="employeesStore.isLoading"
        >
          Gerar Convite
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
/* Header Styles */
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.drawer-header h2 {
  font-size: 1.25rem;
  color: #111827;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.drawer-header p {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

.centered-header {
  text-align: center;
  border-bottom: none;
  padding-bottom: 0;
}

/* Success Header */
.success-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 1rem;
}

.icon-circle {
  width: 64px;
  height: 64px;
  background-color: #dcfce7;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.success-icon {
  color: #16a34a;
}

/* Body Styles */
.drawer-body-padded {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.success-body {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  text-align: center; /* Centraliza textos gerais */
}

/* Card de Detalhes */
.details-card {
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  text-align: left; /* Mantém alinhamento interno do card */
}

.detail-row {
  display: flex;
  gap: 1rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.detail-item.half {
  flex: 1;
}

.detail-icon {
  width: 36px;
  height: 36px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  flex-shrink: 0;
}

.detail-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.detail-text .label {
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.detail-text .value {
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-text .value.highlight {
  color: var(--azul-principal);
}

/* Link Section */
.form-label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  color: #374151;
  text-align: left; /* Label alinhado à esquerda */
}

.link-wrapper {
  position: relative;
}

.link-input {
  width: 100%;
  padding: 0.875rem 3rem 0.875rem 1rem; /* Padding direito menor pois removemos botões internos */
  border-radius: 0.75rem;
  border: 1px solid #d1d5db;
  background-color: #fff;
  font-size: 0.95rem;
  color: #4b5563;
  transition: border-color 0.2s;
  text-align: center;
}

.link-input:focus {
  outline: none;
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.input-icon-right {
  position: absolute;
  top: 50%;
  right: 1rem;
  transform: translateY(-50%);
  color: #9ca3af;
  pointer-events: none;
}

.info {
  font-size: 0.85rem;
  color: #9ca3af;
  margin-top: 0.5rem;
  text-align: center;
}

.text-green {
  color: #16a34a;
}

/* Footer Stacked */
.drawer-footer {
  padding: 1.5rem 2rem;
  border-top: 1px solid #f3f4f6;
  background-color: #fff;
  display: flex;
  gap: 0.75rem;
}

.stacked-footer {
  width: 100%;
}

.btn-full {
  flex: 1; /* Divide o espaço igualmente */
  justify-content: center;
}

.error-message {
  color: #ef4444;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Responsive adjustments */
@media (max-width: 640px) {
  .detail-row {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
