<script setup>
import { ref, onMounted } from 'vue'
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
  { value: 'geral', label: 'Geral', icon: SlidersHorizontal },
  { value: 'horario', label: 'Horário de Funcionamento', icon: Clock },
  { value: 'anamnese', label: 'Modelos de Anamnese', icon: FileText },
  { value: 'termos', label: 'Termos de Consentimento', icon: FileSignature },
  { value: 'funcionarios', label: 'Usuários e Convites', icon: Users },
  { value: 'auditoria', label: 'Histórico de Atividades', icon: History },
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
  margin-bottom: 2rem;
}
</style>
