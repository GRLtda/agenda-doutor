<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useCrmSettingsStore } from '@/stores/crmSettings'
import { Bell, LoaderCircle } from 'lucide-vue-next'
import StyledSelect from '@/components/global/StyledSelect.vue'
import Switch from '@/components/global/Switch.vue'

const settingsStore = useCrmSettingsStore()

const availableTriggers = computed(() => {
  const triggers = settingsStore.availableTriggers || []
  return triggers.filter(t => 
    t.type !== 'APPOINTMENT_3_MINS_BEFORE' && 
    t.type !== 'WORKFLOW_AUTOMATION'
  )
})
const currentSettings = computed(() => settingsStore.currentSettings)
const templateOptions = computed(() => settingsStore.templateOptions)
const isLoading = computed(() => settingsStore.isLoading)

// Estado local para gerenciar os valores selecionados na interface
// Usamos um objeto onde a chave é o 'type' do gatilho
const uiSettings = ref({})

// Popula o estado local quando os dados da store carregam/mudam
watch(currentSettings, (newSettings) => {
  const newUiSettings = {}
  availableTriggers.value.forEach(trigger => {
    const savedSetting = newSettings.find(s => s.type === trigger.type)
    newUiSettings[trigger.type] = {
      templateId: savedSetting?.template?._id || null, // Pega o ID do template vinculado
      isActive: savedSetting ? savedSetting.isActive : false // Pega o isActive (ou false se não houver config)
    }
  })
  uiSettings.value = newUiSettings
}, { immediate: true, deep: true }) // Roda imediatamente e observa mudanças profundas


onMounted(() => {
  settingsStore.fetchAllSettingsData() // Busca tipos e configurações ao montar
})

// Função chamada quando um valor muda na UI (select ou switch)
function handleSettingChange(triggerType) {
  const setting = uiSettings.value[triggerType];
  if (setting) {
     // Se o template for null, desativa o switch automaticamente
     if (!setting.templateId) {
         setting.isActive = false;
     }
     settingsStore.saveSetting(triggerType, setting.templateId, setting.isActive);
  }
}
</script>

<template>
  <div class="messages-tab">
    <h2>Mensagens Automáticas</h2>
    <p class="description">Configure quais modelos de mensagem serão enviados automaticamente com base em eventos.</p>

    <div v-if="isLoading && availableTriggers.length === 0" class="loading-state">
       <LoaderCircle :size="32" class="animate-spin"/> Carregando configurações...
    </div>

    <div v-else-if="availableTriggers.length === 0" class="empty-state">
      Nenhum tipo de mensagem automática disponível para configuração.
    </div>

    <div v-else class="settings-list">
      <div v-for="trigger in availableTriggers" :key="trigger.type" class="setting-item">
        <div class="trigger-info">
          <Bell :size="20" class="trigger-icon" />
          <div>
            <span class="trigger-name">{{ trigger.name }}</span>
            <span class="trigger-type">{{ trigger.type }}</span>
          </div>
        </div>
        <div class="trigger-config">
          <StyledSelect
            v-if="uiSettings[trigger.type]"
            v-model="uiSettings[trigger.type].templateId"
            :options="templateOptions"
            @update:modelValue="handleSettingChange(trigger.type)"
            class="template-select"
          />
          <Switch
            v-if="uiSettings[trigger.type]"
            v-model="uiSettings[trigger.type].isActive"
            @update:modelValue="handleSettingChange(trigger.type)"
            :disabled="!uiSettings[trigger.type]?.templateId"
            class="active-switch"
          />
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}
.description {
  color: var(--cinza-texto);
  margin-bottom: 2rem;
}
.loading-state { text-align: center; color: var(--cinza-texto); padding: 2rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.animate-spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.empty-state { padding: 2rem; text-align: center; color: var(--cinza-texto); background-color: #f9fafb; border-radius: 0.75rem; border: 1px solid #e5e7eb; }

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  padding: 1.5rem;
  background-color: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
}

.trigger-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-grow: 1;
  min-width: 0; /* Para o texto quebrar corretamente */
}
.trigger-icon {
  color: var(--azul-principal);
  flex-shrink: 0;
}
.trigger-name {
  font-weight: 600;
  display: block;
  color: var(--preto);
}
.trigger-type {
  font-size: 0.8rem;
  color: var(--cinza-texto);
  display: block;
  font-family: monospace; /* Para identificar o tipo da API */
}

.trigger-config {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0; /* Impede que os controles sejam espremidos */
}
.template-select {
  width: 250px; /* Largura fixa para o select */
}
.template-select :deep(.form-group) {
   margin-bottom: 0; /* Remove margem padrão do form-group */
   padding-bottom: 0;
}

 /* Ajusta o padding interno do switch se precisar */
 .active-switch :deep(.switch-label) {
    padding-top: 0;
 }

/* Responsividade */
@media (max-width: 768px) {
  .setting-item {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;
    padding: 1rem;
  }
  .trigger-config {
    flex-direction: column;
    align-items: stretch; /* Faz o select e o switch ocuparem a largura */
    gap: 1rem;
  }
  .template-select {
    width: 100%; /* Ocupa toda a largura */
  }
  .active-switch {
      /* Adiciona margem ou padding se necessário para espaçamento */
      padding-left: 0; /* Resetar padding se houver */
  }
   /* Garante que o rótulo do Switch fique alinhado */
   .active-switch :deep(.switch-container) {
      align-items: center; /* Centraliza verticalmente o switch e o label (se houver) */
   }
}
</style>
