<script setup>
import { ref, onMounted } from 'vue';
import { useAnamnesisStore } from '@/stores/anamnesis';
import { useToast } from 'vue-toastification';
import StyledSelect from '@/components/global/StyledSelect.vue';
import AppButton from '@/components/global/AppButton.vue';
import { Copy } from 'lucide-vue-next';

const props = defineProps({
  patientId: { type: String, required: true },
});
const emit = defineEmits(['close']);

const anamnesisStore = useAnamnesisStore();
const toast = useToast();

const templates = ref([]);
const selectedTemplateId = ref(null);
const generatedLink = ref(null);
const isLoading = ref(false);
const sendNotification = ref(true); // <-- NOVO ESTADO

onMounted(async () => {
  await anamnesisStore.fetchTemplates();
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
    sendNotification: sendNotification.value
  }
  // Atualiza a chamada para enviar o payload completo
  const { success, data } = await anamnesisStore.assignAnamnesis(props.patientId, payload);
  // <-- FIM DA MUDANÇA

  if (success) {
    const token = data.patientAccessToken;
    generatedLink.value = `${window.location.origin}/anamnese/${token}`;

    // Mensagem de sucesso baseada na seleção e na resposta da API
    if (sendNotification.value && data.notificationSent === false) {
       toast.success('Link gerado! Notificação na fila de envio.');
    } else if (sendNotification.value && data.notificationSent === true) {
       toast.success('Link gerado e notificação enviada!');
    } else {
       toast.success('Link gerado com sucesso!');
    }

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
      toast.info('Link copiado para a área de transferência!');
    } catch (err) {
      toast.error('Não foi possível copiar o link.');
    }
    document.body.removeChild(textArea);
  }
}

</script>

<template>
  <div class="modal-overlay">
    <div class="modal-content">
      <header class="modal-header">
        <h2>Aplicar Anamnese</h2>
        <p>Selecione um modelo para gerar um link de resposta para o paciente.</p>
      </header>

      <div class="modal-body">
        <div v-if="!generatedLink">
          <StyledSelect v-model="selectedTemplateId" :options="templates" label="Selecione o Modelo" />

          <div class="checkbox-container">
            <input type="checkbox" id="sendNotificationCheck" v-model="sendNotification" class="form-checkbox" />
            <label for="sendNotificationCheck" class="checkbox-label">
              Enviar notificação via WhatsApp
            </label>
          </div>
          </div>
        <div v-else>
          <label class="form-label">Link Público Gerado</label>
          <div class="link-wrapper">
            <input type="text" :value="generatedLink" readonly class="link-input" />
            <button @click="copyLink" class="copy-button" title="Copiar link"><Copy :size="16"/></button>
          </div>
          <p class="info">Envie este link para o paciente. Ele é válido por 7 dias.</p>
        </div>
      </div>

      <footer class="modal-footer">
        <AppButton @click="$emit('close')" variant="default">
          {{ generatedLink ? 'Concluir' : 'Cancelar' }}
        </AppButton>
        <AppButton v-if="!generatedLink" @click="handleGenerateLink" variant="primary" :loading="isLoading" :disabled="isLoading">
          Gerar Link
        </AppButton>
        <AppButton v-else @click="copyLink" variant="primary">Copiar Link</AppButton>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(249, 250, 251, 0.7); backdrop-filter: blur(10px); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-content { background: var(--branco); width: 90%; max-width: 500px; border-radius: 1rem; box-shadow: 0 10px 30px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
.modal-header { padding: 1.5rem; border-bottom: 1px solid #e5e7eb; }
.modal-header h2 { font-size: 1.25rem; }
.modal-header p { color: var(--cinza-texto); }
.modal-body { padding: 1.5rem; }

/* INÍCIO ESTILOS DO CHECKBOX */
.checkbox-container {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding: 0.5rem 0;
}
.form-checkbox {
  height: 1rem;
  width: 1rem;
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
  cursor: pointer;
  accent-color: var(--azul-principal); /* Estiliza o 'check' */
}
.form-checkbox:checked {
  background-color: var(--azul-principal);
  border-color: var(--azul-principal);
}
.checkbox-label {
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151; /* Cor escura para leitura */
  user-select: none; /* Evita selecionar texto ao clicar */
}
/* FIM ESTILOS DO CHECKBOX */

.modal-footer { padding: 1rem 1.5rem; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 1rem; background-color: #f9fafb; }
.form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.875rem; }
.link-wrapper { position: relative; }
.link-input { width: 100%; padding: 0.75rem 2.5rem 0.75rem 0.75rem; border-radius: 0.5rem; border: 1px solid #d1d5db; background-color: #f9fafb; font-size: 0.875rem; }
.copy-button { position: absolute; top: 50%; right: 0.5rem; transform: translateY(-50%); padding: 0.5rem; background: none; border: none; cursor: pointer; color: var(--cinza-texto); }
.info { font-size: 0.875rem; color: var(--cinza-texto); margin-top: 0.5rem; }
</style>
