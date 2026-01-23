<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import GeneralSettings from '@/views/pages/configuracoes/tabs/GeneralSettings.vue'
import WorkingHoursSettings from '@/views/pages/configuracoes/tabs/WorkingHoursSettings.vue'
import AnamnesisTemplates from '@/views/pages/configuracoes/tabs/AnamnesisTemplates.vue'
import ConsentTermsTemplates from '@/views/pages/configuracoes/tabs/ConsentTermsTemplates.vue'
import EmployeesSettings from '@/views/pages/configuracoes/tabs/EmployeesSettings.vue'
import AuditLog from '@/views/pages/configuracoes/tabs/AuditLog.vue'
import AppTabs from '@/components/global/AppTabs.vue'

import { SlidersHorizontal, Clock, FileText, FileSignature, Users, History } from 'lucide-vue-next'

const activeTab = ref('geral')
const route = useRoute()
const router = useRouter()

const tabs = [
  { 
    value: 'geral', 
    label: 'Geral', 
    description: 'Gerencie os dados básicos e a identidade da sua clínica.', 
    icon: SlidersHorizontal 
  },
  { 
    value: 'horario', 
    label: 'Horário de Funcionamento', 
    description: 'Defina os horários de atendimento da clínica.',
    icon: Clock 
  },
  { 
    value: 'anamnese', 
    label: 'Modelos de Anamnese', 
    description: 'Crie e organize os modelos de anamnese para os atendimentos.',
    icon: FileText 
  },
  { 
    value: 'termos', 
    label: 'Termos de Consentimento', 
    description: 'Gerencie os termos de consentimento que os pacientes devem assinar.',
    icon: FileSignature 
  },
  { 
    value: 'funcionarios', 
    label: 'Membros da Equipe', 
    description: 'Gerencie os acessos e funções dos funcionários.', 
    icon: Users 
  },
  { 
    value: 'auditoria', 
    label: 'Histórico de Atividades', 
    description: 'Visualize o registro de atividades importantes no sistema.',
    icon: History 
  },
]

onMounted(() => {
  if (route.query.tab && tabs.some((tab) => tab.value === route.query.tab)) {
    activeTab.value = route.query.tab
  }
})

const handleTabChange = (value) => {
  activeTab.value = value
  router.replace({ query: { ...route.query, tab: value } })
}

const currentTab = computed(() => tabs.find(t => t.value === activeTab.value) || tabs[0])
</script>

<template>
  <div class="settings-page">
    <header class="settings-header">
      <h1 class="title">Configurações</h1>
      <p class="subtitle">Gerencie as informações e preferências da sua clínica.</p>
    </header>

    <div class="tabs-wrapper">
      <AppTabs 
        :model-value="activeTab" 
        @update:model-value="handleTabChange"
        :items="tabs"
      />
    </div>

    <div class="tab-content">
      <div class="header-actions">
        <div class="header-content-wrapper">
          <div class="header-icon">
            <component :is="currentTab.icon" :size="20" />
          </div>
          <div class="header-text">
            <h2>{{ currentTab.label }}</h2>
            <p>{{ currentTab.description }}</p>
          </div>
        </div>
        <div id="tab-actions"></div>
      </div>
      <div class="header-spacer"></div>

      <GeneralSettings v-if="activeTab === 'geral'" />
      <WorkingHoursSettings v-if="activeTab === 'horario'" />
      <AnamnesisTemplates v-if="activeTab === 'anamnese'" />
      <ConsentTermsTemplates v-if="activeTab === 'termos'" />
      <EmployeesSettings v-if="activeTab === 'funcionarios'" />
      <AuditLog v-if="activeTab === 'auditoria'" />
    </div>
  </div>
</template>

<style scoped>
.settings-header {
  margin-bottom: 2rem;
}
.title {
  font-size: 2rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.subtitle {
  font-size: 1.125rem;
  color: var(--cinza-texto);
}

.tabs-wrapper {
  margin-bottom: 1rem;
}

.tab-content {
  background: var(--branco);
  border-radius: 1rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  padding: 1.5rem;
  height: calc(100vh - 300px);
  overflow-y: auto;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  /* Removido margin-bottom para evitar buraco no scroll sticky */
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  position: sticky;
  top: 0;
  z-index: 20;
  background-color: var(--branco);
}

.header-spacer {
  height: 2rem;
}

#tab-actions {
  display: flex;
}

@media (max-width: 768px) {
  #tab-actions {
    position: fixed;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 1rem;
    z-index: 100;
    justify-content: center;
  }
  
  /* Ajuste para o botão ocupar largura total se necessário ou manter padrão */
  #tab-actions :deep(button) {
    width: 100%;
  }

  /* Padding extra no final do conteúdo para não esconder atrás do footer fixo */
  .tab-content {
    background: transparent;
    border: none;
    box-shadow: none;
    border-radius: 0;
    padding: 0;
    padding-bottom: 5rem;
    height: auto;
    overflow-y: visible;
  }

  .header-actions {
    background-color: #fafbfc;
    position: relative;
    z-index: 10;
    margin: 0 -1rem; /* Extrapola o padding do container pai se houver */
    padding: 1rem;
    border-bottom: 1px solid #e5e7eb;

  }
}

.header-content-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.header-icon {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%);
  border-radius: 0.625rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
  flex-shrink: 0;
}

.header-text h2 {
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.125rem 0;
}

.header-text p {
  font-size: 0.8rem;
  color: #6b7280;
  margin: 0;
}
</style>
