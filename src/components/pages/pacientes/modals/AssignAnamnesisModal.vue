<script setup>
import { computed, ref, onMounted, watch } from 'vue';
import { useAnamnesisStore } from '@/stores/anamnesis';
import { useCrmStore } from '@/stores/crm';
import { useToast } from 'vue-toastification';
import StyledSelect from '@/components/global/StyledSelect.vue';
import AppButton from '@/components/global/AppButton.vue';
import FormInput from '@/components/global/FormInput.vue';
import LottieAnimation from '@/components/global/LottieAnimation.vue';
import SideDrawer from '@/components/global/SideDrawer.vue';
import { CheckCircle2, Copy } from 'lucide-vue-next';

const props = defineProps({
  patientId: { type: String, required: true },
});
const emit = defineEmits(['close', 'saved']);

const anamnesisStore = useAnamnesisStore();
const crmStore = useCrmStore();
const toast = useToast();

const templates = ref([]);
const selectedTemplateId = ref(null);
const generatedLink = ref(null);
const notificationSent = ref(null);
const copied = ref(false);
const isLoading = ref(false);
const sendNotification = ref(true); // <-- NOVO ESTADO
const whatsappUnavailableMessage = 'Não está ativo o WhatsApp.';
const canSendWhatsappNotification = computed(() => crmStore.status === 'connected');

watch(canSendWhatsappNotification, (canSend) => {
  if (!canSend) {
    sendNotification.value = false;
  }
});

function markLinkAsCopied() {
  copied.value = true;
  window.setTimeout(() => {
    copied.value = false;
  }, 1800);
}

onMounted(async () => {
  await Promise.all([
    anamnesisStore.fetchTemplates(),
    crmStore.getInitialStatus(),
  ]);
  if (!canSendWhatsappNotification.value) {
    sendNotification.value = false;
  }
  templates.value = anamnesisStore.templates.map(t => ({ value: t._id, label: t.name }));
});

async function handleGenerateLink() {
  if (!selectedTemplateId.value) {
    toast.error('Por favor, selecione um modelo.');
    return;
  }
  isLoading.value = true;

  // <-- INÍCIO DA MUDANÇA
  const payload = {
    templateId: selectedTemplateId.value,
    mode: 'Paciente', // Obrigatório para notificação
    tokenTtlDays: 7, // Definido no README
    sendNotification: canSendWhatsappNotification.value && sendNotification.value
  }
  // Atualiza a chamada para enviar o payload completo
  const { success, data } = await anamnesisStore.assignAnamnesis(props.patientId, payload);
  // <-- FIM DA MUDANÇA

  if (success) {
    const token = data.patientAccessToken;
    generatedLink.value = `${window.location.origin}/anamnese/${token}`;
    notificationSent.value = data.notificationSent;
    emit('saved', data)

  } else {
    toast.error('Não foi possível gerar o link.');
  }
  isLoading.value = false;
}

function copyLink() {
  if (!generatedLink.value) return;
  const link = generatedLink.value;

  if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      markLinkAsCopied();
      toast.info('Link copiado para a área de transferência!');
    });
  } else {
    const textArea = document.createElement('textarea');
    textArea.value = link;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      markLinkAsCopied();
      toast.info('Link copiado para a área de transferência!');
    } catch (err) {
      toast.error('Não foi possível copiar o link.');
    }
    document.body.removeChild(textArea);
  }
}

</script>

<template>
  <SideDrawer size="md" @close="$emit('close')">
    <template #header>
      <div class="drawer-header" :class="{ success: generatedLink }">
        <div>
          <h2>{{ generatedLink ? 'Anamnese anexada' : 'Aplicar Anamnese' }}</h2>
          <p class="subtitle">
            {{
              generatedLink
                ? 'O link de resposta foi criado e já está vinculado ao paciente.'
                : 'Selecione o modelo e escolha como o paciente será avisado.'
            }}
          </p>
        </div>
      </div>
    </template>

    <div class="drawer-body-content">
      <Transition name="confirm-fade" mode="out-in">
        <div v-if="!generatedLink" class="assign-step">
          <StyledSelect v-model="selectedTemplateId" :options="templates" label="Modelo de anamnese" />

          <FormInput
            type="checkbox"
            v-model="sendNotification"
            label="Enviar notificação via WhatsApp"
            :disabled="!canSendWhatsappNotification"
            :disabled-help="!canSendWhatsappNotification ? whatsappUnavailableMessage : ''"
          />
        </div>
        <div v-else class="confirmation-step">
          <div class="success-visual" aria-hidden="true">
            <LottieAnimation
              class="success-lottie"
              name="check.json"
              aria-label="Anamnese anexada com sucesso"
            />
          </div>

          <div class="confirmation-copy">
            <span class="eyebrow">Tudo pronto</span>
            <h3>Link gerado com sucesso</h3>
            <p>Você pode copiar o link agora ou concluir e acessá-lo depois na aba de anamneses.</p>
          </div>

          <div class="link-card">
            <label class="form-label">Link público</label>
            <div class="link-wrapper">
              <input type="text" :value="generatedLink" readonly class="link-input" />
              <button @click="copyLink" class="copy-button" :title="copied ? 'Copiado' : 'Copiar link'">
                <CheckCircle2 v-if="copied" :size="16" />
                <Copy v-else :size="16"/>
              </button>
            </div>
            <p class="info">
              {{ copied ? 'Link copiado para a área de transferência.' : 'Compartilhe este link somente com o paciente.' }}
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
        <AppButton v-if="!generatedLink" @click="handleGenerateLink" variant="primary" :loading="isLoading" :disabled="isLoading">
          Gerar Link
        </AppButton>
        <AppButton v-else @click="copyLink" variant="primary">
          {{ copied ? 'Copiado' : 'Copiar Link' }}
        </AppButton>
      </div>
    </template>
  </SideDrawer>
</template>

<style scoped>
.drawer-header {
  background: #ffffff;
  padding: 1.5rem;
  border-bottom: 1px solid #f3f4f6;
  overflow: hidden;
  position: relative;
  transition: background 0.2s ease;
}

.drawer-header > div {
  position: relative;
  z-index: 1;
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
.link-input { width: 100%; padding: 0.75rem 2.5rem 0.75rem 0.75rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background-color: #f9fafb; font-size: 0.875rem; }
.copy-button { position: absolute; top: 50%; right: 0.5rem; transform: translateY(-50%); padding: 0.5rem; background: none; border: none; cursor: pointer; color: var(--cinza-texto); }
.info { font-size: 0.875rem; color: var(--cinza-texto); margin-top: 0.5rem; }

.drawer-body-content,
.assign-step,
.confirmation-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.drawer-header.success {
  animation: success-header-on 1.45s ease-out both;
  background:
    radial-gradient(120% 120% at 20% 0%, rgba(187, 247, 208, 0.9) 0%, rgba(240, 253, 244, 0.72) 38%, transparent 70%),
    linear-gradient(180deg, #dcfce7 0%, #f0fdf4 52%, #ffffff 100%);
}

.drawer-header.success::before {
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

.drawer-header.success::after {
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

.confirmation-step {
  align-items: stretch;
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

.link-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
}

.copy-button:hover {
  color: var(--azul-principal);
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
