<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useCrmSettingsStore } from '@/stores/crmSettings'
import { 
  Bell, 
  Calendar, 
  Cake, 
  FileText, 
  ClipboardCheck,
  CheckCircle,
  Clock,
  LoaderCircle,
  Save
} from 'lucide-vue-next'
import StyledSelect from '@/components/global/StyledSelect.vue'
import Switch from '@/components/global/Switch.vue'

const settingsStore = useCrmSettingsStore()

// Mapeamento de ícones por tipo
const triggerIcons = {
  APPOINTMENT_CONFIRMATION: CheckCircle,
  APPOINTMENT_1_DAY_BEFORE: Calendar,
  APPOINTMENT_2_HOURS_BEFORE: Clock,
  PATIENT_BIRTHDAY: Cake,
  ANAMNESIS_ASSIGNMENT: FileText,
  CONSENT_TERM_ASSIGNMENT: ClipboardCheck,
}

// Descrições amigáveis
const triggerDescriptions = {
  APPOINTMENT_CONFIRMATION: 'Enviada quando um agendamento é confirmado pelo paciente',
  APPOINTMENT_1_DAY_BEFORE: 'Enviada 24 horas antes do agendamento',
  APPOINTMENT_2_HOURS_BEFORE: 'Enviada 2 horas antes do agendamento',
  PATIENT_BIRTHDAY: 'Enviada no dia do aniversário do paciente',
  ANAMNESIS_ASSIGNMENT: 'Enviada quando uma anamnese é atribuída ao paciente',
  CONSENT_TERM_ASSIGNMENT: 'Enviada quando um termo de consentimento é atribuído',
}

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
const uiSettings = ref({})
// Estado original para comparação (detectar mudanças)
const originalSettings = ref({})
const isSaving = ref(false)

// Popula o estado local quando os dados da store carregam/mudam
watch(currentSettings, (newSettings) => {
  const newUiSettings = {}
  availableTriggers.value.forEach(trigger => {
    const savedSetting = newSettings.find(s => s.type === trigger.type)
    newUiSettings[trigger.type] = {
      templateId: savedSetting?.template?._id || null,
      isActive: savedSetting ? savedSetting.isActive : false
    }
  })
  uiSettings.value = JSON.parse(JSON.stringify(newUiSettings))
  originalSettings.value = JSON.parse(JSON.stringify(newUiSettings))
}, { immediate: true, deep: true })

// Detecta se há mudanças pendentes
const hasChanges = computed(() => {
  return JSON.stringify(uiSettings.value) !== JSON.stringify(originalSettings.value)
})

// Conta quantas configurações estão ativas
const activeCount = computed(() => {
  return Object.values(uiSettings.value).filter(s => s.isActive && s.templateId).length
})

onMounted(() => {
  settingsStore.fetchAllSettingsData()
})

// Salva todas as configurações alteradas
async function saveAllSettings() {
  isSaving.value = true
  
  try {
    // Encontra todas as configurações que foram alteradas
    const changedSettings = []
    
    for (const type of Object.keys(uiSettings.value)) {
      const current = uiSettings.value[type]
      const original = originalSettings.value[type]
      
      if (JSON.stringify(current) !== JSON.stringify(original)) {
        changedSettings.push({
          type,
          templateId: current.templateId,
          isActive: current.templateId ? current.isActive : false
        })
      }
    }
    
    // Salva cada configuração alterada
    for (const setting of changedSettings) {
      await settingsStore.saveSetting(setting.type, setting.templateId, setting.isActive)
    }
    
    // Atualiza o estado original após salvar
    originalSettings.value = JSON.parse(JSON.stringify(uiSettings.value))
  } finally {
    isSaving.value = false
  }
}

function getIcon(type) {
  return triggerIcons[type] || Bell
}

function getDescription(type) {
  return triggerDescriptions[type] || ''
}
</script>

