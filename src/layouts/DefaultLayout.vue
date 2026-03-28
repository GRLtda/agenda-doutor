<script setup>
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Sidebar from '@/components/layout/Sidebar.vue'
import TopBar from '@/components/layout/TopBar.vue' // ✨ 1. Importar a TopBar
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

watch(
  () => route.fullPath,
  () => {
    isMobileSidebarOpen.value = false
  }
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

    <Transition name="sidebar-overlay-fade">
      <div
        v-if="isMobileSidebarOpen"
        @click="isMobileSidebarOpen = false"
        class="sidebar-overlay"
      ></div>
    </Transition>
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
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(8px) saturate(1.2);
  -webkit-backdrop-filter: blur(8px) saturate(1.2);
  z-index: 4999;
}

.sidebar-overlay-fade-enter-active,
.sidebar-overlay-fade-leave-active {
  transition: opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

.sidebar-overlay-fade-enter-from,
.sidebar-overlay-fade-leave-to {
  opacity: 0;
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
    border-radius: 0;
  }
  .main-content.no-padding {
    padding: 0;
  }
  .sidebar-component {
    position: fixed;
    inset: 0 auto 0 0;
    width: 100vw;
    max-width: 100vw;
    border-radius: 0;
    transform: translate3d(-104%, 0, 0) scale(0.985);
    transform-origin: left center;
    opacity: 0.92;
    transition: transform 0.52s cubic-bezier(0.22, 1, 0.36, 1),
      opacity 0.34s cubic-bezier(0.22, 1, 0.36, 1);
    z-index: 5000;
    will-change: transform, opacity;
    box-shadow: 0 28px 60px rgba(15, 23, 42, 0.2);
  }
  .sidebar-component.is-mobile-open {
    transform: translate3d(0, 0, 0) scale(1);
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar-component,
  .sidebar-overlay-fade-enter-active,
  .sidebar-overlay-fade-leave-active {
    transition: none !important;
  }
}
</style>
