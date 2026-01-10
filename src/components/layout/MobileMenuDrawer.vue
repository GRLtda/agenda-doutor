<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { usePlanAccess } from '@/composables/usePlanAccess'
import AppIcon from '@/components/global/AppIcon.vue'
import { ChevronLeft, ChevronRight, LogOut } from 'lucide-vue-next'
import { version } from '../../../package.json'
import logoAgenda from '@/assets/logo_dark.svg'

const appVersion = version

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])
const router = useRouter()
const authStore = useAuthStore()
const { hasAccess } = usePlanAccess()

const menuSections = computed(() => {
  // Itens que NÃO estão na BottomBar
  
  // 1. Gestão/Operacional
  const operacionalLinks = [
    { icon: 'calendar-search', text: 'Calendário', description: 'Visualizar agenda', to: '/app/calendario' },
    { icon: 'stethoscope', text: 'Procedimentos', description: 'Gerenciar serviços', to: '/app/procedimentos' },
  ]

  // 2. Marketing
  const allMarketingChildren = [
    { text: 'Mensagens', description: 'Disparos em massa', to: '/app/marketing/mensagens', icon: 'message', feature: 'marketing_messages' },
    { text: 'Modelos', description: 'Templates de mensagens', to: '/app/marketing/modelos', icon: 'template', feature: 'marketing_templates' },
    { text: 'Conexão', description: 'Status do WhatsApp', to: '/app/marketing/conexao', icon: 'link', feature: 'marketing_connection' },
    { text: 'Histórico', description: 'Logs de envios', to: '/app/marketing/logs', icon: 'history', feature: 'marketing_logs' },
  ]
  const marketingLinks = allMarketingChildren.filter(child => hasAccess(child.feature))
  
  // 3. Sistema
  const systemLinks = [
    { icon: 'settings', text: 'Configurações', description: 'Ajustes gerais', to: '/app/configuracoes' },
    { icon: 'support', text: 'Suporte', description: 'Ajuda e dúvidas', to: '/app/ajuda' },
  ]
  
  // Workflows
    let workflowsLink = []
    if (hasAccess('workflows')) {
        workflowsLink.push({ icon: 'workflow', text: 'Workflows', description: 'Automações inteligentes', to: '/app/workflows' })
    }

  return [
    {
      title: 'Gestão',
      items: operacionalLinks
    },
    {
      title: 'Marketing e Automação',
      items: [...marketingLinks, ...workflowsLink]
    },
    {
      title: 'Sistema',
      items: systemLinks
    }
  ]
})

const navigate = (path) => {
  router.push(path)
  emit('close')
}

const handleLogout = () => {
    authStore.logout()
    router.push('/login')
}
</script>

<template>
  <div class="drawer-overlay" :class="{ 'is-open': isOpen }">
    <div class="drawer-content">
      <div class="drawer-header">
        <button class="close-btn" @click="$emit('close')">
          <ChevronLeft :size="28" />
        </button>
        <h2 class="drawer-title">Mais Opções</h2>
        <div class="spacer" style="width: 28px;"></div> <!-- Spacer to center title -->
      </div>

      <div class="drawer-body">
        <div v-for="(section, index) in menuSections" :key="index" class="menu-section">
          <h3 v-if="section.items.length > 0" class="section-title">{{ section.title }}</h3>
          <div class="section-items">
            <div 
              v-for="item in section.items" 
              :key="item.to" 
              class="menu-item"
              @click="navigate(item.to)"
            >
              <div class="item-icon">
                <AppIcon :name="item.icon" :size="20" />
              </div>
              <div class="text-container">
                  <span class="item-text">{{ item.text }}</span>
                  <span class="item-description">{{ item.description }}</span>
              </div>
              <ChevronRight :size="16" class="chevron" />
            </div>
          </div>
        </div>

        <div class="menu-section logout-section">
             <div class="menu-item logout-item" @click="handleLogout">
                <div class="item-icon">
                    <LogOut :size="20" />
                </div>
                <div class="text-container">
                    <span class="item-text">Sair da Conta</span>
                    <span class="item-description">Encerrar sessão atual</span>
                </div>
             </div>
        </div>

        <div class="drawer-footer">
            <img :src="logoAgenda" alt="AgendaDoutor" class="footer-logo" />
            <span class="version-text">Versão {{ appVersion }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.drawer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #fff; /* Full white background */
  z-index: 6000;
  opacity: 0;
  visibility: hidden;
  transition: all 0.3s ease;
  transform: translateX(100%); /* Slide from right like a new page */
}

.drawer-overlay.is-open {
  opacity: 1;
  visibility: visible;
  transform: translateX(0);
}

.drawer-content {
  width: 100%;
  height: 100%;
  background-color: #f9fafb; /* Light gray bg for content */
  display: flex;
  flex-direction: column;
}

.drawer-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  color: #111827;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.menu-section {
  margin-bottom: 1.5rem; /* Reduced margin */
}

.section-title {
  font-size: 0.75rem; /* Slightly smaller */
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem; /* Reduced margin */
  padding-left: 0.25rem;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0.75rem; /* Reduced padding from 1rem */
  background-color: #fff; /* White items on gray background */
  border-radius: 12px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02); /* Subtle texture */
  border: 1px solid #f3f4f6;
}

.menu-item:active {
  background-color: #f9fafb;
}

.item-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: #f3f4f6; /* Lighter background for icon */
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--azul-principal);
  margin-right: 0.75rem; /* Reduced margin */
}

.logout-item .item-icon {
    color: #ef4444;
    background-color: #fef2f2;
}
.logout-item .item-text {
    color: #ef4444;
}

.text-container {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.item-text {
  font-weight: 500;
  color: #111827;
  font-size: 0.95rem;
  line-height: 1.2;
}

.item-description {
    font-size: 0.8rem;
    color: #6b7280;
    margin-top: 2px;
}

.chevron {
  color: #9ca3af;
}

.drawer-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem; /* Align with other content padding */
  margin-top: auto;
  background: none !important; 
}

.version-text {
  font-size: 0.75rem;
  color: #9ca3af;
}

.footer-logo {
  height: 25px;
  width: auto;
  /* opacity: 0.6; Removed for full color clarity */
  display: block;
}
</style>
