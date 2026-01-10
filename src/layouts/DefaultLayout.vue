<script setup>
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/TopBar.vue' // ✨ 1. Importar a TopBar
import BottomNavBar from '@/components/layout/BottomNavBar.vue' // ✨ Novo Bottom Nav
import MobileMenuDrawer from '@/components/layout/MobileMenuDrawer.vue' // ✨ Novo Drawer
import CreateAppointmentModal from '@/components/pages/dashboard/CreateAppointmentModal.vue' // ✨ 2. Importar o Modal
import SubscriptionModal from '@/components/global/SubscriptionModal.vue'

import { useLayoutStore } from '@/stores/layout'
import { useToast } from 'vue-toastification'
import { useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const layoutStore = useLayoutStore()
const toast = useToast()
const isMobileSidebarOpen = ref(false)
const isAppointmentModalOpen = ref(false) // ✨ 3. Estado para o modal global
const isMobileDrawerOpen = ref(false) // ✨ Estado do Drawer Mobile




watch(
  () => route.query,
  (query) => {
    if (query.success === 'true') {
      toast.success('Assinatura realizada com sucesso!')
      // Remove os parâmetros da URL
      router.replace({ query: { ...query, success: undefined } })
    } else if (query.canceled === 'true') {
      toast.info('Assinatura cancelada ou não finalizada.')
      router.replace({ query: { ...query, canceled: undefined } })
    }
  },
  { immediate: true }
)


</script>

<template>
  <div class="app-layout">
    <div class="unified-container">
      <Sidebar
        v-if="!route.meta.layout?.fullscreen"
        class="sidebar-component"
        :class="{ 'is-mobile-open': isMobileSidebarOpen, 'is-collapsed': layoutStore.isSidebarCollapsed }"
        :is-collapsed="layoutStore.isSidebarCollapsed"
        @close="isMobileSidebarOpen = false"
        @toggle-collapse="layoutStore.toggleSidebar()"
      />

      <div class="main-panel">
        <TopBar
          v-if="!route.meta.layout?.fullscreen"
          :is-sidebar-collapsed="layoutStore.isSidebarCollapsed"
          @toggle-sidebar="isMobileSidebarOpen = true"
          @toggle-collapse="layoutStore.toggleSidebar()"
          @open-schedule-modal="isAppointmentModalOpen = true"
        />

        <main class="main-content" :class="{ 'no-padding': route.meta.layout?.noPadding }">
          <RouterView />
        </main>
      </div>
    </div>

    <CreateAppointmentModal
      v-if="isAppointmentModalOpen"
      @close="isAppointmentModalOpen = false"
    />

    <SubscriptionModal />

    <!-- Novos Componentes Mobile -->
    <BottomNavBar 
      v-if="!route.meta.layout?.fullscreen" 
      @open-menu="isMobileDrawerOpen = true" 
    />
    
    <MobileMenuDrawer 
      :is-open="isMobileDrawerOpen" 
      @close="isMobileDrawerOpen = false" 
    />

    <!-- O antigo sidebar overlay pode ser removido ou mantido se o Sidebar ainda for usado em algum caso raro, 
         mas com o BottomNav ele deve ser desativado no mobile -->
    <div
      v-if="isMobileSidebarOpen"
      @click="isMobileSidebarOpen = false"
      class="sidebar-overlay"
    ></div>
  </div>
</template>

<style scoped>
.app-layout {
  display: flex;
  background-color: var(--branco);
  height: 100dvh;
}

/* Container unificado para sidebar e top bar */
.unified-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  background-color: #fafbfc;
}

/* ✨ 6. Estilo para o novo Main Panel */
.main-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Garante que o painel não ultrapasse a tela */
  /* Isso garante que o painel não fique por baixo da sidebar */
  min-width: 0;
}

.main-content {
  flex: 1;
  padding: 1.5rem;
  border-radius: 1rem 0 0 0rem;
  border: 1px solid #e5e7eb;
  overflow-y: auto; /* O scroll fica apenas no conteúdo principal */
}
.main-content.no-padding {
  padding: 0;
}

/* Remove o header mobile antigo, pois foi integrado na TopBar */
.mobile-header {
  display: none;
}

.sidebar-overlay {
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 4999;
}

/* Breakpoint para tablets e celulares */
@media (max-width: 1024px) {
  .unified-container {
    border: none;
    border-radius: 0;
    margin: 0;
  }
  .main-panel {
    width: 100%; /* Ocupa toda a largura no mobile */
  }
  .main-content {
    padding: 1.5rem 1rem;
    padding-bottom: 100px; /* ✨ Espaço para a Bottom Bar */
    border-radius: 0;
  }
  .main-content.no-padding {
    padding: 0;
    padding-bottom: 100px; /* Mesmo se for no-padding, precisa do espaço embaixo se a nav estiver lá */
  }
  .sidebar-component {
    /* Esconder o sidebar no mobile pois agora usamos BottomNav */
    display: none; 
    /* 
       Mover a sidebar antiga para fora da tela ou display:none é o ideal.
       Se display:none, precisamos garantir que ela reapareça no desktop.
       O media query já cuida do desktop. 
    */
  }
  .sidebar-overlay {
    display: block;
  }
}
</style>
