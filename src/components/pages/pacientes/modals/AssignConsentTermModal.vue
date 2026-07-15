<script setup>
import { ref, onMounted } from 'vue'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { useToast } from 'vue-toastification'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import FormInput from '@/components/global/FormInput.vue'
import LottieAnimation from '@/components/global/LottieAnimation.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import { CheckCircle2, Copy, FilePlus } from 'lucide-vue-next'

const props = defineProps({
  patientId: { type: String, required: true },
  appointmentId: { type: String, default: null },
})
defineEmits(['close'])

const consentTermsStore = useConsentTermsStore()
const toast = useToast()

const templates = ref([])
const selectedTemplateId = ref(null)
const generatedLink = ref(null)
const copied = ref(false)
const isLoading = ref(false)
const sendNotification = ref(true)

onMounted(async () => {
  await consentTermsStore.fetchTemplates()
  templates.value = consentTermsStore.templates.map(t => ({ value: t._id, label: t.name }))
})

function markLinkAsCopied() {
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1800)
}

async function handleGenerateLink() {
  if (!selectedTemplateId.value) {
    toast.error('Por favor, selecione um modelo.')
    return
  }

  isLoading.value = true

  const payload = {
    templateId: selectedTemplateId.value,
    tokenTtlDays: 30,
    sendNotification: sendNotification.value,
    ...(props.appointmentId && { appointmentId: props.appointmentId }),
  }

  const { success, data } = await consentTermsStore.assignTermToPatient(props.patientId, payload)

  if (success) {
    const token = data.patientAccessToken
    generatedLink.value = `${window.location.origin}/termo/${token}`
  } else {
    toast.error('Nao foi possivel gerar o link.')
  }

  isLoading.value = false
}

function copyLink() {
  if (!generatedLink.value) return
  const link = generatedLink.value

  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      markLinkAsCopied()
      toast.info('Link copiado para a area de transferencia!')
    })
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = link
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.focus()
  textArea.select()

  try {
    document.execCommand('copy')
    markLinkAsCopied()
    toast.info('Link copiado para a area de transferencia!')
  } catch (err) {
    toast.error('Nao foi possivel copiar o link.')
  }

  document.body.removeChild(textArea)
}
</script>

<template>
  <SideDrawer @close="$emit('close')">
    <template #header>
      <div class="consent-drawer-header" :class="{ 'is-success': generatedLink }">
        <div>
          <h2>{{ generatedLink ? 'Termo aplicado' : 'Aplicar Termo de Consentimento' }}</h2>
          <p class="subtitle">
            {{
              generatedLink
                ? 'O link de assinatura foi criado e ja esta vinculado ao paciente.'
                : 'Selecione um modelo para gerar um link de assinatura.'
            }}
          </p>
        </div>
      </div>
    </template>

    <div class="drawer-body-content">
      <Transition name="confirm-fade" mode="out-in">
        <div v-if="!generatedLink" class="assign-step">
          <StyledSelect v-model="selectedTemplateId" :options="templates" label="Selecione o Modelo">
            <template #empty>
              <div class="empty-state-custom">
                <FilePlus :size="32" class="empty-icon" />
                <p>Nenhum modelo encontrado</p>
              </div>
            </template>
          </StyledSelect>

          <FormInput
            type="checkbox"
            v-model="sendNotification"
            label="Enviar notificacao via WhatsApp"
            class="notification-checkbox"
          />
        </div>

        <div v-else class="confirmation-step">
          <div class="success-visual" aria-hidden="true">
            <LottieAnimation
              class="success-lottie"
              name="check.json"
              aria-label="Termo aplicado com sucesso"
            />
          </div>

          <div class="confirmation-copy">
            <span class="eyebrow">Tudo pronto</span>
            <h3>Link gerado com sucesso</h3>
            <p>Voce pode copiar o link agora ou concluir e acessa-lo depois nos termos do paciente.</p>
          </div>

          <div class="consent-link-card">
            <label class="form-label">Link publico</label>
            <div class="link-wrapper">
              <input type="text" :value="generatedLink" readonly class="link-input" />
              <button @click="copyLink" class="copy-button" :title="copied ? 'Copiado' : 'Copiar link'">
                <CheckCircle2 v-if="copied" :size="16" />
                <Copy v-else :size="16" />
              </button>
            </div>
            <p class="info">
              {{ copied ? 'Link copiado para a area de transferencia.' : 'Envie este link para o paciente. Ele e valido por 30 dias.' }}
            </p>
          </div>
        </div>
      </Transition>
    </div>

    <template #footer="{ close }">
      <div class="drawer-footer">
        <AppButton @click="close" variant="default">
          {{ generatedLink ? 'Concluir' : 'Cancelar' }}
        </AppButton>
        <AppButton
          v-if="!generatedLink"
          @click="handleGenerateLink"
          variant="primary"
          :loading="isLoading"
          :disabled="isLoading"
        >
          Enviar Termo
        </AppButton>
        <AppButton v-else @click="copyLink" variant="primary">
          {{ copied ? 'Copiado' : 'Copiar Link' }}
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.consent-drawer-header {
  background:
    radial-gradient(120% 120% at 20% 0%, rgba(187, 247, 208, 0) 0%, rgba(240, 253, 244, 0) 38%, transparent 70%),
    linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
  border-bottom: 1px solid #f3f4f6;
  overflow: hidden;
  padding: 1.5rem;
  position: relative;
  transition: background 0.35s ease, border-color 0.35s ease;
}

