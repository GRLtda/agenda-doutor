<script setup>
import { ref, onMounted, computed } from 'vue'
import { useEmployeesStore } from '@/stores/employees'
import { useToast } from 'vue-toastification'
import FormInput from '@/components/global/FormInput.vue'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import { Copy, Check, Share2, CheckCircle, Mail, User, Calendar, Clock } from 'lucide-vue-next'

const emit = defineEmits(['close'])
const employeesStore = useEmployeesStore()
const toast = useToast()

const email = ref('')
const role = ref('recepcionista')
const validationError = ref(null)
const generatedLink = ref(null)
const linkCopied = ref(false)
const canShare = ref(false)

const roleOptions = [
  { value: 'recepcionista', label: 'Recepcionista' },
  { value: 'medico', label: 'Médico(a)' },
  { value: 'gerente', label: 'Gerente' },
]

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
  const selected = roleOptions.find((r) => r.value === role.value)
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

  if (success && data.invitation?.token) {
    const origin = window.location.origin
    generatedLink.value = `${origin}/register?invitationToken=${data.invitation.token}`
    toast.success('Convite gerado com sucesso!')
  } else {
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
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <header class="modal-header" :class="{ 'centered-header': generatedLink }">
        <div v-if="!generatedLink">
          <h2>Convidar Novo Membro</h2>
          <p>Envie um convite para um novo funcionário.</p>
        </div>
        <div v-else class="success-header">
          <div class="icon-circle">
            <CheckCircle :size="48" class="success-icon" />
          </div>
          <h2>Convite Criado!</h2>
          <p>O link de acesso foi gerado com sucesso.</p>
        </div>
      </header>

      <div class="modal-body">
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
              <input type="text" :value="generatedLink" readonly class="link-input" />
              <div class="action-buttons">
                <AppButton v-if="canShare" @click="shareLink" variant="default" size="sm" title="Compartilhar">
                  <Share2 :size="20" />
                </AppButton>
                <AppButton @click="copyLink" variant="default" size="sm" title="Copiar">
                  <Check v-if="linkCopied" :size="20" class="text-green" />
                  <Copy v-else :size="20" />
                </AppButton>
              </div>
            </div>
            <p class="info">
              <Clock :size="16" style="margin-right: 6px; vertical-align: middle" /> O link expira
              automaticamente em 7 dias.
            </p>
          </div>
        </div>
      </div>

      <footer class="modal-footer">
        <AppButton @click="$emit('close')" variant="secondary">
          {{ generatedLink ? 'Fechar' : 'Cancelar' }}
        </AppButton>

        <AppButton
          v-if="!generatedLink"
          @click="handleInvite"
          variant="primary"
          :loading="employeesStore.isLoading"
        >
          Gerar Convite
        </AppButton>

        <AppButton
          v-else-if="generatedLink && canShare"
          @click="shareLink"
          variant="primary"
        >
          Compartilhar Link
        </AppButton>
        <AppButton v-else @click="copyLink" variant="primary">Copiar Link</AppButton>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* =========================================
   ESTILOS DESKTOP (Mantendo o visual Premium)
   ========================================= */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(249, 250, 251, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--branco);
  width: 95%;
  max-width: 600px;
  /* Altura automática no desktop, mas com limite para não estourar telas pequenas */
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  border-radius: 1.5rem;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  border: 1px solid #f3f4f6;
  overflow: hidden;
}

/* Header */
.modal-header { padding: 2.5rem 2.5rem 1.5rem; border-bottom: 1px solid #f3f4f6; flex-shrink: 0; }
.modal-header.centered-header { text-align: center; border-bottom: none; padding-bottom: 0; }
.modal-header h2 { font-size: 1.5rem; color: #111827; font-weight: 700; margin-bottom: 0.5rem; }
.modal-header p { color: #6b7280; font-size: 1rem; }

/* Ícone de Sucesso */
.success-header { display: flex; flex-direction: column; align-items: center; }
.icon-circle { width: 80px; height: 80px; background-color: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 1.5rem; }
.success-icon { color: #16a34a; }

/* Body */
.modal-body {
  padding: 2.5rem;
  overflow-y: auto; /* Permite scroll se o conteúdo for grande */
}
.success-body { display: flex; flex-direction: column; gap: 2rem; }

/* Card de Detalhes */
.details-card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 1rem; padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem; }
.detail-row { display: flex; gap: 2rem; }
.detail-item { display: flex; align-items: center; gap: 1rem; }
.detail-item.half { flex: 1; }

.detail-icon { width: 42px; height: 42px; background: #fff; border: 1px solid #e5e7eb; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #6b7280; flex-shrink: 0;}
.detail-text { display: flex; flex-direction: column; min-width: 0; /* Fix para texto longo não quebrar layout flex */ }
.detail-text .label { font-size: 0.8rem; color: #9ca3af; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px;}
.detail-text .value { font-size: 1rem; color: #1f2937; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.detail-text .value.highlight { color: var(--azul-principal); font-size: 1.1rem; }

/* Link Section */
.form-label { display: block; margin-bottom: 0.75rem; font-weight: 600; font-size: 0.95rem; color: #374151; }
.link-wrapper { position: relative; }
.link-input { width: 100%; padding: 1rem 6rem 1rem 1rem; border-radius: 0.75rem; border: 1px solid #d1d5db; background-color: #fff; font-size: 1rem; color: #4b5563; transition: border-color 0.2s; }
.link-input:focus { outline: none; border-color: var(--azul-principal); box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1); }

.action-buttons { position: absolute; top: 50%; right: 0.75rem; transform: translateY(-50%); display: flex; gap: 0.5rem; }

.info { font-size: 0.9rem; color: #9ca3af; margin-top: 0.75rem; text-align: center; }
.text-green { color: #16a34a; }

/* Footer */
.modal-footer { padding: 1.5rem 2.5rem; border-top: 1px solid #f3f4f6; display: flex; justify-content: flex-end; gap: 1rem; background-color: #fff; flex-shrink: 0; }
.error-message { color: #ef4444; font-size: 0.875rem; margin-top: -0.5rem; margin-bottom: 1rem; }

/* =========================================
   RESPONSIVO (MOBILE - TELA CHEIA)
   ========================================= */
@media (max-width: 640px) {
  .modal-content {
    width: 100%;
    height: 100%; /* Ocupa a tela toda */
    max-width: none;
    max-height: none;
    border-radius: 0; /* Remove bordas arredondadas */
    border: none;
  }

  .modal-header {
    padding: 1.5rem; /* Reduz padding do topo */
  }

  .icon-circle {
    width: 64px;
    height: 64px;
    margin-bottom: 1rem;
  }

  .modal-body {
    padding: 1.5rem; /* Reduz padding lateral */
    flex: 1; /* Força o corpo a ocupar o espaço disponível, empurrando o footer para baixo */
  }

  .success-body {
    gap: 1.5rem;
  }

  /* Ajusta o card de detalhes para empilhar em telas muito pequenas */
  .details-card {
    padding: 1rem;
    gap: 1rem;
  }

  .detail-row {
    flex-direction: column; /* Empilha Cargo e Data */
    gap: 1rem;
  }

  .link-input {
    padding-right: 5.5rem; /* Ajuste fino para input mobile */
    font-size: 0.9rem;
    text-overflow: ellipsis;
  }

  .modal-footer {
    padding: 1rem 1.5rem;
    flex-direction: column-reverse; /* Botão principal em cima, cancelar embaixo */
  }
}
</style>
