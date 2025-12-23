<script setup>
import { ref, onMounted, onUnmounted } from 'vue' // ✨ Adicionado onUnmounted
import { useRoute } from 'vue-router'
import GeneralSettings from '@/views/pages/configuracoes/tabs/GeneralSettings.vue'
import WorkingHoursSettings from '@/views/pages/configuracoes/tabs/WorkingHoursSettings.vue'
import AnamnesisTemplates from '@/views/pages/configuracoes/tabs/AnamnesisTemplates.vue'
import ConsentTermsTemplates from '@/views/pages/configuracoes/tabs/ConsentTermsTemplates.vue'
import EmployeesSettings from '@/views/pages/configuracoes/tabs/EmployeesSettings.vue'
import AuditLog from '@/views/pages/configuracoes/tabs/AuditLog.vue'

import { SlidersHorizontal, Clock, FileText, FileSignature, Users, History } from 'lucide-vue-next'

const activeTab = ref('geral')
const route = useRoute()
const tabsNav = ref(null) // ✨ 1. Criar uma referência para o elemento do DOM
const showLeftFade = ref(false) // ✨ 2. Estado para controlar o degradê esquerdo
const showRightFade = ref(true) // ✨ 3. Estado para controlar o degradê direito

const tabs = [
  { id: 'geral', label: 'Geral', icon: SlidersHorizontal },
  { id: 'horario', label: 'Horário de Funcionamento', icon: Clock },
  { id: 'anamnese', label: 'Modelos de Anamnese', icon: FileText },
  { id: 'termos', label: 'Termos de Consentimento', icon: FileSignature },
  { id: 'funcionarios', label: 'Usuários e Convites', icon: Users },
  { id: 'auditoria', label: 'Histórico de Atividades', icon: History },
]

// ✨ 4. Função para verificar a posição do scroll
const handleScroll = () => {
  const el = tabsNav.value
  if (el) {
    const scrollLeft = el.scrollLeft
    const scrollWidth = el.scrollWidth
    const clientWidth = el.clientWidth

    showLeftFade.value = scrollLeft > 0
    showRightFade.value = scrollLeft < scrollWidth - clientWidth - 1 // -1 para tolerância
  }
}

onMounted(() => {
  if (route.query.tab && tabs.some((tab) => tab.id === route.query.tab)) {
    activeTab.value = route.query.tab
  }
  // ✨ 5. Adicionar o "escutador" de evento quando o componente é montado
  tabsNav.value?.addEventListener('scroll', handleScroll, { passive: true })
  handleScroll() // Verifica o estado inicial
})

// ✨ 6. Remover o "escutador" para evitar vazamentos de memória
onUnmounted(() => {
  tabsNav.value?.removeEventListener('scroll', handleScroll)
})
</script>

<template>
  <div class="settings-page">
    <header class="settings-header">
      <h1 class="title">Configurações</h1>
      <p class="subtitle">Gerencie as informações e preferências da sua clínica.</p>
    </header>

    <div
      class="tabs-nav-wrapper"
      :class="{
        'show-left-fade': showLeftFade,
        'show-right-fade': showRightFade,
      }"
    >
      <div class="tabs-nav" ref="tabsNav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          :class="{ active: activeTab === tab.id }"
        >
          <component :is="tab.icon" :size="18" />
          <span>{{ tab.label }}</span>
        </button>
      </div>
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
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}
.subtitle {
  font-size: 1.125rem;
  color: var(--cinza-texto);
}

/* ✨ 8. Container para o degradê */
.tabs-nav-wrapper {
  position: relative;
  margin-bottom: 2rem;
}

.tabs-nav {
  display: flex;
  gap: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
  overflow-x: auto;
  scrollbar-width: none; /* Firefox */
}
.tabs-nav::-webkit-scrollbar {
  display: none; /* Chrome, Safari, and Opera */
}
.tabs-nav button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  border: none;
  background: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  color: var(--cinza-texto);
  border-bottom: 2px solid transparent;
  transition: all 0.2s ease;
  white-space: nowrap;
}
.tabs-nav button.active {
  color: var(--azul-principal);
  border-bottom-color: var(--azul-principal);
}

/* ✨ 9. Estilos dinâmicos para o degradê */
@media (max-width: 768px) {
  .tabs-nav-wrapper::before,
  .tabs-nav-wrapper::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 3px; /* Leva em conta a borda inferior */
    width: 50px;
    z-index: 2;
    pointer-events: none;
    transition: opacity 0.2s ease;
    opacity: 0;
  }

  .tabs-nav-wrapper::before {
    left: -1px;
    background: linear-gradient(to right, var(--branco) 30%, transparent);
  }

  .tabs-nav-wrapper::after {
    right: -1px;
    background: linear-gradient(to left, var(--branco) 50%, transparent);
  }

  .tabs-nav-wrapper.show-left-fade::before {
    opacity: 1;
  }

  .tabs-nav-wrapper.show-right-fade::after {
    opacity: 1;
  }
}
</style>
