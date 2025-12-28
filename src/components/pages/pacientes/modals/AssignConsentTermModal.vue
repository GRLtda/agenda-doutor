<script setup>
import { ref, onMounted } from 'vue'
import { useConsentTermsStore } from '@/stores/consent-terms'
import { useToast } from 'vue-toastification'
import StyledSelect from '@/components/global/StyledSelect.vue'
import AppButton from '@/components/global/AppButton.vue'
import FormInput from '@/components/global/FormInput.vue'
import SideDrawer from '@/components/global/SideDrawer.vue'
import { Copy, FilePlus } from 'lucide-vue-next'

const props = defineProps({
  patientId: { type: String, required: true },
  appointmentId: { type: String, default: null },
})
const emit = defineEmits(['close'])

const consentTermsStore = useConsentTermsStore()
const toast = useToast()

const templates = ref([])
const selectedTemplateId = ref(null)
const generatedLink = ref(null)
const isLoading = ref(false)
const sendNotification = ref(true)

onMounted(async () => {
  await consentTermsStore.fetchTemplates()
  templates.value = consentTermsStore.templates.map(t => ({ value: t._id, label: t.name }))
})

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

    if (sendNotification.value && data.notificationSent === false) {
      toast.success('Link gerado! Notificação na fila de envio.')
    } else if (sendNotification.value && data.notificationSent === true) {
      toast.success('Link gerado e notificação enviada!')
    } else {
      toast.success('Link gerado com sucesso!')
    }
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
      toast.info('Link copiado para a área de transferência!')
    })
  } else {
    const textArea = document.createElement('textarea')
    textArea.value = link
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    try {
      document.execCommand('copy')
      toast.info('Link copiado para a área de transferência!')
    } catch (err) {
      toast.error('Não foi possível copiar o link.')
    }
    document.body.removeChild(textArea)
  }
}
</script>

<template>
  <SideDrawer @close="$emit('close')">
    <template #header>
      <div class="drawer-header">
        <h2>Aplicar Termo de Consentimento</h2>
        <p class="subtitle">Selecione um modelo para gerar um link de assinatura.</p>
      </div>
    </template>

    <div class="drawer-body-content">
      <div v-if="!generatedLink">
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
          label="Enviar notificação via WhatsApp"
          class="notification-checkbox"
        />
      </div>
      <div v-else>
        <label class="form-label">Link Público Gerado</label>
        <div class="link-wrapper">
          <input type="text" :value="generatedLink" readonly class="link-input" />
          <button @click="copyLink" class="copy-button" title="Copiar link">
            <Copy :size="16"/>
          </button>
        </div>
        <p class="info">Envie este link para o paciente. Ele é válido por 30 dias.</p>
      </div>
    </div>

    <template #footer>
      <div class="drawer-footer">
        <AppButton @click="$emit('close')" variant="default">
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
        <AppButton v-else @click="copyLink" variant="primary">Copiar Link</AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
}

.drawer-footer {
  padding: 1.5rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  border-top: 1px solid #f3f4f6;
  width: 100%;
}

h2 { font-size: 1.25rem; font-weight: 600; color: #111827; margin: 0; }
.subtitle { color: var(--cinza-texto); margin-top: 0.25rem; font-size: 0.875rem; }


.form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; }
.link-wrapper { position: relative; }
.link-input { 
  width: 100%; 
  padding: 0.75rem 2.5rem 0.75rem 0.75rem; 
  border-radius: 0.5rem; 
  border: 1px solid #d1d5db; 
  background-color: #f9fafb; 
  font-size: 0.875rem; 
}
.copy-button { 
  position: absolute; 
  top: 50%; 
  right: 0.5rem; 
  transform: translateY(-50%); 
  padding: 0.5rem; 
  background: none; 
  border: none; 
  cursor: pointer; 
  color: var(--cinza-texto); 
}
.info { font-size: 0.875rem; color: var(--cinza-texto); margin-top: 0.5rem; }

.notification-checkbox {
  margin-top: 1.5rem;
}

.empty-state-custom {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  gap: 0.75rem;
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
.btn-create-term {
  margin-top: 0.5rem;
  width: 100%;
  justify-content: center;
  font-size: 0.875rem;
  height: 38px;
}
</style>