<template>
  <div class="messages-tab">
    <!-- Header -->
    <div class="page-header">
      <div class="header-content">
        <h2>Mensagens Automáticas</h2>
        <p class="description">Configure quais modelos de mensagem serão enviados automaticamente com base em eventos.</p>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading && availableTriggers.length === 0" class="loading-state">
      <LoaderCircle :size="32" class="animate-spin"/>
      <span>Carregando configurações...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="availableTriggers.length === 0" class="empty-state">
      <Bell :size="48" />
      <p>Nenhum tipo de mensagem automática disponível para configuração.</p>
    </div>

    <!-- Cards Grid -->
    <div v-else class="cards-grid">
      <div 
        v-for="trigger in availableTriggers" 
        :key="trigger.type" 
        class="trigger-card"
        :class="{ 'is-active': uiSettings[trigger.type]?.isActive && uiSettings[trigger.type]?.templateId }"
      >
        <!-- Card Header -->
        <div class="card-header">
          <div class="icon-wrapper" :class="{ 'active': uiSettings[trigger.type]?.isActive && uiSettings[trigger.type]?.templateId }">
            <component :is="getIcon(trigger.type)" :size="18" />
          </div>
          <div class="header-right">
            <div class="status-badge" :class="{ 'active': uiSettings[trigger.type]?.isActive && uiSettings[trigger.type]?.templateId }">
              {{ uiSettings[trigger.type]?.isActive && uiSettings[trigger.type]?.templateId ? 'Ativo' : 'Inativo' }}
            </div>
            <Switch
              v-if="uiSettings[trigger.type]"
              v-model="uiSettings[trigger.type].isActive"
              :disabled="!uiSettings[trigger.type]?.templateId"
            />
          </div>
        </div>

        <!-- Card Content -->
        <div class="card-content">
          <h3 class="trigger-name">{{ trigger.name }}</h3>
          <p class="trigger-description">{{ getDescription(trigger.type) }}</p>
        </div>

        <!-- Card Footer -->
        <div class="card-footer">
          <label class="select-label">Modelo de mensagem</label>
          <StyledSelect
            v-if="uiSettings[trigger.type]"
            v-model="uiSettings[trigger.type].templateId"
            :options="templateOptions"
            class="template-select"
          />
        </div>
      </div>
    </div>

    <!-- Floating Save Button -->
    <Transition name="slide-up">
      <div v-if="hasChanges" class="save-bar">
        <div class="save-bar-content">
          <span class="unsaved-text">Você tem alterações não salvas</span>
          <button 
            class="save-button" 
            @click="saveAllSettings"
            :disabled="isSaving"
          >
            <LoaderCircle v-if="isSaving" :size="18" class="animate-spin" />
            <Save v-else :size="18" />
            {{ isSaving ? 'Salvando...' : 'Salvar Alterações' }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.messages-tab {
  padding-bottom: 100px; /* Espaço para a barra de salvar */
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 1rem;
}

.header-content h2 {
  font-size: 2rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--preto);
}

.description {
  color: var(--cinza-texto);
  font-size: 0.95rem;
}

.header-stats {
  flex-shrink: 0;
}

.stat-badge {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1.25rem;
  background: linear-gradient(135deg, var(--azul-principal) 0%, #4f84e5 100%);
  border-radius: 1rem;
  color: white;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 0.75rem;
  opacity: 0.9;
}

/* Loading & Empty States */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 4rem 2rem;
  color: var(--cinza-texto);
}

.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 4rem 2rem;
  text-align: center;
  color: var(--cinza-texto);
  background-color: #f9fafb;
  border-radius: 1rem;
  border: 1px dashed #e5e7eb;
}

/* Cards Grid */
.cards-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.trigger-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 0.7rem;
  background: var(--branco);
  border: 1px solid #e5e7eb;
  border-radius: 0.75rem;
  transition: all 0.2s ease;
}

.trigger-card:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.trigger-card.is-active {
  border-color: var(--azul-principal);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  background: #f3f4f6;
  border-radius: 0.5rem;
  color: var(--cinza-texto);
  transition: all 0.2s ease;
}

.icon-wrapper.active {
  background: linear-gradient(135deg, var(--azul-principal) 0%, #4f84e5 100%);
  color: white;
}

/* Card Content */
.card-content {
  flex-grow: 1;
}

.trigger-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--preto);
  margin-bottom: 0.15rem;
  line-height: 1.3;
}

.trigger-description {
  font-size: 0.75rem;
  color: var(--cinza-texto);
  line-height: 1.35;
}

/* Card Footer */
.card-footer {
  margin-top: auto;
}

.select-label {
  display: block;
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--cinza-texto);
  margin-bottom: 0.35rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

.template-select {
  width: 100%;
}

.template-select :deep(.form-group) {
  margin-bottom: 0;
  padding-bottom: 0;
}

/* Status Badge */
.header-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.status-badge {
  padding: 0.15rem 0.5rem;
  font-size: 0.6rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  border-radius: 2rem;
  background: #f3f4f6;
  color: var(--cinza-texto);
}

.status-badge.active {
  background: #dcfce7;
  color: #166534;
}

/* Save Bar */
.save-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e5e7eb;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
  padding: 1rem 2rem;
  z-index: 100;
}

.save-bar-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.unsaved-text {
  font-size: 0.9rem;
  color: var(--cinza-texto);
}

.save-button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, var(--azul-principal) 0%, #4f84e5 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
}

.save-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Transition */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

/* Responsiveness */
@media (max-width: 1400px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 1024px) {
  .cards-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .cards-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .page-header {
    flex-direction: column;
  }
  
  .header-stats {
    align-self: flex-start;
  }
  
  .stat-badge {
    flex-direction: row;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
  }
  
  .stat-number {
    font-size: 1.25rem;
  }
  
  .trigger-card {
    padding: 1.25rem;
  }
  
  .status-badge {
    right: 3.5rem;
  }
  
  .save-bar {
    padding: 1rem;
  }
  
  .save-bar-content {
    flex-direction: column;
  }
  
  .save-button {
    width: 100%;
    justify-content: center;
  }
}
</style>
