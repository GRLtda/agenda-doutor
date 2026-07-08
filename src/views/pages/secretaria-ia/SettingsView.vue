<script setup>
import { computed, onMounted, ref } from 'vue'
import { Save, ShieldAlert } from 'lucide-vue-next'
import { useAiSecretaryStore } from '@/stores/aiSecretary'
import AppButton from '@/components/global/AppButton.vue'

const store = useAiSecretaryStore()
const settings = computed(() => store.settings)
const localSettings = ref({
  isEnabled: false,
  assistantName: 'Secretaria Virtual',
  responseMode: 'draft_only',
  tone: 'Profissional, acolhedor e objetivo.',
  businessHoursOnly: true,
  faqFallbackMessage: 'Vou encaminhar sua mensagem para nossa equipe para te responder com seguranca.',
})

function syncLocalSettings() {
  if (!settings.value) return
  localSettings.value = {
    isEnabled: Boolean(settings.value.isEnabled),
    assistantName: settings.value.assistantName || 'Secretaria Virtual',
    responseMode: settings.value.responseMode || 'draft_only',
    tone: settings.value.tone || 'Profissional, acolhedor e objetivo.',
    businessHoursOnly: settings.value.businessHoursOnly !== false,
    faqFallbackMessage:
      settings.value.faqFallbackMessage ||
      'Vou encaminhar sua mensagem para nossa equipe para te responder com seguranca.',
  }
}

async function loadPage() {
  await store.fetchSummary()
  syncLocalSettings()
}

async function saveSettings() {
  await store.saveSettings(localSettings.value)
  syncLocalSettings()
}

onMounted(loadPage)
</script>

<template>
  <div class="settings-page">
    <header class="page-header">
      <div>
        <h1 class="title">Configurações</h1>
        <p class="subtitle">Controle como a Secretária IA deve operar na clínica.</p>
      </div>
    </header>

    <section class="panel settings-panel">
      <div class="settings-grid">
        <label class="switch-row">
          <span>
            <strong>Ativar Secretária IA</strong>
            <small>Quando desligada, mensagens recebidas continuam sendo registradas para atendimento humano.</small>
          </span>
          <input v-model="localSettings.isEnabled" type="checkbox" />
        </label>

        <label>Nome da assistente<input v-model="localSettings.assistantName" class="field" /></label>

        <label>
          Modo de resposta
          <select v-model="localSettings.responseMode" class="field">
            <option value="off">Somente registrar</option>
            <option value="draft_only">Gerar rascunhos / revisar antes</option>
            <option value="auto_faq">Responder FAQ automaticamente</option>
          </select>
        </label>

        <label>Tom de voz<textarea v-model="localSettings.tone" class="field" rows="4"></textarea></label>
        <label>Mensagem fallback<textarea v-model="localSettings.faqFallbackMessage" class="field" rows="4"></textarea></label>

        <label class="switch-row">
          <span>
            <strong>Respeitar horário de funcionamento</strong>
            <small>Usará os horários da clínica como regra operacional nas próximas fases.</small>
          </span>
          <input v-model="localSettings.businessHoursOnly" type="checkbox" />
        </label>
      </div>

      <div class="footer">
        <div class="safety-note">
          <ShieldAlert :size="18" />
          A IA não deve diagnosticar, prescrever ou substituir orientação médica.
        </div>
        <AppButton variant="primary" :disabled="store.isSaving" @click="saveSettings">
          <Save :size="16" />
          Salvar configurações
        </AppButton>
      </div>
    </section>
  </div>
</template>

<style scoped>
.settings-page { display: flex; flex-direction: column; gap: 1rem; }
.title { margin: 0; font-size: 2rem; color: #111827; }
.subtitle { margin: 0.25rem 0 0; color: #64748b; }
.panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; }
.settings-panel, .settings-grid { display: flex; flex-direction: column; gap: 1rem; }
label { display: flex; flex-direction: column; gap: 0.45rem; color: #334155; font-weight: 700; }
.field { border: 1px solid #dbe3ef; border-radius: 10px; padding: 0.7rem 0.8rem; font: inherit; }
.switch-row { flex-direction: row; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e5e7eb; border-radius: 12px; }
.switch-row small { display: block; margin-top: 0.2rem; color: #64748b; font-weight: 500; }
.switch-row input { width: 42px; height: 24px; }
.footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin-top: 0.5rem; }
.safety-note { display: inline-flex; align-items: center; gap: 0.5rem; color: #b45309; font-weight: 700; }
@media (max-width: 768px) { .footer, .switch-row { align-items: flex-start; flex-direction: column; } }
</style>