.consent-drawer-header > div {
  position: relative;
  z-index: 1;
}

.drawer-footer {
  border-top: 1px solid #f3f4f6;
  display: grid;
  gap: 1rem;
  grid-template-columns: 1fr 1fr;
  padding: 1.5rem;
  width: 100%;
}

h2 {
  color: #111827;
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0;
}

.subtitle {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  margin-top: 0.25rem;
}

.drawer-body-content,
.assign-step,
.confirmation-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.consent-drawer-header.is-success {
  animation: success-header-on 1.45s ease-out both;
  background:
    radial-gradient(120% 120% at 20% 0%, rgba(134, 239, 172, 0.95) 0%, rgba(220, 252, 231, 0.82) 42%, transparent 72%),
    linear-gradient(180deg, #bbf7d0 0%, #dcfce7 48%, #ffffff 100%);
  border-bottom-color: #bbf7d0;
}

.consent-drawer-header.is-success::before {
  animation: success-wave 1.75s cubic-bezier(0.16, 1, 0.3, 1) both;
  background:
    linear-gradient(
      105deg,
      transparent 0%,
      rgba(134, 239, 172, 0.08) 22%,
      rgba(34, 197, 94, 0.24) 42%,
      rgba(220, 252, 231, 0.72) 53%,
      rgba(34, 197, 94, 0.18) 64%,
      transparent 84%
    );
  content: '';
  inset: -45% -70%;
  position: absolute;
  transform: translateX(-55%) rotate(-8deg);
  z-index: 0;
}

.consent-drawer-header.is-success::after {
  animation: success-ripple 1.85s ease-out both;
  background: radial-gradient(circle, rgba(34, 197, 94, 0.24) 0%, rgba(187, 247, 208, 0.18) 34%, transparent 68%);
  border-radius: 999px;
  content: '';
  height: 180px;
  left: -24px;
  position: absolute;
  top: -84px;
  width: 180px;
  z-index: 0;
}

.success-visual {
  align-items: center;
  display: flex;
  justify-content: center;
  min-height: 154px;
}

.success-lottie {
  height: 154px;
  width: 154px;
}

.confirmation-step {
  align-items: stretch;
}

.confirmation-copy {
  text-align: center;
}

.eyebrow {
  color: #059669;
  display: block;
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0;
  margin-bottom: 0.35rem;
  text-transform: uppercase;
}

.confirmation-copy h3 {
  color: #111827;
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 0.25rem;
}

.confirmation-copy p {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  line-height: 1.45;
  margin: 0;
}

.consent-link-card {
  background: #f8fafc;
  border: 1px solid #dbe3ef;
  border-radius: 8px;
  margin-top: 0.25rem;
  padding: 1rem;
}

.form-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
}

.link-wrapper {
  position: relative;
}

.link-input {
  background-color: #f9fafb;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  padding: 0.75rem 2.5rem 0.75rem 0.75rem;
  width: 100%;
}

.copy-button {
  background: none;
  border: none;
  color: var(--cinza-texto);
  cursor: pointer;
  padding: 0.5rem;
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
}

.copy-button:hover {
  color: var(--azul-principal);
}

.info {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.empty-state-custom {
  align-items: center;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  justify-content: center;
  padding: 1rem;
  text-align: center;
}

.empty-icon {
  color: var(--cinza-texto);
  opacity: 0.7;
}

.empty-state-custom p {
  color: var(--cinza-texto);
  font-size: 0.875rem;
  margin: 0;
}

.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition:
    opacity 0.48s ease,
    transform 0.48s ease;
}

.confirm-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.confirm-fade-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

@keyframes success-header-on {
  0% {
    filter: saturate(0.75);
    opacity: 0.72;
  }
  55% {
    filter: saturate(1.18);
    opacity: 1;
  }
  100% {
    filter: saturate(1);
    opacity: 1;
  }
}

@keyframes success-wave {
  0% {
    opacity: 0;
    transform: translateX(-65%) rotate(-8deg);
  }
  18% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateX(62%) rotate(-8deg);
  }
}

@keyframes success-ripple {
  0% {
    opacity: 0;
    transform: scale(0.45);
  }
  35% {
    opacity: 1;
  }
  100% {
    opacity: 0.25;
    transform: scale(1.42);
  }
}

@media (max-width: 520px) {
  .drawer-footer {
    grid-template-columns: 1fr;
  }

  .success-lottie {
    height: 136px;
    width: 136px;
  }
}
</style>
