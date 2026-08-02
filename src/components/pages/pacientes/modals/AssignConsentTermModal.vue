<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { useCrmStore } from '@/stores/crm'
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
const emit = defineEmits(['close'])

const route = useRoute()
const router = useRouter()
const consentTermsStore = useConsentTermsStore()
const crmStore = useCrmStore()
const toast = useToast()

const templates = ref([])
const selectedTemplateId = ref(null)
const generatedLink = ref(null)
const copied = ref(false)
const isLoading = ref(false)
const sendNotification = ref(true)
const whatsappUnavailableMessage = 'Não está ativo o WhatsApp.'
const canSendWhatsappNotification = computed(() => crmStore.status === 'connected')
const hasTemplates = computed(() => templates.value.length > 0)

watch(canSendWhatsappNotification, (canSend) => {
  if (!canSend) {
    sendNotification.value = false
  }
})

onMounted(async () => {
  await Promise.all([
    consentTermsStore.fetchTemplates(),
    crmStore.getInitialStatus(),
  ])
  if (!canSendWhatsappNotification.value) {
    sendNotification.value = false
  }
  templates.value = consentTermsStore.templates.map((template) => ({
    value: template._id,
    label: template.name,
  }))
})

function markLinkAsCopied() {
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1800)
}

function goToConsentTermSettings() {
  emit('close')
  router.push({
    path: route.path,
    query: {
      ...route.query,
      settings: '1',
      tab: 'termos',
      returnTo: route.fullPath,
    },
  })
}

async function handleGenerateLink() {
  if (!hasTemplates.value) {
    toast.info('Crie um modelo de termo antes de atribuir ao paciente.')
    return
  }

  if (!selectedTemplateId.value) {
    toast.error('Por favor, selecione um modelo.')
    return
  }

  isLoading.value = true

  const payload = {
    templateId: selectedTemplateId.value,
    tokenTtlDays: 30,
    sendNotification: canSendWhatsappNotification.value && sendNotification.value,
    ...(props.appointmentId && { appointmentId: props.appointmentId }),
  }

  const { success, data } = await consentTermsStore.assignTermToPatient(props.patientId, payload)

  if (success) {
    generatedLink.value = `${window.location.origin}/termo/${data.patientAccessToken}`
  } else {
    toast.error('Não foi possível gerar o link.')
  }

  isLoading.value = false
}

function copyLink() {
  if (!generatedLink.value) return
  const link = generatedLink.value

  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      markLinkAsCopied()
      toast.info('Link copiado para a área de transferência!')
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
    toast.info('Link copiado para a área de transferência!')
  } catch (err) {
    toast.error('Não foi possível copiar o link.')
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
                ? 'O link de assinatura foi criado e já está vinculado ao paciente.'
                : 'Selecione um modelo para gerar um link de assinatura.'
            }}
          </p>
        </div>
      </div>
    </template>

    <div class="drawer-body-content">
      <Transition name="confirm-fade" mode="out-in">
        <div v-if="!generatedLink" class="assign-step">
          <StyledSelect
            v-model="selectedTemplateId"
            :options="templates"
            label="Selecione o Modelo"
          >
            <template #empty>
              <button type="button" class="create-term-option" @mousedown.prevent="goToConsentTermSettings">
                <FilePlus :size="16" />
                Criar um termo de consentimento
              </button>
            </template>
          </StyledSelect>

          <FormInput
            v-if="hasTemplates"
            type="checkbox"
            v-model="sendNotification"
            label="Enviar notificação via WhatsApp"
            class="notification-checkbox"
            :disabled="!canSendWhatsappNotification"
            :disabled-help="!canSendWhatsappNotification ? whatsappUnavailableMessage : ''"
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
            <p>Você pode copiar o link agora ou concluir e acessá-lo depois nos termos do paciente.</p>
          </div>

          <div class="consent-link-card">
            <label class="form-label">Link público</label>
            <div class="link-wrapper">
              <input type="text" :value="generatedLink" readonly class="link-input" />
              <button @click="copyLink" class="copy-button" :title="copied ? 'Copiado' : 'Copiar link'">
                <CheckCircle2 v-if="copied" :size="16" />
                <Copy v-else :size="16" />
              </button>
            </div>
            <p class="info">
              {{ copied ? 'Link copiado para a área de transferência.' : 'Envie este link para o paciente. Ele é válido por 30 dias.' }}
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
          :disabled="isLoading || !hasTemplates"
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
  background: #ffffff;
  border-bottom: 1px solid #f3f4f6;
  overflow: hidden;
  padding: 1.5rem;
  position: relative;
  transition: background 0.35s ease, border-color 0.35s ease;
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

.create-term-option {
  align-items: center;
  background: transparent;
  border: 0;
  border-radius: 0.5rem;
  color: var(--azul-principal);
  cursor: pointer;
  display: flex;
  font-size: 0.875rem;
  font-weight: 700;
  gap: 0.5rem;
  justify-content: flex-start;
  padding: 0.75rem 0.875rem;
  text-align: left;
  width: 100%;
}

.create-term-option:hover {
  background: #eff6ff;
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
